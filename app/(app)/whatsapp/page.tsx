'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle, Signal, CheckCircle2, MessageSquare, Shield } from 'lucide-react';
import { SessionList, AddNumberModal, EditNumberModal } from '@/modules/whatsapp/components';
import { usePermissions } from '@/lib/rbac';

interface MetaApiStatus {
  configured: boolean;
  phoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  messagingLimit?: string;
  error?: string;
}

export default function WhatsAppPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [apiStatus, setApiStatus] = useState<MetaApiStatus>({ configured: false });
  const [loadingStatus, setLoadingStatus] = useState(true);

  const { hasPermission } = usePermissions();

  const canAddSession = hasPermission('whatsapp.session.create');
  const canEditSession = hasPermission('whatsapp.session.edit');
  const canDeleteSession = hasPermission('whatsapp.session.delete');

  // Fetch Meta Cloud API status
  const fetchApiStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const response = await fetch('/api/whatsapp/meta-status');
      if (response.ok) {
        const data = await response.json();
        setApiStatus(data);
      } else {
        setApiStatus({ configured: false, error: 'Failed to check API status' });
      }
    } catch {
      setApiStatus({ configured: false, error: 'Could not connect to API' });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchApiStatus();
  }, [fetchApiStatus, refreshKey]);

  const handleAddNumber = () => {
    if (!canAddSession) {
      setError('You do not have permission to add WhatsApp numbers');
      return;
    }
    setShowAddModal(true);
  };

  const handleEdit = (sessionId: string) => {
    if (!canEditSession) {
      setError('You do not have permission to edit WhatsApp numbers');
      return;
    }
    setEditingSessionId(sessionId);
    setShowEditModal(true);
  };

  const handleDelete = async (sessionId: string) => {
    if (!canDeleteSession) {
      setError('You do not have permission to delete WhatsApp numbers');
      return;
    }

    if (!confirm('This will remove this WhatsApp number from the CRM. Are you sure?')) {
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
        throw new Error(data.error || 'Failed to delete number');
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const getQualityColor = (rating?: string) => {
    switch (rating?.toUpperCase()) {
      case 'GREEN': return 'text-vx-teal bg-vx-teal/10';
      case 'YELLOW': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-500/10';
      case 'RED': return 'text-red-600 dark:text-red-400 bg-red-100';
      default: return 'text-vx-text-secondary bg-vx-surface-hover';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-vx-text">WhatsApp Connections</h1>
          <p className="text-vx-text-secondary mt-1">Manage your WhatsApp Business numbers via Meta Cloud API</p>
        </div>
        {canAddSession && (
          <Button
            onClick={handleAddNumber}
            size="lg"
            className="bg-vx-teal hover:bg-vx-teal/90 font-medium flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add WhatsApp Number
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Meta Cloud API Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-vx-surface rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-vx-text-secondary mb-1">API Status</p>
              <p className={`text-lg font-bold ${apiStatus.configured ? 'text-vx-teal' : 'text-red-600 dark:text-red-400'}`}>
                {loadingStatus ? '...' : apiStatus.configured ? 'Connected' : 'Not Configured'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${apiStatus.configured ? 'bg-vx-teal/10' : 'bg-red-100'}`}>
              <Signal className={`w-6 h-6 ${apiStatus.configured ? 'text-vx-teal' : 'text-red-600 dark:text-red-400'}`} />
            </div>
          </div>
        </div>

        <div className="bg-vx-surface rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-vx-text-secondary mb-1">Verified Name</p>
              <p className="text-lg font-bold text-vx-text truncate">
                {loadingStatus ? '...' : apiStatus.verifiedName || '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-vx-purple/10 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-vx-purple" />
            </div>
          </div>
        </div>

        <div className="bg-vx-surface rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-vx-text-secondary mb-1">Quality Rating</p>
              <p className={`text-lg font-bold ${apiStatus.qualityRating === 'GREEN' ? 'text-vx-teal' : apiStatus.qualityRating === 'YELLOW' ? 'text-yellow-600 dark:text-yellow-400' : apiStatus.qualityRating === 'RED' ? 'text-red-600 dark:text-red-400' : 'text-vx-text-secondary'}`}>
                {loadingStatus ? '...' : apiStatus.qualityRating || '-'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getQualityColor(apiStatus.qualityRating)}`}>
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-vx-surface rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-vx-text-secondary mb-1">Messaging Limit</p>
              <p className="text-lg font-bold text-vx-text">
                {loadingStatus ? '...' : apiStatus.messagingLimit || '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-vx-purple/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-vx-purple" />
            </div>
          </div>
        </div>
      </div>

      {/* API Not Configured Warning */}
      {!loadingStatus && !apiStatus.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900">Meta Cloud API Not Configured</h3>
              <p className="text-sm text-amber-700 mt-1">
                Set these environment variables in your Vercel Dashboard to connect:
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li><code className="bg-amber-100 px-1 rounded">META_WHATSAPP_TOKEN</code> — Access token from Meta Developer Console</li>
                <li><code className="bg-amber-100 px-1 rounded">META_PHONE_NUMBER_ID</code> — Phone Number ID from WhatsApp → API Setup</li>
                <li><code className="bg-amber-100 px-1 rounded">META_BUSINESS_ACCOUNT_ID</code> — WhatsApp Business Account ID</li>
              </ul>
              <p className="text-sm text-amber-700 mt-2">
                Find these in the{' '}
                <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="text-amber-800 underline font-medium">
                  Meta Developer Console
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Numbers Table */}
      <SessionList
        key={refreshKey}
        onAddNumber={canAddSession ? handleAddNumber : undefined}
        onEdit={canEditSession ? handleEdit : undefined}
        onDelete={canDeleteSession ? handleDelete : undefined}
        onRefresh={() => {
          setRefreshKey(prev => prev + 1);
          fetchApiStatus();
        }}
      />

      {/* Add Number Modal */}
      <AddNumberModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          fetchApiStatus();
        }}
      />

      {/* Edit Number Modal */}
      <EditNumberModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        sessionId={editingSessionId}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          fetchApiStatus();
        }}
      />
    </div>
  );
}
