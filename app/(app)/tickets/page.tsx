// app/(app)/tickets/page.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Ticket, Plus } from 'lucide-react'
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard'

export default function TicketsPage() {
  return (
    <PermissionGuard permission={['ticket.view']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tickets</h1>
            <p className="text-vx-text-secondary">Manage support tickets</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Ticket
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Ticket List
            </CardTitle>
            <CardDescription>
              All support tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-vx-text-muted">
              <Ticket className="h-12 w-12 mb-4 opacity-20" />
              <p>No tickets yet</p>
              <p className="text-sm">Create your first ticket to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
