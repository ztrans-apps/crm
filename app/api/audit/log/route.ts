/**
 * API Route: Create Audit Log
 * Manually create audit log entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@core/audit/service';
import { withAuth } from '@/lib/rbac/with-auth';

export const POST = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { action, resource_type, resource_id, old_value, new_value, metadata } = body;

  if (!action || !resource_type) {
    return NextResponse.json(
      { error: 'Action and resource_type are required' },
      { status: 400 }
    );
  }

  const auditService = new AuditService(ctx.tenantId);
  const log = await auditService.log(
    {
      action,
      resource_type,
      resource_id,
      old_value,
      new_value,
      metadata,
    },
    ctx.user.id
  );

  return NextResponse.json(log);
});
