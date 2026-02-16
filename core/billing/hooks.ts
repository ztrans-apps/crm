'use client';

import { useEffect, useState } from 'react';
import type { Subscription, PlanLimits } from './types';
import { PLAN_LIMITS } from './types';

export function useSubscription(tenantId: string) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch(`/api/billing/subscription?tenantId=${tenantId}`);
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    }

    if (tenantId) {
      fetchSubscription();
    }
  }, [tenantId]);

  const limits = subscription ? PLAN_LIMITS[subscription.plan] : null;

  return {
    subscription,
    limits,
    loading,
    isActive: subscription?.status === 'active',
    isTrial: subscription?.status === 'trialing',
  };
}

export function useFeatureAccess(tenantId: string, feature: string) {
  const { subscription, loading } = useSubscription(tenantId);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (subscription) {
      const limits = PLAN_LIMITS[subscription.plan];
      setHasAccess(limits.features.includes('all') || limits.features.includes(feature));
    }
  }, [subscription, feature]);

  return { hasAccess, loading };
}

export function useUsageLimit(tenantId: string, metric: keyof PlanLimits) {
  const [usage, setUsage] = useState({ current: 0, limit: 0, allowed: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsage() {
      try {
        const response = await fetch(
          `/api/billing/usage?tenantId=${tenantId}&metric=${metric}`
        );
        if (response.ok) {
          const data = await response.json();
          setUsage(data);
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error);
      } finally {
        setLoading(false);
      }
    }

    if (tenantId) {
      fetchUsage();
    }
  }, [tenantId, metric]);

  return { ...usage, loading };
}
