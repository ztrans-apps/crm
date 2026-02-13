// app/(app)/contacts/page.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard'

export default function ContactsPage() {
  return (
    <PermissionGuard permission={['contact.view']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-gray-600">Manage your contacts</p>
          </div>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contact List
            </CardTitle>
            <CardDescription>
              All your WhatsApp contacts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Users className="h-12 w-12 mb-4 opacity-20" />
              <p>No contacts yet</p>
              <p className="text-sm">Add your first contact to get started</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
