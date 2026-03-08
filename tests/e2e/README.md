# E2E Tests for Frontend Integration

This directory contains end-to-end tests for frontend-backend integration using Playwright.

## Requirements

These tests validate:
- **Requirement 9.1**: UI components only access data through API routes
- **Requirement 9.3**: UI components use React hooks that call API routes  
- **Requirement 9.7**: UI components use Supabase Realtime subscriptions with RLS enforcement

## Test Coverage

### Complete User Flows
1. **Create Contact Flow** - Tests creating a new contact through the UI
2. **Send Message Flow** - Tests sending messages in chat
3. **Create Broadcast Flow** - Tests creating broadcast campaigns
4. **Real-time Updates** - Tests Supabase Realtime subscriptions

### Error Handling
1. **Validation Errors** - Tests form validation feedback
2. **Network Errors** - Tests offline/network failure handling
3. **API Errors** - Tests API error message display
4. **Loading States** - Tests loading indicators during API calls
5. **Unauthorized Access** - Tests authentication redirects
6. **Rate Limiting** - Tests rate limit error handling

## Setup

### 1. Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### 2. Configure Environment Variables

Create a `.env.test` file:

```env
BASE_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test123456
```

### 3. Prepare Test Data

Ensure you have:
- A test user account with the credentials above
- At least one conversation in the test account
- At least one recipient list for broadcast tests

## Running Tests

### Run all E2E tests

```bash
npx playwright test
```

### Run specific test file

```bash
npx playwright test tests/e2e/frontend-integration.spec.ts
```

### Run in headed mode (see browser)

```bash
npx playwright test --headed
```

### Run in debug mode

```bash
npx playwright test --debug
```

### Run specific test

```bash
npx playwright test -g "should create a new contact successfully"
```

### Run on specific browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## CI/CD Integration

The tests are configured to run in CI with:
- Automatic retries (2 retries on failure)
- Sequential execution (no parallel tests)
- Trace collection on failure
- Screenshots and videos on failure

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          BASE_URL: ${{ secrets.TEST_BASE_URL }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Data Management

Tests use dynamically generated test data to avoid conflicts:
- Contact names include timestamps
- Phone numbers are unique per test run
- Messages include timestamps for uniqueness

## Troubleshooting

### Tests fail with "Element not found"

- Check that the test selectors match your UI components
- Update `data-testid` attributes in your components if needed
- Increase timeout values if elements load slowly

### Real-time tests fail

- Ensure Supabase Realtime is enabled for your tables
- Check RLS policies allow the test user to subscribe
- Verify WebSocket connections are not blocked

### Authentication tests fail

- Verify test user credentials are correct
- Check that the login flow matches your implementation
- Ensure session cookies are being set correctly

## Best Practices

1. **Use data-testid attributes** - Add `data-testid` to important UI elements for stable selectors
2. **Avoid brittle selectors** - Don't rely on CSS classes or text that might change
3. **Test user flows, not implementation** - Focus on what users do, not how it's coded
4. **Keep tests independent** - Each test should work in isolation
5. **Clean up test data** - Remove test data after tests complete (if needed)

## Adding New Tests

When adding new E2E tests:

1. Follow the existing test structure
2. Use the helper functions (`login`, `generateTestData`)
3. Add appropriate `data-testid` attributes to UI components
4. Document which requirements the test validates
5. Handle both success and error scenarios
6. Test loading states and error messages

## Related Documentation

- [Playwright Documentation](https://playwright.dev/)
- [Frontend Migration Status](../../.kiro/specs/security-optimization/FRONTEND_MIGRATION_STATUS.md)
- [Security Optimization Design](../../.kiro/specs/security-optimization/design.md)
