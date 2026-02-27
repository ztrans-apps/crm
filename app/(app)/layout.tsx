// app/(app)/layout.tsx
// Universal layout for all authenticated users
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DynamicSidebar from '@/components/layout/DynamicSidebar'
import Header from '@/components/layout/Header'
import AgentStatusManager from '@/components/layout/AgentStatusManager'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await (supabase as any).auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  // Dynamic: check if user has agent capability (chat.send permission)
  const { data: permData } = await supabase
    .from('user_roles')
    .select(`
      roles!inner (
        role_permissions!inner (
          permissions!inner (
            permission_key
          )
        )
      )
    `)
    .eq('user_id', user.id)

  const userPermissions = new Set<string>()
  for (const ur of (permData || [])) {
    const role = (ur as any).roles
    if (!role?.role_permissions) continue
    for (const rp of role.role_permissions) {
      if (rp.permissions?.permission_key) {
        userPermissions.add(rp.permissions.permission_key)
      }
    }
  }
  const isAgent = userPermissions.has('chat.send')

  return (
    <div className="flex h-screen bg-background">
      {/* Agent Status Manager - for users with chat.send permission */}
      {isAgent && (
        <AgentStatusManager userId={user.id} role={(profile as any)?.role} />
      )}
      
      {/* Dynamic Sidebar based on permissions */}
      <DynamicSidebar userRole={(profile as any)?.role} />
      
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header user={{ ...user, ...(profile || {}) }} />
        <main className="flex-1 overflow-y-auto bg-vx-surface-elevated">
          {children}
        </main>
      </div>
    </div>
  )
}
