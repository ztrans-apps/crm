'use client';

import { useState, useEffect } from 'react';
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard';
import { ContactForm, ContactDetail } from '@/modules/crm/components';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  Users, 
  MessageSquare, 
  Calendar,
  Edit,
  Trash2,
  Mail,
  Phone,
  Send
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  notes?: string;
  tags?: string[];
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  metadata?: any;
}

export default function ContactsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    withConversations: 0,
    recentlyActive: 0,
  });

  // Load contacts
  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/contacts');
      if (response.ok) {
        const result = await response.json();
        // API returns { contacts: [...] }
        const contactsArray = Array.isArray(result.contacts) ? result.contacts : [];
        setContacts(contactsArray);
        setFilteredContacts(contactsArray);
        
        // Calculate stats
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        setStats({
          total: contactsArray.length,
          withConversations: contactsArray.filter((c: Contact) => c.last_message).length,
          recentlyActive: contactsArray.filter((c: Contact) => 
            c.last_message_at && new Date(c.last_message_at) > sevenDaysAgo
          ).length,
        });
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
      setFilteredContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(contact =>
      contact.name?.toLowerCase().includes(query) ||
      contact.phone_number?.includes(query) ||
      contact.email?.toLowerCase().includes(query)
    );
    setFilteredContacts(filtered);
  }, [searchQuery, contacts]);

  const handleAddContact = () => {
    setSelectedContact(null);
    setShowAddModal(true);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailModal(true);
  };

  const handleContactSaved = () => {
    loadContacts();
    setShowAddModal(false);
    setSelectedContact(null);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowAddModal(true);
  };

  const handleSendMessage = (contact: Contact) => {
    // TODO: Navigate to chat with this contact
    console.log('Send message to:', contact);
    // You can navigate to /chats with contact filter or open compose modal
  };

  const handleDeleteContact = async (contact: Contact) => {
    if (!confirm(`Yakin ingin menghapus ${contact.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadContacts();
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <PermissionGuard permission={['contact.view']}>
      <div className="h-full bg-vx-surface-elevated p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-vx-text">Contacts</h1>
          <p className="text-sm text-vx-text-secondary mt-1">Kelola kontak customer Anda</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-vx-surface rounded-lg shadow-sm p-5 border border-vx-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-vx-text-secondary">Total Kontak</p>
                <p className="text-3xl font-bold text-vx-text mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-vx-purple/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-vx-purple" />
              </div>
            </div>
          </div>

          <div className="bg-vx-surface rounded-lg shadow-sm p-5 border border-vx-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-vx-text-secondary">Punya Percakapan</p>
                <p className="text-3xl font-bold text-vx-text mt-1">{stats.withConversations}</p>
              </div>
              <div className="w-12 h-12 bg-vx-teal/10 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-vx-teal" />
              </div>
            </div>
          </div>

          <div className="bg-vx-surface rounded-lg shadow-sm p-5 border border-vx-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-vx-text-secondary">Aktif 7 Hari</p>
                <p className="text-3xl font-bold text-vx-text mt-1">{stats.recentlyActive}</p>
              </div>
              <div className="w-12 h-12 bg-vx-purple/10 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-vx-purple" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="bg-vx-surface rounded-lg shadow-sm border border-vx-border mb-4">
          <div className="p-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vx-text-muted" />
              <Input
                placeholder="Cari kontak..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAddContact} className="bg-vx-purple hover:bg-vx-purple/90">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Kontak
            </Button>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-vx-surface rounded-lg shadow-sm border border-vx-border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vx-purple"></div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-vx-text-muted">
              <Users className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'Tidak ada kontak yang ditemukan' : 'Belum ada kontak'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-vx-surface-elevated border-b border-vx-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                      Kontak
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                      Telepon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                      Dibuat
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-vx-text-muted uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-vx-surface divide-y divide-vx-border">
                  {filteredContacts.map((contact) => (
                    <tr 
                      key={contact.id} 
                      className="hover:bg-vx-surface-hover transition-colors cursor-pointer"
                      onClick={() => handleSelectContact(contact)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                            {getInitial(contact.name)}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-vx-text">{contact.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-vx-text-secondary">
                          <Phone className="h-3.5 w-3.5 mr-1.5 text-vx-text-muted" />
                          {contact.phone_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {contact.email ? (
                          <div className="flex items-center text-sm text-vx-text-secondary">
                            <Mail className="h-3.5 w-3.5 mr-1.5 text-vx-text-muted" />
                            {contact.email}
                          </div>
                        ) : (
                          <span className="text-sm text-vx-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-vx-text-muted">
                          {formatDate(contact.created_at)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendMessage(contact);
                            }}
                            className="p-2 text-vx-teal hover:bg-vx-teal/5 rounded-lg transition-colors"
                            title="Kirim Pesan"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditContact(contact);
                            }}
                            className="p-2 text-vx-purple hover:bg-vx-purple/5 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContact(contact);
                            }}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Contact Modal */}
        <ContactForm
          open={showAddModal}
          onOpenChange={(open) => {
            setShowAddModal(open);
            if (!open) setSelectedContact(null);
          }}
          onSuccess={handleContactSaved}
          contact={selectedContact || undefined}
        />

        {/* Contact Detail Modal */}
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="sm:max-w-[600px]">
            {selectedContact && (
              <ContactDetail
                contact={selectedContact}
                onEdit={() => {
                  setShowDetailModal(false);
                  handleEditContact(selectedContact);
                }}
                onDelete={() => {
                  setShowDetailModal(false);
                  handleDeleteContact(selectedContact);
                }}
                onMessage={() => {
                  // TODO: Navigate to chat
                  console.log('Send message to:', selectedContact);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
