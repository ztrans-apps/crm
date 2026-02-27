import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/rbac/with-auth';
import { moduleRegistry } from '@/core/modules';

/**
 * GET /api/modules/[moduleName]
 * Get module details
 */
export const GET = withAuth(async (req, ctx, params) => {
  const { moduleName } = await params;

  const module = moduleRegistry.getModule(moduleName);
  if (!module) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  const isEnabled = await module.isEnabled(ctx.tenantId);

  return NextResponse.json({
    name: module.name,
    version: module.version,
    description: module.description,
    dependencies: module.dependencies,
    enabled: isEnabled,
    config: module.getConfig?.(),
  });
});

/**
 * PATCH /api/modules/[moduleName]
 * Update module configuration
 */
export const PATCH = withAuth(async (req, ctx, params) => {
  const { moduleName } = await params;

  const module = moduleRegistry.getModule(moduleName);
  if (!module) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  const body = await req.json();

  if (module.updateConfig) {
    await module.updateConfig(body.config);
  }

  return NextResponse.json({ success: true });
}, { permission: 'settings.manage' });
