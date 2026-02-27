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
        return <CheckCircle2 className="h-4 w-4 text-vx-teal" />;
      case 'CONNECTING':
        return <Loader2 className="h-4 w-4 text-vx-purple animate-spin" />;
      case 'DISCONNECTED':
        return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'LOGGED_OUT':
        return <LogOut className="h-4 w-4 text-vx-text-secondary" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <Activity className="h-4 w-4 text-vx-text-muted" />;
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'CONNECTED':
        return <Badge className="bg-vx-teal/10 text-vx-teal hover:bg-vx-teal/10">Connected</Badge>;
      case 'CONNECTING':
        return <Badge className="bg-vx-purple/10 text-vx-purple hover:bg-vx-purple/10">Connecting</Badge>;
      case 'DISCONNECTED':
        return <Badge className="bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-500/10">Disconnected</Badge>;
      case 'LOGGED_OUT':
        return <Badge className="bg-vx-surface-hover text-vx-text hover:bg-vx-surface-hover">Logged Out</Badge>;
      case 'ERROR':
        return <Badge className="bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10">Error</Badge>;
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
        return 'border-vx-border bg-vx-surface-elevated';
      case 'ERROR':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-vx-border';
    }
  };

  const getStateMessage = (state: string, errorCount: number) => {
    switch (state) {
      case 'CONNECTED':
        return 'Meta Cloud API connection active — ready to send/receive messages';
      case 'CONNECTING':
        return 'Establishing connection to Meta Cloud API...';
      case 'DISCONNECTED':
        return 'Session marked as disconnected. Verify Meta Business Manager settings.';
      case 'ERROR':
        return 'Connection error. Check Meta API credentials and phone number configuration.';
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
            <Loader2 className="h-8 w-8 animate-spin text-vx-text-muted" />
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
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Failed to Load Sessions</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">Check if database is accessible</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = getSummary();

  // Check data availability
  const hasData = states.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Session Monitor
        </CardTitle>
        <CardDescription>
          Meta Cloud API connection status • Updates every {refreshInterval / 1000}s
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-vx-surface-elevated rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-vx-text">{summary.total}</div>
            <div className="text-xs text-vx-text-secondary mt-1">Total</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-vx-teal">{summary.connected}</div>
            <div className="text-xs text-vx-teal mt-1">Connected</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-vx-purple">{summary.connecting}</div>
            <div className="text-xs text-vx-purple mt-1">Connecting</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{summary.disconnected}</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">Disconnected</div>
          </div>
          <div className="bg-vx-surface-elevated rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-vx-text-secondary">{summary.loggedOut}</div>
            <div className="text-xs text-vx-text-secondary mt-1">Logged Out</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.error}</div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-1">Error</div>
          </div>
        </div>

        {/* Session List */}
        {states.length === 0 ? (
          <div className="text-center py-8 text-vx-text-muted">
            <Activity className="h-12 w-12 mx-auto mb-3 text-vx-text-muted" />
            <p>No active sessions</p>
          </div>
        ) : (
          <div className="text-sm text-vx-text-secondary">
            {states.length} session(s) monitored
          </div>
        )}
      </CardContent>
    </Card>
  );
}
