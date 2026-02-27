/**
 * API Route: Get Audit Logs
 * Permission: admin.access (enforced by middleware)
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@core/audit/service';
import { withAuth } from '@/lib/rbac/with-auth';

export const GET = withAuth(async (request, ctx) => {
  const { searchParams } = new URL(request.url);
  
  const filter = {
    user_id: searchParams.get('user_id') || undefined,
    action: searchParams.get('action') as any || undefined,
    resource_type: searchParams.get('resource_type') || undefined,
    resource_id: searchParams.get('resource_id') || undefined,
    from_date: searchParams.get('from_date') || undefined,
    to_date: searchParams.get('to_date') || undefined,
    limit: parseInt(searchParams.get('limit') || '100'),
    offset: parseInt(searchParams.get('offset') || '0'),
  };

  const auditService = new AuditService(ctx.tenantId);
  const logs = await auditService.getLogs(filter);

  return NextResponse.json(logs);
});
