import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  toContactOutput,
  type ContactModel,
} from '@/lib/dto/contact.dto'
import {
  toMessageOutput,
  type MessageModel,
} from '@/lib/dto/message.dto'
import {
  toBroadcastOutput,
  type BroadcastModel,
} from '@/lib/dto/broadcast.dto'

/**
 * Property-Based Tests for Sensitive Field Exclusion
 * 
 * **Validates: Requirements 6.5**
 * 
 * These tests verify that API responses never include sensitive fields
 * like tenant_id, internal metadata, or other sensitive information.
 */

describe('Feature: security-optimization, Property 20: Sensitive Field Exclusion', () => {
  /**
   * Property Test: Contact output should not include tenant_id
   * 
   * This test verifies that when transforming contact models to output DTOs,
   * the tenant_id field is excluded from the response.
   */
  it('should exclude tenant_id from contact output', async () => {
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

          // Verify tenant_id is not in output
          expect(output).not.toHaveProperty('tenant_id')
          
          // Verify internal metadata is not in output
          expect(output).not.toHaveProperty('metadata')

          // Verify expected fields are present
          expect(output).toHaveProperty('id', model.id)
          expect(output).toHaveProperty('phone_number', model.phone_number)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Message output should not include tenant_id
   * 
   * This test verifies that when transforming message models to output DTOs,
   * the tenant_id field is excluded from the response.
   */
  it('should exclude tenant_id from message output', async () => {
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

          // Verify tenant_id is not in output
          expect(output).not.toHaveProperty('tenant_id')
          
          // Verify internal metadata is not in output
          expect(output).not.toHaveProperty('metadata')
          
          // Verify updated_at is not in output (internal field)
          expect(output).not.toHaveProperty('updated_at')

          // Verify expected fields are present
          expect(output).toHaveProperty('id', model.id)
          expect(output).toHaveProperty('conversation_id', model.conversation_id)
          expect(output).toHaveProperty('content', model.content)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Broadcast output should not include tenant_id or recipient_list_id
   * 
   * This test verifies that when transforming broadcast models to output DTOs,
   * sensitive fields like tenant_id and recipient_list_id are excluded.
   */
  it('should exclude tenant_id and recipient_list_id from broadcast output', async () => {
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
          scheduled_at: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()), { nil: null }),
          started_at: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()), { nil: null }),
          completed_at: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()), { nil: null }),
          metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: null }),
          created_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
          updated_at: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
        }),
        async (model: BroadcastModel) => {
          const output = toBroadcastOutput(model)

          // Verify tenant_id is not in output
          expect(output).not.toHaveProperty('tenant_id')
          
          // Verify recipient_list_id is not in output (internal reference)
          expect(output).not.toHaveProperty('recipient_list_id')
          
          // Verify internal metadata is not in output
          expect(output).not.toHaveProperty('metadata')

          // Verify expected fields are present
          expect(output).toHaveProperty('id', model.id)
          expect(output).toHaveProperty('name', model.name)
          expect(output).toHaveProperty('status', model.status)
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Output DTOs should only contain whitelisted fields
   * 
   * This test verifies that output DTOs only contain explicitly defined
   * fields and no additional sensitive or internal fields.
   */
  it('should only include whitelisted fields in contact output', async () => {
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
          const output = toContactOutput(model)
          const outputKeys = Object.keys(output)

          // Define whitelisted fields
          const whitelistedFields = [
            'id',
            'name',
            'phone_number',
            'email',
            'notes',
            'tags',
            'avatar_url',
            'created_at',
            'updated_at',
          ]

          // Verify all output keys are in whitelist
          outputKeys.forEach(key => {
            expect(whitelistedFields).toContain(key)
          })

          // Verify no sensitive fields are present
          const sensitiveFields = ['tenant_id', 'metadata']
          sensitiveFields.forEach(field => {
            expect(outputKeys).not.toContain(field)
          })
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Arrays of outputs should not include sensitive fields
   * 
   * This test verifies that when transforming arrays of models,
   * no sensitive fields leak into any of the output objects.
   */
  it('should exclude sensitive fields from all items in contact list', async () => {
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
          { minLength: 1, maxLength: 10 }
        ),
        async (models: ContactModel[]) => {
          const outputs = models.map(toContactOutput)

          // Verify no output contains sensitive fields
          outputs.forEach(output => {
            expect(output).not.toHaveProperty('tenant_id')
            expect(output).not.toHaveProperty('metadata')
          })

          // Verify all outputs have required fields
          outputs.forEach(output => {
            expect(output).toHaveProperty('id')
            expect(output).toHaveProperty('phone_number')
          })
        }
      ),
      { numRuns: 10 }
    )
  })

  /**
   * Property Test: Sensitive fields should never appear in JSON serialization
   * 
   * This test verifies that even after JSON serialization (as would happen
   * in API responses), sensitive fields are not present.
   */
  it('should not include sensitive fields after JSON serialization', async () => {
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
          const output = toContactOutput(model)
          
          // Serialize to JSON and parse back
          const jsonString = JSON.stringify(output)
          const parsed = JSON.parse(jsonString)

          // Verify sensitive fields are not in parsed JSON
          expect(parsed).not.toHaveProperty('tenant_id')
          expect(parsed).not.toHaveProperty('metadata')

          // Verify the JSON string doesn't contain the tenant_id value
          expect(jsonString).not.toContain(model.tenant_id)
        }
      ),
      { numRuns: 10 }
    )
  })
})
