'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Users, Search, Trash2, UserPlus, Loader2, Plus, Edit 
} from 'lucide-react';

interface RecipientList {
  id: string;
  name: string;
  description: string;
  total_contacts: number;
  source: string;
  filter_criteria?: any;
  created_at: string;
  created_by: string;
  profiles?: {
    name: string;
  };
}

interface Contact {
  id: string;
  contact_id: string;
  added_at: string;
  contact: {
    id: string;
    name: string;
    phone_number: string;
  };
}

interface RecipientListDetailProps {
  list: RecipientList;
  onBack: () => void;
  onRefresh: () => void;
}

export function RecipientListDetail({ list, onBack, onRefresh }: RecipientListDetailProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: list.name,
    description: list.description || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [list.id]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(`/api/broadcast/recipient-lists/${list.id}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || []);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContacts = async () => {
    if (selectedContacts.length === 0) return;
    
    if (!confirm(`Hapus ${selectedContacts.length} kontak dari daftar ini?`)) return;

    try {
      const response = await fetch(`/api/broadcast/recipient-lists/${list.id}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_ids: selectedContacts }),
      });

      if (response.ok) {
        await fetchContacts();
        setSelectedContacts([]);
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to remove contacts:', error);
    }
  };

  const handleSaveEdit = async () => {
    if (!editData.name.trim()) {
      alert('Nama daftar harus diisi');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/broadcast/recipient-lists/${list.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        setIsEditing(false);
        onRefresh();
        // Update local list data
        list.name = editData.name;
        list.description = editData.description;
      } else {
        alert('Gagal menyimpan perubahan');
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Error: ' + error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: list.name,
      description: list.description || '',
    });
    setIsEditing(false);
  };

  const filteredContacts = contacts.filter(c =>
    c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact.phone_number.includes(searchQuery)
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
      </div>

      {/* List Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      placeholder="Nama Daftar Penerima"
                      className="text-2xl font-bold"
                    />
                  </div>
                  <div>
                    <Input
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      placeholder="Deskripsi (opsional)"
                      className="text-vx-text-secondary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="bg-vx-teal hover:bg-vx-teal/90"
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEdit}
                      disabled={saving}
                    >
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-2xl">{list.name}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  {list.description && (
                    <p className="text-vx-text-secondary mt-1">{list.description}</p>
                  )}
                </div>
              )}
            </div>
            {!isEditing && (
              <div className="ml-4">
                {getSourceBadge(list.source, list.filter_criteria)}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-vx-surface-elevated rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-vx-text-secondary" />
              <div className="text-2xl font-bold text-vx-text">{list.total_contacts}</div>
              <div className="text-sm text-vx-text-secondary">Total Kontak</div>
            </div>
            <div className="text-center p-4 bg-vx-surface-elevated rounded-lg">
              <div className="text-sm text-vx-text-secondary mb-1">Dibuat</div>
              <div className="font-medium text-vx-text">
                {new Date(list.created_at).toLocaleDateString('id-ID')}
              </div>
            </div>
            <div className="text-center p-4 bg-vx-surface-elevated rounded-lg">
              <div className="text-sm text-vx-text-secondary mb-1">Sumber</div>
              <div className="font-medium text-vx-text capitalize">{list.source}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daftar Kontak</CardTitle>
            {selectedContacts.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveContacts}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus ({selectedContacts.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vx-text-muted" />
            <Input
              placeholder="Cari nama atau nomor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-vx-text-muted" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-vx-surface-elevated">
                  <tr>
                    <th className="px-4 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContacts(filteredContacts.map(c => c.id));
                          } else {
                            setSelectedContacts([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-vx-text-secondary">Nama</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-vx-text-secondary">Nomor Telepon</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-vx-text-secondary">Saluran</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-vx-text-secondary">Ditambahkan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredContacts.map((contact) => (
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
                      <td className="px-4 py-3 text-sm font-medium text-vx-text">
                        {contact.contact.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-vx-text">
                        {contact.contact.phone_number}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge className="bg-green-100 text-green-700">WhatsApp</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-vx-text-secondary">
                        {new Date(contact.added_at).toLocaleDateString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredContacts.length === 0 && (
                <div className="text-center py-8 text-vx-text-muted">
                  {searchQuery ? 'Tidak ada hasil pencarian' : 'Belum ada kontak'}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
