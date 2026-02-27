'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Plus, Power, Edit, Trash2, BarChart3 } from 'lucide-react';
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard';
import { ChatbotFormModal } from './components/ChatbotFormModal';

interface Chatbot {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: string;
  trigger_config: any;
  priority: number;
  created_at: string;
}

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);

  const loadChatbots = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chatbots');
      if (response.ok) {
        const data = await response.json();
        setChatbots(data.chatbots || []);
      }
    } catch (error) {
      console.error('Failed to load chatbots:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChatbots();
  }, []);

  const handleToggleActive = async (chatbot: Chatbot) => {
    try {
      const response = await fetch(`/api/chatbots/${chatbot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !chatbot.is_active }),
      });

      if (response.ok) {
        loadChatbots();
      }
    } catch (error) {
      console.error('Failed to toggle chatbot:', error);
    }
  };

  const handleDelete = async (chatbot: Chatbot) => {
    if (!confirm(`Delete chatbot "${chatbot.name}"?`)) return;

    try {
      const response = await fetch(`/api/chatbots/${chatbot.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadChatbots();
      }
    } catch (error) {
      console.error('Failed to delete chatbot:', error);
    }
  };

  const handleCreate = () => {
    setSelectedChatbot(null);
    setIsModalOpen(true);
  };

  const handleEdit = (chatbot: Chatbot) => {
    setSelectedChatbot(chatbot);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedChatbot(null);
  };

  const handleModalSuccess = () => {
    loadChatbots();
  };

  return (
    <PermissionGuard permission={['chatbot.manage']}>
      <div className="h-full bg-vx-surface-elevated p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-vx-text flex items-center gap-2">
                <Bot className="h-6 w-6 text-vx-purple" />
                Chatbots
              </h1>
              <p className="text-sm text-vx-text-secondary mt-1">
                Automate conversations with AI-powered chatbots
              </p>
            </div>
            <Button onClick={handleCreate} className="bg-vx-purple hover:bg-vx-purple/90">
              <Plus className="h-4 w-4 mr-2" />
              Create Chatbot
            </Button>
          </div>
        </div>

        {/* Chatbots List */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vx-purple"></div>
            </CardContent>
          </Card>
        ) : chatbots.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-vx-purple/10 rounded-full flex items-center justify-center mb-4">
                <Bot className="h-10 w-10 text-vx-purple" />
              </div>
              <h3 className="text-xl font-semibold text-vx-text mb-2">No Chatbots Yet</h3>
              <p className="text-vx-text-secondary mb-6 text-center max-w-md">
                Create your first chatbot to automate responses and handle common questions
              </p>
              <Button onClick={handleCreate} className="bg-vx-purple hover:bg-vx-purple/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Chatbot
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {chatbots.map((chatbot) => (
              <Card key={chatbot.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-vx-text">{chatbot.name}</h3>
                        {chatbot.is_active ? (
                          <span className="px-2 py-0.5 bg-vx-teal/10 text-vx-teal rounded text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-vx-surface-hover text-vx-text-secondary rounded text-xs font-medium">
                            Inactive
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-vx-purple/10 text-vx-purple rounded text-xs">
                          {chatbot.trigger_type}
                        </span>
                      </div>
                      <p className="text-vx-text-secondary mb-4">{chatbot.description}</p>
                      <div className="flex items-center gap-4 text-sm text-vx-text-muted">
                        <span>Priority: {chatbot.priority}</span>
                        <span>Created: {new Date(chatbot.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleActive(chatbot)}
                        className={`p-2 rounded-lg transition-colors ${
                          chatbot.is_active
                            ? 'text-vx-teal hover:bg-vx-teal/5'
                            : 'text-vx-text-secondary hover:bg-vx-surface-hover'
                        }`}
                        title={chatbot.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-vx-purple hover:bg-vx-purple/5 rounded-lg transition-colors"
                        title="Analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(chatbot)}
                        className="p-2 text-vx-text-secondary hover:bg-vx-surface-hover rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(chatbot)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Form Modal */}
        <ChatbotFormModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          chatbot={selectedChatbot}
        />
      </div>
    </PermissionGuard>
  );
}
