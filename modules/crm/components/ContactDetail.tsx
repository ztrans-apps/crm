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
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
            <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
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
          <div className="flex items-center gap-3 text-gray-700">
            <Phone className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{contact.phone_number}</p>
            </div>
          </div>
          
          {contact.email && (
            <div className="flex items-center gap-3 text-gray-700">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{contact.email}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-gray-700">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Added</p>
              <p className="font-medium">
                {new Date(contact.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        {contact.notes && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{contact.notes}</p>
          </div>
        )}

        {/* Last Message */}
        {contact.last_message && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Last Message</h3>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{contact.last_message}</p>
              {contact.last_message_at && (
                <p className="text-sm text-gray-500 mt-1">
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
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
