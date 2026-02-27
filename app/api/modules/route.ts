import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { moduleRegistry } from '@/core/modules';

/**
 * GET /api/modules
 * Get all enabled modules for current tenant
 */
export const GET = withAuth(async (req, ctx) => {
  const modules = await moduleRegistry.getEnabledModules(ctx.tenantId);

  const moduleList = modules.map(module => ({
    name: module.name,
    version: module.version,
    description: module.description,
    config: module.getConfig?.(),
  }));

  return NextResponse.json({ modules: moduleList });
}, { permission: 'settings.manage' });
