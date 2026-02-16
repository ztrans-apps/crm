import { NextRequest, NextResponse } from 'next/server';
import { moduleRegistry } from '@/core/modules';
import { getCurrentTenant } from '@/core/tenant';

/**
 * GET /api/modules/[moduleName]
 * Get module details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { moduleName: string } }
) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const module = moduleRegistry.getModule(params.moduleName);
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    const isEnabled = await module.isEnabled(tenant.id);

    return NextResponse.json({
      name: module.name,
      version: module.version,
      description: module.description,
      dependencies: module.dependencies,
      enabled: isEnabled,
      config: module.getConfig?.(),
    });
  } catch (error) {
    console.error('Error fetching module:', error);
    return NextResponse.json(
      { error: 'Failed to fetch module' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/modules/[moduleName]
 * Update module configuration
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { moduleName: string } }
) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const module = moduleRegistry.getModule(params.moduleName);
    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    const body = await req.json();
    
    if (module.updateConfig) {
      await module.updateConfig(body.config);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating module:', error);
    return NextResponse.json(
      { error: 'Failed to update module' },
      { status: 500 }
    );
  }
}
