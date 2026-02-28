'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/lib/stores/toast-store';

interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
}

interface QuickReplyFormProps {
  quickReply?: QuickReply | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickReplyForm({
  quickReply,
  isOpen,
  onClose,
  onSuccess,
}: QuickReplyFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shortcut: '',
    title: '',
    content: '',
    category: '',
    is_active: true,
  });

  useEffect(() => {
    if (quickReply) {
      setFormData({
        shortcut: quickReply.shortcut,
        title: quickReply.title,
        content: quickReply.content,
        category: quickReply.category || '',
        is_active: quickReply.is_active,
      });
    } else {
      setFormData({
        shortcut: '',
        title: '',
        content: '',
        category: '',
        is_active: true,
      });
    }
  }, [quickReply]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = quickReply
        ? `/api/quick-replies/${quickReply.id}`
        : '/api/quick-replies';
      const method = quickReply ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save quick reply');
      }
    } catch (error) {
      console.error('Failed to save quick reply:', error);
      toast.error('Failed to save quick reply');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-vx-surface rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-vx-border">
          <h2 className="text-xl font-semibold text-vx-text">
            {quickReply ? 'Edit Quick Reply' : 'New Quick Reply'}
          </h2>
          <button
            onClick={onClose}
            className="text-vx-text-muted hover:text-vx-text-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shortcut">Shortcut *</Label>
              <Input
                id="shortcut"
                value={formData.shortcut}
                onChange={(e) =>
                  setFormData({ ...formData, shortcut: e.target.value })
                }
                placeholder="/hello"
                required
              />
              <p className="text-xs text-vx-text-muted">
                Start with / (e.g., /hello, /pricing)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="Greetings, Support, Sales"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Welcome Message"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              placeholder="Hello! Welcome to our service. How can I help you today?"
              required
              rows={6}
            />
            <p className="text-xs text-vx-text-muted">
              {formData.content.length} characters
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="rounded border-vx-border text-yellow-600 focus:ring-yellow-500 dark:ring-yellow-400/30"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active (available for use)
            </Label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-vx-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500"
            >
              {loading ? 'Saving...' : quickReply ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
