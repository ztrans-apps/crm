/**
 * Load Test: Broadcasts API
 * 
 * Tests the performance of broadcast-related endpoints under load:
 * - GET /api/broadcasts (list broadcasts)
 * - POST /api/broadcasts (create broadcast)
 * - GET /api/broadcasts/[id] (get broadcast)
 * - GET /api/broadcasts/[id]/stats (get stats)
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
  const params = getRequestParams(accessToken, { endpoint: 'broadcasts' });
  
  // Scenario 1: List broadcasts (most common operation)
  listBroadcasts(accessToken, params);
  sleep(1);
  
  // Scenario 2: Create broadcast (less frequent)
  const broadcastId = createBroadcast(accessToken, params);
  sleep(1);
  
  if (broadcastId) {
    // Scenario 3: Get specific broadcast
    getBroadcast(accessToken, params, broadcastId);
    sleep(1);
    
    // Scenario 4: Get broadcast stats
    getBroadcastStats(accessToken, params, broadcastId);
    sleep(1);
  }
  
  // Random sleep between iterations (2-4 seconds)
  sleep(Math.random() * 2 + 2);
}

function listBroadcasts(accessToken, params) {
  const url = `${config.baseUrl}/api/broadcasts`;
  const response = http.get(url, params);
  
  checkResponse(response, 'GET /api/broadcasts');
  
  return response;
}

function createBroadcast(accessToken, params) {
  const url = `${config.baseUrl}/api/broadcasts`;
  
  const payload = JSON.stringify({
    name: `Load Test Broadcast ${randomString(6)}`,
    message_template: `This is a load test broadcast message: ${randomString(20)}`,
    status: 'draft',
  });
  
  const response = http.post(url, payload, params);
  
  checkResponse(response, 'POST /api/broadcasts');
  
  // Extract broadcast ID from response
  if (response.status === 200 || response.status === 201) {
    try {
      const body = JSON.parse(response.body);
      return body.id || body.data?.id || body.campaign_id;
    } catch (e) {
      console.error('Failed to parse create broadcast response:', e);
    }
  }
  
  return null;
}

function getBroadcast(accessToken, params, broadcastId) {
  const url = `${config.baseUrl}/api/broadcasts/${broadcastId}`;
  const response = http.get(url, params);
  
  checkResponse(response, 'GET /api/broadcasts/[id]');
  
  return response;
}

function getBroadcastStats(accessToken, params, broadcastId) {
  const url = `${config.baseUrl}/api/broadcasts/${broadcastId}/stats`;
  const response = http.get(url, params);
  
  checkResponse(response, 'GET /api/broadcasts/[id]/stats');
  
  return response;
}

// Teardown
export function teardown(data) {
  console.log('Broadcasts load test completed');
}
