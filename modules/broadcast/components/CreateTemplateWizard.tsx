'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, ArrowRight, Check, Upload, X, 
  FileText, Image as ImageIcon, Video, FileType,
  Phone, Globe, MessageSquare, Info, Plus
} from 'lucide-react';
import { toast } from '@/lib/stores/toast-store';

interface TemplateData {
  // Step 1: Basic Information
  name: string;
  language: string;
  category: string;
  
  // Step 2: Header Configuration
  headerFormat: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerText?: string;
  headerMedia?: File | null;
  
  // Step 3: Message Body
  bodyText: string;
  footerText?: string;
  
  // Step 4: Buttons & Actions
  buttonType: 'NONE' | 'CALL_TO_ACTION' | 'QUICK_REPLY';
  buttons: Array<{
    type: 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY';
    text: string;
    value?: string;
  }>;
  
  // Step 5: Variables & Examples
  variables: Array<{
    key: string;
    example: string;
  }>;
}

interface CreateTemplateWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTemplate?: Template | null;
}

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  language?: string;
  header_format?: string;
  header_text?: string;
  header_media_url?: string;
  body_text?: string;
  footer_text?: string;
  button_type?: string;
  buttons?: any[];
  variables?: any[];
}

export function CreateTemplateWizard({ open, onClose, onSuccess, editTemplate }: CreateTemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [templateData, setTemplateData] = useState<TemplateData>({
    name: '',
    language: 'id',
    category: '',
    headerFormat: 'NONE',
    bodyText: '',
    buttonType: 'NONE',
    buttons: [],
    variables: [],
  });
  const [saving, setSaving] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);

  // Load edit data when editTemplate changes
  useEffect(() => {
    if (editTemplate && open) {
      setTemplateData({
        name: editTemplate.name || '',
        language: editTemplate.language || 'id',
        category: editTemplate.category || '',
        headerFormat: (editTemplate.header_format as any) || 'NONE',
        headerText: editTemplate.header_text || '',
        bodyText: editTemplate.body_text || editTemplate.content || '',
        footerText: editTemplate.footer_text || '',
        buttonType: (editTemplate.button_type as any) || 'NONE',
        buttons: editTemplate.buttons || [],
        variables: editTemplate.variables || [],
        headerMedia: null,
      });
      
      // Load existing media URL for preview if available
      if (editTemplate.header_media_url && !editTemplate.header_media_url.startsWith('placeholder_')) {
        setMediaPreviewUrl(editTemplate.header_media_url);
      } else {
        setMediaPreviewUrl(null);
      }
    } else if (!editTemplate && open) {
      // Reset for new template
      setTemplateData({
        name: '',
        language: 'id',
        category: '',
        headerFormat: 'NONE',
        bodyText: '',
        buttonType: 'NONE',
        buttons: [],
        variables: [],
      });
      setCurrentStep(1);
      setMediaPreviewUrl(null);
    }
  }, [editTemplate, open]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  const steps = [
    { number: 1, title: 'Basic Information', icon: FileText },
    { number: 2, title: 'Header Configuration', icon: ImageIcon },
    { number: 3, title: 'Message Body', icon: MessageSquare },
    { number: 4, title: 'Buttons & Actions', icon: Globe },
    { number: 5, title: 'Variables & Examples', icon: FileType },
    { number: 6, title: 'Review & Submit', icon: Check },
  ];

  const updateTemplateData = (updates: Partial<TemplateData>) => {
    setTemplateData(prev => ({ ...prev, ...updates }));
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\d+)\}\}/g;
    const matches = text.match(regex) || [];
    return [...new Set(matches)].sort();
  };

  const goToNextStep = () => {
    if (currentStep < 6) {
      // Auto-extract variables when moving from step 3
      if (currentStep === 3) {
        const vars = extractVariables(templateData.bodyText);
        if (vars.length > 0) {
          const variablesList = vars.map(v => ({
            key: v,
            example: templateData.variables.find(vr => vr.key === v)?.example || '',
          }));
          updateTemplateData({ variables: variablesList });
        }
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!(templateData.name && templateData.language && templateData.category);
      case 2:
        if (templateData.headerFormat === 'TEXT') {
          return !!(templateData.headerText && templateData.headerText.length <= 60);
        }
        if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(templateData.headerFormat)) {
          return !!templateData.headerMedia;
        }
        return true;
      case 3:
        return !!(templateData.bodyText && templateData.bodyText.length <= 1024);
      case 4:
        if (templateData.buttonType === 'CALL_TO_ACTION') {
          return templateData.buttons.length > 0 && templateData.buttons.length <= 2;
        }
        if (templateData.buttonType === 'QUICK_REPLY') {
          return templateData.buttons.length > 0 && templateData.buttons.length <= 3;
        }
        return true;
      case 5:
        // Check if all variables have examples
        return templateData.variables.every(v => v.example.trim() !== '');
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      
      // Prepare form data
      const formData = new FormData();
      formData.append('name', templateData.name);
      formData.append('language', templateData.language);
      formData.append('category', templateData.category);
      formData.append('headerFormat', templateData.headerFormat);
      
      if (templateData.headerText) {
        formData.append('headerText', templateData.headerText);
      }
      
      if (templateData.headerMedia) {
        formData.append('headerMedia', templateData.headerMedia);
      }
      
      formData.append('bodyText', templateData.bodyText);
      
      if (templateData.footerText) {
        formData.append('footerText', templateData.footerText);
      }
      
      formData.append('buttonType', templateData.buttonType);
      formData.append('buttons', JSON.stringify(templateData.buttons));
      formData.append('variables', JSON.stringify(templateData.variables));

      const url = editTemplate 
        ? `/api/broadcast/templates/${editTemplate.id}`
        : '/api/broadcast/templates';
      
      const method = editTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (response.ok) {
        onSuccess();
        onClose();
        // Reset form
        setCurrentStep(1);
        setTemplateData({
          name: '',
          language: 'id',
          category: '',
          headerFormat: 'NONE',
          bodyText: '',
          buttonType: 'NONE',
          buttons: [],
          variables: [],
        });
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save template');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-vx-surface overflow-hidden flex flex-col">
      {/* Header */}
      <div className="border-b bg-vx-surface px-6 py-4">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-vx-text">
            {editTemplate ? 'Edit WhatsApp Template' : 'Create WhatsApp Template'}
          </h1>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-vx-surface-hover rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-vx-text-secondary" />
          </button>
        </div>
        <p className="text-sm text-vx-text-secondary">
          {editTemplate 
            ? 'Update your message template for WhatsApp Business account.'
            : 'Create a new message template for your WhatsApp Business account. Templates must be approved before use.'
          }
        </p>
      </div>

      {/* Progress Steps */}
      <div className="border-b bg-vx-surface-elevated px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                    currentStep === step.number
                      ? 'bg-teal-600 border-teal-600 text-white'
                      : currentStep > step.number
                      ? 'bg-teal-100 border-teal-600 text-teal-600'
                      : 'bg-vx-surface-hover border-vx-border text-vx-text-muted'
                  }`}
                >
                  {currentStep > step.number ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.number}</span>
                  )}
                </div>
                <span
                  className={`text-xs mt-2 text-center max-w-[100px] ${
                    currentStep === step.number
                      ? 'text-teal-600 font-semibold'
                      : currentStep > step.number
                      ? 'text-teal-600'
                      : 'text-vx-text-muted'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-3 mb-8 ${
                    currentStep > step.number ? 'bg-teal-600' : 'bg-vx-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area with Split View */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Side - Form Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto">
            {currentStep === 1 && <Step1BasicInformation data={templateData} onChange={updateTemplateData} />}
            {currentStep === 2 && <Step2HeaderConfiguration data={templateData} onChange={updateTemplateData} onMediaPreview={setMediaPreviewUrl} mediaPreviewUrl={mediaPreviewUrl} />}
            {currentStep === 3 && <Step3MessageBody data={templateData} onChange={updateTemplateData} />}
            {currentStep === 4 && <Step4ButtonsActions data={templateData} onChange={updateTemplateData} />}
            {currentStep === 5 && <Step5VariablesExamples data={templateData} onChange={updateTemplateData} />}
            {currentStep === 6 && <Step6ReviewSubmit data={templateData} />}
          </div>
        </div>

        {/* Right Side - WhatsApp Preview (Always Visible) */}
        <div className="w-[380px] border-l bg-vx-surface-elevated overflow-y-auto">
          <WhatsAppPreview data={templateData} mediaPreviewUrl={mediaPreviewUrl} />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t bg-vx-surface px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goToPreviousStep}
            disabled={currentStep === 1}
            className="px-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="text-sm text-vx-text-secondary font-medium">
            Step {currentStep} of {steps.length}
          </div>

          {currentStep < 6 ? (
            <Button
              onClick={goToNextStep}
              disabled={!canProceed()}
              className="bg-teal-600 hover:bg-teal-700 px-4"
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving || !canProceed()}
              className="bg-teal-600 hover:bg-teal-700 px-4"
            >
              {saving ? (editTemplate ? 'Updating...' : 'Submitting...') : (editTemplate ? 'Update' : 'Submit')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Step Components will be added next...


// ============================================================================
// WhatsApp Preview Component (Always Visible)
// ============================================================================
function WhatsAppPreview({ data, mediaPreviewUrl }: { data: TemplateData; mediaPreviewUrl: string | null }) {
  const getPreviewBody = () => {
    return data.bodyText.replace(/\{\{(\d+)\}\}/g, (match, num) => {
      const varIndex = data.variables.findIndex(v => v.key === match);
      return varIndex >= 0 && data.variables[varIndex].example
        ? data.variables[varIndex].example
        : match;
    });
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="mb-3">
        <h3 className="font-semibold text-vx-text text-base mb-0.5">WhatsApp</h3>
        <p className="text-xs text-vx-text-secondary">Preview</p>
      </div>

      {/* Phone Preview */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[280px] bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-gray-800">
          {/* Phone Header */}
          <div className="bg-teal-600 text-white px-3 py-2 flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-teal-600 font-bold text-sm">B</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs truncate">Broadcast</p>
              <p className="text-[10px] opacity-90">+6282876743835</p>
            </div>
          </div>

          {/* Chat Background */}
          <div className="bg-[#e5ddd5] min-h-[350px] max-h-[450px] overflow-y-auto p-3">
            {/* Message Bubble */}
            <div className="bg-white rounded-lg shadow-sm max-w-[90%] overflow-hidden">
              {/* Header */}
              {data.headerFormat === 'TEXT' && data.headerText && (
                <div className="px-2.5 pt-2.5">
                  <p className="font-bold text-gray-900 text-sm">{data.headerText}</p>
                </div>
              )}
              
              {data.headerFormat === 'IMAGE' && (
                <div className="bg-gray-200 h-32 flex items-center justify-center overflow-hidden">
                  {mediaPreviewUrl ? (
                    <img 
                      src={mediaPreviewUrl} 
                      alt="Header preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-600">Image Preview</p>
                    </div>
                  )}
                </div>
              )}

              {data.headerFormat === 'VIDEO' && (
                <div className="bg-gray-200 h-32 flex items-center justify-center overflow-hidden">
                  {mediaPreviewUrl ? (
                    <video 
                      src={mediaPreviewUrl} 
                      className="w-full h-full object-cover"
                      controls={false}
                    />
                  ) : (
                    <div className="text-center">
                      <Video className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-600">Video Preview</p>
                    </div>
                  )}
                </div>
              )}

              {data.headerFormat === 'DOCUMENT' && (
                <div className="bg-gray-100 px-2.5 py-2 flex items-center gap-2">
                  <FileType className="h-8 w-8 text-gray-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {data.headerMedia?.name || 'Document.pdf'}
                    </p>
                    <p className="text-[10px] text-gray-600">PDF Document</p>
                  </div>
                </div>
              )}

              {/* Body */}
              <div className="px-2.5 py-2">
                {data.bodyText ? (
                  <p className="text-gray-900 text-xs whitespace-pre-wrap leading-relaxed">
                    {getPreviewBody()}
                  </p>
                ) : (
                  <p className="text-gray-400 text-xs italic">
                    Your message body will appear here...
                  </p>
                )}
              </div>

              {/* Footer */}
              {data.footerText && (
                <div className="px-2.5 pb-1.5">
                  <p className="text-[10px] text-gray-500">{data.footerText}</p>
                </div>
              )}

              {/* Buttons */}
              {data.buttons.length > 0 && (
                <div className="border-t border-gray-200 mt-1">
                  {data.buttons.map((button, index) => (
                    <button
                      key={index}
                      className="w-full text-center py-2 text-teal-600 text-xs font-semibold hover:bg-gray-50 flex items-center justify-center gap-1.5 border-b border-gray-200 last:border-b-0"
                    >
                      {button.type === 'PHONE_NUMBER' && <Phone className="h-3 w-3" />}
                      {button.type === 'URL' && <Globe className="h-3 w-3" />}
                      {button.type === 'QUICK_REPLY' && <MessageSquare className="h-3 w-3" />}
                      <span>{button.text || `Button ${index + 1}`}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="px-2.5 pb-1.5 pt-0.5">
                <p className="text-[10px] text-gray-400 text-right">11:33 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Info */}
      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-[10px] text-blue-900">
          <strong>Preview:</strong> This shows how your message will appear to customers on WhatsApp.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 1: Basic Information
// ============================================================================
function Step1BasicInformation({ 
  data, 
  onChange 
}: { 
  data: TemplateData; 
  onChange: (updates: Partial<TemplateData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <p className="font-semibold mb-1">Template Naming Guidelines</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-800">
            <li>Names should be descriptive of the template's purpose</li>
            <li>Use underscores instead of spaces</li>
            <li>Names cannot be changed after submission</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="template-name" className="text-sm">
            Template Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="template-name"
            placeholder="order_confirmation"
            value={data.name}
            onChange={(e) => {
              const value = e.target.value.toLowerCase().replace(/\s+/g, '_');
              onChange({ name: value });
            }}
            className="font-mono text-sm h-9"
          />
          <p className="text-xs text-vx-text-muted">
            Use only letters, numbers, and underscores. Spaces will be converted to underscores.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="language" className="text-sm">
            Language <span className="text-red-500">*</span>
          </Label>
          <select
            id="language"
            value={data.language}
            onChange={(e) => onChange({ language: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="id">Indonesian</option>
            <option value="en">English</option>
            <option value="en_US">English (US)</option>
            <option value="en_GB">English (UK)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-sm">
            Category <span className="text-red-500">*</span>
          </Label>
          <select
            id="category"
            value={data.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">Select category...</option>
            <option value="MARKETING">MARKETING - Promotional content</option>
            <option value="UTILITY">UTILITY - Transactional updates</option>
            <option value="AUTHENTICATION">AUTHENTICATION - Security codes</option>
          </select>
          <div className="text-xs text-vx-text-secondary space-y-0.5 mt-1.5 bg-vx-surface-elevated p-2 rounded-lg">
            <p><strong>MARKETING:</strong> Promotional messages, offers, announcements</p>
            <p><strong>UTILITY:</strong> Account updates, order status, reminders</p>
            <p><strong>AUTHENTICATION:</strong> OTP, verification codes, security alerts</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 2: Header Configuration
// ============================================================================
function Step2HeaderConfiguration({ 
  data, 
  onChange,
  onMediaPreview,
  mediaPreviewUrl
}: { 
  data: TemplateData; 
  onChange: (updates: Partial<TemplateData>) => void;
  onMediaPreview: (url: string | null) => void;
  mediaPreviewUrl: string | null;
}) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({ headerMedia: file });
      
      // Generate preview URL for images and videos
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const previewUrl = URL.createObjectURL(file);
        onMediaPreview(previewUrl);
      } else {
        onMediaPreview(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Header Guidelines</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Text headers are limited to 60 characters</li>
            <li>Images should be clear and relevant to the message</li>
            <li>Videos should be under 16MB and less than 30 seconds</li>
            <li>Documents should be in PDF format</li>
          </ul>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-3">
          <Label className="text-base">Header Format</Label>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => {
                onChange({ headerFormat: 'NONE', headerText: '', headerMedia: null });
                onMediaPreview(null);
              }}
              className={`p-5 border-2 rounded-lg text-left transition-colors ${
                data.headerFormat === 'NONE'
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-vx-border hover:border-vx-border'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <X className="h-6 w-6" />
                <span className="font-semibold text-base">None</span>
              </div>
              <p className="text-sm text-vx-text-secondary">No header</p>
            </button>

            <button
              type="button"
              onClick={() => {
                onChange({ headerFormat: 'TEXT', headerMedia: null });
                onMediaPreview(null);
              }}
              className={`p-5 border-2 rounded-lg text-left transition-colors ${
                data.headerFormat === 'TEXT'
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-vx-border hover:border-vx-border'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6" />
                <span className="font-semibold text-base">Text</span>
              </div>
              <p className="text-sm text-vx-text-secondary">Max 60 chars</p>
            </button>

            <button
              type="button"
              onClick={() => {
                onChange({ headerFormat: 'IMAGE', headerText: '' });
                onMediaPreview(null);
              }}
              className={`p-5 border-2 rounded-lg text-left transition-colors ${
                data.headerFormat === 'IMAGE'
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-vx-border hover:border-vx-border'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <ImageIcon className="h-6 w-6" />
                <span className="font-semibold text-base">Image</span>
              </div>
              <p className="text-sm text-vx-text-secondary">Max 5MB</p>
            </button>

            <button
              type="button"
              onClick={() => {
                onChange({ headerFormat: 'VIDEO', headerText: '' });
                onMediaPreview(null);
              }}
              className={`p-5 border-2 rounded-lg text-left transition-colors ${
                data.headerFormat === 'VIDEO'
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-vx-border hover:border-vx-border'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Video className="h-6 w-6" />
                <span className="font-semibold text-base">Video</span>
              </div>
              <p className="text-sm text-vx-text-secondary">&lt;16MB, &lt;30s</p>
            </button>

            <button
              type="button"
              onClick={() => {
                onChange({ headerFormat: 'DOCUMENT', headerText: '' });
                onMediaPreview(null);
              }}
              className={`p-5 border-2 rounded-lg text-left transition-colors ${
                data.headerFormat === 'DOCUMENT'
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-vx-border hover:border-vx-border'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <FileType className="h-6 w-6" />
                <span className="font-semibold text-base">Document</span>
              </div>
              <p className="text-sm text-vx-text-secondary">PDF only</p>
            </button>
          </div>
        </div>

        {data.headerFormat === 'TEXT' && (
          <div className="space-y-2">
            <Label htmlFor="header-text" className="text-base">
              Header Text <span className="text-red-500">*</span>
            </Label>
            <Input
              id="header-text"
              placeholder="Special Offer Just for You!"
              value={data.headerText || ''}
              onChange={(e) => onChange({ headerText: e.target.value })}
              maxLength={60}
              className="text-base h-11"
            />
            <p className="text-sm text-vx-text-muted">
              {(data.headerText || '').length}/60 characters
            </p>
          </div>
        )}

        {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(data.headerFormat) && (
          <div className="space-y-2">
            <Label htmlFor="header-media" className="text-base">
              Upload {data.headerFormat} <span className="text-red-500">*</span>
            </Label>
            
            {/* Show existing media preview if in edit mode */}
            {!data.headerMedia && mediaPreviewUrl && (
              <div className="mb-3 p-4 bg-vx-surface-elevated border rounded-lg">
                <p className="text-sm text-vx-text-secondary mb-2 font-semibold">Current {data.headerFormat}:</p>
                {data.headerFormat === 'IMAGE' && (
                  <img 
                    src={mediaPreviewUrl} 
                    alt="Current header" 
                    className="max-h-48 rounded border"
                  />
                )}
                {data.headerFormat === 'VIDEO' && (
                  <video 
                    src={mediaPreviewUrl} 
                    className="max-h-48 rounded border"
                    controls
                  />
                )}
                {data.headerFormat === 'DOCUMENT' && (
                  <div className="flex items-center gap-2 text-vx-text-secondary">
                    <FileType className="h-8 w-8" />
                    <span className="text-sm">Document uploaded</span>
                  </div>
                )}
                <p className="text-xs text-vx-text-muted mt-2">Upload a new file to replace this</p>
              </div>
            )}
            
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-teal-500 transition-colors">
              <Upload className="h-12 w-12 text-vx-text-muted mx-auto mb-3" />
              <input
                id="header-media"
                type="file"
                accept={
                  data.headerFormat === 'IMAGE' ? 'image/*' :
                  data.headerFormat === 'VIDEO' ? 'video/*' :
                  'application/pdf'
                }
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="header-media" className="cursor-pointer">
                <span className="text-teal-600 hover:text-teal-700 font-semibold text-base">
                  Click to upload
                </span>
                <span className="text-vx-text-secondary"> or drag and drop</span>
              </label>
              {data.headerMedia && (
                <p className="text-sm text-vx-text-secondary mt-3 font-semibold">
                  ✓ New file selected: {data.headerMedia.name}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STEP 3: Message Body
// ============================================================================
function Step3MessageBody({ 
  data, 
  onChange 
}: { 
  data: TemplateData; 
  onChange: (updates: Partial<TemplateData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <p className="font-semibold mb-1">Body Text Guidelines</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-800">
            <li>Use clear, concise language</li>
            <li>Add variables using the {'{{1}}'} syntax</li>
            <li>Provide examples for all variables in the next step</li>
            <li>Footer text is optional and limited to 60 characters</li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="body-text" className="text-sm">
            Body <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="body-text"
            placeholder="Hello {{1}}, your order {{2}} is ready for pickup!"
            value={data.bodyText}
            onChange={(e) => onChange({ bodyText: e.target.value })}
            rows={8}
            maxLength={1024}
            className="font-sans text-sm resize-none"
          />
          <p className="text-xs text-vx-text-muted">
            {data.bodyText.length}/1024 characters
          </p>
          <div className="bg-vx-surface-elevated border rounded-lg p-2.5 text-xs text-vx-text-secondary">
            <p className="font-semibold mb-1">Variable Syntax:</p>
            <p>• {'{{1}}'} for first variable (e.g., customer name)</p>
            <p>• {'{{2}}'} for second variable (e.g., order number)</p>
            <p>• {'{{3}}'} for third variable (e.g., date)</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="footer-text" className="text-sm">Footer Text (Optional)</Label>
          <Input
            id="footer-text"
            placeholder="Reply STOP to unsubscribe"
            value={data.footerText || ''}
            onChange={(e) => onChange({ footerText: e.target.value })}
            maxLength={60}
            className="text-sm h-9"
          />
          <p className="text-xs text-vx-text-muted">
            {(data.footerText || '').length}/60 characters
          </p>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// STEP 4: Buttons & Actions
// ============================================================================
function Step4ButtonsActions({ 
  data, 
  onChange 
}: { 
  data: TemplateData; 
  onChange: (updates: Partial<TemplateData>) => void;
}) {
  const addButton = (type: 'PHONE_NUMBER' | 'URL' | 'QUICK_REPLY') => {
    const newButton = { type, text: '', value: type !== 'QUICK_REPLY' ? '' : undefined };
    onChange({ buttons: [...data.buttons, newButton] });
  };

  const updateButton = (index: number, updates: Partial<typeof data.buttons[0]>) => {
    const newButtons = [...data.buttons];
    newButtons[index] = { ...newButtons[index], ...updates };
    onChange({ buttons: newButtons });
  };

  const removeButton = (index: number) => {
    const newButtons = data.buttons.filter((_, i) => i !== index);
    onChange({ buttons: newButtons });
  };

  const maxButtons = data.buttonType === 'CALL_TO_ACTION' ? 2 : 3;
  const canAddMore = data.buttons.length < maxButtons;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Button Guidelines</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Quick Reply buttons are limited to 3 buttons</li>
            <li>Call-to-Action buttons are limited to 2 buttons</li>
            <li>Button text is limited to 20 characters</li>
            <li>Phone numbers should include country code (e.g., +6281234567890)</li>
            <li>URLs should be valid and include https:// prefix</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Button Type</Label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => onChange({ buttonType: 'NONE', buttons: [] })}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                data.buttonType === 'NONE'
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-vx-border hover:border-vx-border'
              }`}
            >
              <X className="h-5 w-5 mx-auto mb-1" />
              <span className="font-semibold text-sm">None</span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ buttonType: 'CALL_TO_ACTION', buttons: [] })}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                data.buttonType === 'CALL_TO_ACTION'
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-vx-border hover:border-vx-border'
              }`}
            >
              <Globe className="h-5 w-5 mx-auto mb-1" />
              <span className="font-semibold text-sm">Call to Action</span>
              <p className="text-xs text-vx-text-secondary mt-1">Max 2</p>
            </button>

            <button
              type="button"
              onClick={() => onChange({ buttonType: 'QUICK_REPLY', buttons: [] })}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                data.buttonType === 'QUICK_REPLY'
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-vx-border hover:border-vx-border'
              }`}
            >
              <MessageSquare className="h-5 w-5 mx-auto mb-1" />
              <span className="font-semibold text-sm">Quick Reply</span>
              <p className="text-xs text-vx-text-secondary mt-1">Max 3</p>
            </button>
          </div>
        </div>

        {data.buttonType === 'CALL_TO_ACTION' && (
          <div className="space-y-3">
            <Label>Call-to-Action Buttons (Max 2)</Label>
            
            {data.buttons.map((button, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Action Type</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeButton(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateButton(index, { type: 'PHONE_NUMBER' })}
                      className={`p-3 border-2 rounded-lg text-left transition-colors ${
                        button.type === 'PHONE_NUMBER'
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-vx-border'
                      }`}
                    >
                      <Phone className="h-4 w-4 mb-1" />
                      <span className="text-sm font-semibold">Call Phone</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => updateButton(index, { type: 'URL' })}
                      className={`p-3 border-2 rounded-lg text-left transition-colors ${
                        button.type === 'URL'
                          ? 'border-teal-600 bg-teal-50'
                          : 'border-vx-border'
                      }`}
                    >
                      <Globe className="h-4 w-4 mb-1" />
                      <span className="text-sm font-semibold">Visit Website</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input
                      placeholder={button.type === 'PHONE_NUMBER' ? 'Call Support' : 'Shop Now'}
                      value={button.text}
                      onChange={(e) => updateButton(index, { text: e.target.value })}
                      maxLength={20}
                    />
                    <p className="text-xs text-vx-text-muted">{button.text.length}/20 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      {button.type === 'PHONE_NUMBER' ? 'Phone Number' : 'Website URL'}
                    </Label>
                    <Input
                      placeholder={
                        button.type === 'PHONE_NUMBER' 
                          ? '+6281234567890' 
                          : 'https://example.com'
                      }
                      value={button.value || ''}
                      onChange={(e) => updateButton(index, { value: e.target.value })}
                    />
                  </div>
                </div>
              </Card>
            ))}

            {canAddMore && (
              <Button
                variant="outline"
                onClick={() => addButton('PHONE_NUMBER')}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Button
              </Button>
            )}
          </div>
        )}

        {data.buttonType === 'QUICK_REPLY' && (
          <div className="space-y-3">
            <Label>Quick Reply Buttons (Max 3)</Label>
            
            {data.buttons.map((button, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Button ${index + 1}`}
                  value={button.text}
                  onChange={(e) => updateButton(index, { text: e.target.value })}
                  maxLength={20}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeButton(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {canAddMore && (
              <Button
                variant="outline"
                onClick={() => addButton('QUICK_REPLY')}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Button
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STEP 5: Variables & Examples
// ============================================================================
function Step5VariablesExamples({ 
  data, 
  onChange 
}: { 
  data: TemplateData; 
  onChange: (updates: Partial<TemplateData>) => void;
}) {
  const updateVariable = (index: number, example: string) => {
    const newVariables = [...data.variables];
    newVariables[index] = { ...newVariables[index], example };
    onChange({ variables: newVariables });
  };

  if (data.variables.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">No variables detected in your message.</p>
            <p>If you want to add dynamic content, go back to the Message Body step and add variables using the {'{{1}}'} syntax.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Variables & Examples</p>
          <p className="text-blue-800">
            Provide example values for each variable. These examples help WhatsApp understand your template usage and are required for approval.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Variable Examples</Label>
        {data.variables.map((variable, index) => (
          <div key={variable.key} className="space-y-2">
            <Label htmlFor={`var-${index}`}>
              Variable {variable.key} <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`var-${index}`}
              placeholder={
                index === 0 ? 'John Doe' :
                index === 1 ? 'ORD-12345' :
                'Example value'
              }
              value={variable.example}
              onChange={(e) => updateVariable(index, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="bg-vx-surface-elevated border rounded-lg p-4">
        <p className="text-sm font-semibold text-vx-text mb-2">Preview with Examples:</p>
        <p className="text-sm text-vx-text-secondary whitespace-pre-wrap">
          {data.bodyText.replace(/\{\{(\d+)\}\}/g, (match, num) => {
            const varIndex = data.variables.findIndex(v => v.key === match);
            return varIndex >= 0 && data.variables[varIndex].example
              ? data.variables[varIndex].example
              : match;
          })}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// STEP 6: Review & Submit
// ============================================================================
function Step6ReviewSubmit({ data }: { data: TemplateData }) {
  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
        <Info className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-900">
          <p className="font-semibold mb-1">Before You Submit</p>
          <ul className="list-disc list-inside space-y-1 text-yellow-800">
            <li>Review your template carefully - templates cannot be edited after submission</li>
            <li>Ensure all variables have appropriate examples</li>
            <li>Check that your template complies with WhatsApp's guidelines</li>
            <li>Templates typically take 1-2 days (or more) for review</li>
          </ul>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-vx-text mb-4 text-lg">Template Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-sm text-vx-text-secondary">Name:</span>
                <p className="font-mono font-semibold text-base">{data.name || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-vx-text-secondary">Language:</span>
                <p className="font-semibold text-base">{data.language || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-vx-text-secondary">Category:</span>
                <p className="font-semibold text-base">{data.category || '-'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-sm text-vx-text-secondary">Header Format:</span>
                <p className="font-semibold text-base">{data.headerFormat || 'NONE'}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-vx-text mb-4 text-lg">Template Content</h3>
            
            {data.headerFormat !== 'NONE' && (
              <div className="mb-4 p-3 bg-vx-surface-elevated rounded-lg">
                <span className="text-xs text-vx-text-secondary uppercase font-semibold">Header:</span>
                {data.headerFormat === 'TEXT' && (
                  <p className="font-semibold text-vx-text mt-1">{data.headerText}</p>
                )}
                {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(data.headerFormat) && (
                  <p className="text-sm text-vx-text-secondary mt-1">
                    {data.headerFormat} {data.headerMedia ? `(${data.headerMedia.name})` : '(Uploaded)'}
                  </p>
                )}
              </div>
            )}

            <div className="mb-4 p-3 bg-vx-surface-elevated rounded-lg">
              <span className="text-xs text-vx-text-secondary uppercase font-semibold">Body:</span>
              <p className="text-vx-text whitespace-pre-wrap mt-1">{data.bodyText || '-'}</p>
            </div>

            {data.footerText && (
              <div className="mb-4 p-3 bg-vx-surface-elevated rounded-lg">
                <span className="text-xs text-vx-text-secondary uppercase font-semibold">Footer:</span>
                <p className="text-sm text-vx-text-secondary mt-1">{data.footerText}</p>
              </div>
            )}

            {data.buttons.length > 0 && (
              <div className="p-3 bg-vx-surface-elevated rounded-lg">
                <span className="text-xs text-vx-text-secondary uppercase font-semibold">Buttons:</span>
                <div className="space-y-2 mt-2">
                  {data.buttons.map((button, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm bg-vx-surface p-2 rounded">
                      {button.type === 'PHONE_NUMBER' && <Phone className="h-4 w-4 text-teal-600" />}
                      {button.type === 'URL' && <Globe className="h-4 w-4 text-teal-600" />}
                      {button.type === 'QUICK_REPLY' && <MessageSquare className="h-4 w-4 text-teal-600" />}
                      <span className="font-semibold">{button.text}</span>
                      {button.value && <span className="text-vx-text-secondary">→ {button.value}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {data.variables.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-vx-text mb-4 text-lg">Variable Examples</h3>
              <div className="space-y-2">
                {data.variables.map((variable, index) => (
                  <div key={variable.key} className="flex items-center gap-3 text-sm p-2 bg-vx-surface-elevated rounded">
                    <span className="font-mono text-vx-text-secondary font-semibold">{variable.key}</span>
                    <span className="text-vx-text-muted">→</span>
                    <span className="font-semibold text-vx-text">{variable.example}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
        <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-green-900">
          <p className="font-semibold mb-1">Ready to Submit</p>
          <p className="text-green-800">
            Your template is ready for submission. Check the preview on the right to see how it will appear to customers.
          </p>
        </div>
      </div>
    </div>
  );
}
