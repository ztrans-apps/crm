'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatbotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chatbot?: {
    id: string;
    name: string;
    description: string;
    trigger_type: string;
    trigger_config: any;
    priority: number;
    is_active: boolean;
  } | null;
}

export function ChatbotFormModal({ isOpen, onClose, onSuccess, chatbot }: ChatbotFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    trigger_type: 'keyword',
    keywords: '',
    priority: 10,
    is_active: true,
    flow_message: '', // Simple flow: just one message response
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (chatbot) {
      setFormData({
        name: chatbot.name,
        description: chatbot.description || '',
        trigger_type: chatbot.trigger_type,
        keywords: chatbot.trigger_config?.keywords?.join(', ') || '',
        priority: chatbot.priority,
        is_active: chatbot.is_active,
        flow_message: chatbot.trigger_config?.response_message || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        trigger_type: 'keyword',
        keywords: '',
        priority: 10,
        is_active: true,
        flow_message: '',
      });
    }
    setError('');
  }, [chatbot, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const trigger_config: any = {};
      
      if (formData.trigger_type === 'keyword') {
        trigger_config.keywords = formData.keywords
          .split(',')
          .map(k => k.trim())
          .filter(k => k.length > 0);
      }

      // Add response message to trigger_config
      trigger_config.response_message = formData.flow_message;

      const payload = {
        name: formData.name,
        description: formData.description,
        trigger_type: formData.trigger_type,
        trigger_config,
        priority: formData.priority,
        is_active: formData.is_active,
      };

      const url = chatbot ? `/api/chatbots/${chatbot.id}` : '/api/chatbots';
      const method = chatbot ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save chatbot');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {chatbot ? 'Edit Chatbot' : 'Create Chatbot'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Chatbot Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Welcome Bot"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What does this chatbot do?"
                rows={3}
              />
            </div>

            {/* Trigger Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Trigger Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.trigger_type}
                onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="keyword">Keyword</option>
                <option value="greeting">Greeting</option>
                <option value="always">Always</option>
                <option value="schedule">Schedule</option>
                <option value="intent">Intent</option>
              </select>
              <p className="text-xs text-gray-500">
                {formData.trigger_type === 'keyword' && 'Triggered by specific keywords'}
                {formData.trigger_type === 'greeting' && 'Triggered when customer first messages'}
                {formData.trigger_type === 'always' && 'Always active for all messages'}
                {formData.trigger_type === 'schedule' && 'Triggered at specific times'}
                {formData.trigger_type === 'intent' && 'Triggered by detected intent'}
              </p>
            </div>

            {/* Keywords (only for keyword trigger) */}
            {formData.trigger_type === 'keyword' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Keywords <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., hello, hi, hey (comma separated)"
                  required={formData.trigger_type === 'keyword'}
                />
                <p className="text-xs text-gray-500">
                  Separate multiple keywords with commas
                </p>
              </div>
            )}

            {/* Priority */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Priority <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                max="100"
                required
              />
              <p className="text-xs text-gray-500">
                Higher priority bots run first (0-100)
              </p>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active (chatbot will respond to triggers)
              </label>
            </div>

            {/* Flow Message */}
            <div className="space-y-2 pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700">
                Response Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.flow_message}
                onChange={(e) => setFormData({ ...formData, flow_message: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What should the chatbot say when triggered?"
                rows={4}
                required
              />
              <p className="text-xs text-gray-500">
                This message will be sent automatically when the chatbot is triggered
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Saving...' : chatbot ? 'Update Chatbot' : 'Create Chatbot'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
