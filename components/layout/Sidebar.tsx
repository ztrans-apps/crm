// components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Ticket, 
  Bot, 
  Radio,
  UserCog,
  Settings,
  QrCode,
  BarChart3,
  ArrowRightLeft,
  Shield,
  Sliders,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/lib/rbac'

interface SidebarProps {
  role: 'owner' | 'agent'
}

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const { hasPermission, loading } = usePermissions()

  const ownerMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/owner/dashboard' },
    { icon: QrCode, label: 'WhatsApp', href: '/owner/whatsapp' },
    { icon: MessageSquare, label: 'Chats', href: '/chats' },
    { icon: Users, label: 'Contacts', href: '/owner/contacts' },
    { icon: Ticket, label: 'Tickets', href: '/owner/tickets' },
    { icon: Bot, label: 'Chatbots', href: '/owner/chatbots' },
    { icon: Radio, label: 'Broadcasts', href: '/owner/broadcasts' },
    { icon: UserCog, label: 'Agents', href: '/owner/agents' },
    { icon: BarChart3, label: 'Analytics', href: '/owner/analytics' },
    { icon: ArrowRightLeft, label: 'Handover Reports', href: '/reports/handovers' },
    // Admin section - only show if user has permission
    ...(!loading && hasPermission('role.view') ? [
      { icon: Shield, label: 'Role Management', href: '/admin/roles' },
      { icon: Sliders, label: 'System Settings', href: '/admin/settings' },
    ] : []),
    { icon: Settings, label: 'Settings', href: '/owner/settings' },
  ]

  const agentMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/agent/dashboard' },
    { icon: MessageSquare, label: 'My Chats', href: '/chats' },
    { icon: Ticket, label: 'My Tickets', href: '/agent/tickets' },
    { icon: ArrowRightLeft, label: 'My Handovers', href: '/reports/handovers' },
    { icon: Settings, label: 'Settings', href: '/agent/settings' },
  ]

  const menuItems = role === 'owner' ? ownerMenuItems : agentMenuItems

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-green-500 p-2 rounded-lg">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">WhatsApp CRM</h1>
            <p className="text-xs text-gray-500 capitalize">{role} Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-green-50 text-green-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>WhatsApp CRM v1.0</p>
          <p className="mt-1">© 2026 All rights reserved</p>
        </div>
      </div>
    </div>
  )
}
