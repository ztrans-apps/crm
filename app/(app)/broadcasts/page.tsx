'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Radio, FileText, Users, History } from 'lucide-react';
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard';
import { CampaignHistory } from '@/modules/broadcast/components/CampaignHistory';
import { TemplateManagement } from '@/modules/broadcast/components/TemplateManagement';
import { RecipientLists } from '@/modules/broadcast/components/RecipientLists';
import { CreateCampaign } from '@/modules/broadcast/components/CreateCampaign';

export default function BroadcastsPage() {
  const [activeTab, setActiveTab] = useState('history');
  const [refreshKey, setRefreshKey] = useState(0);

  // Check URL params for tab
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['history', 'create', 'templates', 'recipients'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <PermissionGuard permission={['broadcast.manage']}>
      <div className="h-full bg-vx-surface-elevated p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="h-6 w-6 text-vx-purple" />
            <h1 className="text-2xl font-bold text-vx-text">Broadcast System</h1>
          </div>
          <p className="text-sm text-vx-text-secondary">
            Kelola campaign, template, dan daftar penerima broadcast
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-vx-surface border">
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Riwayat Broadcast
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <Radio className="h-4 w-4" />
              Buat Campaign
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Template
            </TabsTrigger>
            <TabsTrigger value="recipients" className="gap-2">
              <Users className="h-4 w-4" />
              Daftar Penerima
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <CampaignHistory key={refreshKey} />
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <CreateCampaign onSuccess={handleRefresh} />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <TemplateManagement />
          </TabsContent>

          <TabsContent value="recipients" className="space-y-4">
            <RecipientLists />
          </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
}
