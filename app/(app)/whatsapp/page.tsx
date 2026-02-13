// app/(app)/whatsapp/page.tsx
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QrCode } from 'lucide-react'
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard'

export default function WhatsAppPage() {
  return (
    <PermissionGuard permission={['whatsapp.view']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Connection</h1>
          <p className="text-gray-600">Manage your WhatsApp connection</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Connection Status
            </CardTitle>
            <CardDescription>
              Scan QR code to connect your WhatsApp account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-64 h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">QR Code will appear here</p>
              </div>
              <p className="mt-4 text-sm text-gray-600">
                Open WhatsApp on your phone and scan this code
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PermissionGuard>
  )
}
