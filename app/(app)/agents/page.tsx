// app/owner/agents/page.tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Activity } from 'lucide-react'
import AgentListTab from './components/AgentListTab'
import AgentStatusTab from './components/AgentStatusTab'

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Management</h1>
        <p className="text-gray-600">Manage agents and monitor their status</p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Agent List
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Agent Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <AgentListTab />
        </TabsContent>

        <TabsContent value="status" className="mt-6">
          <AgentStatusTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
