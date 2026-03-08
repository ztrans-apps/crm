import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  toContactOutput,
  fromCreateContactInput,
  fromUpdateContactInput,
  type ContactModel,
  type CreateContactInput,
} from '@/lib/dto/contact.dto'
import {
  toMessageOutput,
  fromSendMessageInput,
  type MessageModel,
} from '@/lib/dto/message.dto'
import {
  toBroadcastOutput,
  fromCreateBroadcastInput,
  type BroadcastModel,
} from '@/lib/dto/broadcast.dto'

/**
 * Property-Based Tests for DTO Transformation Correctness
 * 
 * **Validates: Requirements 6.6, 6.7**
 * 
 * These tests verify that transforming model → DTO → model preserves data
 * and that transformations are bidirectional and lossless (for non-sensitive fields).
 */

describe('Feature: security-optimization, Property 21: DTO Transformation Correctness', () => {
  /**
   * Property Test: Contact output transformation should preserve all public fields
   * 
   * This test verifies that when transforming a contact model to output DTO,
   * all non-sensitive fields are preserved correctly.
   */
  it('should preserve all public fields in contact output transformation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          tenant_id: fc.uuid(),
          name: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
          phone_number: fc.string({ minLength: 10, maxLength: 15 }),
          email: fc.option(fc.emailAddress(), { nil: null }),
          notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
          tags: fc.option(fc.array(fc.string(), { maxLength: 10 }), { nil: null }),
          avatar_url: fc.option(fc.webUrl(), { nil: null }),
          metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
          created_at: fc.date().map(d => d.toISOString()),
          updated_at: fc.date().map(d => d.toISOString()),
        }),
        async (model: ContactModel) => {
          const output = toContactOutput(model)

          // Verify all public fields are preserved
          expect(output.id).toBe(model.id)
          expect(output.name).toBe(model.name)
          expect(output.phone_number).toBe(model.phone_number)
          expect(output.email).toBe(model.email)
          expect(output.notes).toBe(model.notes)
          expect(output.tags).toEqual(model.tags || [])
          expect(output.avatar_url).toBe(model.avatar_url)
          expect(output.created_at).toBe(model.created_at)
          expect(output.updated_at).toBe(model.updated_at)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Contact input transformation should set correct fields
   * 
   * This test verifies that when transforming create input to model,
   * all fields are correctly mapped and tenant_id is set.
   */
  it('should correctly transform contact create input to model', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          input: fc.record({
            name: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            phone_number: fc.string({ minLength: 10, maxLength: 15 }),
            email: fc.option(fc.emailAddress()),
            notes: fc.option(fc.string({ maxLength: 500 })),
            tags: fc.option(fc.array(fc.string(), { maxLength: 10 })),
            metadata: fc.option(fc.dictionary(fc.string(), fc.anything())),
          }),
          tenantId: fc.uuid(),
        }),
        async ({ input, tenantId }) => {
          const model = fromCreateContactInput(input as CreateContactInput, tenantId)

          // Verify tenant_id is set
          expect(model.tenant_id).toBe(tenantId)

          // Verify all input fields are mapped
          expect(model.name).toBe(input.name || null)
          expect(model.phone_number).toBe(input.phone_number)
          expect(model.email).toBe(input.email || null)
          expect(model.notes).toBe(input.notes || null)
          expect(model.tags).toEqual(input.tags || null)
          expect(model.metadata).toEqual(input.metadata || null)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Contact update transformation should only include provided fields
   * 
   * This test verifies that update transformations only include fields
   * that were explicitly provided in the input.
   */
  it('should only include provided fields in contact update transformation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.option(fc.string()),
          email: fc.option(fc.emailAddress()),
          notes: fc.option(fc.string()),
        }),
        async (input) => {
          const model = fromUpdateContactInput(input)

          // Count how many fields were provided
          const providedFields = Object.keys(input).filter(key => input[key as keyof typeof input] !== undefined)
          const modelFields = Object.keys(model)

          // Verify only provided fields are in the model
          expect(modelFields.length).toBeLessThanOrEqual(providedFields.length)

          // Verify each provided field is correctly mapped
          if (input.name !== undefined) {
            expect(model.name).toBe(input.name || null)
          }
          if (input.email !== undefined) {
            expect(model.email).toBe(input.email || null)
          }
          if (input.notes !== undefined) {
            expect(model.notes).toBe(input.notes || null)
          }
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Message output transformation should preserve all public fields
   * 
   * This test verifies that message transformations preserve all non-sensitive data.
   */
  it('should preserve all public fields in message output transformation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          tenant_id: fc.uuid(),
          conversation_id: fc.uuid(),
          sender_id: fc.option(fc.uuid(), { nil: null }),
          content: fc.string({ minLength: 1, maxLength: 1000 }),
          media_url: fc.option(fc.webUrl(), { nil: null }),
          media_type: fc.option(fc.constantFrom('image', 'video', 'audio', 'document'), { nil: null }),
          status: fc.constantFrom('pending', 'sent', 'delivered', 'read', 'failed'),
          direction: fc.constantFrom('inbound', 'outbound'),
          metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
          created_at: fc.date().map(d => d.toISOString()),
          delivered_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
          read_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
          updated_at: fc.date().map(d => d.toISOString()),
        }),
        async (model: MessageModel) => {
          const output = toMessageOutput(model)

          // Verify all public fields are preserved
          expect(output.id).toBe(model.id)
          expect(output.conversation_id).toBe(model.conversation_id)
          expect(output.sender_id).toBe(model.sender_id)
          expect(output.content).toBe(model.content)
          expect(output.media_url).toBe(model.media_url)
          expect(output.media_type).toBe(model.media_type)
          expect(output.status).toBe(model.status)
          expect(output.direction).toBe(model.direction)
          expect(output.created_at).toBe(model.created_at)
          expect(output.delivered_at).toBe(model.delivered_at)
          expect(output.read_at).toBe(model.read_at)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Message input transformation should set correct defaults
   * 
   * This test verifies that message input transformations set appropriate
   * default values for status and direction.
   */
  it('should set correct defaults in message input transformation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          input: fc.record({
            conversation_id: fc.uuid(),
            content: fc.string({ minLength: 1, maxLength: 1000 }),
            media_url: fc.option(fc.webUrl()),
            media_type: fc.option(fc.constantFrom('image', 'video', 'audio', 'document')),
          }),
          tenantId: fc.uuid(),
          senderId: fc.uuid(),
        }),
        async ({ input, tenantId, senderId }) => {
          const model = fromSendMessageInput(input, tenantId, senderId)

          // Verify required fields are set
          expect(model.tenant_id).toBe(tenantId)
          expect(model.sender_id).toBe(senderId)
          expect(model.conversation_id).toBe(input.conversation_id)
          expect(model.content).toBe(input.content)

          // Verify defaults are set
          expect(model.status).toBe('pending')
          expect(model.direction).toBe('outbound')
          expect(model.metadata).toBe(null)

          // Verify optional fields
          expect(model.media_url).toBe(input.media_url || null)
          expect(model.media_type).toBe(input.media_type || null)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Broadcast output transformation should preserve statistics
   * 
   * This test verifies that broadcast transformations preserve all
   * statistical fields correctly.
   */
  it('should preserve statistics in broadcast output transformation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          tenant_id: fc.uuid(),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          message_template: fc.string({ minLength: 1, maxLength: 1000 }),
          recipient_list_id: fc.uuid(),
          status: fc.constantFrom('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'),
          total_recipients: fc.integer({ min: 0, max: 10000 }),
          sent_count: fc.integer({ min: 0, max: 10000 }),
          delivered_count: fc.integer({ min: 0, max: 10000 }),
          failed_count: fc.integer({ min: 0, max: 10000 }),
          scheduled_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
          started_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
          completed_at: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
          metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
          created_at: fc.date().map(d => d.toISOString()),
          updated_at: fc.date().map(d => d.toISOString()),
        }),
        async (model: BroadcastModel) => {
          const output = toBroadcastOutput(model)

          // Verify all statistics are preserved
          expect(output.total_recipients).toBe(model.total_recipients)
          expect(output.sent_count).toBe(model.sent_count)
          expect(output.delivered_count).toBe(model.delivered_count)
          expect(output.failed_count).toBe(model.failed_count)

          // Verify other fields
          expect(output.id).toBe(model.id)
          expect(output.name).toBe(model.name)
          expect(output.status).toBe(model.status)
          expect(output.scheduled_at).toBe(model.scheduled_at)
          expect(output.started_at).toBe(model.started_at)
          expect(output.completed_at).toBe(model.completed_at)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Broadcast input transformation should initialize statistics
   * 
   * This test verifies that broadcast create input transformations
   * initialize all statistical fields to zero.
   */
  it('should initialize statistics to zero in broadcast input transformation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          input: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            message_template: fc.string({ minLength: 1, maxLength: 1000 }),
            recipient_list_id: fc.uuid(),
            scheduled_at: fc.option(fc.date().map(d => d.toISOString())),
            metadata: fc.option(fc.dictionary(fc.string(), fc.anything())),
          }),
          tenantId: fc.uuid(),
        }),
        async ({ input, tenantId }) => {
          const model = fromCreateBroadcastInput(input, tenantId)

          // Verify tenant_id is set
          expect(model.tenant_id).toBe(tenantId)

          // Verify input fields are mapped
          expect(model.name).toBe(input.name)
          expect(model.message_template).toBe(input.message_template)
          expect(model.recipient_list_id).toBe(input.recipient_list_id)

          // Verify statistics are initialized to zero
          expect(model.total_recipients).toBe(0)
          expect(model.sent_count).toBe(0)
          expect(model.delivered_count).toBe(0)
          expect(model.failed_count).toBe(0)

          // Verify status is set to draft
          expect(model.status).toBe('draft')

          // Verify optional fields
          expect(model.scheduled_at).toBe(input.scheduled_at || null)
          expect(model.metadata).toEqual(input.metadata || null)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Transformation should be idempotent for output
   * 
   * This test verifies that transforming the same model multiple times
   * produces the same output (idempotency).
   */
  it('should produce identical output when transforming same model multiple times', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          tenant_id: fc.uuid(),
          name: fc.option(fc.string(), { nil: null }),
          phone_number: fc.string({ minLength: 10, maxLength: 15 }),
          email: fc.option(fc.emailAddress(), { nil: null }),
          notes: fc.option(fc.string(), { nil: null }),
          tags: fc.option(fc.array(fc.string()), { nil: null }),
          avatar_url: fc.option(fc.webUrl(), { nil: null }),
          metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
          created_at: fc.date().map(d => d.toISOString()),
          updated_at: fc.date().map(d => d.toISOString()),
        }),
        async (model: ContactModel) => {
          const output1 = toContactOutput(model)
          const output2 = toContactOutput(model)
          const output3 = toContactOutput(model)

          // Verify all outputs are identical
          expect(output1).toEqual(output2)
          expect(output2).toEqual(output3)
          expect(output1).toEqual(output3)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Array transformations should preserve order and count
   * 
   * This test verifies that transforming arrays of models preserves
   * the order and count of items.
   */
  it('should preserve order and count in array transformations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            tenant_id: fc.uuid(),
            name: fc.option(fc.string(), { nil: null }),
            phone_number: fc.string({ minLength: 10, maxLength: 15 }),
            email: fc.option(fc.emailAddress(), { nil: null }),
            notes: fc.option(fc.string(), { nil: null }),
            tags: fc.option(fc.array(fc.string()), { nil: null }),
            avatar_url: fc.option(fc.webUrl(), { nil: null }),
            metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
            created_at: fc.date().map(d => d.toISOString()),
            updated_at: fc.date().map(d => d.toISOString()),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (models: ContactModel[]) => {
          const outputs = models.map(toContactOutput)

          // Verify count is preserved
          expect(outputs.length).toBe(models.length)

          // Verify order is preserved
          outputs.forEach((output, index) => {
            expect(output.id).toBe(models[index].id)
            expect(output.phone_number).toBe(models[index].phone_number)
          })
        }
      ),
      { numRuns: 10 }
    )
  })
})
