// Reusable Customer Profile Component
'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Mail, Building, Briefcase } from 'lucide-react'

interface CustomerProfileProps {
  contact: any
  onUpdate: (contactId: string, name: string, customFields: any) => Promise<void>
  canEdit: boolean
}

export function CustomerProfile({ contact, onUpdate, canEdit }: CustomerProfileProps) {
  const [customFields, setCustomFields] = useState({
    email: '',
    company: '',
    position: '',
    notes: '',
  })

  useEffect(() => {
    if (contact?.metadata) {
      setCustomFields({
        email: contact.metadata.email || '',
        company: contact.metadata.company || '',
        position: contact.metadata.position || '',
        notes: contact.metadata.notes || '',
      })
    }
  }, [contact])

  const handleSave = async () => {
    if (!contact?.id) return

    try {
      await onUpdate(contact.id, contact.name, customFields)
    } catch (error: any) {
      alert('Gagal memperbarui kontak: ' + error.message)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
          <Mail className="h-2.5 w-2.5 mr-1" />
          Email
        </label>
        <Input
          placeholder="email@example.com"
          value={customFields.email}
          onChange={(e) => setCustomFields({ ...customFields, email: e.target.value })}
          onBlur={handleSave}
          className="h-7 text-xs"
          disabled={!canEdit}
        />
      </div>
      <div>
        <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
          <Building className="h-2.5 w-2.5 mr-1" />
          Perusahaan
        </label>
        <Input
          placeholder="Nama perusahaan"
          value={customFields.company}
          onChange={(e) => setCustomFields({ ...customFields, company: e.target.value })}
          onBlur={handleSave}
          className="h-7 text-xs"
          disabled={!canEdit}
        />
      </div>
      <div>
        <label className="text-[10px] text-gray-500 flex items-center mb-0.5">
          <Briefcase className="h-2.5 w-2.5 mr-1" />
          Posisi
        </label>
        <Input
          placeholder="Jabatan"
          value={customFields.position}
          onChange={(e) => setCustomFields({ ...customFields, position: e.target.value })}
          onBlur={handleSave}
          className="h-7 text-xs"
          disabled={!canEdit}
        />
      </div>
    </div>
  )
}
