'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MessageSquare, Edit, Trash2, Calendar } from 'lucide-react';

interface Contact {
  id: string;
  name?: string;
  phone_number: string;
  email?: string;
  notes?: string;
  tags?: string[];
  avatar_url?: string;
  last_message?: string;
  last_message_at?: string;
  created_at: string;
}

interface ContactDetailProps {
  contact: Contact;
  onEdit?: () => void;
  onDelete?: () => void;
  onMessage?: () => void;
}

export function ContactDetail({ contact, onEdit, onDelete, onMessage }: ContactDetailProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Contact Details</CardTitle>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDelete}
                className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/5"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Section */}
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-vx-purple/10 text-vx-purple text-2xl">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-vx-text">
              {contact.name || contact.phone_number}
            </h2>
            {contact.tags && contact.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {contact.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-vx-text-secondary">
            <Phone className="h-5 w-5 text-vx-text-muted" />
            <div>
              <p className="text-sm text-vx-text-muted">Phone</p>
              <p className="font-medium">{contact.phone_number}</p>
            </div>
          </div>
          
          {contact.email && (
            <div className="flex items-center gap-3 text-vx-text-secondary">
              <Mail className="h-5 w-5 text-vx-text-muted" />
              <div>
                <p className="text-sm text-vx-text-muted">Email</p>
                <p className="font-medium">{contact.email}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-vx-text-secondary">
            <Calendar className="h-5 w-5 text-vx-text-muted" />
            <div>
              <p className="text-sm text-vx-text-muted">Added</p>
              <p className="font-medium">
                {new Date(contact.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {contact.notes && (
          <div>
            <h3 className="font-semibold text-vx-text mb-2">Notes</h3>
            <p className="text-vx-text-secondary whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}

        {/* Last Message */}
        {contact.last_message && (
          <div>
            <h3 className="font-semibold text-vx-text mb-2">Last Message</h3>
            <div className="p-3 bg-vx-surface-elevated rounded-lg">
              <p className="text-vx-text-secondary">{contact.last_message}</p>
              {contact.last_message_at && (
                <p className="text-sm text-vx-text-muted mt-1">
                  {new Date(contact.last_message_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {onMessage && (
          <Button
            onClick={onMessage}
            className="w-full bg-vx-teal hover:bg-vx-teal/90"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
