'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Clock } from 'lucide-react';

interface CampaignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CampaignForm({ open, onOpenChange, onSuccess }: CampaignFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    message_template: '',
    scheduled_at: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (sendNow: boolean = false) => {
    if (!formData.name.trim() || !formData.message_template.trim()) {
      setError('Campaign name and message are required');
      return;
    }

    if (!sendNow && !formData.scheduled_at) {
      setError('Please select a schedule time or send now');
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const response = await fetch('/api/broadcast/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduled_at: sendNow ? null : formData.scheduled_at,
          send_now: sendNow,
        }),
      });

      if (response.ok) {
        setFormData({ name: '', message_template: '', scheduled_at: '' });
        onOpenChange(false);
        onSuccess?.();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create campaign');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Broadcast Campaign</DialogTitle>
          <DialogDescription>
            Send a message to multiple contacts at once
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              placeholder="Summer Promotion 2024"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message_template">Message *</Label>
            <Textarea
              id="message_template"
              placeholder="Hello! We have a special offer for you..."
              value={formData.message_template}
              onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
              disabled={loading}
              rows={5}
            />
            <p className="text-sm text-gray-500">
              {formData.message_template.length} characters
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="scheduled_at">Schedule (Optional)</Label>
            <Input
              id="scheduled_at"
              type="datetime-local"
              value={formData.scheduled_at}
              onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
              disabled={loading}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-sm text-gray-500">
              Leave empty to send immediately
            </p>
          </div>
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          {formData.scheduled_at && (
            <Button
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Campaign
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
