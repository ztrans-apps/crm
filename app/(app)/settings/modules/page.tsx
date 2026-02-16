'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSubscription } from '@/core/billing';

interface Module {
  name: string;
  version: string;
  description?: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export default function ModulesPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscription, limits } = useSubscription(''); // Get from context

  useEffect(() => {
    async function fetchModules() {
      try {
        const response = await fetch('/api/modules');
        if (response.ok) {
          const data = await response.json();
          setModules(data.modules);
        }
      } catch (error) {
        console.error('Failed to fetch modules:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchModules();
  }, []);

  if (loading) {
    return <div>Loading modules...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Modules</h1>
        <p className="text-muted-foreground">
          Manage your enabled modules and features
        </p>
      </div>

      {subscription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              Your subscription plan and available features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="default" className="text-lg">
                  {subscription.plan.toUpperCase()}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Status: {subscription.status}
                </p>
              </div>
              <Button variant="outline">Upgrade Plan</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{module.name}</CardTitle>
                <Switch checked={module.enabled} disabled />
              </div>
              <CardDescription>v{module.version}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {module.description || 'No description available'}
              </p>
              
              {module.enabled ? (
                <Badge variant="default">Enabled</Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {modules.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No modules available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
