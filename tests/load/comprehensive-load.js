/**
 * Comprehensive Load Test
 * 
 * Tests all major API endpoints under various load conditions:
 * - 100 concurrent users (normal load)
 * - 500 concurrent users (high load)
 * - 1000 concurrent users (stress test)
 * 
 * This test simulates realistic user behavior by mixing different operations
 * with appropriate weights based on typical usage patterns.
 * 
 * Requirements: 11.1, 11.2
 */

import { sleep } from 'k6';
import http from 'k6/http';
import { config, authenticate, getRequestParams, checkResponse, randomPhoneNumber, randomEmail, randomString } from './config.js';

// Test configuration with multiple stages
export const options = {
  stages: [
    // Phase 1: Normal load (100 users)
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    
    // Phase 2: High load (500 users)
    { duration: '2m', target: 500 },
    { duration: '5m', target: 500 },
    
    // Phase 3: Stress test (1000 users)
    { duration: '2m', target: 1000 },
    { duration: '3m', target: 1000 },
    
    // Phase 4: Ramp down
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // Response time thresholds
    'http_req_duration{type:api}': ['p(95)<500', 'p(99)<1000'],
    
    // Error rate threshold
    'http_req_failed{type:api}': ['rate<0.01'],
    
    // Specific endpoint thresholds
    'http_req_duration{endpoint:contacts}': ['p(95)<500'],
    'http_req_duration{endpoint:messages}': ['p(95)<500'],
    'http_req_duration{endpoint:broadcasts}': ['p(95)<500'],
    'http_req_duration{endpoint:conversations}': ['p(95)<500'],
  },
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
  
  // Get a test conversation ID
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

// Main test scenario - simulates realistic user behavior
export default function (data) {
  const { accessToken, conversationId } = data;
  
  // Randomly select a user scenario based on typical usage patterns
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Contact management scenario
    contactManagementScenario(accessToken);
  } else if (scenario < 0.7) {
    // 30% - Messaging scenario
    messagingScenario(accessToken, conversationId);
  } else if (scenario < 0.9) {
    // 20% - Conversation browsing scenario
    conversationBrowsingScenario(accessToken);
  } else {
    // 10% - Broadcast management scenario
    broadcastManagementScenario(accessToken);
  }
  
  // Random think time between scenarios (1-5 seconds)
  sleep(Math.random() * 4 + 1);
}

// Scenario 1: Contact Management (40% of users)
function contactManagementScenario(accessToken) {
  const params = getRequestParams(accessToken, { endpoint: 'contacts' });
  
  // List contacts
  const listUrl = `${config.baseUrl}/api/contacts`;
  const listResponse = http.get(listUrl, params);
  checkResponse(listResponse, 'GET /api/contacts');
  sleep(1);
  
  // Create a new contact (30% of the time)
  if (Math.random() < 0.3) {
    const createPayload = JSON.stringify({
      name: `Contact ${randomString(6)}`,
      phone_number: randomPhoneNumber(),
      email: randomEmail(),
      tags: ['load-test'],
    });
    
    const createResponse = http.post(listUrl, createPayload, params);
    checkResponse(createResponse, 'POST /api/contacts');
    sleep(1);
    
    // Get the created contact
    if (createResponse.status === 200 || createResponse.status === 201) {
      try {
        const body = JSON.parse(createResponse.body);
        const contactId = body.id || body.data?.id;
        
        if (contactId) {
          const getUrl = `${config.baseUrl}/api/contacts/${contactId}`;
          const getResponse = http.get(getUrl, params);
          checkResponse(getResponse, 'GET /api/contacts/[id]');
          sleep(1);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }
}

// Scenario 2: Messaging (30% of users)
function messagingScenario(accessToken, conversationId) {
  if (!conversationId) {
    return;
  }
  
  const params = getRequestParams(accessToken, { endpoint: 'messages' });
  
  // Send a message
  const sendUrl = `${config.baseUrl}/api/send-message`;
  const sendPayload = JSON.stringify({
    conversation_id: conversationId,
    content: `Message: ${randomString(30)}`,
    type: 'text',
  });
  
  const sendResponse = http.post(sendUrl, sendPayload, params);
  checkResponse(sendResponse, 'POST /api/send-message');
  sleep(1);
  
  // Get message details (50% of the time)
  if (Math.random() < 0.5 && (sendResponse.status === 200 || sendResponse.status === 201)) {
    try {
      const body = JSON.parse(sendResponse.body);
      const messageId = body.id || body.data?.id || body.message_id;
      
      if (messageId) {
        const getUrl = `${config.baseUrl}/api/messages/${messageId}`;
        const getResponse = http.get(getUrl, params);
        checkResponse(getResponse, 'GET /api/messages/[messageId]');
        sleep(1);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
}

// Scenario 3: Conversation Browsing (20% of users)
function conversationBrowsingScenario(accessToken) {
  const params = getRequestParams(accessToken, { endpoint: 'conversations' });
  
  // List conversations
  const listUrl = `${config.baseUrl}/api/chat/conversations`;
  const listResponse = http.get(listUrl, params);
  checkResponse(listResponse, 'GET /api/chat/conversations');
  sleep(1);
  
  // Get conversation operations
  const opsUrl = `${config.baseUrl}/api/chat/operations`;
  const opsResponse = http.get(opsUrl, params);
  checkResponse(opsResponse, 'GET /api/chat/operations');
  sleep(1);
}

// Scenario 4: Broadcast Management (10% of users)
function broadcastManagementScenario(accessToken) {
  const params = getRequestParams(accessToken, { endpoint: 'broadcasts' });
  
  // List broadcasts
  const listUrl = `${config.baseUrl}/api/broadcasts`;
  const listResponse = http.get(listUrl, params);
  checkResponse(listResponse, 'GET /api/broadcasts');
  sleep(1);
  
  // Create a broadcast (20% of the time)
  if (Math.random() < 0.2) {
    const createPayload = JSON.stringify({
      name: `Broadcast ${randomString(6)}`,
      message_template: `Template: ${randomString(30)}`,
      status: 'draft',
    });
    
    const createResponse = http.post(listUrl, createPayload, params);
    checkResponse(createResponse, 'POST /api/broadcasts');
    sleep(1);
    
    // Get broadcast stats
    if (createResponse.status === 200 || createResponse.status === 201) {
      try {
        const body = JSON.parse(createResponse.body);
        const broadcastId = body.id || body.data?.id || body.campaign_id;
        
        if (broadcastId) {
          const statsUrl = `${config.baseUrl}/api/broadcasts/${broadcastId}/stats`;
          const statsResponse = http.get(statsUrl, params);
          checkResponse(statsResponse, 'GET /api/broadcasts/[id]/stats');
          sleep(1);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }
}

// Teardown
export function teardown(data) {
  console.log('Comprehensive load test completed');
  console.log('Test covered:');
  console.log('  - 100 concurrent users (normal load)');
  console.log('  - 500 concurrent users (high load)');
  console.log('  - 1000 concurrent users (stress test)');
}
