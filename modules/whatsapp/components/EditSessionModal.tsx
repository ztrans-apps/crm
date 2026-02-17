'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface EditSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  onSuccess?: () => void;
}

export function EditSessionModal({ open, onOpenChange, sessionId, onSuccess }: EditSessionModalProps) {
  const [sessionName, setSessionName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
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
        }),
      });

      if (response.ok) {
        onSuccess?.();
        onOpenChange(false);
        setSessionName('');
        setPhoneNumber('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update session');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit WhatsApp Session</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={phoneNumber}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">Phone number cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Device Name</Label>
              <Input
                id="name"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g., Customer Service Bot"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
