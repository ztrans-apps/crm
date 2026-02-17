'use client';

import { useState, useEffect } from 'react';

export interface SessionState {
  sessionId: string;
  state: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'LOGGED_OUT' | 'ERROR';
  lastUpdate: string;
  errorCount: number;
  metadata?: any;
}

export interface SessionStateWithDetails extends SessionState {
  phoneNumber?: string;
  name?: string;
}

interface UseSessionStatesOptions {
  refreshInterval?: number;
  includeDetails?: boolean;
}

export function useSessionStates({ 
  refreshInterval = 5000, 
  includeDetails = true 
}: UseSessionStatesOptions = {}) {
  const [states, setStates] = useState<SessionStateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStates = async () => {
    try {
      // Fetch session details from database first
      const detailsResponse = await fetch('/api/whatsapp/sessions');
      
      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch sessions');
      }

      const detailsData = await detailsResponse.json();
      const sessions = detailsData.sessions || [];

      // Try to fetch states from WhatsApp service via Next.js proxy
      let sessionStates: SessionStateWithDetails[] = [];
      
      try {
        const statesResponse = await fetch('/api/whatsapp/session-states');
        
        if (statesResponse.ok) {
          const statesData = await statesResponse.json();
          
          // Check if we got real data from service
          if (statesData.success !== false && statesData.states && statesData.states.length > 0) {
            const states = statesData.states || [];

            // Merge state with details
            sessionStates = states.map((state: SessionState) => {
              const details = sessions.find((s: any) => s.id === state.sessionId);
              return {
                ...state,
                phoneNumber: details?.phone_number,
                name: details?.name,
                metadata: { ...state.metadata, fromService: true },
              };
            });
          } else {
            // WhatsApp service not available, use database status only
            sessionStates = sessions.map((session: any) => ({
              sessionId: session.id,
              state: session.status === 'connected' ? 'CONNECTED' : 
                     session.status === 'disconnected' ? 'DISCONNECTED' : 
                     session.status === 'reconnecting' ? 'CONNECTING' : 'DISCONNECTED',
              lastUpdate: session.updated_at || session.created_at,
              errorCount: 0,
              phoneNumber: session.phone_number,
              name: session.name,
              metadata: { ...session.metadata, fromService: false },
            }));
          }
        } else {
          // API error, use database status
          sessionStates = sessions.map((session: any) => ({
            sessionId: session.id,
            state: session.status === 'connected' ? 'CONNECTED' : 
                   session.status === 'disconnected' ? 'DISCONNECTED' : 
                   session.status === 'reconnecting' ? 'CONNECTING' : 'DISCONNECTED',
            lastUpdate: session.updated_at || session.created_at,
            errorCount: 0,
            phoneNumber: session.phone_number,
            name: session.name,
            metadata: { ...session.metadata, fromService: false },
          }));
        }
      } catch (err) {
        console.warn('WhatsApp service not available, using database status:', err);
        // Fallback to database status
        sessionStates = sessions.map((session: any) => ({
          sessionId: session.id,
          state: session.status === 'connected' ? 'CONNECTED' : 
                 session.status === 'disconnected' ? 'DISCONNECTED' : 
                 session.status === 'reconnecting' ? 'CONNECTING' : 'DISCONNECTED',
          lastUpdate: session.updated_at || session.created_at,
          errorCount: 0,
          phoneNumber: session.phone_number,
          name: session.name,
          metadata: { ...session.metadata, fromService: false },
        }));
      }

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
