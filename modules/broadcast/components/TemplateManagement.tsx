'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, FileText, Loader2, Edit, Trash2, Search
} from 'lucide-react';
import { CreateTemplateWizard } from './CreateTemplateWizard';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showWizard, setShowWizard] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/broadcast/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setShowWizard(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus template ini?')) return;

    try {
      const response = await fetch(`/api/broadcast/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'MARKETING':
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Marketing</Badge>;
      case 'UTILITY':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Utility</Badge>;
      case 'AUTHENTICATION':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Authentication</Badge>;
      default:
        return <Badge variant="secondary">{category}</Badge>;
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-12 w-12 text-vx-text-muted animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-vx-text-muted" />
              <Input
                placeholder="Cari template..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg bg-vx-surface"
            >
              <option value="all">Semua Kategori</option>
              <option value="MARKETING">Marketing</option>
              <option value="UTILITY">Utility</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
            <Button onClick={() => setShowWizard(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Buat Template
            </Button>
          </div>
          <p className="text-xs text-vx-text-muted mt-2">
            ℹ️ Templates cannot be edited after creation (WhatsApp Business API guideline)
          </p>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-vx-text-muted mb-4" />
            <h3 className="text-xl font-semibold text-vx-text mb-2">Belum Ada Template</h3>
            <p className="text-vx-text-secondary mb-6">Buat template pesan untuk mempercepat broadcast</p>
            <Button onClick={() => setShowWizard(true)} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-2" />
              Buat Template Pertama
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-vx-text mb-1">{template.name}</h3>
                    {template.category && getCategoryBadge(template.category)}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                      title="View template details"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-vx-text-secondary line-clamp-3 mb-3">
                  {template.content}
                </p>
                
                <div className="text-xs text-vx-text-muted">
                  Digunakan {template.usage_count} kali
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Template Wizard */}
      <CreateTemplateWizard
        open={showWizard}
        onClose={() => {
          setShowWizard(false);
          setEditingTemplate(null);
        }}
        onSuccess={() => {
          fetchTemplates();
          setEditingTemplate(null);
        }}
        editTemplate={editingTemplate}
      />
    </div>
  );
}
