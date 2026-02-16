// app/(app)/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Users, Ticket, TrendingUp } from 'lucide-react'
import { usePermissions } from '@/lib/rbac'

interface DashboardStats {
  totalConversations: number
  totalContacts: number
  openTickets: number
  messagesToday: number
  activeChats?: number
  resolvedToday?: number
  pendingChats?: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    totalContacts: 0,
    openTickets: 0,
    messagesToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const { hasPermission } = usePermissions()

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const supabase = createClient()
      
      // Get current user and role
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setUserRole((profile as any)?.role || '')

      // Load stats based on role
      const isAgent = (profile as any)?.role === 'agent'

      // Total conversations (filtered by agent if applicable)
      let conversationsQuery = supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })

      if (isAgent) {
        conversationsQuery = conversationsQuery.eq('assigned_agent_id', user.id)
      }

      const { count: totalConversations } = await conversationsQuery

      // Total contacts
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })

      // Open tickets (filtered by agent if applicable)
      let ticketsQuery = supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'closed')

      if (isAgent) {
        ticketsQuery = ticketsQuery.eq('assigned_to', user.id)
      }

      const { count: openTickets } = await ticketsQuery

      // Messages today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count: messagesToday } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())

      // Agent-specific stats
      let agentStats = {}
      if (isAgent) {
        const { count: activeChats } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_agent_id', user.id)
          .eq('status', 'active')

        const { count: resolvedToday } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_agent_id', user.id)
          .eq('workflow_status', 'done')
          .gte('closed_at', today.toISOString())

        const { count: pendingChats } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_agent_id', user.id)
          .in('workflow_status', ['incoming', 'waiting'])

        agentStats = { activeChats, resolvedToday, pendingChats }
      }

      setStats({
        totalConversations: totalConversations || 0,
        totalContacts: totalContacts || 0,
        openTickets: openTickets || 0,
        messagesToday: messagesToday || 0,
        ...agentStats,
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const isAgent = userRole === 'agent'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">
          {isAgent ? 'Welcome back! Here\'s your overview.' : 'Welcome back! Here\'s your overview.'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAgent ? 'My Conversations' : 'Total Conversations'}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              {isAgent ? 'Assigned to you' : 'All conversations'}
            </p>
          </CardContent>
        </Card>

        {hasPermission('contact.view') && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalContacts}</div>
              <p className="text-xs text-muted-foreground">In database</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isAgent ? 'My Open Tickets' : 'Open Tickets'}
            </CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openTickets}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesToday}</div>
            <p className="text-xs text-muted-foreground">Since midnight</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent-specific stats */}
      {isAgent && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeChats || 0}</div>
              <p className="text-xs text-muted-foreground">Currently handling</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolvedToday || 0}</div>
              <p className="text-xs text-muted-foreground">Completed conversations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.pendingChats || 0}</div>
              <p className="text-xs text-muted-foreground">Waiting for response</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hasPermission('chat.view') && (
              <a
                href="/chats"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer"
              >
                <MessageSquare className="h-8 w-8 text-green-600 mb-2" />
                <span className="font-medium">View Chats</span>
                <span className="text-sm text-gray-500">Manage conversations</span>
              </a>
            )}

            {hasPermission('contact.view') && (
              <a
                href="/contacts"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <span className="font-medium">Contacts</span>
                <span className="text-sm text-gray-500">Manage your contacts</span>
              </a>
            )}

            {hasPermission('broadcast.manage') && (
              <a
                href="/broadcasts"
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                <span className="font-medium">Broadcast</span>
                <span className="text-sm text-gray-500">Send bulk messages</span>
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity - placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>No recent activity</p>
            <p className="text-sm">Start a conversation to see activity here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
