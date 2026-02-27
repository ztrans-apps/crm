'use client';

import { useState, useEffect } from 'react';

export interface SessionState {
  sessionId: string;
  state: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR';
  lastUpdate: string;
  errorCount: number;
  metadata?: any;
}

export interface SessionStateWithDetails extends SessionState {
  phoneNumber?: string;
  name?: string;
  metaPhoneNumberId?: string;
}

interface UseSessionStatesOptions {
  refreshInterval?: number;
  includeDetails?: boolean;
}

/**
 * Hook to fetch WhatsApp session states from Supabase
 * Uses Meta Cloud API
 */
export function useSessionStates({ 
  refreshInterval = 10000, 
  includeDetails = true 
}: UseSessionStatesOptions = {}) {
  const [states, setStates] = useState<SessionStateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStates = async () => {
    try {
      const response = await fetch('/api/whatsapp/sessions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const data = await response.json();
      const sessions = data.sessions || [];

      // Map database status to session states
      const sessionStates: SessionStateWithDetails[] = sessions.map((session: any) => ({
        sessionId: session.id,
        state: session.status === 'connected' ? 'CONNECTED' : 
               session.status === 'connecting' ? 'CONNECTING' : 
               session.status === 'disconnected' ? 'DISCONNECTED' : 'DISCONNECTED',
        lastUpdate: session.updated_at || session.created_at,
        errorCount: 0,
        phoneNumber: session.phone_number,
        name: session.session_name || session.name,
        metaPhoneNumberId: session.meta_phone_number_id,
        metadata: session.metadata || {},
      }));

      setStates(sessionStates);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching session states:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStates();
    const interval = setInterval(fetchStates, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, includeDetails]);

  return {
    states,
    loading,
    error,
    refresh: fetchStates,
  };
}
