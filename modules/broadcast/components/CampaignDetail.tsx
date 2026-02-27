'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Download, Users, CheckCircle, XCircle, Clock, 
  Eye, Search, Loader2, X 
} from 'lucide-react';
import { useMessageTracking } from '@/hooks/useMessageTracking';
import { createClient } from '@/lib/supabase/client';

interface Campaign {
  id: string;
  name: string;
  message_template: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
  metadata?: {
    template_data?: {
      header_format?: string;
      header_text?: string;
      header_media_url?: string;
      footer_text?: string;
      buttons?: Array<{
        type: string;
        text: string;
        value?: string;
      }>;
    };
  };
}

interface Recipient {
  id: string;
  contact_id: string;
  phone_number: string;
  status: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  error_message?: string;
  message_id?: string;
  contact?: {
    name: string;
  };
  message?: {
    whatsapp_message_id: string;
  };
}

interface CampaignDetailProps {
  campaign: Campaign;
  onBack: () => void;
  onRefresh: () => void;
}

export function CampaignDetail({ campaign, onBack, onRefresh }: CampaignDetailProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPreview, setShowPreview] = useState(false);
  const [stats, setStats] = useState({
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
  });
  const supabase = createClient();

  // Handle message status updates for broadcast
  const handleStatusUpdate = useCallback(async (data: any) => {
    
    // Check if this message belongs to current campaign
    const { data: message } = await supabase
      .from('messages')
      .select('id, metadata')
      .eq('whatsapp_message_id', data.messageId)
      .single();
    
    
    if (message?.metadata?.broadcast_campaign_id === campaign.id) {
      
      // Update recipient and stats together
      setRecipients((prevRecipients) => {
        let oldStatus: string | null = null;
        let found = false;
        
        const updated = prevRecipients.map((r) => {
          if (r.message_id === message.id) {
            oldStatus = r.status;
            found = true;
            return {
              ...r,
              status: data.status,
              [`${data.status}_at`]: data.timestamp
            };
          }
          return r;
        });
        
        // Update stats if recipient was found and status changed
        if (found && oldStatus && oldStatus !== data.status) {
          setStats((prev) => {
            const newStats = { ...prev };
            
            // Decrement old status count
            if (oldStatus === 'sent' && newStats.sent > 0) newStats.sent--;
            else if (oldStatus === 'delivered' && newStats.delivered > 0) newStats.delivered--;
            else if (oldStatus === 'read' && newStats.read > 0) newStats.read--;
            else if (oldStatus === 'failed' && newStats.failed > 0) newStats.failed--;
            
            // Increment new status count
            if (data.status === 'sent') newStats.sent++;
            else if (data.status === 'delivered') newStats.delivered++;
            else if (data.status === 'read') newStats.read++;
            else if (data.status === 'failed') newStats.failed++;
            
            return newStats;
          });
        }
        
        return updated;
      });
    }
  }, [campaign.id, supabase]);

  // Subscribe to message tracking
  useMessageTracking({
    enabled: true,
    onStatusUpdate: handleStatusUpdate,
  });

  useEffect(() => {
    const loadData = async () => {
      await fetchRecipients();
      await fetchStats(); // Fetch stats after recipients
    };
    loadData();
  }, [campaign.id]);

  const fetchRecipients = async () => {
    try {
      const response = await fetch(`/api/broadcast/campaigns/${campaign.id}/recipients`);
      if (response.ok) {
        const data = await response.json();
        
        // Sync recipient status with message status
        const recipientsWithMessageStatus = await Promise.all(
          (data.recipients || []).map(async (recipient: Recipient) => {
            if (recipient.message_id) {
              // Get message status from messages table
              const { data: message } = await supabase
                .from('messages')
                .select('status, whatsapp_message_id')
                .eq('id', recipient.message_id)
                .single();
              
              if (message && message.status) {
                // Update recipient with message status
                return {
                  ...recipient,
                  status: message.status,
                };
              }
            }
            return recipient;
          })
        );
        
        setRecipients(recipientsWithMessageStatus);
      }
    } catch (error) {
      console.error('Failed to fetch recipients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get all messages for this campaign using filter on metadata
      const { data: messages, error } = await supabase
        .from('messages')
        .select('status, metadata')
        .not('metadata', 'is', null);
      
      
      // Filter messages that belong to this campaign
      const campaignMessages = messages?.filter(m => 
        m.metadata?.broadcast_campaign_id === campaign.id
      ) || [];
      
      
      if (campaignMessages.length > 0) {
        const newStats = {
          sent: campaignMessages.filter((m) => m.status === 'sent').length,
          delivered: campaignMessages.filter((m) => m.status === 'delivered').length,
          read: campaignMessages.filter((m) => m.status === 'read').length,
          failed: campaignMessages.filter((m) => m.status === 'failed').length,
        };
        
        setStats(newStats);
      } else {
        // Fallback to campaign counts if no messages found
        setStats({
          sent: campaign.sent_count || 0,
          delivered: campaign.delivered_count || 0,
          read: campaign.read_count || 0,
          failed: campaign.failed_count || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/broadcast/campaigns/${campaign.id}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign-${campaign.name}-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <Badge className="bg-vx-teal/10 text-vx-teal">Terkirim</Badge>;
      case 'read':
        return <Badge className="bg-vx-purple/10 text-vx-purple">Dibaca</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400">Gagal</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const filteredRecipients = recipients.filter(recipient => {
    const matchesSearch = 
      recipient.phone_number.includes(searchQuery) ||
      recipient.contact?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || recipient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Campaign Info */}
      <Card>
        <CardHeader>
          <CardTitle>{campaign.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview Button - No label, just button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2"
              title="Klik untuk melihat preview template lengkap"
            >
              <Eye className="h-4 w-4" />
              Lihat Preview
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-vx-surface-elevated rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-vx-text-secondary" />
              <div className="text-2xl font-bold text-vx-text">{campaign.total_recipients}</div>
              <div className="text-sm text-vx-text-secondary">Total Penerima</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-vx-purple" />
              <div className="text-2xl font-bold text-vx-purple">{stats.sent + stats.delivered + stats.read}</div>
              <div className="text-sm text-vx-text-secondary">Terkirim</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Eye className="h-6 w-6 mx-auto mb-2 text-vx-teal" />
              <div className="text-2xl font-bold text-vx-teal">{stats.read}</div>
              <div className="text-sm text-vx-text-secondary">Dibaca</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600 dark:text-red-400" />
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
              <div className="text-sm text-vx-text-secondary">Gagal</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recipients List */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Penerima</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vx-text-muted" />
              <Input
                placeholder="Cari nama atau nomor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-vx-surface"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="sent">Terkirim</option>
              <option value="delivered">Delivered</option>
              <option value="read">Dibaca</option>
              <option value="failed">Gagal</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-vx-text-muted" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-vx-surface-elevated">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-vx-text-secondary">Nama</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-vx-text-secondary">Nomor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-vx-text-secondary">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-vx-text-secondary">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRecipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-vx-surface-hover">
                      <td className="px-4 py-3 text-sm text-vx-text">
                        {recipient.contact?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-vx-text">
                        {recipient.phone_number}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(recipient.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-vx-text-secondary">
                        {recipient.sent_at 
                          ? new Date(recipient.sent_at).toLocaleString('id-ID')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredRecipients.length === 0 && (
                <div className="text-center py-8 text-vx-text-muted">
                  Tidak ada data penerima
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal with Animation */}
      {showPreview && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn"
          onClick={() => setShowPreview(false)}
          style={{
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="relative max-w-md w-full animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
            style={{
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              title="Tutup preview"
            >
              <X className="h-6 w-6" />
            </button>

            {/* WhatsApp Phone Mockup */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
              {/* Phone Header */}
              <div className="bg-[#075e54] text-white p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <span className="text-[#075e54] font-bold text-sm">WA</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">Preview Pesan</h3>
                    <p className="text-xs text-gray-200">{campaign.name}</p>
                  </div>
                </div>
              </div>
              
              {/* Chat Area */}
              <div 
                className="relative bg-[#efeae2] p-3"
                style={{
                  minHeight: '400px',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
              >
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    {/* Message Bubble */}
                    <div className="bg-white rounded-lg rounded-tl-none shadow-sm overflow-hidden">
                      {/* Header Image/Video/Document */}
                      {campaign.metadata?.template_data?.header_format === 'IMAGE' && 
                       campaign.metadata.template_data.header_media_url &&
                       !campaign.metadata.template_data.header_media_url.startsWith('placeholder_') && (
                        <img 
                          src={campaign.metadata.template_data.header_media_url} 
                          alt="Header" 
                          className="w-full h-auto"
                        />
                      )}
                      {campaign.metadata?.template_data?.header_format === 'VIDEO' && 
                       campaign.metadata.template_data.header_media_url &&
                       !campaign.metadata.template_data.header_media_url.startsWith('placeholder_') && (
                        <video 
                          src={campaign.metadata.template_data.header_media_url} 
                          className="w-full h-auto"
                          controls
                        />
                      )}
                      {campaign.metadata?.template_data?.header_format === 'TEXT' && 
                       campaign.metadata.template_data.header_text && (
                        <div className="px-2.5 pt-2.5 pb-1">
                          <p className="font-semibold text-sm text-gray-900">
                            {campaign.metadata.template_data.header_text}
                          </p>
                        </div>
                      )}
                      
                      {/* Message Body */}
                      <div className="p-2.5">
                        <div className="whitespace-pre-wrap text-[13px] text-gray-900 break-words leading-[1.4]">
                          {campaign.message_template}
                        </div>
                        
                        {/* Footer */}
                        {campaign.metadata?.template_data?.footer_text && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            {campaign.metadata.template_data.footer_text}
                          </div>
                        )}
                        
                        {/* Buttons */}
                        {campaign.metadata?.template_data?.buttons && 
                         campaign.metadata.template_data.buttons.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {campaign.metadata.template_data.buttons.map((button: any, index: number) => (
                              <button
                                key={index}
                                className="w-full py-1.5 text-center text-[13px] text-teal-600 font-medium border border-gray-200 rounded hover:bg-gray-50"
                              >
                                {button.text}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[11px] text-gray-500">
                            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Input Area (disabled) */}
              <div className="bg-[#f0f0f0] p-2 border-t border-gray-300">
                <div className="flex items-center gap-2 bg-white rounded-full px-3 py-2">
                  <span className="text-gray-400 text-xs">Ketik pesan</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
