'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Smartphone, RefreshCw, Trash2, Plus } from 'lucide-react';

interface WhatsAppSession {
  id: string;
  phone_number: string | null;
  status: 'connected' | 'disconnected' | 'connecting';
  created_at: string;
  last_activity: string | null;
}

interface SessionListProps {
  onAddSession?: () => void;
  onReconnect?: (sessionId: string) => void;
  onDisconnect?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
}

export function SessionList({ 
  onAddSession, 
  onReconnect, 
  onDisconnect, 
  onDelete 
}: SessionListProps) {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/whatsapp/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Connecting
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Loading sessions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No WhatsApp Numbers Connected
          </h3>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            Connect your first WhatsApp business number to start managing conversations
          </p>
          {onAddSession && (
            <Button onClick={onAddSession} size="lg" className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First WhatsApp Number
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {session.phone_number || 'Connecting...'}
                    </h3>
                    {getStatusBadge(session.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Added {new Date(session.created_at).toLocaleDateString()}
                    {session.last_activity && (
                      <> • Last active {new Date(session.last_activity).toLocaleTimeString()}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {(session.status === 'disconnected' || session.status === 'connecting') && onReconnect && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onReconnect(session.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reconnect
                  </Button>
                )}
                {session.status === 'connected' && onDisconnect && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDisconnect(session.id)}
                    className="border-orange-600 text-orange-600 hover:bg-orange-50"
                  >
                    Disconnect
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(session.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete phone number and session"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={fetchSessions} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>
    </div>
  );
}
