'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CampaignList, CampaignForm, CampaignStats } from '@/modules/broadcast/components';

export default function BroadcastsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState({
    total_campaigns: 0,
    total_sent: 0,
    total_delivered: 0,
    total_failed: 0,
    pending: 0,
    success_rate: 0,
  });

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/broadcast/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    }

    fetchStats();
  }, [refreshKey]);

  const handleAddCampaign = () => {
    setShowAddModal(true);
  };

  const handleCampaignCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleSelectCampaign = (campaign: any) => {
    console.log('Selected campaign:', campaign);
    // TODO: Show campaign details
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Broadcast Campaigns</h1>
          <p className="text-gray-600 mt-1">Send messages to multiple contacts at once</p>
        </div>
        <Button
          onClick={handleAddCampaign}
          size="lg"
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <CampaignStats stats={stats} />

      {/* Campaign List */}
      <CampaignList
        key={refreshKey}
        onAddCampaign={handleAddCampaign}
        onSelectCampaign={handleSelectCampaign}
      />

      {/* Add Campaign Modal */}
      <CampaignForm
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={handleCampaignCreated}
      />
    </div>
  );
}
