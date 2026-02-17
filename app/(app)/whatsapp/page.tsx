'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { SessionList, QRCode, AddSessionModal, EditSessionModal } from '@/modules/whatsapp/components';
import { usePermissions } from '@/lib/rbac';

export default function WhatsAppPage() {
  const [showQR, setShowQR] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sessionMonitor, setSessionMonitor] = useState({
    total: 0,
    connected: 0,
    connecting: 0,
    disconnected: 0,
    loggedOut: 0,
    error: 0,
  });
  
  const { hasPermission } = usePermissions();
  
  // Check permissions for different actions
  const canAddSession = hasPermission('whatsapp.session.create');
  const canEditSession = hasPermission('whatsapp.session.edit');
  const canDeleteSession = hasPermission('whatsapp.session.delete');
  const canConnectSession = hasPermission('whatsapp.session.connect');
  const canDisconnectSession = hasPermission('whatsapp.session.disconnect');

  // Fetch session stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/whatsapp/session-states');
        if (response.ok) {
          const data = await response.json();
          const states = data.states || [];
          
          setSessionMonitor({
            total: states.length,
            connected: states.filter((s: any) => s.state === 'CONNECTED').length,
            connecting: states.filter((s: any) => s.state === 'CONNECTING').length,
            disconnected: states.filter((s: any) => s.state === 'DISCONNECTED').length,
            loggedOut: states.filter((s: any) => s.state === 'LOGGED_OUT').length,
            error: states.filter((s: any) => s.state === 'ERROR').length,
          });
        }
      } catch (error) {
        console.error('Failed to fetch session stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleAddSession = () => {
    if (!canAddSession) {
      setError('You do not have permission to add WhatsApp sessions');
      return;
    }
    setShowAddModal(true);
  };

  const handleSessionCreated = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    
    // Wait for DB to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Trigger reconnect to show QR (force new for new sessions)
    await handleReconnect(sessionId, true);
    
    // Refresh session list
    setRefreshKey(prev => prev + 1);
  };

  const handleReconnect = async (sessionId: string, forceNew: boolean = false) => {
    if (!canConnectSession) {
      setError('You do not have permission to connect WhatsApp sessions');
      return;
    }
    
    try {
      setError(null);
      
      // Only use forceNew for new sessions, otherwise let backend decide
      const url = forceNew 
        ? `/api/whatsapp/reconnect/${sessionId}?forceNew=true`
        : `/api/whatsapp/reconnect/${sessionId}`;
      
      const response = await fetch(url, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Only show QR if not auto-reconnecting
        if (!data.autoReconnect || forceNew) {
          // Wait for status to update
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setCurrentSessionId(sessionId);
          setShowQR(true);
        }
        
        // Refresh session list
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reconnect');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDisconnect = async (sessionId: string) => {
    if (!canDisconnectSession) {
      setError('You do not have permission to disconnect WhatsApp sessions');
      return;
    }
    
    if (!confirm('This will disconnect WhatsApp but keep the phone number saved. You can reconnect later.')) {
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`/api/whatsapp/disconnect/${sessionId}`, {
        method: 'POST',
      });

      if (response.ok) {
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!canDeleteSession) {
      setError('You do not have permission to delete WhatsApp sessions');
      return;
    }
    
    if (!confirm('This will permanently delete this WhatsApp number and all authentication data. Are you sure?')) {
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`/api/whatsapp/delete/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRefreshKey(prev => prev + 1);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete session');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEdit = (sessionId: string) => {
    if (!canEditSession) {
      setError('You do not have permission to edit WhatsApp sessions');
      return;
    }
    setEditingSessionId(sessionId);
    setShowEditModal(true);
  };

  const handleQRConnected = () => {
    setShowQR(false);
    setCurrentSessionId(null);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Connections</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp business numbers</p>
        </div>
        {canAddSession && (
          <Button
            onClick={handleAddSession}
            size="lg"
            className="bg-green-600 hover:bg-green-700 font-medium flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add WhatsApp Number
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900">
                {sessionMonitor.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Connected</p>
              <p className="text-3xl font-bold text-green-600">
                {sessionMonitor.connected}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Disconnected</p>
              <p className="text-3xl font-bold text-yellow-600">
                {sessionMonitor.disconnected}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Errors</p>
              <p className="text-3xl font-bold text-red-600">
                {sessionMonitor.error}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code */}
      {showQR && currentSessionId && (
        <QRCode
          sessionId={currentSessionId}
          onClose={() => {
            setShowQR(false);
            setCurrentSessionId(null);
          }}
          onConnected={handleQRConnected}
        />
      )}

      {/* Sessions Table */}
      <SessionList
        key={refreshKey}
        onAddSession={canAddSession ? handleAddSession : undefined}
        onReconnect={canConnectSession ? handleReconnect : undefined}
        onDisconnect={canDisconnectSession ? handleDisconnect : undefined}
        onDelete={canDeleteSession ? handleDelete : undefined}
        onEdit={canEditSession ? handleEdit : undefined}
      />

      {/* Add Session Modal */}
      <AddSessionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleSessionCreated}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        sessionId={editingSessionId}
        onSuccess={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
}
