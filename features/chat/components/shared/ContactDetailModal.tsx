// Contact Detail Modal - Simple and Clean Design
'use client'

import { useState, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ContactDetailModalProps {
  open: boolean
  onClose: () => void
  contact: any
  onUpdate?: (contactId: string, name: string, customFields: any) => Promise<void>
  canEdit?: boolean
  initialEditMode?: boolean
}

export function ContactDetailModal({
  open,
  onClose,
  contact,
  onUpdate,
  canEdit = false,
  initialEditMode = false
}: ContactDetailModalProps) {
  const [editing, setEditing] = useState(initialEditMode)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    salutation: '',
    organization: '',
    address: '',
    city: '',
    country: '',
  })

  // Initialize form data when contact changes or modal opens
  useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact?.name?.split(' ')[0] || '',
        last_name: contact?.name?.split(' ').slice(1).join(' ') || '',
        email: contact?.email || contact?.metadata?.email || '',
        phone_number: contact?.phone_number || '',
        salutation: contact?.metadata?.salutation || '',
        organization: contact?.metadata?.organization || '',
        address: contact?.metadata?.street || '',
        city: contact?.metadata?.city || '',
        country: contact?.metadata?.country || '',
      })
    }
  }, [contact, open])

  // Set editing mode when initialEditMode changes
  useEffect(() => {
    setEditing(initialEditMode)
  }, [initialEditMode])

  const handleSave = async () => {
    if (!contact?.id || !onUpdate) {
      return
    }
    
    // Validate required fields
    const newErrors: { [key: string]: string } = {}
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First Name wajib diisi'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    // Clear errors if validation passes
    setErrors({})
    
    setSaving(true)
    try {
      const fullName = `${formData.first_name} ${formData.last_name}`.trim()
      
      // Prepare custom fields for metadata
      const customFields = {
        salutation: formData.salutation,
        email: formData.email,
        organization: formData.organization,
        street: formData.address,
        city: formData.city,
        country: formData.country,
      }
      
      await onUpdate(contact.id, fullName, customFields)
      
      setEditing(false)
      setErrors({})
      onClose()
    } catch (error: any) {
      console.error('Save error:', error)
      setErrors({ submit: error.message || 'Gagal menyimpan kontak' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setErrors({})
    // Reset form data
    if (contact) {
      setFormData({
        first_name: contact?.name?.split(' ')[0] || '',
        last_name: contact?.name?.split(' ').slice(1).join(' ') || '',
        email: contact?.email || contact?.metadata?.email || '',
        phone_number: contact?.phone_number || '',
        salutation: contact?.metadata?.salutation || '',
        organization: contact?.metadata?.organization || '',
        address: contact?.metadata?.street || '',
        city: contact?.metadata?.city || '',
        country: contact?.metadata?.country || '',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {editing ? 'Edit Contact Information' : 'Contact Information'}
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-6">
          {!editing ? (
            // View Mode
            <div className="space-y-4">
              <div>
                <label className="text-sm text-vx-text-secondary mb-1 block">Salutation</label>
                <p className="text-base text-vx-text">{formData.salutation || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-vx-text-secondary mb-1 block">First Name</label>
                  <p className="text-base text-vx-text">{formData.first_name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-vx-text-secondary mb-1 block">Last Name</label>
                  <p className="text-base text-vx-text">{formData.last_name || '-'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm text-vx-text-secondary mb-1 block">Email</label>
                <p className="text-base text-vx-text">{formData.email || '-'}</p>
              </div>

              <div>
                <label className="text-sm text-vx-text-secondary mb-1 block">Phone Number</label>
                <p className="text-base text-vx-text">{formData.phone_number || '-'}</p>
              </div>

              <div>
                <label className="text-sm text-vx-text-secondary mb-1 block">Organization</label>
                <p className="text-base text-vx-text">{formData.organization || '-'}</p>
              </div>

              <div>
                <label className="text-sm text-vx-text-secondary mb-1 block">Address</label>
                <p className="text-base text-vx-text">{formData.address || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-vx-text-secondary mb-1 block">City</label>
                  <p className="text-base text-vx-text">{formData.city || '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-vx-text-secondary mb-1 block">Country</label>
                  <p className="text-base text-vx-text">{formData.country || '-'}</p>
                </div>
              </div>

              {canEdit && (
                <div className="pt-4">
                  <Button
                    onClick={() => setEditing(true)}
                    className="w-full h-11 bg-vx-purple hover:bg-vx-purple/90"
                  >
                    Edit Contact
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Edit Mode
            <div className="space-y-4">
              {/* Salutation Dropdown */}
              <div>
                <label className="text-sm text-vx-text-secondary mb-2 block">Salutation</label>
                <Select
                  value={formData.salutation}
                  onValueChange={(value) => setFormData({ ...formData, salutation: value })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select salutation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr.">Mr.</SelectItem>
                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                    <SelectItem value="Ms.">Ms.</SelectItem>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Prof.">Prof.</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-vx-text-secondary mb-2 block">
                    First Name <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => {
                      setFormData({ ...formData, first_name: e.target.value })
                      if (errors.first_name) {
                        setErrors({ ...errors, first_name: '' })
                      }
                    }}
                    placeholder="John"
                    className={`h-11 ${errors.first_name ? 'border-red-500 dark:border-red-400' : ''}`}
                    required
                  />
                  {errors.first_name && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{errors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-vx-text-secondary mb-2 block">Last Name</label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Smith"
                    className="h-11"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm text-vx-text-secondary mb-2 block">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@company.com"
                  className="h-11"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-sm text-vx-text-secondary mb-2 block">Phone Number</label>
                <Input
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="h-11"
                  disabled
                />
              </div>

              {/* Organization */}
              <div>
                <label className="text-sm text-vx-text-secondary mb-2 block">Organization</label>
                <Input
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  placeholder="Company name"
                  className="h-11"
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-sm text-vx-text-secondary mb-2 block">Address</label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                  className="h-11"
                />
              </div>

              {/* City & Country */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-vx-text-secondary mb-2 block">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-vx-text-secondary mb-2 block">Country</label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                    className="h-11"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-11 vx-gradient hover:opacity-90 text-white font-medium"
                >
                  {saving ? 'Saving...' : 'Save Contact'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 h-11"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
