'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, Download, Users, CheckCircle, XCircle, Clock, 
  Eye, Search, Loader2 
} from 'lucide-react';

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
  contact?: {
    name: string;
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

  useEffect(() => {
    fetchRecipients();
  }, [campaign.id]);

  const fetchRecipients = async () => {
    try {
      const response = await fetch(`/api/broadcast/campaigns/${campaign.id}/recipients`);
      if (response.ok) {
        const data = await response.json();
        setRecipients(data.recipients || []);
      }
    } catch (error) {
      console.error('Failed to fetch recipients:', error);
    } finally {
      setLoading(false);
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
        return <Badge className="bg-green-100 text-green-700">Terkirim</Badge>;
      case 'read':
        return <Badge className="bg-blue-100 text-blue-700">Dibaca</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700">Gagal</Badge>;
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
          <div>
            <label className="text-sm font-medium text-gray-700">Pesan:</label>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
              {campaign.message_template}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-gray-600" />
              <div className="text-2xl font-bold text-gray-900">{campaign.total_recipients}</div>
              <div className="text-sm text-gray-600">Total Penerima</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{campaign.sent_count}</div>
              <div className="text-sm text-gray-600">Terkirim</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Eye className="h-6 w-6 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{campaign.read_count}</div>
              <div className="text-sm text-gray-600">Dibaca</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <div className="text-2xl font-bold text-red-600">{campaign.failed_count}</div>
              <div className="text-sm text-gray-600">Gagal</div>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
              className="px-4 py-2 border rounded-lg bg-white"
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
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nama</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nomor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRecipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {recipient.contact?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {recipient.phone_number}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(recipient.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
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
                <div className="text-center py-8 text-gray-500">
                  Tidak ada data penerima
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
