// app/agent/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function AgentLayout({
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
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  // Only redirect if explicitly owner, otherwise allow (for agent or null)
  if (profile && (profile as any).role === 'owner') {
    redirect('/owner/dashboard')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="agent" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={{ email: user.email, full_name: (profile as any)?.full_name }} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
