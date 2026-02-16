'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useSubscription, useUsageLimit } from '@/core/billing';
import { PLAN_LIMITS } from '@/core/billing';

export default function BillingPage() {
  const { subscription, limits, isActive, loading } = useSubscription(''); // Get from context
  const messagesUsage = useUsageLimit('', 'maxMessagesPerMonth');
  const contactsUsage = useUsageLimit('', 'maxContacts');

  if (loading) {
    return <div>Loading billing information...</div>;
  }

  if (!subscription) {
    return <div>No subscription found</div>;
  }

  const plans = ['free', 'starter', 'professional', 'enterprise'] as const;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Current Plan */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Your active subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Badge variant="default" className="text-lg mb-2">
                {subscription.plan.toUpperCase()}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Status: {subscription.status}
              </p>
              <p className="text-sm text-muted-foreground">
                Period: {subscription.currentPeriodStart.toLocaleDateString()} - {subscription.currentPeriodEnd.toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <Button variant="outline" className="mb-2">
                Change Plan
              </Button>
              <br />
              <Button variant="ghost" size="sm">
                Cancel Subscription
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>
            Your current usage and limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Messages */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Messages</span>
              <span className="text-sm text-muted-foreground">
                {messagesUsage.current} / {messagesUsage.limit === -1 ? '∞' : messagesUsage.limit}
              </span>
            </div>
            <Progress 
              value={messagesUsage.limit === -1 ? 0 : (messagesUsage.current / messagesUsage.limit) * 100} 
            />
          </div>

          {/* Contacts */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Contacts</span>
              <span className="text-sm text-muted-foreground">
                {contactsUsage.current} / {contactsUsage.limit === -1 ? '∞' : contactsUsage.limit}
              </span>
            </div>
            <Progress 
              value={contactsUsage.limit === -1 ? 0 : (contactsUsage.current / contactsUsage.limit) * 100} 
            />
          </div>

          {/* Other limits */}
          {limits && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Max Users</p>
                <p className="text-2xl font-bold">
                  {limits.maxUsers === -1 ? '∞' : limits.maxUsers}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp Sessions</p>
                <p className="text-2xl font-bold">
                  {limits.maxWhatsAppSessions === -1 ? '∞' : limits.maxWhatsAppSessions}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Broadcasts/Month</p>
                <p className="text-2xl font-bold">
                  {limits.maxBroadcastsPerMonth === -1 ? '∞' : limits.maxBroadcastsPerMonth}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const planLimits = PLAN_LIMITS[plan];
          const isCurrent = subscription.plan === plan;

          return (
            <Card key={plan} className={isCurrent ? 'border-primary' : ''}>
              <CardHeader>
                <CardTitle className="capitalize">{plan}</CardTitle>
                <CardDescription>
                  {isCurrent && <Badge>Current Plan</Badge>}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>
                    {planLimits.maxUsers === -1 ? 'Unlimited' : planLimits.maxUsers} users
                  </li>
                  <li>
                    {planLimits.maxWhatsAppSessions === -1 ? 'Unlimited' : planLimits.maxWhatsAppSessions} sessions
                  </li>
                  <li>
                    {planLimits.maxMessagesPerMonth === -1 ? 'Unlimited' : `${planLimits.maxMessagesPerMonth.toLocaleString()}`} messages/mo
                  </li>
                  <li>
                    {planLimits.maxContacts === -1 ? 'Unlimited' : planLimits.maxContacts.toLocaleString()} contacts
                  </li>
                </ul>
                
                {!isCurrent && (
                  <Button className="w-full mt-4" variant="outline">
                    {plans.indexOf(plan) > plans.indexOf(subscription.plan) ? 'Upgrade' : 'Downgrade'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
