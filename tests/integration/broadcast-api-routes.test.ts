/**
 * Integration tests for Broadcast API routes
 * 
 * Tests the migrated broadcast API routes to ensure they work correctly
 * with the new middleware, service, and repository layers.
 * 
 * Requirements: 4.7, 9.1, 9.2
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Broadcast API Routes Integration', () => {
  let supabase: any
  let testTenantId: string
  let testUserId: string
  let testBroadcastId: string
  let testRecipientListId: string

  beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Use a test tenant ID
    testTenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001'
    testUserId = '00000000-0000-0000-0000-000000000001'

    // Create a test recipient list
    const { data: recipientList } = await supabase
      .from('recipient_lists')
      .insert({
        tenant_id: testTenantId,
        name: 'Test Recipient List',
        description: 'Test list for integration tests',
      })
      .select()
      .single()

    testRecipientListId = recipientList?.id || '00000000-0000-0000-0000-000000000002'
  })

  afterAll(async () => {
    // Clean up test data
    if (testBroadcastId) {
      await supabase
        .from('broadcast_campaigns')
        .delete()
        .eq('id', testBroadcastId)
    }

    if (testRecipientListId) {
      await supabase
        .from('recipient_lists')
        .delete()
        .eq('id', testRecipientListId)
    }
  })

  it('should create a broadcast using BroadcastService', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    const input = {
      name: 'Test Broadcast',
      message_template: 'Hello {{name}}, this is a test message!',
      recipient_list_id: testRecipientListId,
    }

    const broadcast = await broadcastService.createBroadcast(input, testUserId)

    expect(broadcast).toBeDefined()
    expect(broadcast.name).toBe('Test Broadcast')
    expect(broadcast.message_template).toBe('Hello {{name}}, this is a test message!')
    expect(broadcast.status).toBe('draft')
    expect(broadcast.id).toBeDefined()

    testBroadcastId = broadcast.id
  })

  it('should get a broadcast using BroadcastService', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    const broadcast = await broadcastService.getBroadcast(testBroadcastId)

    expect(broadcast).toBeDefined()
    expect(broadcast.id).toBe(testBroadcastId)
    expect(broadcast.name).toBe('Test Broadcast')
    expect(broadcast.status).toBe('draft')
  })

  it('should list broadcasts using BroadcastService', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    const result = await broadcastService.listBroadcasts({
      page: 1,
      pageSize: 50,
    })

    expect(result).toBeDefined()
    expect(result.data).toBeInstanceOf(Array)
    expect(result.total).toBeGreaterThan(0)
    expect(result.data.some(b => b.id === testBroadcastId)).toBe(true)
  })

  it('should filter broadcasts by status', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    const result = await broadcastService.listBroadcasts({
      status: 'draft',
      page: 1,
      pageSize: 50,
    })

    expect(result).toBeDefined()
    expect(result.data).toBeInstanceOf(Array)
    expect(result.data.every(b => b.status === 'draft')).toBe(true)
  })

  it('should update a broadcast using BroadcastService', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    const input = {
      name: 'Updated Broadcast',
      message_template: 'Updated message template',
    }

    const broadcast = await broadcastService.updateBroadcast(testBroadcastId, input, testUserId)

    expect(broadcast).toBeDefined()
    expect(broadcast.id).toBe(testBroadcastId)
    expect(broadcast.name).toBe('Updated Broadcast')
    expect(broadcast.message_template).toBe('Updated message template')
  })

  it('should schedule a broadcast using BroadcastService', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    // Schedule for 1 hour in the future
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    const broadcast = await broadcastService.scheduleBroadcast(testBroadcastId, scheduledAt)

    expect(broadcast).toBeDefined()
    expect(broadcast.status).toBe('scheduled')
    expect(broadcast.scheduled_at).toBe(scheduledAt)
  })

  it('should get broadcast statistics using BroadcastService', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    const stats = await broadcastService.getBroadcastStats(testBroadcastId)

    expect(stats).toBeDefined()
    expect(stats.id).toBe(testBroadcastId)
    expect(stats.name).toBe('Updated Broadcast')
    expect(stats.status).toBe('scheduled')
    expect(stats.total_recipients).toBe(0)
    expect(stats.sent_count).toBe(0)
    expect(stats.delivered_count).toBe(0)
    expect(stats.failed_count).toBe(0)
  })

  it('should cancel a broadcast using BroadcastService', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    await broadcastService.cancelBroadcast(testBroadcastId)

    const broadcast = await broadcastService.getBroadcast(testBroadcastId)

    expect(broadcast).toBeDefined()
    expect(broadcast.status).toBe('cancelled')
  })

  it('should delete a broadcast using BroadcastService', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    await broadcastService.deleteBroadcast(testBroadcastId, testUserId)

    // Verify broadcast is deleted
    await expect(
      broadcastService.getBroadcast(testBroadcastId)
    ).rejects.toThrow()

    // Clear the ID so afterAll doesn't try to delete it again
    testBroadcastId = ''
  })

  it('should validate message template length', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    const input = {
      name: 'Test Broadcast',
      message_template: 'a'.repeat(5000), // Exceeds 4096 character limit
      recipient_list_id: testRecipientListId,
    }

    await expect(
      broadcastService.createBroadcast(input, testUserId)
    ).rejects.toThrow('Message template exceeds maximum length')
  })

  it('should validate scheduled time is in the future', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    const input = {
      name: 'Test Broadcast',
      message_template: 'Test message',
      recipient_list_id: testRecipientListId,
      scheduled_at: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute in the past
    }

    await expect(
      broadcastService.createBroadcast(input, testUserId)
    ).rejects.toThrow('Scheduled time must be in the future')
  })

  it('should prevent updating broadcasts that are not draft or scheduled', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    // Create a broadcast
    const input = {
      name: 'Test Broadcast',
      message_template: 'Test message',
      recipient_list_id: testRecipientListId,
    }

    const broadcast = await broadcastService.createBroadcast(input, testUserId)
    const broadcastId = broadcast.id

    // Manually update status to 'completed' (simulating a completed broadcast)
    await supabase
      .from('broadcast_campaigns')
      .update({ status: 'completed' })
      .eq('id', broadcastId)

    // Try to update the completed broadcast
    await expect(
      broadcastService.updateBroadcast(broadcastId, { name: 'Updated' }, testUserId)
    ).rejects.toThrow('Cannot update broadcast with status')

    // Clean up
    await supabase
      .from('broadcast_campaigns')
      .delete()
      .eq('id', broadcastId)
  })

  it('should prevent deleting scheduled or sending broadcasts', async () => {
    const { BroadcastService } = await import('@/lib/services/broadcast-service')
    const broadcastService = new BroadcastService(supabase, testTenantId)

    // Create and schedule a broadcast
    const input = {
      name: 'Test Broadcast',
      message_template: 'Test message',
      recipient_list_id: testRecipientListId,
    }

    const broadcast = await broadcastService.createBroadcast(input, testUserId)
    const broadcastId = broadcast.id

    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await broadcastService.scheduleBroadcast(broadcastId, scheduledAt)

    // Try to delete the scheduled broadcast
    await expect(
      broadcastService.deleteBroadcast(broadcastId, testUserId)
    ).rejects.toThrow('Cannot delete broadcast with status')

    // Cancel and then delete
    await broadcastService.cancelBroadcast(broadcastId)
    await broadcastService.deleteBroadcast(broadcastId, testUserId)
  })
})
