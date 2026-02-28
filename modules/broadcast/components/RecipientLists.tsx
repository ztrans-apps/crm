'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Users, Loader2, Edit, Trash2, Search, Upload, UserPlus, CheckCircle 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/stores/toast-store';

import { RecipientListDetail } from './RecipientListDetail';

interface RecipientList {
  id: string;
  name: string;
  description: string;
  total_contacts: number;
  source: string;
  filter_criteria?: {
    has_variables?: boolean;
  };
  created_at: string;
  created_by: string;
  profiles?: {
    name: string;
  };
}

export function RecipientLists() {
  const [lists, setLists] = useState<RecipientList[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source: 'manual',
  });
  const [saving, setSaving] = useState(false);
  const [selectedSource, setSelectedSource] = useState<string>('crm');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedList, setSelectedList] = useState<RecipientList | null>(null);

  useEffect(() => {
    fetchLists();
    
    // Check URL params for action
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'add') {
      setShowForm(true);
      // Clean up URL
      window.history.replaceState({}, '', '/broadcasts?tab=recipients');
    }
  }, []);

  useEffect(() => {
    if (showForm && selectedSource === 'crm') {
      fetchContacts();
    }
  }, [showForm, selectedSource]);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts');
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const fetchLists = async () => {
    try {
      const response = await fetch('/api/broadcast/recipient-lists');
      if (response.ok) {
        const data = await response.json();
        setLists(data.lists || []);
      }
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create CSV content with proper format
    const csvContent = 'contacts_name,phone_number,var1(text),var2(text),var3(date)\nMark,6289231340000,Jakarta,MANAGER,25-08-2024\nJohn,6284233540000,Bandung,CSA,29-06-2024';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_kontak_broadcast.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.warning('Nama daftar harus diisi');
      return;
    }

    if (selectedSource === 'import' && !uploadedFile) {
      toast.warning('Pilih file Excel untuk diupload');
      return;
    }

    if (selectedSource === 'import-variabel' && !uploadedFile) {
      toast.warning('Pilih file Excel untuk diupload');
      return;
    }

    if (selectedSource === 'crm' && selectedContacts.length === 0) {
      toast.warning('Pilih minimal 1 kontak');
      return;
    }

    try {
      setSaving(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('source', selectedSource);
      
      if ((selectedSource === 'import' || selectedSource === 'import-variabel') && uploadedFile) {
        formDataToSend.append('file', uploadedFile);
      } else if (selectedSource === 'crm') {
        formDataToSend.append('contact_ids', JSON.stringify(selectedContacts));
      }

      const response = await fetch('/api/broadcast/recipient-lists', {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (response.ok) {
        await fetchLists();
        setShowForm(false);
        setFormData({ name: '', description: '', source: 'manual' });
        setSelectedSource('crm');
        setUploadedFile(null);
        setSelectedContacts([]);
        toast.success('Daftar penerima berhasil dibuat!');
      } else {
        toast.error('Error: ' + (result.error || 'Gagal membuat daftar'));
      }
    } catch (error) {
      console.error('Failed to save list:', error);
      toast.error('Error: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus daftar penerima ini?')) return;

    try {
      const response = await fetch(`/api/broadcast/recipient-lists/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchLists();
      }
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  const filteredLists = lists.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSourceBadge = (source: string, filterCriteria?: any) => {
    if (source === 'import' && filterCriteria?.has_variables) {
      return <Badge className="bg-blue-100 text-blue-700">Import Excel Dengan Variabel</Badge>;
    }
    
    switch (source) {
      case 'import':
        return <Badge className="bg-blue-100 text-blue-700">Import Excel</Badge>;
      case 'crm':
        return <Badge className="bg-green-100 text-green-700">Dari CRM</Badge>;
      case 'filter':
        return <Badge className="bg-purple-100 text-purple-700">Filter</Badge>;
      default:
        return <Badge variant="secondary">Manual</Badge>;
    }
  };

  if (selectedList) {
    return (
      <RecipientListDetail
        list={selectedList}
        onBack={() => setSelectedList(null)}
        onRefresh={fetchLists}
      />
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-12 w-12 text-vx-text-muted animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vx-text-muted" />
              <Input
                placeholder="Cari daftar penerima..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Buat Daftar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lists Grid */}
      {filteredLists.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-vx-text-muted mb-4" />
            <h3 className="text-xl font-semibold text-vx-text mb-2">Belum Ada Daftar Penerima</h3>
            <p className="text-vx-text-secondary mb-6">Buat daftar penerima untuk broadcast campaign</p>
            <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Buat Daftar Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLists.map((list) => (
            <Card key={list.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-vx-text">{list.name}</h3>
                      {getSourceBadge(list.source, list.filter_criteria)}
                    </div>
                    
                    {list.description && (
                      <p className="text-vx-text-secondary mb-3">{list.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-vx-text-secondary">
                      <Users className="h-4 w-4" />
                      <span>{list.total_contacts} kontak</span>
                      <span className="text-vx-text-muted">•</span>
                      <span>{new Date(list.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedList(list)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(list.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Daftar Penerima Baru</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Nama Daftar */}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Daftar Penerima *</Label>
              <Input
                id="name"
                placeholder="Contoh : Customer Jakarta Barat"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Source Selection */}
            <div className="space-y-3">
              <Label>Sumber</Label>
              <div className="grid grid-cols-3 gap-4">
                <div
                  onClick={() => setSelectedSource('import')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedSource === 'import'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-vx-border hover:border-vx-purple/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      checked={selectedSource === 'import'}
                      onChange={() => setSelectedSource('import')}
                      className="w-4 h-4"
                    />
                    <h4 className="font-semibold">Impor Excel</h4>
                  </div>
                  <p className="text-sm text-vx-text-secondary">
                    Unggah kontak penerima dari excel yang Anda sediakan
                  </p>
                </div>

                <div
                  onClick={() => setSelectedSource('import-variabel')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedSource === 'import-variabel'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-vx-border hover:border-vx-purple/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      checked={selectedSource === 'import-variabel'}
                      onChange={() => setSelectedSource('import-variabel')}
                      className="w-4 h-4"
                    />
                    <h4 className="font-semibold">Impor Excel Dengan Variabel</h4>
                  </div>
                  <p className="text-sm text-vx-text-secondary">
                    Unggah kontak penerima dari excel yang Anda sediakan
                  </p>
                </div>

                <div
                  onClick={() => setSelectedSource('crm')}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedSource === 'crm'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-vx-border hover:border-vx-purple/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      checked={selectedSource === 'crm'}
                      onChange={() => setSelectedSource('crm')}
                      className="w-4 h-4"
                    />
                    <h4 className="font-semibold">Dari Kontak CRM</h4>
                  </div>
                  <p className="text-sm text-vx-text-secondary">
                    Pilih daftar penerima langsung dari CRM Barantum
                  </p>
                </div>
              </div>
            </div>

            {/* Import Excel */}
            {(selectedSource === 'import' || selectedSource === 'import-variabel') && (
              <div className="space-y-4 p-4 bg-vx-surface-elevated rounded-lg">
                <div>
                  <h4 className="font-semibold mb-2">Ikuti langkah-langkah berikut agar proses unggah berhasil:</h4>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
                        1
                      </div>
                      <div>
                        <h5 className="font-medium">Unduh Template</h5>
                        <p className="text-sm text-vx-text-secondary mb-2">
                          Gunakan hanya template resmi dari Barantum untuk mengisi daftar penerima.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadTemplate}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Unduh Sampel
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
                        2
                      </div>
                      <div>
                        <h5 className="font-medium">Isi Template Yang Diunduh Sesuai Petunjuk</h5>
                        <p className="text-sm text-vx-text-secondary">Agar file berhasil diunggah, pastikan:</p>
                        <ul className="text-sm text-vx-text-secondary list-disc ml-5 mt-1">
                          <li>Jangan menghapus baris pertama (header) dan menambah column baru</li>
                          <li>Tulis nomor telepon dengan kode negara di awal</li>
                        </ul>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <span className="text-green-600">✓ 6289222222222</span>
                          <span className="text-red-600">✗ 089875484945</span>
                          <span className="text-red-600">✗ +6289875484945</span>
                          <span className="text-red-600">✗ +628-9875-4845-95</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
                        3
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium mb-2">Unggah Template</h5>
                        <div className="border-2 border-dashed border-vx-border rounded-lg p-6 text-center">
                          <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="file-upload"
                          />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            {uploadedFile ? (
                              <div className="text-green-600">
                                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                                <p className="font-medium">{uploadedFile.name}</p>
                                <p className="text-sm text-vx-text-muted">Klik untuk ganti file</p>
                              </div>
                            ) : (
                              <div>
                                <Upload className="h-8 w-8 mx-auto mb-2 text-vx-text-muted" />
                                <p className="font-medium text-vx-text-secondary">Pilih Dokumen</p>
                                <p className="text-sm text-vx-text-muted">Tidak ada file terpilih</p>
                              </div>
                            )}
                          </label>
                        </div>
                        <p className="text-xs text-vx-text-muted mt-2">
                          💡 Catatan: Anda memiliki 2 akun WhatsApp dengan batas unggah berbeda:
                        </p>
                        <p className="text-xs text-vx-text-muted">
                          Jackal Holidays (622150600678) — Maksimal 100,000 kontak per file sesuai kebijakan Meta.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* From CRM */}
            {selectedSource === 'crm' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Pilih Modul</Label>
                  <button className="text-sm text-red-600">Diperlukan</button>
                </div>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Kontak</option>
                </select>

                <div className="border rounded-lg">
                  <div className="p-3 bg-vx-surface-elevated border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContacts(contacts.map(c => c.id));
                          } else {
                            setSelectedContacts([]);
                          }
                        }}
                        checked={selectedContacts.length === contacts.length && contacts.length > 0}
                      />
                      <span className="text-sm font-medium">Pilih Semua</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-vx-text-secondary">Lihat</span>
                      <select className="text-sm border rounded px-2 py-1">
                        <option>15</option>
                        <option>25</option>
                        <option>50</option>
                      </select>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-vx-surface-elevated sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-vx-text-secondary w-12"></th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-vx-text-secondary">NAMA</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-vx-text-secondary">NOMOR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {contacts.map((contact) => (
                          <tr key={contact.id} className="hover:bg-vx-surface-hover">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedContacts.includes(contact.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedContacts([...selectedContacts, contact.id]);
                                  } else {
                                    setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="px-4 py-3 text-sm">{contact.name}</td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                  <UserPlus className="h-4 w-4 text-white" />
                                </div>
                                {contact.phone_number}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {contacts.length === 0 && (
                      <div className="text-center py-8 text-vx-text-muted">
                        Tidak ada kontak tersedia
                      </div>
                    )}
                  </div>
                </div>

                {selectedContacts.length > 0 && (
                  <div className="text-sm text-vx-text-secondary">
                    {selectedContacts.length} kontak dipilih
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Daftar pelanggan VIP untuk promo khusus"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving || !formData.name}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
