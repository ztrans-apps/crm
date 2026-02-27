// API route for chat operations that require service role (bypasses RLS)
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/rbac/with-auth'

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json()
  const { action, ...params } = body

  const supabase = ctx.serviceClient
  const tenantId = ctx.tenantId

  switch (action) {
    // ==================== LABELS ====================
    case 'apply_label': {
      const { conversationId, labelId } = params

      if (!conversationId || !labelId) {
        return NextResponse.json({ error: 'Missing conversationId or labelId' }, { status: 400 })
      }

      // Check max 5 labels
      const { data: existingLabels } = await supabase
        .from('conversation_labels')
        .select('id')
        .eq('conversation_id', conversationId)

      if (existingLabels && existingLabels.length >= 5) {
        return NextResponse.json({ error: 'Maximum 5 labels per conversation' }, { status: 400 })
      }

      // Check if already applied
      const { data: existing } = await supabase
        .from('conversation_labels')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('label_id', labelId)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'Label already applied to this conversation' }, { status: 400 })
      }

      // Apply label
      const { data, error } = await supabase
        .from('conversation_labels')
        .insert({
          conversation_id: conversationId,
          label_id: labelId,
          created_by: ctx.user.id,
          tenant_id: tenantId,
        })
        .select(`*, label:labels(*)`)
        .single()

      if (error) {
        console.error('[apply_label] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    case 'remove_label': {
      const { conversationId, labelId } = params

      if (!conversationId || !labelId) {
        return NextResponse.json({ error: 'Missing conversationId or labelId' }, { status: 400 })
      }

      const { error } = await supabase
        .from('conversation_labels')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('label_id', labelId)

      if (error) {
        console.error('[remove_label] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    case 'get_labels': {
      // Get all labels for the tenant
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[get_labels] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // If no labels exist, create defaults
      if (!data || data.length === 0) {
        const defaultLabels = [
          { name: 'Important', color: '#EF4444' },
          { name: 'Follow-up', color: '#F59E0B' },
          { name: 'Resolved', color: '#10B981' },
          { name: 'Pending', color: '#3B82F6' },
          { name: 'Not Important', color: '#6B7280' },
        ]

        const { data: created, error: createError } = await supabase
          .from('labels')
          .insert(
            defaultLabels.map((label) => ({
              user_id: ctx.user.id,
              name: label.name,
              color: label.color,
              tenant_id: tenantId,
            }))
          )
          .select()

        if (createError) {
          console.error('[get_labels] Error creating defaults:', createError)
          return NextResponse.json({ error: createError.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: created || [] })
      }

      // Remove duplicates by name
      const uniqueLabels = data.reduce((acc: any[], label: any) => {
        if (!acc.find((l: any) => l.name === label.name)) {
          acc.push(label)
        }
        return acc
      }, [])

      return NextResponse.json({ success: true, data: uniqueLabels })
    }

    case 'get_conversation_labels': {
      const { conversationId } = params

      if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('conversation_labels')
        .select(`*, label:labels(*)`)
        .eq('conversation_id', conversationId)

      if (error) {
        console.error('[get_conversation_labels] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: data || [] })
    }

    // ==================== NOTES ====================
    case 'save_note': {
      const { conversationId, content, rating, noteType } = params

      if (!conversationId || !content || content.trim().length === 0) {
        return NextResponse.json({ error: 'Missing conversationId or content' }, { status: 400 })
      }

      if (content.length > 1000) {
        return NextResponse.json({ error: 'Note content exceeds 1000 characters limit' }, { status: 400 })
      }

      if (rating !== null && rating !== undefined && (rating < 0 || rating > 10)) {
        return NextResponse.json({ error: 'Rating must be between 0 and 10' }, { status: 400 })
      }

      // Determine note_type
      let finalNoteType = noteType
      if (!finalNoteType) {
        finalNoteType = (rating && rating > 0) ? 'review' : 'internal'
      }

      const { data, error } = await supabase
        .from('conversation_notes')
        .insert({
          conversation_id: conversationId,
          content: content.trim(),
          rating: rating || null,
          created_by: ctx.user.id,
          note_type: finalNoteType,
          is_visible_to_customer: finalNoteType === 'review',
          tenant_id: tenantId,
        })
        .select()
        .single()

      if (error) {
        console.error('[save_note] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    case 'get_notes': {
      const { conversationId } = params

      if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('conversation_notes')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[get_notes] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: data || [] })
    }

    // ==================== CONVERSATIONS ====================
    case 'mark_as_read': {
      const { conversationId } = params

      if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
      }

      const { error } = await supabase
        .from('conversations')
        .update({
          read_status: 'read',
          unread_count: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      if (error) {
        console.error('[mark_as_read] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    case 'close_conversation': {
      const { conversationId } = params

      if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
      }

      const { error } = await supabase
        .from('conversations')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: ctx.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      if (error) {
        console.error('[close_conversation] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    case 'pick_conversation': {
      const { conversationId } = params

      if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
      }

      const { error } = await supabase
        .from('conversations')
        .update({
          assigned_to: ctx.user.id,
          assignment_method: 'manual',
          workflow_status: 'waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .is('assigned_to', null)

      if (error) {
        console.error('[pick_conversation] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    case 'assign_conversation': {
      const { conversationId, agentId } = params

      if (!conversationId || !agentId) {
        return NextResponse.json({ error: 'Missing conversationId or agentId' }, { status: 400 })
      }

      const { error } = await supabase
        .from('conversations')
        .update({
          assigned_to: agentId,
          assignment_method: 'manual',
          workflow_status: 'waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      if (error) {
        console.error('[assign_conversation] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    case 'handover_conversation': {
      const { conversationId, fromAgentId, toAgentId, reason } = params

      if (!conversationId || !fromAgentId || !toAgentId) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
      }

      // Update conversation assignment
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          assigned_to: toAgentId,
          assignment_method: 'manual',
          workflow_status: 'waiting',
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('assigned_to', fromAgentId)

      if (updateError) {
        console.error('[handover_conversation] Error:', updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Log handover
      await supabase
        .from('handover_logs')
        .insert({
          conversation_id: conversationId,
          from_agent_id: fromAgentId,
          to_agent_id: toAgentId,
          reason: reason || null,
          handover_at: new Date().toISOString(),
          tenant_id: tenantId,
        })

      return NextResponse.json({ success: true })
    }

    case 'update_workflow_status': {
      const { conversationId, status } = params

      if (!conversationId || !status) {
        return NextResponse.json({ error: 'Missing conversationId or status' }, { status: 400 })
      }

      const { error } = await supabase
        .from('conversations')
        .update({
          workflow_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      if (error) {
        console.error('[update_workflow_status] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    // ==================== CONTACTS ====================
    case 'update_contact': {
      const { contactId, name, metadata } = params

      if (!contactId) {
        return NextResponse.json({ error: 'Missing contactId' }, { status: 400 })
      }

      const updateData: any = { updated_at: new Date().toISOString() }
      if (name !== undefined) updateData.name = name
      if (metadata !== undefined) {
        // Extract email and phone from metadata if provided
        if (metadata.email) updateData.email = metadata.email
        if (metadata.mobile_phone) updateData.phone_number = metadata.mobile_phone
        updateData.metadata = metadata
      }

      const { data, error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId)
        .select()
        .single()

      if (error) {
        console.error('[update_contact] Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data })
    }

    case 'update_contact_metadata': {
      const { contactId, metadata } = params

      if (!contactId) {
        return NextResponse.json({ error: 'Missing contactId' }, { status: 400 })
      }

      // Get existing metadata
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('metadata')
        .eq('id', contactId)
        .single()

      const mergedMetadata = {
        ...(existingContact?.metadata || {}),
        ...metadata,
      }

      const { data: metaData, error: metaError } = await supabase
        .from('contacts')
        .update({
          metadata: mergedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId)
        .select()
        .single()

      if (metaError) {
        console.error('[update_contact_metadata] Error:', metaError)
        return NextResponse.json({ error: metaError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: metaData })
    }

    case 'create_contact': {
      const { phoneNumber, name: contactName, metadata: contactMeta } = params

      if (!phoneNumber) {
        return NextResponse.json({ error: 'Missing phoneNumber' }, { status: 400 })
      }

      const contactInsert: any = {
        phone_number: phoneNumber,
        name: contactName || null,
        metadata: contactMeta || {},
        created_at: new Date().toISOString(),
        tenant_id: tenantId,
      }

      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert(contactInsert)
        .select()
        .single()

      if (createError) {
        console.error('[create_contact] Error:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, data: newContact })
    }

    case 'update_contact_from_whatsapp': {
      const { phoneNumber, pushname } = params

      if (!phoneNumber || !pushname) {
        return NextResponse.json({ data: null })
      }

      // Find contact
      const { data: waContact, error: waFindErr } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single()

      if (waFindErr || !waContact) {
        return NextResponse.json({ data: null })
      }

      // Only update if name is not set
      if (!waContact.name || waContact.name.trim() === '') {
        const { data: waUpdated, error: waUpdErr } = await supabase
          .from('contacts')
          .update({
            name: pushname,
            updated_at: new Date().toISOString(),
          })
          .eq('id', waContact.id)
          .select()

        if (waUpdErr) {
          console.error('[update_contact_from_whatsapp] Error:', waUpdErr)
          return NextResponse.json({ error: waUpdErr.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: waUpdated?.[0] })
      }

      return NextResponse.json({ success: true, data: waContact })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
})
