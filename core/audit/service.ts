/**
 * Core Audit Service
 * Audit logging operations
 */

import { createClient } from '@/lib/supabase/server';
import type { AuditLog, CreateAuditLogInput, AuditLogFilter } from './types';

export class AuditService {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Create audit log entry
   */
  async log(input: CreateAuditLogInput, userId?: string): Promise<AuditLog> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        tenant_id: this.tenantId,
        user_id: userId || null,
        action: input.action,
        resource_type: input.resource_type,
        resource_id: input.resource_id || null,
        old_value: input.old_value || null,
        new_value: input.new_value || null,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get audit logs with filters
   */
  async getLogs(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    const supabase = await createClient();
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', this.tenantId);

    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }

    if (filter.action) {
      query = query.eq('action', filter.action);
    }

    if (filter.resource_type) {
      query = query.eq('resource_type', filter.resource_type);
    }

    if (filter.resource_id) {
      query = query.eq('resource_id', filter.resource_id);
    }

    if (filter.from_date) {
      query = query.gte('created_at', filter.from_date);
    }

    if (filter.to_date) {
      query = query.lte('created_at', filter.to_date);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(filter.limit || 100)
      .range(filter.offset || 0, (filter.offset || 0) + (filter.limit || 100) - 1);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Get audit logs for specific resource
   */
  async getResourceLogs(
    resourceType: string,
    resourceId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    userId: string,
    fromDate?: string,
    limit: number = 100
  ): Promise<AuditLog[]> {
    const supabase = await createClient();
    let query = supabase
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('user_id', userId);

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }
}
