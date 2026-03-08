import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { generateCacheKey } from '@/lib/cache/cache-layer'

/**
 * Property-Based Tests for Tenant-Specific Cache Keys
 * 
 * **Validates: Requirements 10.7**
 * 
 * These tests verify that cache keys include tenant ID for isolation:
 * - All cache keys include tenant ID
 * - Different tenants have different cache keys for same resource
 * - Cache keys follow consistent format with tenant ID
 * - Tenant ID is always present in cache key structure
 */

describe('Feature: security-optimization, Property 34: Tenant-Specific Cache Keys', () => {
  /**
   * Property Test: Cache keys must always include tenant ID
   * 
   * This test verifies that every cache key generated includes the tenant ID,
   * ensuring tenant isolation at the cache level.
   * 
   * The property being tested: For any tenant ID and resource,
   * the generated cache key must contain the tenant ID.
   */
  it('should include tenant ID in all cache keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations', 'permissions', 'config'),
          resourceId: fc.uuid(),
        }),
        async ({ tenantId, resourceType, resourceId }) => {
          // Generate cache key
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Verify: Cache key includes tenant ID
          expect(cacheKey).toContain(tenantId)

          // Verify: Cache key follows expected format (cache:tenantId:...)
          expect(cacheKey).toMatch(new RegExp(`^cache:${tenantId}:`))
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Different tenants must have different cache keys
   * 
   * This test verifies that two different tenants accessing the same resource
   * will have completely different cache keys, ensuring tenant isolation.
   * 
   * The property being tested: For any two different tenant IDs accessing
   * the same resource, their cache keys must be different.
   */
  it('should generate different cache keys for different tenants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.uuid(),
          tenant2Id: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations'),
          resourceId: fc.uuid(),
        }).filter(({ tenant1Id, tenant2Id }) => tenant1Id !== tenant2Id),
        async ({ tenant1Id, tenant2Id, resourceType, resourceId }) => {
          // Generate cache keys for both tenants
          const cacheKey1 = generateCacheKey(tenant1Id, resourceType, resourceId)
          const cacheKey2 = generateCacheKey(tenant2Id, resourceType, resourceId)

          // Verify: Cache keys are different
          expect(cacheKey1).not.toBe(cacheKey2)

          // Verify: Each key contains its respective tenant ID
          expect(cacheKey1).toContain(tenant1Id)
          expect(cacheKey2).toContain(tenant2Id)

          // Verify: Each key does NOT contain the other tenant's ID
          expect(cacheKey1).not.toContain(tenant2Id)
          expect(cacheKey2).not.toContain(tenant1Id)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Cache key format must be consistent
   * 
   * This test verifies that cache keys follow a consistent format
   * with tenant ID as the first component after the cache prefix.
   * 
   * The property being tested: For any cache key,
   * the format should be "cache:tenantId:resource:..." with tenant ID
   * always in the second position.
   */
  it('should follow consistent format with tenant ID in correct position', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations', 'permissions', 'config'),
          // Use identifiers without colons to avoid splitting issues
          identifiers: fc.array(
            fc.oneof(
              fc.uuid(),
              fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(':'))
            ),
            { minLength: 0, maxLength: 3 }
          ),
        }),
        async ({ tenantId, resourceType, identifiers }) => {
          // Filter out empty identifiers (generateCacheKey uses filter(Boolean))
          const filteredIdentifiers = identifiers.filter(Boolean)
          
          // Generate cache key with variable number of identifiers
          const cacheKey = generateCacheKey(tenantId, resourceType, ...identifiers)

          // Split cache key into parts
          const parts = cacheKey.split(':')

          // Verify: First part is "cache" prefix
          expect(parts[0]).toBe('cache')

          // Verify: Second part is tenant ID
          expect(parts[1]).toBe(tenantId)

          // Verify: Third part is resource type
          expect(parts[2]).toBe(resourceType)

          // Verify: Remaining parts are identifiers (if any)
          if (filteredIdentifiers.length > 0) {
            const keyIdentifiers = parts.slice(3)
            expect(keyIdentifiers).toEqual(filteredIdentifiers.map(String))
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Tenant ID must be present for all resource types
   * 
   * This test verifies that tenant ID is included in cache keys
   * for all different resource types in the system.
   * 
   * The property being tested: For any resource type,
   * the cache key must include the tenant ID.
   */
  it('should include tenant ID for all resource types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceTypes: fc.constant(['contacts', 'messages', 'broadcasts', 'conversations', 'permissions', 'config']),
        }),
        async ({ tenantId, resourceTypes }) => {
          // Generate cache keys for all resource types
          const cacheKeys = resourceTypes.map(resourceType =>
            generateCacheKey(tenantId, resourceType)
          )

          // Verify: All cache keys include tenant ID
          cacheKeys.forEach(cacheKey => {
            expect(cacheKey).toContain(tenantId)
            expect(cacheKey).toMatch(new RegExp(`^cache:${tenantId}:`))
          })

          // Verify: All cache keys are unique (different resource types)
          const uniqueKeys = new Set(cacheKeys)
          expect(uniqueKeys.size).toBe(resourceTypes.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Cache keys with multiple identifiers must include tenant ID
   * 
   * This test verifies that even with multiple resource identifiers,
   * the tenant ID is always included in the cache key.
   * 
   * The property being tested: For any cache key with multiple identifiers,
   * the tenant ID must be present and in the correct position.
   */
  it('should include tenant ID with multiple resource identifiers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          identifier1: fc.uuid(),
          identifier2: fc.uuid(),
          identifier3: fc.string({ minLength: 1, maxLength: 20 }),
        }),
        async ({ tenantId, resourceType, identifier1, identifier2, identifier3 }) => {
          // Generate cache key with multiple identifiers
          const cacheKey = generateCacheKey(tenantId, resourceType, identifier1, identifier2, identifier3)

          // Verify: Cache key includes tenant ID
          expect(cacheKey).toContain(tenantId)

          // Verify: Tenant ID is in the correct position (second component)
          const parts = cacheKey.split(':')
          expect(parts[1]).toBe(tenantId)

          // Verify: All identifiers are present
          expect(cacheKey).toContain(identifier1)
          expect(cacheKey).toContain(identifier2)
          expect(cacheKey).toContain(identifier3)

          // Verify: Format is correct
          expect(cacheKey).toBe(`cache:${tenantId}:${resourceType}:${identifier1}:${identifier2}:${identifier3}`)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Tenant isolation through cache key patterns
   * 
   * This test verifies that cache key patterns for tenant-wide operations
   * correctly isolate tenants by including tenant ID in the pattern.
   * 
   * The property being tested: For any tenant-specific cache pattern,
   * the pattern must include the tenant ID to ensure isolation.
   */
  it('should support tenant-specific cache patterns for isolation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations'),
          resourceIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }).filter((ids) => {
            return new Set(ids).size === ids.length
          }),
        }),
        async ({ tenantId, resourceType, resourceIds }) => {
          // Generate cache keys for all resources
          const cacheKeys = resourceIds.map(id =>
            generateCacheKey(tenantId, resourceType, id)
          )

          // Create tenant-specific pattern
          const tenantPattern = `cache:${tenantId}:${resourceType}:*`

          // Verify: All cache keys match the tenant-specific pattern
          cacheKeys.forEach(cacheKey => {
            const regex = new RegExp(`^cache:${tenantId}:${resourceType}:`)
            expect(cacheKey).toMatch(regex)
          })

          // Verify: Pattern includes tenant ID
          expect(tenantPattern).toContain(tenantId)

          // Verify: All keys start with the same tenant prefix
          const tenantPrefix = `cache:${tenantId}:`
          cacheKeys.forEach(cacheKey => {
            expect(cacheKey.startsWith(tenantPrefix)).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Same resource across tenants must have unique cache keys
   * 
   * This test verifies that the same resource ID accessed by multiple tenants
   * results in unique cache keys for each tenant.
   * 
   * The property being tested: For any resource ID accessed by N different tenants,
   * there should be N unique cache keys, each containing its respective tenant ID.
   */
  it('should create unique cache keys for same resource across multiple tenants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantIds: fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }).filter((ids) => {
            return new Set(ids).size === ids.length
          }),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
        }),
        async ({ tenantIds, resourceType, resourceId }) => {
          // Generate cache keys for all tenants accessing the same resource
          const cacheKeys = tenantIds.map(tenantId =>
            generateCacheKey(tenantId, resourceType, resourceId)
          )

          // Verify: All cache keys are unique
          const uniqueKeys = new Set(cacheKeys)
          expect(uniqueKeys.size).toBe(tenantIds.length)

          // Verify: Each cache key contains its respective tenant ID
          cacheKeys.forEach((cacheKey, index) => {
            expect(cacheKey).toContain(tenantIds[index])
          })

          // Verify: Each cache key contains the shared resource ID
          cacheKeys.forEach(cacheKey => {
            expect(cacheKey).toContain(resourceId)
          })

          // Verify: No cache key contains another tenant's ID
          cacheKeys.forEach((cacheKey, index) => {
            tenantIds.forEach((tenantId, otherIndex) => {
              if (index !== otherIndex) {
                expect(cacheKey).not.toContain(tenantId)
              }
            })
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Tenant ID must not be empty or null
   * 
   * This test verifies that cache keys are only generated with valid tenant IDs,
   * ensuring that tenant isolation is always enforced.
   * 
   * The property being tested: For any valid cache key generation,
   * the tenant ID must be a non-empty string.
   */
  it('should only generate cache keys with valid non-empty tenant IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenantId: fc.uuid(),
          resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          resourceId: fc.uuid(),
        }),
        async ({ tenantId, resourceType, resourceId }) => {
          // Generate cache key
          const cacheKey = generateCacheKey(tenantId, resourceType, resourceId)

          // Split and extract tenant ID from cache key
          const parts = cacheKey.split(':')
          const extractedTenantId = parts[1]

          // Verify: Extracted tenant ID is not empty
          expect(extractedTenantId).toBeTruthy()
          expect(extractedTenantId.length).toBeGreaterThan(0)

          // Verify: Extracted tenant ID matches input tenant ID
          expect(extractedTenantId).toBe(tenantId)

          // Verify: Tenant ID is a valid UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          expect(extractedTenantId).toMatch(uuidRegex)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Cache key structure ensures tenant cannot access other tenant's data
   * 
   * This test verifies that the cache key structure makes it impossible
   * for one tenant to accidentally access another tenant's cached data.
   * 
   * The property being tested: For any two tenants with overlapping resource IDs,
   * their cache keys must be completely different and non-overlapping.
   */
  it('should prevent cross-tenant cache access through key structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.uuid(),
          tenant2Id: fc.uuid(),
          sharedResourceType: fc.constantFrom('contacts', 'messages', 'broadcasts'),
          sharedResourceId: fc.uuid(),
        }).filter(({ tenant1Id, tenant2Id }) => tenant1Id !== tenant2Id),
        async ({ tenant1Id, tenant2Id, sharedResourceType, sharedResourceId }) => {
          // Generate cache keys for both tenants with same resource
          const tenant1Key = generateCacheKey(tenant1Id, sharedResourceType, sharedResourceId)
          const tenant2Key = generateCacheKey(tenant2Id, sharedResourceType, sharedResourceId)

          // Verify: Keys are completely different
          expect(tenant1Key).not.toBe(tenant2Key)

          // Verify: Tenant1's key cannot match tenant2's pattern
          const tenant2Pattern = new RegExp(`^cache:${tenant2Id}:`)
          expect(tenant1Key).not.toMatch(tenant2Pattern)

          // Verify: Tenant2's key cannot match tenant1's pattern
          const tenant1Pattern = new RegExp(`^cache:${tenant1Id}:`)
          expect(tenant2Key).not.toMatch(tenant1Pattern)

          // Verify: Both keys contain the shared resource ID but different tenant IDs
          expect(tenant1Key).toContain(sharedResourceId)
          expect(tenant2Key).toContain(sharedResourceId)
          expect(tenant1Key).toContain(tenant1Id)
          expect(tenant2Key).toContain(tenant2Id)

          // Verify: No substring overlap that could cause confusion
          expect(tenant1Key.includes(tenant2Key)).toBe(false)
          expect(tenant2Key.includes(tenant1Key)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property Test: Tenant ID position is consistent across all cache operations
   * 
   * This test verifies that the tenant ID is always in the same position
   * in the cache key structure, making it reliable for pattern matching
   * and tenant-wide operations.
   * 
   * The property being tested: For any cache key generated,
   * the tenant ID must always be the second component (after "cache:").
   */
  it('should maintain consistent tenant ID position in all cache keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operations: fc.array(
            fc.record({
              tenantId: fc.uuid(),
              resourceType: fc.constantFrom('contacts', 'messages', 'broadcasts', 'conversations', 'permissions', 'config'),
              // Use identifiers without colons to avoid splitting issues
              identifiers: fc.array(
                fc.oneof(
                  fc.uuid(),
                  fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(':'))
                ),
                { minLength: 0, maxLength: 4 }
              ),
            }),
            { minLength: 5, maxLength: 20 }
          ),
        }),
        async ({ operations }) => {
          // Generate cache keys for all operations
          const cacheKeys = operations.map(op =>
            generateCacheKey(op.tenantId, op.resourceType, ...op.identifiers)
          )

          // Verify: All cache keys have tenant ID in position 1 (after split by ':')
          cacheKeys.forEach((cacheKey, index) => {
            const parts = cacheKey.split(':')
            
            // Position 0: "cache"
            expect(parts[0]).toBe('cache')
            
            // Position 1: tenant ID
            expect(parts[1]).toBe(operations[index].tenantId)
            
            // Position 2: resource type
            expect(parts[2]).toBe(operations[index].resourceType)
            
            // Verify minimum structure
            expect(parts.length).toBeGreaterThanOrEqual(3)
          })

          // Verify: Tenant ID is always extractable from the same position
          const extractedTenantIds = cacheKeys.map(key => key.split(':')[1])
          const expectedTenantIds = operations.map(op => op.tenantId)
          expect(extractedTenantIds).toEqual(expectedTenantIds)
        }
      ),
      { numRuns: 100 }
    )
  })
})
