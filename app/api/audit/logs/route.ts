/**
 * API Route: Get Audit Logs
 * Retrieve audit logs with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@core/audit/service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

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

    const auditService = new AuditService(tenantId);
    const logs = await auditService.getLogs(filter);

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
