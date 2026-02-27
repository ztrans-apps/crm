'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface EditNumberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onSuccess?: () => void;
}

export function EditNumberModal({ open, onOpenChange, sessionId, onSuccess }: EditNumberModalProps) {
  const [sessionName, setSessionName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && sessionId) {
      fetchSessionData();
    }
  }, [open, sessionId]);

  const fetchSessionData = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`/api/whatsapp/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionName(data.session_name || '');
        setPhoneNumber(data.phone_number || '');
        setMetaPhoneNumberId(data.meta_phone_number_id || '');
      }
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/whatsapp/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_name: sessionName,
          meta_phone_number_id: metaPhoneNumberId || undefined,
        }),
      });

      if (response.ok) {
        onSuccess?.();
        onOpenChange(false);
        setSessionName('');
        setPhoneNumber('');
        setMetaPhoneNumberId('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit WhatsApp Number</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                disabled
                className="bg-vx-surface-elevated"
              />
              <p className="text-xs text-vx-text-muted">Phone number cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Label</Label>
              <Input
                id="name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Customer Service"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metaId">Meta Phone Number ID</Label>
              <Input
                id="metaId"
                value={metaPhoneNumberId}
                onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                placeholder="e.g., 123456789012345"
              />
              <p className="text-xs text-vx-text-muted">
                From Meta Developer Console → WhatsApp → API Setup
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-vx-teal hover:bg-vx-teal/90">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
