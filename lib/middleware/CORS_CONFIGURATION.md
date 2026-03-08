# CORS Configuration

This document describes the Cross-Origin Resource Sharing (CORS) configuration implemented in the Next.js middleware.

## Overview

CORS is configured at the middleware level to control which origins can access the API. The configuration differs between development and production environments for security and convenience.

## Environment-Based Configuration

### Development Environment

In development (`NODE_ENV=development`), the following origins are automatically allowed:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`

This allows for easy local development without additional configuration.

### Production Environment

In production (`NODE_ENV=production`), only explicitly whitelisted origins are allowed. Configure allowed origins using the `ALLOWED_ORIGINS` environment variable:

```bash
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

**Important**: Separate multiple origins with commas. Whitespace is automatically trimmed.

## CORS Headers

### Standard Requests

For allowed origins, the following headers are added to responses:
- `Access-Control-Allow-Origin`: The requesting origin (if whitelisted)
- `Access-Control-Allow-Credentials`: `true` (allows cookies and authentication)

### Preflight OPTIONS Requests

For preflight OPTIONS requests from allowed origins, additional headers are included:
- `Access-Control-Allow-Methods`: `GET, POST, PUT, DELETE, PATCH, OPTIONS`
- `Access-Control-Allow-Headers`: `Content-Type, Authorization, X-Requested-With, X-Tenant-ID, X-API-Key`
- `Access-Control-Max-Age`: `86400` (24 hours)

## Security Features

### Origin Whitelisting

Only origins explicitly allowed (via environment configuration or development defaults) receive CORS headers. Requests from non-whitelisted origins:
- Do not receive CORS headers
- Are logged as security events
- Can still reach the server but browsers will block the response

### CORS Violation Logging

All CORS violations are logged for security monitoring with the following information:
- Origin that was rejected
- Request path and method
- IP address
- User agent
- Timestamp
- Reason for rejection

These logs can be used to:
- Detect potential attacks
- Identify misconfigured clients
- Monitor unauthorized access attempts

### Preflight Request Handling

Preflight OPTIONS requests are handled specially:
- Allowed origins receive a 200 response with CORS headers
- Non-whitelisted origins receive a 403 Forbidden response
- Violations are logged for security monitoring

## Configuration Examples

### Single Domain

```bash
ALLOWED_ORIGINS=https://app.example.com
```

### Multiple Domains

```bash
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com,https://mobile.example.com
```

### Subdomain Pattern

Note: Wildcard subdomains are not supported for security reasons. Each subdomain must be explicitly listed:

```bash
ALLOWED_ORIGINS=https://app.example.com,https://api.example.com,https://admin.example.com
```

## Testing CORS Configuration

### Development Testing

1. Start the development server
2. Make requests from `http://localhost:3000` - should work
3. Make requests from other origins - should be rejected

### Production Testing

1. Set `NODE_ENV=production`
2. Configure `ALLOWED_ORIGINS` with your production domains
3. Test requests from allowed origins - should work
4. Test requests from non-allowed origins - should be rejected and logged

### Using curl

Test preflight request:
```bash
curl -X OPTIONS http://localhost:3000/api/test \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Test regular request:
```bash
curl -X GET http://localhost:3000/api/test \
  -H "Origin: http://localhost:3000" \
  -v
```

## Requirements Validation

This implementation validates the following requirements:

- **8.1**: CORS headers configured for allowed origins
- **8.2**: Restricted to whitelisted domains in production
- **8.3**: Localhost allowed in development environment
- **8.4**: Allowed HTTP methods configured per endpoint
- **8.5**: Allowed headers configured for API requests
- **8.6**: Preflight OPTIONS requests handled correctly
- **8.10**: CORS violations logged for security monitoring

## Troubleshooting

### CORS errors in production

1. Verify `ALLOWED_ORIGINS` is set correctly
2. Check that the origin matches exactly (including protocol and port)
3. Review security logs for CORS violations
4. Ensure no trailing slashes in origin URLs

### CORS errors in development

1. Verify `NODE_ENV=development` is set
2. Check that you're using one of the default allowed origins
3. Clear browser cache and cookies
4. Check browser console for specific CORS error messages

### Preflight requests failing

1. Verify the origin is whitelisted
2. Check that the requested method is in the allowed methods list
3. Verify the requested headers are in the allowed headers list
4. Review server logs for CORS violation entries

## Security Best Practices

1. **Never use wildcards** in production (`*` origin)
2. **Always use HTTPS** in production origins
3. **Minimize allowed origins** to only what's necessary
4. **Monitor CORS violation logs** regularly
5. **Rotate origins** when domains change
6. **Test thoroughly** before deploying to production
7. **Document all allowed origins** and their purpose

## Related Files

- `middleware.ts` - Main CORS implementation
- `lib/middleware/request-logger.ts` - CORS violation logging
- `tests/unit/cors-middleware.test.ts` - CORS unit tests
- `.env.example` - Environment variable template
