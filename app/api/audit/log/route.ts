/**
 * API Route: Create Audit Log
 * Manually create audit log entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@core/audit/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('X-Tenant-ID');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Get current user
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { action, resource_type, resource_id, old_value, new_value, metadata } = body;

    if (!action || !resource_type) {
      return NextResponse.json(
        { error: 'Action and resource_type are required' },
        { status: 400 }
      );
    }

    const auditService = new AuditService(tenantId);
    const log = await auditService.log(
      {
        action,
        resource_type,
        resource_id,
        old_value,
        new_value,
        metadata,
      },
      user?.id
    );

    return NextResponse.json(log);
  } catch (error) {
    console.error('Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
