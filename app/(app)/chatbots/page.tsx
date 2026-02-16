// app/(app)/chatbots/page.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bot, Plus } from 'lucide-react'
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard'

export default function ChatbotsPage() {
  return (
    <PermissionGuard permission={['chatbot.view']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Chatbots</h1>
            <p className="text-gray-600">Manage automated chatbots</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Chatbot
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Chatbot List
            </CardTitle>
            <CardDescription>
              Automated conversation flows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bot className="h-12 w-12 mb-4 opacity-20" />
              <p>No chatbots configured</p>
              <p className="text-sm">Create your first chatbot to automate responses</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
