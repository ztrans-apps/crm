// app/owner/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function OwnerLayout({
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

  // Only redirect if explicitly agent, otherwise allow (for owner or null)
  if (profile && (profile as any).role === 'agent') {
    redirect('/agent/dashboard')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="owner" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={{ ...user, ...profile }} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
