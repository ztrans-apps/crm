/**
 * Core Audit Middleware
 * Auto-capture audit logs for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from './service';
import type { AuditAction } from './types';

interface AuditConfig {
  action: AuditAction;
  resourceType: string;
  getResourceId?: (req: NextRequest) => string | null;
  captureBody?: boolean;
}

/**
 * Middleware to automatically log API actions
 */
export function withAudit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: AuditConfig
) {
  return async (req: NextRequest) => {
    const tenantId = req.headers.get('X-Tenant-ID');
    const userId = req.headers.get('X-User-ID'); // Set by auth middleware

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const auditService = new AuditService(tenantId);
    
    let oldValue = null;
    let resourceId = config.getResourceId?.(req) || null;

    // For UPDATE/DELETE, fetch old value first
    if (config.action === 'UPDATE' || config.action === 'DELETE') {
      // Implementation depends on resource type
      // This is a placeholder
    }

    // Execute the handler
    const response = await handler(req);

    // Capture new value if needed
    let newValue = null;
    if (config.captureBody && response.ok) {
      try {
        const body = await response.clone().json();
        newValue = body;
      } catch {
        // Response is not JSON
      }
    }

    // Log the action (fire and forget)
    auditService.log(
      {
        action: config.action,
        resource_type: config.resourceType,
        resource_id: resourceId,
        old_value: oldValue,
        new_value: newValue,
      },
      userId || undefined
    ).catch(error => {
      console.error('Failed to create audit log:', error);
    });

    return response;
  };
}
