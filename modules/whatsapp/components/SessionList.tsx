'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, Smartphone, RefreshCw, Trash2, Plus, Phone, Edit, ExternalLink, Cloud } from 'lucide-react';

interface WhatsAppNumber {
  id: string;
  phone_number: string | null;
  session_name: string | null;
  status: 'connected' | 'disconnected' | 'connecting';
  meta_phone_number_id?: string | null;
  meta_verified_name?: string | null;
  meta_quality_rating?: string | null;
  created_at: string;
  last_activity: string | null;
}

interface SessionListProps {
  onAddNumber?: () => void;
  onEdit?: (sessionId: string) => void;
  onDelete?: (sessionId: string) => void;
  onRefresh?: () => void;
}

export function SessionList({ 
  onAddNumber, 
  onEdit,
  onDelete,
  onRefresh,
}: SessionListProps) {
  const [sessions, setSessions] = useState<WhatsAppNumber[]>([]);
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
    const interval = setInterval(fetchSessions, 30000); // Poll every 30s (Meta API is stable)
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    // With Meta Cloud API, numbers are always "connected" via Meta's infrastructure
    return (
      <Badge className="bg-vx-teal/10 text-vx-teal hover:bg-vx-teal/10">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };

  const getQualityBadge = (rating?: string | null) => {
    if (!rating) return null;
    const colors: Record<string, string> = {
      GREEN: 'bg-vx-teal/10 text-vx-teal',
      YELLOW: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      RED: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    };
    return (
      <Badge className={colors[rating.toUpperCase()] || 'bg-vx-surface-hover text-vx-text-secondary'}>
        {rating}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-12 w-12 text-vx-text-muted animate-spin mx-auto mb-3" />
            <p className="text-vx-text-secondary">Loading WhatsApp numbers...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-vx-surface rounded-lg border overflow-hidden">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-vx-teal/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Cloud className="h-8 w-8 text-vx-teal" />
          </div>
          <h3 className="text-lg font-semibold text-vx-text mb-2">
            No WhatsApp Numbers Registered
          </h3>
          <p className="text-vx-text-secondary mb-2 max-w-lg mx-auto">
            Register your WhatsApp Business number from the Meta Developer Console to start messaging.
          </p>
          <p className="text-sm text-vx-text-muted mb-6 max-w-lg mx-auto">
            With Meta Cloud API, no QR code scanning needed — numbers connect automatically via Meta&apos;s infrastructure.
          </p>
          {onAddNumber && (
            <Button onClick={onAddNumber} size="lg" className="bg-vx-teal hover:bg-vx-teal/90">
              <Plus className="h-4 w-4 mr-2" />
              Register WhatsApp Number
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-vx-surface rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-vx-surface-elevated border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                Phone Number
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                Label
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                Quality
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                Added
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vx-border">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-vx-surface-hover transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="shrink-0 h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Phone className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-vx-text">
                        {session.phone_number ? `+${session.phone_number.replace(/^\+/, '')}` : '-'}
                      </div>
                      {session.meta_verified_name && (
                        <div className="text-xs text-vx-text-muted">
                          {session.meta_verified_name}
                        </div>
                      )}
                      {!session.meta_verified_name && session.meta_phone_number_id && (
                        <div className="text-xs text-vx-text-muted">
                          ID: {session.meta_phone_number_id}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-vx-text">
                    {session.session_name || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(session.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getQualityBadge(session.meta_quality_rating) || (
                    <span className="text-sm text-vx-text-muted">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-vx-text-muted">
                  {formatTimestamp(session.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(session.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-vx-border rounded-md text-sm font-medium text-vx-text-secondary bg-vx-surface hover:bg-vx-surface-hover transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                    <a
                      href={`https://business.facebook.com/wa/manage/phone-numbers/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 border border-vx-purple/30 rounded-md text-sm font-medium text-vx-purple bg-vx-surface hover:bg-vx-purple/5 transition-colors"
                      title="Manage on Meta"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(session.id)}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-500/30 rounded-md text-sm font-medium text-red-600 dark:text-red-400 bg-vx-surface hover:bg-red-50 dark:hover:bg-red-500/5 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 border-t bg-vx-surface-elevated flex justify-between items-center">
        <div className="text-sm text-vx-text-secondary">
          {sessions.length} number(s) registered
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchSessions();
            onRefresh?.();
          }}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
