'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink } from 'lucide-react';

interface AddNumberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddNumberModal({ open, onOpenChange, onSuccess }: AddNumberModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [label, setLabel] = useState('');
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter the phone number');
      return;
    }

    if (!label.trim()) {
      setError('Please enter a label for this number');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const response = await fetch('/api/whatsapp/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          name: label.trim(),
          metaPhoneNumberId: metaPhoneNumberId.trim() || undefined,
        }),
      });

      if (response.ok) {
        setPhoneNumber('');
        setLabel('');
        setMetaPhoneNumberId('');
        onOpenChange(false);
        onSuccess?.();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to register number');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register WhatsApp Number</DialogTitle>
          <DialogDescription>
            Add a WhatsApp Business number connected via Meta Cloud API
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              With Meta Cloud API, numbers are managed through the{' '}
              <a
                href="https://business.facebook.com/wa/manage/phone-numbers/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium inline-flex items-center gap-1"
              >
                Meta Business Manager <ExternalLink className="h-3 w-3" />
              </a>
              . No QR code scanning needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              placeholder="e.g., Customer Service, Sales Team"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              A friendly name to identify this number in the CRM
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="+6285777078921"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              The WhatsApp Business number with country code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaId">Meta Phone Number ID <span className="text-gray-400">(optional)</span></Label>
            <Input
              id="metaId"
              placeholder="e.g., 123456789012345"
              value={metaPhoneNumberId}
              onChange={(e) => setMetaPhoneNumberId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Found in Meta Developer Console → WhatsApp → API Setup
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!phoneNumber.trim() || !label.trim() || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              'Register Number'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
