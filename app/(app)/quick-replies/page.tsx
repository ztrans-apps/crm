'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Zap, Search, Edit, Trash2, Copy, Eye } from 'lucide-react';
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard';
import QuickReplyForm from './components/QuickReplyForm';

interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string;
  created_at: string;
}

export default function QuickRepliesPage() {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [filteredReplies, setFilteredReplies] = useState<QuickReply[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedReply, setSelectedReply] = useState<QuickReply | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load quick replies
  const loadQuickReplies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/quick-replies');
      if (response.ok) {
        const data = await response.json();
        setQuickReplies(data.quickReplies || []);
        setFilteredReplies(data.quickReplies || []);
      }
    } catch (error) {
      console.error('Failed to load quick replies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuickReplies();
  }, []);

  // Filter quick replies
  useEffect(() => {
    let filtered = quickReplies;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (reply) =>
          reply.title.toLowerCase().includes(query) ||
          reply.shortcut.toLowerCase().includes(query) ||
          reply.content.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((reply) => reply.category === selectedCategory);
    }

    setFilteredReplies(filtered);
  }, [searchQuery, selectedCategory, quickReplies]);

  const handleEdit = (reply: QuickReply) => {
    setSelectedReply(reply);
    setShowForm(true);
  };

  const handlePreview = (reply: QuickReply) => {
    setSelectedReply(reply);
    setShowPreview(true);
  };

  const handleDelete = async (reply: QuickReply) => {
    if (!confirm(`Hapus quick reply "${reply.title}"?`)) return;

    try {
      const response = await fetch(`/api/quick-replies/${reply.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadQuickReplies();
      }
    } catch (error) {
      console.error('Failed to delete quick reply:', error);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    // TODO: Show toast notification
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedReply(null);
  };

  const handleFormSuccess = () => {
    loadQuickReplies();
  };

  // Get unique categories
  const categories = Array.from(
    new Set(quickReplies.map((r) => r.category).filter(Boolean))
  );

  return (
    <PermissionGuard permission={['settings.manage']}>
      <div className="h-full bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-600" />
                Quick Replies
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage quick reply templates for faster responses
              </p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Quick Reply
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search quick replies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Replies List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Zap className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery || selectedCategory !== 'all'
                  ? 'No quick replies found'
                  : 'No quick replies yet'}
              </p>
              {!searchQuery && selectedCategory === 'all' && (
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Quick Reply
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredReplies.map((reply) => (
                <div
                  key={reply.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-mono">
                          {reply.shortcut}
                        </code>
                        <h3 className="text-base font-semibold text-gray-900">
                          {reply.title}
                        </h3>
                        {reply.category && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                            {reply.category}
                          </span>
                        )}
                        {!reply.is_active && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2 whitespace-pre-wrap">
                        {reply.content.replace(/\\n/g, '\n')}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Used {reply.usage_count} times</span>
                        {reply.last_used_at && (
                          <span>
                            Last used:{' '}
                            {new Date(reply.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handlePreview(reply)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleCopy(reply.content)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copy content"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(reply)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(reply)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Reply Form Modal */}
        <QuickReplyForm
          quickReply={selectedReply}
          isOpen={showForm}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />

        {/* Preview Modal */}
        {showPreview && selectedReply && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Eye className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Quick Reply Preview
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Preview how this quick reply will appear
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Info Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Shortcut</label>
                    <div className="mt-1">
                      <code className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded text-sm font-mono">
                        {selectedReply.shortcut}
                      </code>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Category</label>
                    <div className="mt-1">
                      <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-sm inline-block">
                        {selectedReply.category || 'Uncategorized'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {selectedReply.title}
                  </p>
                </div>

                {/* Message Preview */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">
                    Message Preview
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {/* WhatsApp-style message bubble */}
                    <div className="flex justify-end">
                      <div className="bg-[#d9fdd3] rounded-lg px-4 py-2 max-w-[80%] shadow-sm">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                          {selectedReply.content.replace(/\\n/g, '\n')}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">
                            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <svg className="h-4 w-4 text-blue-500" viewBox="0 0 16 15" fill="currentColor">
                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {selectedReply.usage_count}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Times Used</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedReply.is_active ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Active</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Inactive</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Status</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedReply.last_used_at 
                        ? new Date(selectedReply.last_used_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                        : 'Never'
                      }
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Last Used</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
                <Button
                  onClick={() => {
                    handleCopy(selectedReply.content);
                    setShowPreview(false);
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Content
                </Button>
                <Button
                  onClick={() => {
                    setShowPreview(false);
                    handleEdit(selectedReply);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}
