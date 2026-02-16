'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle, CheckCircle2, Loader2, XCircle, LogOut, Phone } from 'lucide-react';
import { useSessionStates } from '../hooks/useSessionStates';

interface SessionMonitorProps {
  refreshInterval?: number; // milliseconds
}

export function SessionMonitor({ refreshInterval = 5000 }: SessionMonitorProps) {
  const { states, loading, error } = useSessionStates({ refreshInterval, includeDetails: true });

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'CONNECTED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'CONNECTING':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'DISCONNECTED':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'LOGGED_OUT':
        return <LogOut className="h-4 w-4 text-gray-600" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'CONNECTED':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Connected</Badge>;
      case 'CONNECTING':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Connecting</Badge>;
      case 'DISCONNECTED':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Disconnected</Badge>;
      case 'LOGGED_OUT':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Logged Out</Badge>;
      case 'ERROR':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'CONNECTED':
        return 'border-green-200 bg-green-50';
      case 'CONNECTING':
        return 'border-blue-200 bg-blue-50';
      case 'DISCONNECTED':
        return 'border-yellow-200 bg-yellow-50';
      case 'LOGGED_OUT':
        return 'border-gray-200 bg-gray-50';
      case 'ERROR':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200';
    }
  };

  const getStateMessage = (state: string, errorCount: number) => {
    switch (state) {
      case 'CONNECTED':
        return 'Session is active and ready to send/receive messages';
      case 'CONNECTING':
        return 'Establishing connection to WhatsApp servers...';
      case 'DISCONNECTED':
        return 'Connection lost. Auto-reconnect in progress with exponential backoff';
      case 'LOGGED_OUT':
        return 'Session logged out. Please scan QR code to reconnect';
      case 'ERROR':
        if (errorCount > 5) {
          return 'Multiple errors detected. Check logs or restart session';
        }
        return 'Connection error. Attempting to recover...';
      default:
        return 'Unknown state';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleString();
    }
  };

  const getSummary = () => {
    const summary = {
      total: states.length,
      connected: states.filter(s => s.state === 'CONNECTED').length,
      connecting: states.filter(s => s.state === 'CONNECTING').length,
      disconnected: states.filter(s => s.state === 'DISCONNECTED').length,
      loggedOut: states.filter(s => s.state === 'LOGGED_OUT').length,
      error: states.filter(s => s.state === 'ERROR').length,
    };
    return summary;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Session Monitor
          </CardTitle>
          <CardDescription>Real-time connection status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Session Monitor
          </CardTitle>
          <CardDescription>Real-time connection status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Failed to Load Sessions</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <p className="text-xs text-red-600 mt-2">Check if database is accessible</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = getSummary();

  // Check if we have real-time data from WhatsApp service
  const hasRealtimeData = states.some(s => s.metadata?.fromService !== false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Session Monitor
        </CardTitle>
        <CardDescription>
          Real-time connection status • Updates every {refreshInterval / 1000}s
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning if WhatsApp service not available */}
        {!hasRealtimeData && states.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-900">Limited Monitoring</p>
              <p className="text-yellow-700 text-xs mt-0.5">
                WhatsApp service not available. Showing database status only. Start service for real-time monitoring.
              </p>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
            <div className="text-xs text-gray-600 mt-1">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{summary.connected}</div>
            <div className="text-xs text-green-600 mt-1">Connected</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{summary.connecting}</div>
            <div className="text-xs text-blue-600 mt-1">Connecting</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700">{summary.disconnected}</div>
            <div className="text-xs text-yellow-600 mt-1">Disconnected</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-700">{summary.loggedOut}</div>
            <div className="text-xs text-gray-600 mt-1">Logged Out</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{summary.error}</div>
            <div className="text-xs text-red-600 mt-1">Error</div>
          </div>
        </div>

        {/* Session List */}
        {states.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active sessions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {states.map((session) => (
              <div
                key={session.sessionId}
                className={`border rounded-lg p-4 transition-colors ${getStateColor(session.state)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getStateIcon(session.state)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {session.phoneNumber && (
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                            <Phone className="h-3.5 w-3.5" />
                            {session.phoneNumber}
                          </div>
                        )}
                        {session.name && (
                          <span className="text-sm text-gray-600">
                            ({session.name})
                          </span>
                        )}
                        {getStateBadge(session.state)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                        <span className="font-mono truncate">{session.sessionId}</span>
                        <span>Updated: {formatTimestamp(session.lastUpdate)}</span>
                        {session.errorCount > 0 && (
                          <span className="text-red-600 font-medium">
                            Errors: {session.errorCount}
                          </span>
                        )}
                        {session.state === 'DISCONNECTED' && (
                          <span className="text-yellow-600 font-medium flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Auto-reconnecting...
                          </span>
                        )}
                      </div>
                      {/* State Message */}
                      <p className="text-xs text-gray-500 mt-1 italic">
                        {getStateMessage(session.state, session.errorCount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
