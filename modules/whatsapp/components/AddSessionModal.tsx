'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ExternalLink, Eye, EyeOff } from 'lucide-react';

interface AddNumberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddNumberModal({ open, onOpenChange, onSuccess }: AddNumberModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [label, setLabel] = useState('');
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

      const response = await fetch('/api/whatsapp/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber.trim(),
          session_name: label.trim(),
          meta_phone_number_id: metaPhoneNumberId.trim() || undefined,
          meta_api_token: metaApiToken.trim() || undefined,
          meta_business_account_id: metaBusinessAccountId.trim() || undefined,
          meta_api_version: metaApiVersion.trim() || 'v21.0',
          meta_webhook_verify_token: metaWebhookVerifyToken.trim() || undefined,
          meta_app_id: metaAppId.trim() || undefined,
          meta_app_secret: metaAppSecret.trim() || undefined,
        }),
      });

      if (response.ok) {
        setPhoneNumber('');
        setLabel('');
        setMetaPhoneNumberId('');
        setMetaApiToken('');
        setMetaBusinessAccountId('');
        setMetaApiVersion('v21.0');
        setMetaWebhookVerifyToken('');
        setMetaAppId('');
        setMetaAppSecret('');
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Basic Information */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="label">Label <span className="text-red-500">*</span></Label>
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
              <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
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
          </div>

          {/* Meta Configuration */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold text-sm">Meta Cloud API Configuration</h3>
            
            <div className="space-y-2">
              <Label htmlFor="metaId">Meta Phone Number ID</Label>
              <Input
                id="metaId"
                placeholder="e.g., 123456789012345"
                value={metaPhoneNumberId}
                onChange={(e) => setMetaPhoneNumberId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Found in Meta Developer Console → WhatsApp → API Setup
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
                  disabled={loading}
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
              <p className="text-xs text-gray-500">
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
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
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
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
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
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
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
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
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
                  disabled={loading}
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
              <p className="text-xs text-gray-500">
                Meta App Secret from Developer Console
              </p>
            </div>
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
