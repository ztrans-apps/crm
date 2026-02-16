'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard';
import { ContactList, ContactForm, ContactDetail } from '@/modules/crm/components';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags?: string[];
  last_message?: string;
  last_message_at?: string;
  created_at: string;
}

export default function ContactsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddContact = () => {
    setShowAddModal(true);
  };

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailModal(true);
  };

  const handleContactSaved = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleEditContact = () => {
    setShowDetailModal(false);
    setShowAddModal(true);
  };

  const handleDeleteContact = async () => {
    if (!selectedContact) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedContact.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/crm/contacts/${selectedContact.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDetailModal(false);
        setSelectedContact(null);
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleSendMessage = () => {
    // TODO: Navigate to chat with this contact
    console.log('Send message to:', selectedContact);
  };

  return (
    <PermissionGuard permission={['contact.view']}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">Manage your customer contacts</p>
        </div>

        <ContactList
          key={refreshKey}
          onAddContact={handleAddContact}
          onSelectContact={handleSelectContact}
        />

        <ContactForm
          open={showAddModal}
          onOpenChange={(open) => {
            setShowAddModal(open);
            if (!open) setSelectedContact(null);
          }}
          onSuccess={handleContactSaved}
          contact={selectedContact || undefined}
        />

        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="sm:max-w-[600px]">
            {selectedContact && (
              <ContactDetail
                contact={selectedContact}
                onEdit={handleEditContact}
                onDelete={handleDeleteContact}
                onMessage={handleSendMessage}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
