/**
 * Critical User Flows - E2E Tests
 * Minimum E2E tests for critical paths
 * 
 * Setup: npm install -D @playwright/test
 * Run: npx playwright test
 */

import { test, expect } from '@playwright/test'

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_USER = {
  email: 'test@example.com',
  password: 'test123456',
}

test.describe('Critical User Flows - E2E', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto(BASE_URL)
  })

  test('Flow 1: Login', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto(`${BASE_URL}/login`)

    // 2. Fill login form
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)

    // 3. Click login button
    await page.click('button[type="submit"]')

    // 4. Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 5000 })

    // 5. Verify user is logged in
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })

  test('Flow 2: Open Chat', async ({ page }) => {
    // Prerequisite: Login first
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`)

    // 1. Navigate to chat page
    await page.click('a[href="/chat"]')
    await page.waitForURL(`${BASE_URL}/chat`)

    // 2. Verify chat interface loaded
    await expect(page.locator('[data-testid="chat-list"]')).toBeVisible()
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible()

    // 3. Select first conversation (if exists)
    const firstConversation = page.locator('[data-testid="conversation-item"]').first()
    const conversationExists = await firstConversation.count() > 0

    if (conversationExists) {
      await firstConversation.click()
      
      // 4. Verify conversation opened
      await expect(page.locator('[data-testid="message-list"]')).toBeVisible()
    }
  })

  test('Flow 3: Send Message', async ({ page }) => {
    // Prerequisite: Login and open chat
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="email"]', TEST_USER.email)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/dashboard`)
    
    await page.click('a[href="/chat"]')
    await page.waitForURL(`${BASE_URL}/chat`)

    // 1. Select or create conversation
    const firstConversation = page.locator('[data-testid="conversation-item"]').first()
    const conversationExists = await firstConversation.count() > 0

    if (conversationExists) {
      await firstConversation.click()
    } else {
      // Skip test if no conversations
      test.skip()
      return
    }

    // 2. Type message
    const messageInput = page.locator('[data-testid="chat-input"]')
    const testMessage = `Test message ${Date.now()}`
    await messageInput.fill(testMessage)

    // 3. Send message
    await page.click('[data-testid="send-button"]')

    // 4. Verify message appears in chat
    await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10000 })

    // 5. Verify message status (optional)
    const messageElement = page.locator(`text=${testMessage}`).locator('..')
    await expect(messageElement.locator('[data-testid="message-status"]')).toBeVisible()
  })
})

test.describe('Error Scenarios - E2E', () => {
  test('Should show error for invalid login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)

    // Try login with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Verify error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 5000 })
  })

  test('Should handle network errors gracefully', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true)

    await page.goto(`${BASE_URL}/chat`)

    // Verify offline indicator or error message
    await expect(
      page.locator('text=No internet connection').or(page.locator('text=Offline'))
    ).toBeVisible({ timeout: 5000 })
  })
})
