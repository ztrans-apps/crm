'use client'

import { KPIStrip } from './components/KPIStrip'
import { ConversationEffectiveness } from './components/ConversationEffectiveness'
import { WhatsAppPerformance } from './components/WhatsAppPerformance'
import { CustomerLoad } from './components/CustomerLoad'
import { AgentProductivity } from './components/AgentProductivity'
import { AutomationImpact } from './components/AutomationImpact'
import { BusinessImpact } from './components/BusinessImpact'
import { DateRangePicker } from './components/DateRangePicker'
import { useState } from 'react'

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today')
  const [customDates, setCustomDates] = useState<{ start?: Date; end?: Date }>({})

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-vx-text">
            Dashboard Efektivitas CRM
          </h1>
          <p className="mt-1 text-sm text-vx-text-secondary">
            Pantau performa tim, sistem, dan dampak bisnis secara real-time
          </p>
        </div>
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          customDates={customDates}
          onCustomDatesChange={setCustomDates}
        />
      </div>

      {/* KPI Strip */}
      <section>
        <KPIStrip />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversation Effectiveness */}
        <section className="lg:col-span-2">
          <ConversationEffectiveness dateRange={dateRange} customDates={customDates} />
        </section>

        {/* WhatsApp Performance */}
        <section>
          <WhatsAppPerformance />
        </section>

        {/* Customer Load */}
        <section>
          <CustomerLoad />
        </section>

        {/* Agent Productivity */}
        <section className="lg:col-span-2">
          <AgentProductivity dateRange={dateRange} />
        </section>

        {/* Automation Impact */}
        <section>
          <AutomationImpact />
        </section>

        {/* Business Impact */}
        <section>
          <BusinessImpact />
        </section>
      </div>
    </div>
  )
}
