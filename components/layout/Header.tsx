// components/layout/Header.tsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bell, LogOut, Settings, User, Menu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import { useSidebarStore } from '@/lib/stores/sidebar-store'

interface HeaderProps {
  user: {
    email?: string
    full_name?: string
    avatar_url?: string | null
  }
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter()
  const { setMobileOpen } = useSidebarStore()

  const handleLogout = async () => {
    const supabase = createClient()
    
    // Get current user before signing out
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Get user profile to check agent_status
      const { data: profile } = await supabase
        .from('profiles')
        .select('agent_status')
        .eq('id', user.id)
        .single()
      
      const profileData = profile as any
      // Update agent status to 'offline' for any user with agent_status set
      if (profileData?.agent_status && profileData.agent_status !== 'offline') {
        await supabase
          .from('profiles')
          // @ts-ignore - Supabase type issue
          .update({ 
            agent_status: 'offline',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)
      }
    }
    
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U'

  return (
    <header className="bg-vx-surface border-b border-vx-border px-4 md:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-vx-text-secondary hover:text-vx-purple hover:bg-vx-surface-hover"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative h-9 w-9 text-vx-text-secondary hover:text-vx-purple hover:bg-vx-surface-hover">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-vx-teal rounded-full animate-pulse"></span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 h-9 px-2 hover:bg-vx-surface-hover">
                <Avatar className="h-7 w-7 border-2 border-vx-purple/20">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-vx-purple/10 text-vx-purple text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium text-vx-text leading-tight">{user.full_name || 'User'}</p>
                  <p className="text-[11px] text-vx-text-muted leading-tight">{user.email}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-vx-surface border-vx-border vx-shadow-md">
              <DropdownMenuLabel className="text-vx-text">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-vx-border" />
              <DropdownMenuItem className="text-vx-text-secondary hover:text-vx-text hover:bg-vx-surface-hover">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-vx-text-secondary hover:text-vx-text hover:bg-vx-surface-hover">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-vx-border" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
