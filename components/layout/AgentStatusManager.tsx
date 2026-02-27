// components/layout/AgentStatusManager.tsx
'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AgentStatusManagerProps {
  userId: string
  role: string
}

export default function AgentStatusManager({ userId, role }: AgentStatusManagerProps) {
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Dynamic: check permission instead of hardcoded role
    // Component should work for any user with agent capabilities
    // The parent layout already gates rendering based on permissions
    if (!userId) return

    const supabase = createClient()

    const setInitialStatus = async () => {
      try {
        await fetch('/api/agent-status/set-available', {
          method: 'POST',
        })
      } catch (err) {
        // Silent fail
      }
    }

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/agent-status/heartbeat', {
          method: 'POST',
        })
      } catch (error) {
        // Silent fail
      }
    }

    setInitialStatus()
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000)

    const handleBeforeUnload = async () => {
      const data = JSON.stringify({
        userId,
        status: 'offline',
        timestamp: new Date().toISOString()
      })
      navigator.sendBeacon('/api/agent-status/offline', data)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      supabase
        .from('profiles')
        // @ts-ignore - Supabase type issue
        .update({ 
          agent_status: 'offline',
          last_activity: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    }
  }, [userId, role])

  return null
}
