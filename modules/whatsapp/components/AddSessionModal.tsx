'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode } from 'lucide-react';

interface AddSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (sessionId: string) => void;
}

/** Register WhatsApp number via Baileys (QR scan). No Meta Cloud API credentials. */
export function AddSessionModal({ open, onOpenChange, onSuccess }: AddSessionModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setPhoneNumber('');
    setName('');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a name for this device');
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
          name: name.trim(),
          provider: 'baileys',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        resetForm();
        onOpenChange(false);
        onSuccess?.(data.sessionId);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initialize session');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading) {
          if (!next) resetForm();
          onOpenChange(next);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register WhatsApp Number</DialogTitle>
          <DialogDescription>
            Connect via Baileys (WhatsApp Web). After you continue, scan the QR code with your phone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex gap-3">
            <QrCode className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              No Meta Cloud API or business verification needed. Open WhatsApp on your phone →
              Linked Devices → Link a Device, then scan the QR that appears next.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              Label <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Customer Service, Sales Team"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-gray-500">
              A friendly name to identify this WhatsApp number in the CRM
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              placeholder="+62812345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
              disabled={loading}
            />
            <p className="text-sm text-gray-500">
              Include country code (e.g., +62 for Indonesia)
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
            disabled={!phoneNumber.trim() || !name.trim() || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Continue to QR Scan'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Alias used by Meta-era pages; same Baileys register flow. */
export const AddNumberModal = AddSessionModal;
