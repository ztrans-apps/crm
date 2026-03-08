import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import { addSecurityHeaders, SECURITY_HEADERS } from '@/lib/middleware/security-headers'

describe('Security Headers Middleware', () => {
  describe('addSecurityHeaders', () => {
    it('should add all security headers to response', () => {
      // Arrange
      const response = NextResponse.json({ data: 'test' })
      
      // Act
      const securedResponse = addSecurityHeaders(response)
      
      // Assert
      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY')
      expect(securedResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(securedResponse.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains')
      expect(securedResponse.headers.get('Content-Security-Policy')).toBe("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';")
      expect(securedResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(securedResponse.headers.get('Permissions-Policy')).toBe('geolocation=(), microphone=(), camera=()')
    })
    
    it('should remove X-Powered-By header', () => {
      // Arrange
      const response = NextResponse.json({ data: 'test' })
      response.headers.set('X-Powered-By', 'Next.js')
      
      // Act
      const securedResponse = addSecurityHeaders(response)
      
      // Assert
      expect(securedResponse.headers.get('X-Powered-By')).toBeNull()
    })
    
    it('should return the same response object', () => {
      // Arrange
      const response = NextResponse.json({ data: 'test' })
      
      // Act
      const securedResponse = addSecurityHeaders(response)
      
      // Assert
      expect(securedResponse).toBe(response)
    })
    
    it('should preserve existing headers', () => {
      // Arrange
      const response = NextResponse.json({ data: 'test' })
      response.headers.set('Custom-Header', 'custom-value')
      
      // Act
      const securedResponse = addSecurityHeaders(response)
      
      // Assert
      expect(securedResponse.headers.get('Custom-Header')).toBe('custom-value')
    })
    
    it('should work with different response types', () => {
      // Arrange - JSON response
      const jsonResponse = NextResponse.json({ data: 'test' })
      
      // Act
      const securedJsonResponse = addSecurityHeaders(jsonResponse)
      
      // Assert
      expect(securedJsonResponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
      
      // Arrange - Text response
      const textResponse = new NextResponse('test')
      
      // Act
      const securedTextResponse = addSecurityHeaders(textResponse)
      
      // Assert
      expect(securedTextResponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })
  })
  
  describe('SECURITY_HEADERS constant', () => {
    it('should contain all required headers', () => {
      // Assert - Requirement 13.1
      expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff')
      
      // Assert - Requirement 13.2
      expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY')
      
      // Assert - Requirement 13.3
      expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block')
      
      // Assert - Requirement 13.4
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains')
      
      // Assert - Requirement 13.5
      expect(SECURITY_HEADERS['Content-Security-Policy']).toContain("default-src 'self'")
      
      // Assert - Requirement 13.6
      expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
      
      // Assert - Requirement 13.7
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('geolocation=()')
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('microphone=()')
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()')
    })
    
    it('should have correct HSTS configuration', () => {
      const hsts = SECURITY_HEADERS['Strict-Transport-Security']
      
      // Should enforce HTTPS for 1 year (31536000 seconds)
      expect(hsts).toContain('max-age=31536000')
      
      // Should include subdomains
      expect(hsts).toContain('includeSubDomains')
    })
    
    it('should have secure CSP configuration', () => {
      const csp = SECURITY_HEADERS['Content-Security-Policy']
      
      // Should restrict default sources to same origin
      expect(csp).toContain("default-src 'self'")
      
      // Should have script-src policy
      expect(csp).toContain("script-src 'self'")
      
      // Should have style-src policy
      expect(csp).toContain("style-src 'self'")
    })
  })
  
  describe('Header Security Properties', () => {
    it('should prevent MIME type sniffing', () => {
      const response = NextResponse.json({ data: 'test' })
      const securedResponse = addSecurityHeaders(response)
      
      // X-Content-Type-Options: nosniff prevents browsers from MIME-sniffing
      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff')
    })
    
    it('should prevent clickjacking attacks', () => {
      const response = NextResponse.json({ data: 'test' })
      const securedResponse = addSecurityHeaders(response)
      
      // X-Frame-Options: DENY prevents the page from being embedded in iframes
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY')
    })
    
    it('should enable XSS protection', () => {
      const response = NextResponse.json({ data: 'test' })
      const securedResponse = addSecurityHeaders(response)
      
      // X-XSS-Protection enables browser XSS filtering
      const xssProtection = securedResponse.headers.get('X-XSS-Protection')
      expect(xssProtection).toContain('1')
      expect(xssProtection).toContain('mode=block')
    })
    
    it('should enforce HTTPS connections', () => {
      const response = NextResponse.json({ data: 'test' })
      const securedResponse = addSecurityHeaders(response)
      
      // HSTS forces HTTPS for future requests
      const hsts = securedResponse.headers.get('Strict-Transport-Security')
      expect(hsts).toBeTruthy()
      expect(hsts).toContain('max-age=')
    })
    
    it('should restrict resource loading with CSP', () => {
      const response = NextResponse.json({ data: 'test' })
      const securedResponse = addSecurityHeaders(response)
      
      // CSP restricts which resources can be loaded
      const csp = securedResponse.headers.get('Content-Security-Policy')
      expect(csp).toBeTruthy()
      expect(csp).toContain('default-src')
    })
    
    it('should control referrer information', () => {
      const response = NextResponse.json({ data: 'test' })
      const securedResponse = addSecurityHeaders(response)
      
      // Referrer-Policy controls how much referrer info is sent
      expect(securedResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })
    
    it('should restrict browser features', () => {
      const response = NextResponse.json({ data: 'test' })
      const securedResponse = addSecurityHeaders(response)
      
      // Permissions-Policy restricts access to sensitive browser APIs
      const permissionsPolicy = securedResponse.headers.get('Permissions-Policy')
      expect(permissionsPolicy).toBeTruthy()
      expect(permissionsPolicy).toContain('geolocation=()')
    })
    
    it('should prevent server fingerprinting', () => {
      const response = NextResponse.json({ data: 'test' })
      response.headers.set('X-Powered-By', 'Next.js')
      
      const securedResponse = addSecurityHeaders(response)
      
      // X-Powered-By should be removed to prevent revealing server technology
      expect(securedResponse.headers.get('X-Powered-By')).toBeNull()
    })
  })
})
