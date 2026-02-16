import type { Module, ModuleContext, RouteDefinition, ComponentRegistry } from './types';

class ModuleRegistry {
  private modules: Map<string, Module> = new Map();
  private initialized: Set<string> = new Set();

  /**
   * Register a module
   */
  register(module: Module): void {
    if (this.modules.has(module.name)) {
      throw new Error(`Module ${module.name} is already registered`);
    }

    // Validate dependencies
    for (const dep of module.dependencies) {
      if (!this.modules.has(dep)) {
        throw new Error(`Module ${module.name} depends on ${dep} which is not registered`);
      }
    }

    this.modules.set(module.name, module);
    console.log(`✅ Module registered: ${module.name} v${module.version}`);
  }

  /**
   * Initialize a module
   */
  async initialize(moduleName: string, context: ModuleContext): Promise<void> {
    const module = this.modules.get(moduleName);
    if (!module) {
      throw new Error(`Module ${moduleName} is not registered`);
    }

    if (this.initialized.has(moduleName)) {
      console.warn(`Module ${moduleName} is already initialized`);
      return;
    }

    // Initialize dependencies first
    for (const dep of module.dependencies) {
      if (!this.initialized.has(dep)) {
        await this.initialize(dep, context);
      }
    }

    // Initialize the module
    await module.initialize(context);
    this.initialized.add(moduleName);
    console.log(`✅ Module initialized: ${moduleName}`);
  }

  /**
   * Initialize all registered modules
   */
  async initializeAll(context: ModuleContext): Promise<void> {
    const moduleNames = Array.from(this.modules.keys());
    
    for (const name of moduleNames) {
      if (!this.initialized.has(name)) {
        await this.initialize(name, context);
      }
    }
  }

  /**
   * Destroy a module
   */
  async destroy(moduleName: string): Promise<void> {
    const module = this.modules.get(moduleName);
    if (!module) {
      throw new Error(`Module ${moduleName} is not registered`);
    }

    if (!this.initialized.has(moduleName)) {
      return;
    }

    await module.destroy();
    this.initialized.delete(moduleName);
    console.log(`✅ Module destroyed: ${moduleName}`);
  }

  /**
   * Check if module is enabled for tenant
   */
  async isEnabled(moduleName: string, tenantId: string): Promise<boolean> {
    const module = this.modules.get(moduleName);
    if (!module) return false;

    return module.isEnabled(tenantId);
  }

  /**
   * Get all routes from all modules
   */
  getAllRoutes(): RouteDefinition[] {
    const routes: RouteDefinition[] = [];

    for (const module of this.modules.values()) {
      if (this.initialized.has(module.name)) {
        routes.push(...module.getRoutes());
      }
    }

    return routes;
  }

  /**
   * Get all components from all modules
   */
  getAllComponents(): Map<string, ComponentRegistry> {
    const components = new Map<string, ComponentRegistry>();

    for (const module of this.modules.values()) {
      if (this.initialized.has(module.name)) {
        components.set(module.name, module.getComponents());
      }
    }

    return components;
  }

  /**
   * Get module by name
   */
  getModule(name: string): Module | undefined {
    return this.modules.get(name);
  }

  /**
   * Get all registered modules
   */
  getAllModules(): Module[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get enabled modules for tenant
   */
  async getEnabledModules(tenantId: string): Promise<Module[]> {
    const enabled: Module[] = [];

    for (const module of this.modules.values()) {
      if (await module.isEnabled(tenantId)) {
        enabled.push(module);
      }
    }

    return enabled;
  }
}

// Singleton instance
export const moduleRegistry = new ModuleRegistry();
