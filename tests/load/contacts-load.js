/**
 * Load Test: Contacts API
 * 
 * Tests the performance of contact-related endpoints under load:
 * - GET /api/contacts (list contacts)
 * - POST /api/contacts (create contact)
 * - GET /api/contacts/[id] (get contact)
 * - PUT /api/contacts/[id] (update contact)
 * 
 * Requirements: 11.1, 11.2
 */

import { sleep } from 'k6';
import http from 'k6/http';
import { config, authenticate, getRequestParams, checkResponse, randomPhoneNumber, randomEmail, randomString } from './config.js';

// Test configuration
export const options = {
  stages: config.stages.rampUp,
  thresholds: config.thresholds,
};

// Setup: Authenticate once per VU
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
  const params = getRequestParams(accessToken, { endpoint: 'contacts' });
  
  // Scenario 1: List contacts (most common operation)
  listContacts(accessToken, params);
  sleep(1);
  
  // Scenario 2: Create contact
  const contactId = createContact(accessToken, params);
  sleep(1);
  
  if (contactId) {
    // Scenario 3: Get specific contact
    getContact(accessToken, params, contactId);
    sleep(1);
    
    // Scenario 4: Update contact
    updateContact(accessToken, params, contactId);
    sleep(1);
  }
  
  // Random sleep between iterations (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

function listContacts(accessToken, params) {
  const url = `${config.baseUrl}/api/contacts`;
  const response = http.get(url, params);
  
  checkResponse(response, 'GET /api/contacts');
  
  return response;
}

function createContact(accessToken, params) {
  const url = `${config.baseUrl}/api/contacts`;
  
  const payload = JSON.stringify({
    name: `Load Test Contact ${randomString(6)}`,
    phone_number: randomPhoneNumber(),
    email: randomEmail(),
    notes: 'Created during load testing',
    tags: ['load-test', 'automated'],
  });
  
  const response = http.post(url, payload, params);
  
  checkResponse(response, 'POST /api/contacts');
  
  // Extract contact ID from response
  if (response.status === 200 || response.status === 201) {
    try {
      const body = JSON.parse(response.body);
      return body.id || body.data?.id;
    } catch (e) {
      console.error('Failed to parse create contact response:', e);
    }
  }
  
  return null;
}

function getContact(accessToken, params, contactId) {
  const url = `${config.baseUrl}/api/contacts/${contactId}`;
  const response = http.get(url, params);
  
  checkResponse(response, 'GET /api/contacts/[id]');
  
  return response;
}

function updateContact(accessToken, params, contactId) {
  const url = `${config.baseUrl}/api/contacts/${contactId}`;
  
  const payload = JSON.stringify({
    name: `Updated Contact ${randomString(6)}`,
    notes: `Updated during load testing at ${new Date().toISOString()}`,
    tags: ['load-test', 'updated'],
  });
  
  const response = http.put(url, payload, params);
  
  checkResponse(response, 'PUT /api/contacts/[id]');
  
  return response;
}

// Teardown: Clean up if needed
export function teardown(data) {
  // Optional: Clean up test data
  console.log('Load test completed');
}
