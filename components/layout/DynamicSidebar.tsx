// components/layout/DynamicSidebar.tsx
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
  Contact,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/lib/rbac'

interface DynamicSidebarProps {
  userRole?: string
}

interface MenuItem {
  icon: any
  label: string
  href: string
  permission?: string
  requireAny?: string[]
}

export default function DynamicSidebar({ userRole }: DynamicSidebarProps) {
  const pathname = usePathname()
  const { hasPermission, loading } = usePermissions()

  // Define all possible menu items with their required permissions
  const allMenuItems: MenuItem[] = [
    { 
      icon: LayoutDashboard, 
      label: 'Dashboard', 
      href: '/dashboard'
    },
    { 
      icon: QrCode, 
      label: 'WhatsApp', 
      href: '/whatsapp'
      // Removed permission requirement - accessible to all
    },
    { 
      icon: MessageSquare, 
      label: 'Chats', 
      href: '/chats',
      permission: 'chat.view'
    },
    { 
      icon: Contact, 
      label: 'Contacts', 
      href: '/contacts',
      permission: 'contact.view'
    },
    { 
      icon: Ticket, 
      label: 'Tickets', 
      href: '/tickets',
      permission: 'ticket.view'
    },
    { 
      icon: Bot, 
      label: 'Chatbots', 
      href: '/chatbots',
      permission: 'chatbot.manage'
    },
    { 
      icon: Radio, 
      label: 'Broadcasts', 
      href: '/broadcasts',
      permission: 'broadcast.manage'
    },
    { 
      icon: UserCog, 
      label: 'Agents', 
      href: '/agents',
      permission: 'agent.view'
    },
    { 
      icon: BarChart3, 
      label: 'Analytics', 
      href: '/analytics',
      permission: 'analytics.view'
    },
    { 
      icon: Zap, 
      label: 'Quick Replies', 
      href: '/quick-replies',
      permission: 'settings.manage' // Only owner can manage quick replies
    },
    { 
      icon: ArrowRightLeft, 
      label: 'Handover Reports', 
      href: '/reports/handovers',
      requireAny: ['report.view', 'handover.view']
    },
    { 
      icon: Shield, 
      label: 'Role Management', 
      href: '/admin/roles',
      permission: 'role.view'
    },
    { 
      icon: Sliders, 
      label: 'System Settings', 
      href: '/admin/settings',
      permission: 'settings.manage'
    },
    { 
      icon: Settings, 
      label: 'Settings', 
      href: '/settings'
    },
  ]

  // Filter menu items based on permissions
  const visibleMenuItems = allMenuItems.filter(item => {
    // No permission required - always show
    if (!item.permission && !item.requireAny) return true
    
    // Loading - hide permission-based items
    if (loading) return false
    
    // Check single permission
    if (item.permission) return hasPermission(item.permission)
    
    // Check any of multiple permissions
    if (item.requireAny) {
      return item.requireAny.some(perm => hasPermission(perm))
    }
    
    return false
  })

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
            <p className="text-xs text-gray-500 capitalize">{userRole || 'User'}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
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
