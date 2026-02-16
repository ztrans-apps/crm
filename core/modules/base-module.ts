import type { Module, ModuleContext, RouteDefinition, ComponentRegistry } from './types';
import { BillingService } from '@/core/billing';

/**
 * Base class for all modules
 * Provides common functionality and enforces module interface
 */
export abstract class BaseModule implements Module {
  abstract name: string;
  abstract version: string;
  abstract description?: string;
  dependencies: string[] = [];

  protected context?: ModuleContext;
  protected requiredFeature?: string;

  /**
   * Initialize the module
   */
  async initialize(context: ModuleContext): Promise<void> {
    this.context = context;
    console.log(`Initializing module: ${this.name}`);
  }

  /**
   * Cleanup module resources
   */
  async destroy(): Promise<void> {
    console.log(`Destroying module: ${this.name}`);
  }

  /**
   * Check if module is enabled for tenant
   * Override this for custom logic
   */
  async isEnabled(tenantId: string): Promise<boolean> {
    // Check if tenant has access to this feature
    if (this.requiredFeature) {
      return BillingService.hasFeature(tenantId, this.requiredFeature);
    }
    return true;
  }

  /**
   * Get API routes for this module
   * Override this to add routes
   */
  getRoutes(): RouteDefinition[] {
    return [];
  }

  /**
   * Get UI components for this module
   * Override this to add components
   */
  getComponents(): ComponentRegistry {
    return {};
  }

  /**
   * Get module configuration
   */
  getConfig(): Record<string, any> {
    return {};
  }

  /**
   * Update module configuration
   */
  async updateConfig(config: Record<string, any>): Promise<void> {
    // Override in subclass
  }
}
