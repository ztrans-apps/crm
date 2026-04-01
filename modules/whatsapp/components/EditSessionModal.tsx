'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';

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
  const [metaApiToken, setMetaApiToken] = useState('');
  const [metaBusinessAccountId, setMetaBusinessAccountId] = useState('');
  const [metaApiVersion, setMetaApiVersion] = useState('v21.0');
  const [metaWebhookVerifyToken, setMetaWebhookVerifyToken] = useState('');
  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [showApiToken, setShowApiToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
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
      const response = await fetch(`/api/whatsapp/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionName(data.session_name || '');
        setPhoneNumber(data.phone_number || '');
        setMetaPhoneNumberId(data.meta_phone_number_id || '');
        setMetaApiToken(data.meta_api_token || '');
        setMetaBusinessAccountId(data.meta_business_account_id || '');
        setMetaApiVersion(data.meta_api_version || 'v21.0');
        setMetaWebhookVerifyToken(data.meta_webhook_verify_token || '');
        setMetaAppId(data.meta_app_id || '');
        setMetaAppSecret(data.meta_app_secret || '');
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
      const response = await fetch(`/api/whatsapp/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_name: sessionName,
          meta_phone_number_id: metaPhoneNumberId || undefined,
          meta_api_token: metaApiToken || undefined,
          meta_business_account_id: metaBusinessAccountId || undefined,
          meta_api_version: metaApiVersion || 'v21.0',
          meta_webhook_verify_token: metaWebhookVerifyToken || undefined,
          meta_app_id: metaAppId || undefined,
          meta_app_secret: metaAppSecret || undefined,
        }),
      });

      if (response.ok) {
        onSuccess?.();
        onOpenChange(false);
        setSessionName('');
        setPhoneNumber('');
        setMetaPhoneNumberId('');
        setMetaApiToken('');
        setMetaBusinessAccountId('');
        setMetaApiVersion('v21.0');
        setMetaWebhookVerifyToken('');
        setMetaAppId('');
        setMetaAppSecret('');
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit WhatsApp Number</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              
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
                <Label htmlFor="name">Label <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., Customer Service"
                  required
                />
              </div>
            </div>

            {/* Meta Configuration */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-sm">Meta Cloud API Configuration</h3>
              
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

              <div className="space-y-2">
                <Label htmlFor="apiToken">API Access Token</Label>
                <div className="relative">
                  <Input
                    id="apiToken"
                    type={showApiToken ? "text" : "password"}
                    placeholder="EAAxxxxxxxxxx..."
                    value={metaApiToken}
                    onChange={(e) => setMetaApiToken(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiToken(!showApiToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showApiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-vx-text-muted">
                  System User Access Token from Meta Business Settings
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAccountId">Business Account ID</Label>
                <Input
                  id="businessAccountId"
                  placeholder="e.g., 123456789012345"
                  value={metaBusinessAccountId}
                  onChange={(e) => setMetaBusinessAccountId(e.target.value)}
                />
                <p className="text-xs text-vx-text-muted">
                  WhatsApp Business Account ID from Meta Business Manager
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiVersion">API Version</Label>
                <Input
                  id="apiVersion"
                  placeholder="v21.0"
                  value={metaApiVersion}
                  onChange={(e) => setMetaApiVersion(e.target.value)}
                />
                <p className="text-xs text-vx-text-muted">
                  Meta Graph API version (default: v21.0)
                </p>
              </div>
            </div>

            {/* Advanced Configuration */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Advanced Configuration (Optional)</h3>
              
              <div className="space-y-2">
                <Label htmlFor="webhookToken">Webhook Verify Token</Label>
                <Input
                  id="webhookToken"
                  placeholder="your-verify-token"
                  value={metaWebhookVerifyToken}
                  onChange={(e) => setMetaWebhookVerifyToken(e.target.value)}
                />
                <p className="text-xs text-vx-text-muted">
                  Token for webhook verification
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appId">App ID</Label>
                <Input
                  id="appId"
                  placeholder="e.g., 123456789012345"
                  value={metaAppId}
                  onChange={(e) => setMetaAppId(e.target.value)}
                />
                <p className="text-xs text-vx-text-muted">
                  Meta App ID from Developer Console
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="appSecret">App Secret</Label>
                <div className="relative">
                  <Input
                    id="appSecret"
                    type={showAppSecret ? "text" : "password"}
                    placeholder="xxxxxxxxxxxxxxxx"
                    value={metaAppSecret}
                    onChange={(e) => setMetaAppSecret(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAppSecret(!showAppSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showAppSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-vx-text-muted">
                  Meta App Secret from Developer Console
                </p>
              </div>
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
