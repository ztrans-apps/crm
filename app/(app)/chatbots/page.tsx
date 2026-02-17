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
      <div className="h-full bg-gray-50 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bot className="h-6 w-6 text-blue-600" />
                Chatbots
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Automate conversations with AI-powered chatbots
              </p>
            </div>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Chatbot
            </Button>
          </div>
        </div>

        {/* Chatbots List */}
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </CardContent>
          </Card>
        ) : chatbots.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Bot className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Chatbots Yet</h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Create your first chatbot to automate responses and handle common questions
              </p>
              <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
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
                        <h3 className="text-lg font-semibold text-gray-900">{chatbot.name}</h3>
                        {chatbot.is_active ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            Inactive
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {chatbot.trigger_type}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-4">{chatbot.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Priority: {chatbot.priority}</span>
                        <span>Created: {new Date(chatbot.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleToggleActive(chatbot)}
                        className={`p-2 rounded-lg transition-colors ${
                          chatbot.is_active
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={chatbot.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(chatbot)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(chatbot)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
