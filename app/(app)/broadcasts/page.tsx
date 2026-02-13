// app/(app)/broadcasts/page.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Radio, Plus } from 'lucide-react'
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard'

export default function BroadcastsPage() {
  return (
    <PermissionGuard permission={['broadcast.view']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Broadcasts</h1>
            <p className="text-gray-600">Send bulk messages to contacts</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Broadcast
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Broadcast History
            </CardTitle>
            <CardDescription>
              All broadcast campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Radio className="h-12 w-12 mb-4 opacity-20" />
              <p>No broadcasts sent</p>
              <p className="text-sm">Create your first broadcast campaign</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
