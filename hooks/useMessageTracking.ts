import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleStatusUpdate = useCallback((data: MessageStatusUpdate) => {
    onStatusUpdate(data);
  }, [onStatusUpdate]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const whatsappServiceUrl = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL || 'http://localhost:3001';
    
    // Create socket connection
    const socket = io(whatsappServiceUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      // Clear any pending reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    socket.on('disconnect', (reason) => {
      // Auto-reconnect after 2 seconds if not intentional disconnect
      if (reason === 'io server disconnect') {
        // Server disconnected, manually reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          socket.connect();
        }, 2000);
      }
    });

    socket.on('message_status_update', handleStatusUpdate);

    socket.on('connect_error', (error) => {
      console.error('❌ [useMessageTracking] Connection error:', error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      // Reconnected successfully
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      // Attempting to reconnect
    });

    socket.on('reconnect_error', (error) => {
      console.error('❌ [useMessageTracking] Reconnect error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ [useMessageTracking] Reconnect failed after all attempts');
    });

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      socket.off('message_status_update', handleStatusUpdate);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, handleStatusUpdate]);

  return {
    isConnected: socketRef.current?.connected || false,
  };
}
