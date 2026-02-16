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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Agent Status Manager - only for agents */}
      {(profile as any)?.role === 'agent' && (
        <AgentStatusManager userId={user.id} role={(profile as any)?.role} />
      )}
      
      {/* Dynamic Sidebar based on permissions */}
      <DynamicSidebar userRole={(profile as any)?.role} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={{ ...user, ...(profile || {}) }} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
