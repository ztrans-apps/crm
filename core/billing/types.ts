export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'paused';

export type BillingPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export interface Subscription {
  id: string;
  tenantId: string;
  plan: BillingPlan;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageRecord {
  id: string;
  tenantId: string;
  metric: string;
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PlanLimits {
  maxUsers: number;
  maxWhatsAppSessions: number;
  maxMessagesPerMonth: number;
  maxContacts: number;
  maxBroadcastsPerMonth: number;
  features: string[];
}

export const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  free: {
    maxUsers: 2,
    maxWhatsAppSessions: 1,
    maxMessagesPerMonth: 1000,
    maxContacts: 500,
    maxBroadcastsPerMonth: 10,
    features: ['basic_chat', 'contacts'],
  },
  starter: {
    maxUsers: 5,
    maxWhatsAppSessions: 3,
    maxMessagesPerMonth: 10000,
    maxContacts: 5000,
    maxBroadcastsPerMonth: 100,
    features: ['basic_chat', 'contacts', 'broadcast', 'basic_automation'],
  },
  professional: {
    maxUsers: 20,
    maxWhatsAppSessions: 10,
    maxMessagesPerMonth: 100000,
    maxContacts: 50000,
    maxBroadcastsPerMonth: 1000,
    features: ['basic_chat', 'contacts', 'broadcast', 'advanced_automation', 'crm', 'analytics'],
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxWhatsAppSessions: -1,
    maxMessagesPerMonth: -1,
    maxContacts: -1,
    maxBroadcastsPerMonth: -1,
    features: ['all'],
  },
};
