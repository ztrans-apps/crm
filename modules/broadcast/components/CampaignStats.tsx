'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Users, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

interface CampaignStatsProps {
  stats: {
    total_campaigns: number;
    total_sent: number;
    total_delivered: number;
    total_failed: number;
    pending: number;
    success_rate: number;
  };
}

export function CampaignStats({ stats }: CampaignStatsProps) {
  const statCards = [
    {
      title: 'Total Campaigns',
      value: stats.total_campaigns,
      icon: Send,
      color: 'text-vx-purple',
      bgColor: 'bg-vx-purple/10',
    },
    {
      title: 'Messages Sent',
      value: stats.total_sent,
      icon: Users,
      color: 'text-vx-purple',
      bgColor: 'bg-vx-purple/10',
    },
    {
      title: 'Delivered',
      value: stats.total_delivered,
      icon: CheckCircle,
      color: 'text-vx-teal',
      bgColor: 'bg-vx-teal/10',
    },
    {
      title: 'Failed',
      value: stats.total_failed,
      icon: XCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-500/10',
    },
    {
      title: 'Pending',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-500/10',
    },
    {
      title: 'Success Rate',
      value: `${stats.success_rate}%`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-vx-text-secondary">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-vx-text">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
