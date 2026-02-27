'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Send, Clock, Loader2, AlertCircle, RefreshCw 
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
}

interface RecipientList {
  id: string;
  name: string;
  total_contacts: number;
}

interface Agent {
  id: string;
  full_name: string;
  roles: string[];
}

interface WhatsAppAccount {
  id: string;
  phone_number: string;
  session_name: string;
  status: string;
  health?: {
    status: string;
    quality?: string;
  };
}

interface CreateCampaignProps {
  onSuccess?: () => void;
}

export function CreateCampaign({ onSuccess }: CreateCampaignProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [recipientLists, setRecipientLists] = useState<RecipientList[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    sender_id: '',
    whatsapp_account: '',
    recipient_list_id: '',
    template_id: '',
    message_content: '',
    scheduled_at: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch health data for selected WhatsApp account
  useEffect(() => {
    if (formData.whatsapp_account) {
      fetchHealthData(formData.whatsapp_account);
    }
  }, [formData.whatsapp_account]);

  const fetchHealthData = async (accountId: string) => {
    try {
      const account = whatsappAccounts.find(a => a.id === accountId);
      if (!account) return;

      // Fetch status from Meta Cloud API
      const response = await fetch('/api/whatsapp/meta-status');
      
      if (response.ok) {
        const data = await response.json();
        
        // Update account with health data from Meta API
        setWhatsappAccounts(prev => prev.map(acc => {
          if (acc.id === accountId) {
            return {
              ...acc,
              health: {
                status: data.phone_number ? 'connected' : 'unknown',
                quality: data.quality_rating || 'unknown',
              }
            };
          }
          return acc;
        }));
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [templatesRes, listsRes, usersRes, waSessionsRes] = await Promise.all([
        fetch('/api/broadcast/templates'),
        fetch('/api/broadcast/recipient-lists'),
        fetch('/api/users'),
        fetch('/api/whatsapp/sessions'),
      ]);

      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setTemplates(data.templates || []);
      }

      if (listsRes.ok) {
        const data = await listsRes.json();
        setRecipientLists(data.lists || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        // Filter only users with Agent role
        const agentUsers = data.users?.filter((u: any) => 
          u.roles?.includes('Agent')
        ) || [];
        setAgents(agentUsers);
      }

      if (waSessionsRes.ok) {
        const data = await waSessionsRes.json();
        setWhatsappAccounts(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setFormData({
        ...formData,
        template_id: templateId,
        message_content: template.content,
      });
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      sender_id: '',
      whatsapp_account: '',
      recipient_list_id: '',
      template_id: '',
      message_content: '',
      scheduled_at: '',
    });
    setError(null);
  };

  const handleSubmit = async (schedule: boolean = false) => {
    if (!formData.name.trim()) {
      setError('Nama campaign harus diisi');
      return;
    }

    if (!formData.sender_id) {
      setError('Pilih pengirim');
      return;
    }

    if (!formData.recipient_list_id) {
      setError('Pilih daftar penerima');
      return;
    }

    if (!formData.template_id) {
      setError('Pilih template pesan');
      return;
    }

    if (schedule && !formData.scheduled_at) {
      setError('Pilih tanggal & waktu pengiriman');
      return;
    }

    try {
      setError(null);
      setSaving(true);

      // Convert scheduled_at to UTC ISO string if scheduling
      let scheduledAtUTC = null;
      if (schedule && formData.scheduled_at) {
        // formData.scheduled_at is in format: "2026-02-17T17:57"
        // Create Date object which will be in local timezone
        const localDate = new Date(formData.scheduled_at);
        // Convert to UTC ISO string
        scheduledAtUTC = localDate.toISOString();
      }

      const response = await fetch('/api/broadcast/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          message_template: formData.message_content,
          scheduled_at: scheduledAtUTC,
          send_now: !schedule,
          recipient_list_id: formData.recipient_list_id,
          sender_id: formData.sender_id,
          whatsapp_account: formData.whatsapp_account,
          template_id: formData.template_id, // Send template ID
        }),
      });

      if (response.ok) {
        handleReset();
        onSuccess?.();
        alert('Campaign berhasil dibuat!');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Gagal membuat campaign');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-12 w-12 text-vx-text-muted animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const selectedList = recipientLists.find(l => l.id === formData.recipient_list_id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Form */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Buat Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Nama Campaign */}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Campaign</Label>
              <p className="text-xs text-vx-text-muted">
                Gunakan huruf kecil, angka, dan garis bawah. Tidak boleh ada spasi atau simbol
              </p>
              <Input
                id="name"
                placeholder="Contoh : promo_diskon_akhir_tahun"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={saving}
              />
            </div>

            {/* Pengirim */}
            <div className="space-y-2">
              <Label htmlFor="sender">Pengirim</Label>
              <p className="text-xs text-vx-text-muted">
                Pilih nama pengirim yang akan tampil di daftar log
              </p>
              <select
                id="sender"
                value={formData.sender_id}
                onChange={(e) => setFormData({ ...formData, sender_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={saving}
              >
                <option value="">Pilih Pengirim</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Akun WhatsApp */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Akun WhatsApp</Label>
              <p className="text-xs text-vx-text-muted">
                Pilih Akun WhatsApp yang akan digunakan untuk mengirim pesan
              </p>
              <select
                id="whatsapp"
                value={formData.whatsapp_account}
                onChange={(e) => setFormData({ ...formData, whatsapp_account: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={saving}
              >
                <option value="">Pilih Akun WhatsApp</option>
                {whatsappAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.session_name && account.session_name !== account.phone_number 
                      ? `${account.session_name} (${account.phone_number})`
                      : account.phone_number
                    }
                  </option>
                ))}
              </select>
              
              {formData.whatsapp_account && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    {(() => {
                      const account = whatsappAccounts.find(a => a.id === formData.whatsapp_account);
                      const quality = account?.health?.quality || account?.status || 'unknown';
                      const status = account?.status || 'disconnected';
                      
                      // Determine color based on quality/status
                      let bgColor = 'bg-vx-text-muted';
                      let badgeColor = 'bg-gray-600';
                      let borderColor = 'border-vx-border';
                      let bgLight = 'bg-vx-surface-elevated';
                      
                      if (quality === 'healthy' || status === 'connected') {
                        bgColor = 'bg-green-500';
                        badgeColor = 'bg-green-600';
                        borderColor = 'border-green-200';
                        bgLight = 'bg-green-50';
                      } else if (quality === 'degraded' || quality === 'warning') {
                        bgColor = 'bg-yellow-500';
                        badgeColor = 'bg-yellow-600';
                        borderColor = 'border-yellow-200';
                        bgLight = 'bg-yellow-50';
                      } else if (quality === 'unhealthy' || status === 'disconnected') {
                        bgColor = 'bg-red-500';
                        badgeColor = 'bg-red-600';
                        borderColor = 'border-red-200';
                        bgLight = 'bg-red-50';
                      }
                      
                      return (
                        <>
                          <div className={`w-3 h-3 ${bgColor} rounded-full mt-1`}></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">Kualitas:</span>
                              <span className={`px-2 py-0.5 ${badgeColor} text-white text-xs rounded uppercase`}>
                                {quality}
                              </span>
                              <span className="text-sm">Status: {status}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Daftar Penerima */}
            <div className="space-y-2">
              <Label htmlFor="recipients">Daftar Penerima</Label>
              <p className="text-xs text-vx-text-muted">
                Pilih daftar penerima pesan
              </p>
              <select
                id="recipients"
                value={formData.recipient_list_id}
                onChange={(e) => setFormData({ ...formData, recipient_list_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={saving}
              >
                <option value="">Pilih Daftar Penerima</option>
                {recipientLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.total_contacts} kontak)
                  </option>
                ))}
              </select>
              <p className="text-xs text-vx-purple">
                Belum punya daftar? <button type="button" onClick={() => setShowRecipientForm(true)} className="underline">Buat Baru di Sini</button>
              </p>
            </div>

            {/* Konten Template */}
            <div className="space-y-2">
              <Label htmlFor="template">Konten Template</Label>
              <p className="text-xs text-vx-text-muted">
                Pilih template pesan yang ingin digunakan
              </p>
              <select
                id="template"
                value={formData.template_id}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                disabled={saving}
              >
                <option value="">Pilih Template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal & Waktu */}
            <div className="space-y-2">
              <Label htmlFor="scheduled">Tanggal & Waktu Pengiriman</Label>
              <p className="text-xs text-vx-text-muted">
                Pilih tanggal dan waktu pengiriman pesan
              </p>
              <Input
                id="scheduled"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                disabled={saving}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={saving}
                className="text-red-600 dark:text-red-400 border-red-600 hover:bg-red-50 dark:hover:bg-red-500/5"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="flex-1 bg-vx-teal hover:bg-vx-teal/90"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Kirim Sekarang
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={saving || !formData.scheduled_at}
                className="flex-1 bg-vx-purple hover:bg-vx-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!formData.scheduled_at ? 'Isi tanggal & waktu terlebih dahulu' : ''}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Menjadwalkan...
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 mr-2" />
                    Jadwalkan Kirim
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Preview */}
      <div className="space-y-6">
        <div className="sticky top-6">
          {/* Mobile Phone Frame */}
          <div className="mx-auto max-w-[375px] bg-white rounded-3xl shadow-2xl overflow-hidden border-8 border-gray-800">
            {/* Header */}
            <div className="bg-[#075e54] text-white p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[#075e54] font-bold text-sm">
                    {(() => {
                      const account = whatsappAccounts.find(a => a.id === formData.whatsapp_account);
                      if (account?.session_name) {
                        return account.session_name.substring(0, 2).toUpperCase();
                      }
                      return 'WA';
                    })()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {(() => {
                      const account = whatsappAccounts.find(a => a.id === formData.whatsapp_account);
                      return account?.session_name || 'Preview Pesan';
                    })()}
                  </h3>
                  <p className="text-xs text-gray-200">
                    {formData.whatsapp_account 
                      ? whatsappAccounts.find(a => a.id === formData.whatsapp_account)?.phone_number || ''
                      : 'Pilih akun WhatsApp'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {/* Chat Area */}
            <div 
              className="relative bg-[#efeae2] p-3 overflow-y-auto"
              style={{
                height: '600px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d9d9d9' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            >
              {formData.message_content ? (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    {/* Message Bubble - Customer POV (incoming message) */}
                    <div className="bg-white rounded-lg rounded-tl-none shadow-sm overflow-hidden">
                      {/* Header Image/Video/Document */}
                      {selectedTemplate?.header_format === 'IMAGE' && selectedTemplate?.header_media_url && (
                        <img 
                          src={selectedTemplate.header_media_url} 
                          alt="Header" 
                          className="w-full h-auto"
                        />
                      )}
                      {selectedTemplate?.header_format === 'VIDEO' && selectedTemplate?.header_media_url && (
                        <video 
                          src={selectedTemplate.header_media_url} 
                          className="w-full h-auto"
                          controls
                        />
                      )}
                      {selectedTemplate?.header_format === 'TEXT' && selectedTemplate?.header_text && (
                        <div className="px-2.5 pt-2.5 pb-1">
                          <p className="font-semibold text-sm text-gray-900">{selectedTemplate.header_text}</p>
                        </div>
                      )}
                      
                      {/* Message Body */}
                      <div className="p-2.5">
                        <div className="whitespace-pre-wrap text-[13px] text-gray-900 break-words leading-[1.4]">
                          {formData.message_content}
                        </div>
                        
                        {/* Footer */}
                        {selectedTemplate?.footer_text && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            {selectedTemplate.footer_text}
                          </div>
                        )}
                        
                        {/* Buttons */}
                        {selectedTemplate?.buttons && selectedTemplate.buttons.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {selectedTemplate.buttons.map((button: any, index: number) => (
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
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <Send className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Pilih template untuk melihat preview</p>
                  </div>
                </div>
              )}
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

      {/* Recipient Form Dialog - Placeholder for now */}
      {showRecipientForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowRecipientForm(false)}>
          <div className="bg-vx-surface rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Buat Daftar Penerima Baru</h3>
            <p className="text-vx-text-secondary mb-4">
              Fitur ini akan membuka form untuk membuat daftar penerima baru. 
              Untuk saat ini, silakan gunakan tab "Daftar Penerima" untuk membuat daftar baru.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRecipientForm(false)}>
                Tutup
              </Button>
              <Button onClick={() => {
                setShowRecipientForm(false);
                // Navigate to broadcasts page with recipients tab and trigger add
                window.location.href = '/broadcasts?tab=recipients&action=add';
              }}>
                Buka Tab Daftar Penerima
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

