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
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/lib/rbac'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import { VoxentraLogo } from './VoxentraLogo'
import { useEffect } from 'react'

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
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useSidebarStore()

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, setMobileOpen])

  // Close mobile sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [setMobileOpen])

  // Define all possible menu items with their required permissions
  const allMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: QrCode, label: 'WhatsApp', href: '/whatsapp' },
    { icon: MessageSquare, label: 'Chats', href: '/chats', permission: 'chat.view' },
    { icon: Contact, label: 'Contacts', href: '/contacts', permission: 'contact.view' },
    { icon: Ticket, label: 'Tickets', href: '/tickets', permission: 'ticket.view' },
    { icon: Bot, label: 'Chatbots', href: '/chatbots', permission: 'chatbot.manage' },
    { icon: Radio, label: 'Broadcasts', href: '/broadcasts', permission: 'broadcast.manage' },
    { icon: UserCog, label: 'Users', href: '/users', permission: 'agent.view' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics', permission: 'analytics.view' },
    { icon: Zap, label: 'Quick Replies', href: '/quick-replies', permission: 'settings.manage' },
    { icon: ArrowRightLeft, label: 'Handover Reports', href: '/reports/handovers', requireAny: ['report.view', 'handover.view'] },
    { icon: Shield, label: 'Role Management', href: '/admin/roles', permission: 'role.view' },
    { icon: Sliders, label: 'System Settings', href: '/admin/settings', permission: 'settings.manage' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ]

  // Filter menu items based on permissions
  const visibleMenuItems = allMenuItems.filter(item => {
    if (!item.permission && !item.requireAny) return true
    if (loading) return false
    if (item.permission) return hasPermission(item.permission)
    if (item.requireAny) return item.requireAny.some(perm => hasPermission(perm))
    return false
  })

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn(
        'border-b border-vx-border flex items-center',
        collapsed ? 'p-3 justify-center' : 'p-4'
      )}>
        <VoxentraLogo collapsed={collapsed} />
        {!collapsed && (
          <p className="text-[10px] text-vx-text-muted capitalize ml-auto bg-vx-surface-elevated px-2 py-0.5 rounded-full">
            {userRole || 'User'}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn(
        'flex-1 overflow-y-auto vx-scrollbar',
        collapsed ? 'p-2 space-y-1' : 'p-3 space-y-0.5'
      )}>
        {visibleMenuItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center rounded-xl transition-all duration-200',
                collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-vx-purple/10 text-vx-purple font-medium'
                  : 'text-vx-text-secondary hover:bg-vx-surface-hover hover:text-vx-text'
              )}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full vx-gradient" />
              )}
              
              <Icon className={cn(
                'flex-shrink-0 transition-colors duration-200',
                collapsed ? 'h-5 w-5' : 'h-[18px] w-[18px]',
                isActive ? 'text-vx-purple' : 'text-vx-text-muted group-hover:text-vx-purple'
              )} />
              
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-vx-surface-elevated border border-vx-border rounded-lg text-xs font-medium text-vx-text whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 vx-shadow-md pointer-events-none">
                  {item.label}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-vx-surface-elevated border-l border-b border-vx-border rotate-45" />
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle & Footer */}
      <div className="border-t border-vx-border">
        {/* Collapse toggle button */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            'w-full flex items-center text-vx-text-muted hover:text-vx-purple hover:bg-vx-surface-hover transition-all duration-200',
            collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>

        {/* Footer */}
        {!collapsed && (
          <div className="px-4 pb-3">
            <div className="text-[10px] text-vx-text-muted text-center">
              <p className="vx-gradient-text font-semibold">Voxentra v1.0</p>
              <p className="mt-0.5">&copy; 2026 All rights reserved</p>
            </div>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col bg-vx-surface border-r border-vx-border transition-all duration-300 ease-in-out h-screen',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-vx-surface border-r border-vx-border transition-transform duration-300 ease-in-out md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-vx-text-muted hover:bg-vx-surface-hover hover:text-vx-text transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        {sidebarContent}
      </aside>
    </>
  )
}
