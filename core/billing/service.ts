import { createClient } from '@/lib/supabase/server';
import type { Subscription, UsageRecord, BillingPlan, PlanLimits } from './types';
import { PLAN_LIMITS } from './types';

export class BillingService {
  /**
   * Get subscription for a tenant
   */
  static async getSubscription(tenantId: string): Promise<Subscription | null> {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      tenantId: data.tenant_id,
      plan: data.plan,
      status: data.status,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      cancelAtPeriodEnd: data.cancel_at_period_end,
      trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Check if tenant has access to a feature
   */
  static async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) return false;

    const limits = PLAN_LIMITS[subscription.plan];
    return limits.features.includes('all') || limits.features.includes(feature);
  }

  /**
   * Check if tenant is within usage limits
   */
  static async checkLimit(
    tenantId: string,
    metric: keyof PlanLimits
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      return { allowed: false, current: 0, limit: 0 };
    }

    const limits = PLAN_LIMITS[subscription.plan];
    const limit = limits[metric] as number;

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, current: 0, limit: -1 };
    }

    const current = await this.getCurrentUsage(tenantId, metric);
    return {
      allowed: current < limit,
      current,
      limit,
    };
  }

  /**
   * Record usage for billing
   */
  static async recordUsage(
    tenantId: string,
    metric: string,
    quantity: number = 1,
    metadata?: Record<string, any>
  ): Promise<void> {
    const supabase = await createClient();

    await supabase.from('usage_records').insert({
      tenant_id: tenantId,
      metric,
      quantity,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get current usage for a metric
   */
  private static async getCurrentUsage(
    tenantId: string,
    metric: string
  ): Promise<number> {
    const supabase = await createClient();
    const subscription = await this.getSubscription(tenantId);
    
    if (!subscription) return 0;

    // Get usage for current billing period
    const { data, error } = await supabase
      .from('usage_records')
      .select('quantity')
      .eq('tenant_id', tenantId)
      .eq('metric', metric)
      .gte('timestamp', subscription.currentPeriodStart.toISOString())
      .lte('timestamp', subscription.currentPeriodEnd.toISOString());

    if (error || !data) return 0;

    return data.reduce((sum, record) => sum + record.quantity, 0);
  }

  /**
   * Upgrade/downgrade subscription
   */
  static async updatePlan(tenantId: string, newPlan: BillingPlan): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from('subscriptions')
      .update({
        plan: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(
    tenantId: string,
    immediate: boolean = false
  ): Promise<void> {
    const supabase = await createClient();

    if (immediate) {
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
    } else {
      await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId);
    }
  }
}
