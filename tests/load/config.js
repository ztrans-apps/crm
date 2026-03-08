// Shared configuration for k6 load tests
import { check } from 'k6';
import http from 'k6/http';

// Load test configuration
export const config = {
  // Base URL for API (update for your environment)
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  
  // Authentication credentials (set via environment variables)
  testUserEmail: __ENV.TEST_USER_EMAIL || 'test@example.com',
  testUserPassword: __ENV.TEST_USER_PASSWORD || 'testpassword',
  
  // Performance thresholds based on Requirements 11.1 and 11.2
  thresholds: {
    // Response time < 500ms for 95% of requests
    'http_req_duration{type:api}': ['p(95)<500', 'p(99)<1000'],
    
    // Error rate < 1%
    'http_req_failed{type:api}': ['rate<0.01'],
    
    // Request rate
    'http_reqs': ['rate>10'],
  },
  
  // Load test stages
  stages: {
    // Ramp-up test: gradually increase load
    rampUp: [
      { duration: '30s', target: 10 },   // Ramp up to 10 users
      { duration: '1m', target: 50 },    // Ramp up to 50 users
      { duration: '1m', target: 100 },   // Ramp up to 100 users
      { duration: '2m', target: 100 },   // Stay at 100 users
      { duration: '30s', target: 0 },    // Ramp down
    ],
    
    // Stress test: test with high load
    stress: [
      { duration: '1m', target: 100 },   // Ramp up to 100 users
      { duration: '2m', target: 500 },   // Ramp up to 500 users
      { duration: '3m', target: 500 },   // Stay at 500 users
      { duration: '1m', target: 0 },     // Ramp down
    ],
    
    // Spike test: sudden load increase
    spike: [
      { duration: '30s', target: 100 },  // Normal load
      { duration: '10s', target: 1000 }, // Spike to 1000 users
      { duration: '1m', target: 1000 },  // Stay at spike
      { duration: '30s', target: 100 },  // Back to normal
      { duration: '30s', target: 0 },    // Ramp down
    ],
    
    // Soak test: sustained load over time
    soak: [
      { duration: '2m', target: 100 },   // Ramp up
      { duration: '10m', target: 100 },  // Sustained load
      { duration: '1m', target: 0 },     // Ramp down
    ],
  },
};

// Authentication helper
export function authenticate(baseUrl, email, password) {
  const loginUrl = `${baseUrl}/api/auth/login`;
  
  const payload = JSON.stringify({
    email: email,
    password: password,
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { type: 'auth' },
  };
  
  const response = http.post(loginUrl, payload, params);
  
  check(response, {
    'authentication successful': (r) => r.status === 200,
    'received access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (response.status === 200) {
    try {
      const body = JSON.parse(response.body);
      return body.access_token;
    } catch (e) {
      console.error('Failed to parse authentication response:', e);
      return null;
    }
  }
  
  return null;
}

// Common request parameters
export function getRequestParams(accessToken, tags = {}) {
  return {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    tags: { type: 'api', ...tags },
  };
}

// Check helper for common validations
export function checkResponse(response, endpoint) {
  return check(response, {
    [`${endpoint}: status is 200`]: (r) => r.status === 200,
    [`${endpoint}: response time < 500ms`]: (r) => r.timings.duration < 500,
    [`${endpoint}: response time < 1000ms`]: (r) => r.timings.duration < 1000,
    [`${endpoint}: has valid JSON`]: (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });
}

// Performance metrics summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

// Helper to generate random data
export function randomString(length = 10) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function randomPhoneNumber() {
  // Generate E.164 format phone number
  const countryCode = '1'; // US
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const lineNumber = Math.floor(Math.random() * 9000) + 1000;
  return `+${countryCode}${areaCode}${prefix}${lineNumber}`;
}

export function randomEmail() {
  return `test-${randomString(8)}@example.com`;
}
