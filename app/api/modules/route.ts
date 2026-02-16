import { NextRequest, NextResponse } from 'next/server';
import { moduleRegistry } from '@/core/modules';
import { getCurrentTenant } from '@/core/tenant';

/**
 * GET /api/modules
 * Get all enabled modules for current tenant
 */
export async function GET(req: NextRequest) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modules = await moduleRegistry.getEnabledModules(tenant.id);
    
    const moduleList = modules.map(module => ({
      name: module.name,
      version: module.version,
      description: module.description,
      config: module.getConfig?.(),
    }));

    return NextResponse.json({ modules: moduleList });
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}
