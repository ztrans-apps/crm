'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { SessionList, QRCode, AddSessionModal, SessionMonitor } from '@/modules/whatsapp/components';

export default function WhatsAppPage() {
  const [showQR, setShowQR] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddSession = () => {
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
        console.log('Reconnect response:', data);
        
        // Only show QR if not auto-reconnecting
        if (!data.autoReconnect || forceNew) {
          // Wait for status to update
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setCurrentSessionId(sessionId);
          setShowQR(true);
        } else {
          console.log('✅ Auto-reconnecting with existing credentials');
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

  const handleQRConnected = () => {
    setShowQR(false);
    setCurrentSessionId(null);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Connections</h1>
          <p className="text-gray-600 mt-1">Manage your WhatsApp business numbers</p>
        </div>
        <Button
          onClick={handleAddSession}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add WhatsApp Number
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Session Monitor */}
      <SessionMonitor refreshInterval={5000} />

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

      {/* Sessions List */}
      <SessionList
        key={refreshKey}
        onAddSession={handleAddSession}
        onReconnect={handleReconnect}
        onDisconnect={handleDisconnect}
        onDelete={handleDelete}
      />

      {/* Add Session Modal */}
      <AddSessionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleSessionCreated}
      />
    </div>
  );
}
