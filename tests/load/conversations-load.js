/**
 * Load Test: Conversations API
 * 
 * Tests the performance of conversation-related endpoints under load:
 * - GET /api/chat/conversations (list conversations)
 * - GET /api/chat/operations (conversation operations)
 * 
 * Requirements: 11.1, 11.2
 */

import { sleep } from 'k6';
import http from 'k6/http';
import { config, authenticate, getRequestParams, checkResponse } from './config.js';

// Test configuration
export const options = {
  stages: config.stages.rampUp,
  thresholds: config.thresholds,
};

// Setup: Authenticate
export function setup() {
  const accessToken = authenticate(
    config.baseUrl,
    config.testUserEmail,
    config.testUserPassword
  );
  
  if (!accessToken) {
    throw new Error('Authentication failed during setup');
  }
  
  return { accessToken };
}

// Main test scenario
export default function (data) {
  const { accessToken } = data;
  const params = getRequestParams(accessToken, { endpoint: 'conversations' });
  
  // Scenario 1: List conversations (most common operation)
  listConversations(accessToken, params);
  sleep(1);
  
  // Scenario 2: Get conversation operations
  getConversationOperations(accessToken, params);
  sleep(1);
  
  // Random sleep between iterations (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

function listConversations(accessToken, params) {
  const url = `${config.baseUrl}/api/chat/conversations`;
  const response = http.get(url, params);
  
  checkResponse(response, 'GET /api/chat/conversations');
  
  return response;
}

function getConversationOperations(accessToken, params) {
  const url = `${config.baseUrl}/api/chat/operations`;
  const response = http.get(url, params);
  
  checkResponse(response, 'GET /api/chat/operations');
  
  return response;
}

// Teardown
export function teardown(data) {
  console.log('Conversations load test completed');
}
