/**
 * Frontend Integration E2E Tests
 * 
 * Tests complete user flows for frontend-backend integration:
 * - Create contact
 * - Send message
 * - Create broadcast
 * - Error handling and validation feedback
 * - Real-time updates
 * 
 * **Requirements: 9.1, 9.3, 9.7**
 * 
 * Setup: npm install -D @playwright/test
 * Run: npx playwright test tests/e2e/frontend-integration.spec.ts
 */

import { test, expect, type Page } from '@playwright/test'

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'test123456',
}

/**
 * Helper: Login to the application
 */
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[name="email"]', TEST_USER.email)
  await page.fill('input[name="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 })
}

/**
 * Helper: Generate unique test data
 */
function generateTestData() {
  const timestamp = Date.now()
  return {
    contactName: `Test Contact ${timestamp}`,
    contactPhone: `+1555${timestamp.toString().slice(-7)}`,
    contactEmail: `test${timestamp}@example.com`,
    messageContent: `Test message ${timestamp}`,
    broadcastName: `Test Broadcast ${timestamp}`,
    broadcastMessage: `Broadcast message ${timestamp}`,
  }
}

test.describe('Frontend Integration - Complete User Flows', () => {
  test.describe.configure({ mode: 'serial' })

  let testData: ReturnType<typeof generateTestData>
  let createdContactId: string | null = null

  test.beforeAll(() => {
    testData = generateTestData()
  })

  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  /**
   * Test: Create Contact Flow
   * 
   * **Requirement 9.1**: UI components only access data through API routes
   * **Requirement 9.3**: UI components use React hooks that call API routes
   */
  test('should create a new contact successfully', async ({ page }) => {
    // 1. Navigate to contacts page
    await page.goto(`${BASE_URL}/contacts`)
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible()

    // 2. Click "Add Contact" button
    await page.click('button:has-text("Add Contact"), button:has-text("New Contact")')

    // 3. Fill contact form
    await page.fill('input[name="name"]', testData.contactName)
    await page.fill('input[name="phone_number"]', testData.contactPhone)
    await page.fill('input[name="email"]', testData.contactEmail)

    // 4. Submit form
    await page.click('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")')

    // 5. Verify success message
    await expect(
      page.locator('text=Contact created successfully, text=Success')
    ).toBeVisible({ timeout: 5000 })

    // 6. Verify contact appears in list
    await expect(page.locator(`text=${testData.contactName}`)).toBeVisible({ timeout: 5000 })
    await expect(page.locator(`text=${testData.contactPhone}`)).toBeVisible()

    // 7. Store contact ID for later tests (extract from URL or data attribute)
    const contactElement = page.locator(`text=${testData.contactName}`).locator('..')
    const contactId = await contactElement.getAttribute('data-contact-id')
    if (contactId) {
      createdContactId = contactId
    }
  })

  /**
   * Test: Contact Validation Errors
   * 
   * **Requirement 9.1**: API routes enforce all security checks before database access
   */
  test('should show validation errors for invalid contact data', async ({ page }) => {
    // 1. Navigate to contacts page
    await page.goto(`${BASE_URL}/contacts`)

    // 2. Click "Add Contact" button
    await page.click('button:has-text("Add Contact"), button:has-text("New Contact")')

    // 3. Try to submit with invalid phone number
    await page.fill('input[name="name"]', 'Invalid Contact')
    await page.fill('input[name="phone_number"]', 'invalid-phone')
    await page.click('button[type="submit"]')

    // 4. Verify validation error message
    await expect(
      page.locator('text=Invalid phone number, text=Phone number must be valid')
    ).toBeVisible({ timeout: 5000 })

    // 5. Try to submit with missing required field
    await page.fill('input[name="phone_number"]', '')
    await page.click('button[type="submit"]')

    // 6. Verify required field error
    await expect(
      page.locator('text=Phone number is required, text=Required')
    ).toBeVisible({ timeout: 5000 })
  })

  /**
   * Test: Send Message Flow
   * 
   * **Requirement 9.1**: UI components only access data through API routes
   * **Requirement 9.3**: UI components use React hooks that call API routes
   */
  test('should send a message successfully', async ({ page }) => {
    // 1. Navigate to chat page
    await page.goto(`${BASE_URL}/chat`)
    await expect(page.locator('[data-testid="chat-list"]')).toBeVisible()

    // 2. Select first conversation or create new one
    const firstConversation = page.locator('[data-testid="conversation-item"]').first()
    const conversationExists = await firstConversation.count() > 0

    if (!conversationExists) {
      test.skip()
      return
    }

    await firstConversation.click()

    // 3. Wait for message list to load
    await expect(page.locator('[data-testid="message-list"]')).toBeVisible()

    // 4. Type message
    const messageInput = page.locator('[data-testid="chat-input"], textarea[placeholder*="message"]')
    await messageInput.fill(testData.messageContent)

    // 5. Send message
    await page.click('[data-testid="send-button"], button:has-text("Send")')

    // 6. Verify message appears in chat
    await expect(page.locator(`text=${testData.messageContent}`)).toBeVisible({ timeout: 10000 })

    // 7. Verify message status indicator
    const messageElement = page.locator(`text=${testData.messageContent}`).locator('..')
    await expect(
      messageElement.locator('[data-testid="message-status"], .message-status')
    ).toBeVisible({ timeout: 5000 })
  })

  /**
   * Test: Message Validation Errors
   * 
   * **Requirement 9.1**: API routes enforce all security checks before database access
   */
  test('should show validation errors for invalid message', async ({ page }) => {
    // 1. Navigate to chat page
    await page.goto(`${BASE_URL}/chat`)

    // 2. Select first conversation
    const firstConversation = page.locator('[data-testid="conversation-item"]').first()
    const conversationExists = await firstConversation.count() > 0

    if (!conversationExists) {
      test.skip()
      return
    }

    await firstConversation.click()

    // 3. Try to send empty message
    const sendButton = page.locator('[data-testid="send-button"], button:has-text("Send")')
    await sendButton.click()

    // 4. Verify error or button is disabled
    const isDisabled = await sendButton.isDisabled()
    if (!isDisabled) {
      await expect(
        page.locator('text=Message cannot be empty, text=Please enter a message')
      ).toBeVisible({ timeout: 5000 })
    }

    // 5. Try to send message that's too long (> 4096 characters)
    const longMessage = 'a'.repeat(5000)
    const messageInput = page.locator('[data-testid="chat-input"], textarea[placeholder*="message"]')
    await messageInput.fill(longMessage)
    await sendButton.click()

    // 6. Verify validation error
    await expect(
      page.locator('text=Message too long, text=Maximum length exceeded')
    ).toBeVisible({ timeout: 5000 })
  })

  /**
   * Test: Create Broadcast Flow
   * 
   * **Requirement 9.1**: UI components only access data through API routes
   * **Requirement 9.3**: UI components use React hooks that call API routes
   */
  test('should create a broadcast successfully', async ({ page }) => {
    // 1. Navigate to broadcasts page
    await page.goto(`${BASE_URL}/broadcasts`)
    await expect(page.locator('h1:has-text("Broadcasts"), h1:has-text("Campaigns")')).toBeVisible()

    // 2. Click "Create Broadcast" button
    await page.click('button:has-text("Create Broadcast"), button:has-text("New Broadcast"), button:has-text("New Campaign")')

    // 3. Fill broadcast form
    await page.fill('input[name="name"]', testData.broadcastName)
    await page.fill('textarea[name="message_template"], textarea[name="message"]', testData.broadcastMessage)

    // 4. Select recipient list (if available)
    const recipientSelect = page.locator('select[name="recipient_list_id"], [data-testid="recipient-list-select"]')
    const hasRecipientSelect = await recipientSelect.count() > 0
    
    if (hasRecipientSelect) {
      await recipientSelect.selectOption({ index: 1 })
    }

    // 5. Submit form
    await page.click('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")')

    // 6. Verify success message
    await expect(
      page.locator('text=Broadcast created successfully, text=Success')
    ).toBeVisible({ timeout: 5000 })

    // 7. Verify broadcast appears in list
    await expect(page.locator(`text=${testData.broadcastName}`)).toBeVisible({ timeout: 5000 })
  })

  /**
   * Test: Broadcast Validation Errors
   * 
   * **Requirement 9.1**: API routes enforce all security checks before database access
   */
  test('should show validation errors for invalid broadcast data', async ({ page }) => {
    // 1. Navigate to broadcasts page
    await page.goto(`${BASE_URL}/broadcasts`)

    // 2. Click "Create Broadcast" button
    await page.click('button:has-text("Create Broadcast"), button:has-text("New Broadcast"), button:has-text("New Campaign")')

    // 3. Try to submit with missing required fields
    await page.click('button[type="submit"]')

    // 4. Verify validation errors
    await expect(
      page.locator('text=Name is required, text=Required')
    ).toBeVisible({ timeout: 5000 })

    // 5. Fill name but leave message empty
    await page.fill('input[name="name"]', 'Test Broadcast')
    await page.click('button[type="submit"]')

    // 6. Verify message validation error
    await expect(
      page.locator('text=Message is required, text=Required')
    ).toBeVisible({ timeout: 5000 })
  })

  /**
   * Test: Real-time Updates
   * 
   * **Requirement 9.7**: UI components use Supabase Realtime subscriptions with RLS enforcement
   */
  test('should receive real-time message updates', async ({ page, context }) => {
    // 1. Open chat in first tab
    await page.goto(`${BASE_URL}/chat`)
    const firstConversation = page.locator('[data-testid="conversation-item"]').first()
    const conversationExists = await firstConversation.count() > 0

    if (!conversationExists) {
      test.skip()
      return
    }

    await firstConversation.click()
    await expect(page.locator('[data-testid="message-list"]')).toBeVisible()

    // 2. Get initial message count
    const initialMessages = await page.locator('[data-testid="message-item"], .message').count()

    // 3. Open second tab (simulate another user/device)
    const secondPage = await context.newPage()
    await login(secondPage)
    await secondPage.goto(`${BASE_URL}/chat`)
    await secondPage.locator('[data-testid="conversation-item"]').first().click()

    // 4. Send message from second tab
    const messageInput = secondPage.locator('[data-testid="chat-input"], textarea[placeholder*="message"]')
    const realtimeTestMessage = `Realtime test ${Date.now()}`
    await messageInput.fill(realtimeTestMessage)
    await secondPage.click('[data-testid="send-button"], button:has-text("Send")')

    // 5. Verify message appears in second tab
    await expect(secondPage.locator(`text=${realtimeTestMessage}`)).toBeVisible({ timeout: 10000 })

    // 6. Verify message appears in first tab (real-time update)
    await expect(page.locator(`text=${realtimeTestMessage}`)).toBeVisible({ timeout: 15000 })

    // 7. Verify message count increased
    const updatedMessages = await page.locator('[data-testid="message-item"], .message').count()
    expect(updatedMessages).toBeGreaterThan(initialMessages)

    // Cleanup
    await secondPage.close()
  })

  /**
   * Test: Network Error Handling
   * 
   * **Requirement 9.1**: UI components handle loading and error states from API calls
   */
  test('should handle network errors gracefully', async ({ page }) => {
    // 1. Navigate to contacts page
    await page.goto(`${BASE_URL}/contacts`)

    // 2. Simulate offline
    await page.context().setOffline(true)

    // 3. Try to create contact
    await page.click('button:has-text("Add Contact"), button:has-text("New Contact")')
    await page.fill('input[name="name"]', 'Network Test')
    await page.fill('input[name="phone_number"]', '+15551234567')
    await page.click('button[type="submit"]')

    // 4. Verify error message
    await expect(
      page.locator('text=Network error, text=Failed to connect, text=No internet connection')
    ).toBeVisible({ timeout: 5000 })

    // 5. Restore connection
    await page.context().setOffline(false)

    // 6. Retry and verify success
    await page.click('button[type="submit"]')
    await expect(
      page.locator('text=Contact created successfully, text=Success')
    ).toBeVisible({ timeout: 10000 })
  })

  /**
   * Test: API Error Handling
   * 
   * **Requirement 9.1**: UI components handle loading and error states from API calls
   */
  test('should display API error messages to user', async ({ page }) => {
    // 1. Navigate to contacts page
    await page.goto(`${BASE_URL}/contacts`)

    // 2. Try to create duplicate contact (if previous test ran)
    if (createdContactId) {
      await page.click('button:has-text("Add Contact"), button:has-text("New Contact")')
      await page.fill('input[name="name"]', testData.contactName)
      await page.fill('input[name="phone_number"]', testData.contactPhone)
      await page.click('button[type="submit"]')

      // 3. Verify duplicate error message
      await expect(
        page.locator('text=Contact already exists, text=Duplicate phone number')
      ).toBeVisible({ timeout: 5000 })
    }
  })

  /**
   * Test: Loading States
   * 
   * **Requirement 9.1**: UI components handle loading and error states from API calls
   */
  test('should show loading indicators during API calls', async ({ page }) => {
    // 1. Navigate to contacts page
    await page.goto(`${BASE_URL}/contacts`)

    // 2. Click "Add Contact" button
    await page.click('button:has-text("Add Contact"), button:has-text("New Contact")')

    // 3. Fill form
    await page.fill('input[name="name"]', `Loading Test ${Date.now()}`)
    await page.fill('input[name="phone_number"]', `+1555${Date.now().toString().slice(-7)}`)

    // 4. Submit and immediately check for loading indicator
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // 5. Verify loading state (button disabled or loading spinner)
    const isDisabled = await submitButton.isDisabled()
    const hasLoadingSpinner = await page.locator('.loading, .spinner, [data-testid="loading"]').count() > 0

    expect(isDisabled || hasLoadingSpinner).toBeTruthy()

    // 6. Wait for completion
    await expect(
      page.locator('text=Contact created successfully, text=Success')
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Frontend Integration - Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  /**
   * Test: Unauthorized Access
   */
  test('should handle unauthorized access', async ({ page, context }) => {
    // 1. Clear session/cookies
    await context.clearCookies()

    // 2. Try to access protected page
    await page.goto(`${BASE_URL}/contacts`)

    // 3. Verify redirect to login
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 5000 })
    await expect(page.locator('text=Login, text=Sign in')).toBeVisible()
  })

  /**
   * Test: Rate Limiting
   */
  test('should handle rate limit errors', async ({ page }) => {
    // This test would require triggering rate limits
    // For now, we'll just verify the UI can display rate limit errors
    
    // Navigate to contacts
    await page.goto(`${BASE_URL}/contacts`)

    // Intercept API calls and mock rate limit response
    await page.route('**/api/contacts', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'RateLimitError',
          message: 'Too many requests',
          code: 'RATE_001',
          requestId: 'test-123',
          timestamp: new Date().toISOString(),
        }),
      })
    })

    // Try to create contact
    await page.click('button:has-text("Add Contact"), button:has-text("New Contact")')
    await page.fill('input[name="name"]', 'Rate Limit Test')
    await page.fill('input[name="phone_number"]', '+15551234567')
    await page.click('button[type="submit"]')

    // Verify rate limit error message
    await expect(
      page.locator('text=Too many requests, text=Rate limit exceeded')
    ).toBeVisible({ timeout: 5000 })
  })
})
