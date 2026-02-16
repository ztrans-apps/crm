/**
 * Module Registry Initialization
 * Register all available modules here
 */
import { moduleRegistry } from './registry';
import { WhatsAppModule } from '@/modules/whatsapp/module';
import { CRMModule } from '@/modules/crm/module';
import { ChatbotModule } from '@/modules/chatbot/module';
import { BroadcastModule } from '@/modules/broadcast/module';

/**
 * Initialize all modules
 */
export async function initializeModules() {
  console.log('🚀 Initializing module registry...');

  try {
    // Register all modules
    const modules = [
      new WhatsAppModule(),
      new CRMModule(),
      new ChatbotModule(),
      new BroadcastModule(),
    ];

    for (const module of modules) {
      moduleRegistry.register(module);
    }

    console.log('✅ All modules registered');

    // Initialize all modules with default context
    await moduleRegistry.initializeAll({
      config: {},
    });

    console.log('✅ All modules initialized');
  } catch (error) {
    console.error('❌ Failed to initialize modules:', error);
    throw error;
  }
}

/**
 * Get enabled modules for a tenant
 */
export async function getEnabledModulesForTenant(tenantId: string) {
  return moduleRegistry.getEnabledModules(tenantId);
}

/**
 * Check if a module is enabled for a tenant
 */
export async function isModuleEnabled(moduleName: string, tenantId: string) {
  return moduleRegistry.isEnabled(moduleName, tenantId);
}
