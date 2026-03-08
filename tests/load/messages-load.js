/**
 * Load Test: Messages API
 * 
 * Tests the performance of message-related endpoints under load:
 * - POST /api/send-message (send message)
 * - GET /api/messages/[messageId] (get message)
 * 
 * Requirements: 11.1, 11.2
 */

import { sleep } from 'k6';
import http from 'k6/http';
import { config, authenticate, getRequestParams, checkResponse, randomString } from './config.js';

// Test configuration
export const options = {
  stages: config.stages.rampUp,
  thresholds: config.thresholds,
};

// Setup: Authenticate and create test conversation
export function setup() {
  const accessToken = authenticate(
    config.baseUrl,
    config.testUserEmail,
    config.testUserPassword
  );
  
  if (!accessToken) {
    throw new Error('Authentication failed during setup');
  }
  
  // Get or create a test conversation
  const params = getRequestParams(accessToken);
  const conversationsUrl = `${config.baseUrl}/api/chat/conversations`;
  const conversationsResponse = http.get(conversationsUrl, params);
  
  let conversationId = null;
  
  if (conversationsResponse.status === 200) {
    try {
      const body = JSON.parse(conversationsResponse.body);
      const conversations = body.data || body;
      if (Array.isArray(conversations) && conversations.length > 0) {
        conversationId = conversations[0].id;
      }
    } catch (e) {
      console.error('Failed to parse conversations response:', e);
    }
  }
  
  return { accessToken, conversationId };
}

// Main test scenario
export default function (data) {
  const { accessToken, conversationId } = data;
  
  if (!conversationId) {
    console.warn('No conversation ID available, skipping message tests');
    sleep(5);
    return;
  }
  
  const params = getRequestParams(accessToken, { endpoint: 'messages' });
  
  // Scenario 1: Send message (most common operation)
  const messageId = sendMessage(accessToken, params, conversationId);
  sleep(1);
  
  if (messageId) {
    // Scenario 2: Get message details
    getMessage(accessToken, params, messageId);
    sleep(1);
  }
  
  // Random sleep between iterations (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

function sendMessage(accessToken, params, conversationId) {
  const url = `${config.baseUrl}/api/send-message`;
  
  const payload = JSON.stringify({
    conversation_id: conversationId,
    content: `Load test message: ${randomString(20)}`,
    type: 'text',
  });
  
  const response = http.post(url, payload, params);
  
  checkResponse(response, 'POST /api/send-message');
  
  // Extract message ID from response
  if (response.status === 200 || response.status === 201) {
    try {
      const body = JSON.parse(response.body);
      return body.id || body.data?.id || body.message_id;
    } catch (e) {
      console.error('Failed to parse send message response:', e);
    }
  }
  
  return null;
}

function getMessage(accessToken, params, messageId) {
  const url = `${config.baseUrl}/api/messages/${messageId}`;
  const response = http.get(url, params);
  
  checkResponse(response, 'GET /api/messages/[messageId]');
  
  return response;
}

// Teardown
export function teardown(data) {
  console.log('Messages load test completed');
}
