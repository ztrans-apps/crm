'use client'

import { ArrowUp, ArrowDown, Minus, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: number | string
  trend: 'up' | 'down' | 'stable'
  change: number
  status?: 'good' | 'warning' | 'critical'
  icon: LucideIcon
  suffix?: string
  subtitle?: string
}

export function KPICard({
  title,
  value,
  trend,
  change,
  status = 'good',
  icon: Icon,
  suffix = '',
  subtitle
}: KPICardProps) {
  const statusColors = {
    good: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
    critical: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
  }

  const iconColors = {
    good: 'text-vx-teal',
    warning: 'text-yellow-600 dark:text-yellow-400',
    critical: 'text-red-600 dark:text-red-400'
  }

  const trendColors = {
    up: 'text-vx-teal',
    down: 'text-red-600 dark:text-red-400',
    stable: 'text-vx-text-secondary'
  }

  const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-all hover:shadow-md',
      statusColors[status]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-vx-text-secondary">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-vx-text">
              {value}{suffix}
            </h3>
            <div className={cn('flex items-center text-sm font-medium', trendColors[trend])}>
              <TrendIcon className="h-4 w-4" />
              <span className="ml-1">{change}%</span>
            </div>
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-vx-text-muted">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn('rounded-full p-2', iconColors[status])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
