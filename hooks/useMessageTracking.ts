/**
 * useMessageTracking - Supabase Realtime based (Vercel-compatible)
 * 
 * Listens for message status updates via Supabase Realtime
 * instead of Socket.IO (no persistent WebSocket server needed).
 */

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface MessageStatusUpdate {
  sessionId: string;
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

interface UseMessageTrackingOptions {
  enabled?: boolean;
  onStatusUpdate: (data: MessageStatusUpdate) => void;
}

export function useMessageTracking(options: UseMessageTrackingOptions) {
  const { enabled = true, onStatusUpdate } = options;
  const supabase = createClient();
  const isSubscribed = useRef(false);

  const handleStatusUpdate = useCallback((data: MessageStatusUpdate) => {
    onStatusUpdate(data);
  }, [onStatusUpdate]);

  useEffect(() => {
    if (!enabled || isSubscribed.current) {
      return;
    }

    isSubscribed.current = true;

    // Listen for message status changes via Supabase Realtime
    const channel = supabase
      .channel('message-status-tracking')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;

          // Only fire when delivery_status actually changed
          if (newRecord.delivery_status !== oldRecord.delivery_status) {
            handleStatusUpdate({
              sessionId: '',
              messageId: newRecord.id || newRecord.whatsapp_message_id || '',
              status: newRecord.delivery_status,
              timestamp: newRecord.updated_at || new Date().toISOString(),
            });
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed.current = false;
      channel.unsubscribe();
    };
  }, [enabled, handleStatusUpdate, supabase]);

  return {
    isConnected: true, // Supabase Realtime is always available
  };
}
