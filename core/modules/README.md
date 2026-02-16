# Module Registry

Core module system for plugin architecture.

## Features

- Module registration and lifecycle management
- Dependency resolution
- Feature flag integration
- Dynamic route registration
- Component registry

## Creating a Module

```typescript
import { BaseModule } from '@/core/modules';
import type { RouteDefinition, ComponentRegistry } from '@/core/modules';

export class MyModule extends BaseModule {
  name = 'my-module';
  version = '1.0.0';
  description = 'My custom module';
  dependencies = ['core-auth']; // Optional dependencies
  
  protected requiredFeature = 'my_feature'; // Optional billing feature

  async initialize(context: ModuleContext): Promise<void> {
    await super.initialize(context);
    // Custom initialization logic
  }

  async destroy(): Promise<void> {
    // Cleanup logic
    await super.destroy();
  }

  getRoutes(): RouteDefinition[] {
    return [
      {
        path: '/api/my-module/action',
        method: 'POST',
        handler: async (req) => {
          // Handle request
          return Response.json({ success: true });
        },
      },
    ];
  }

  getComponents(): ComponentRegistry {
    return {
      MyComponent: () => <div>My Component</div>,
    };
  }
}
```

## Registering a Module

```typescript
import { moduleRegistry } from '@/core/modules';
import { MyModule } from './my-module';

// Register module
const myModule = new MyModule();
moduleRegistry.register(myModule);

// Initialize module
await moduleRegistry.initialize('my-module', {
  tenantId: 'tenant-123',
  config: {},
});
```

## Using the Registry

```typescript
import { moduleRegistry } from '@/core/modules';

// Get all routes
const routes = moduleRegistry.getAllRoutes();

// Get enabled modules for tenant
const modules = await moduleRegistry.getEnabledModules('tenant-123');

// Check if module is enabled
const isEnabled = await moduleRegistry.isEnabled('my-module', 'tenant-123');
```

## Module Lifecycle

1. **Registration**: Module is registered with the registry
2. **Initialization**: Module dependencies are resolved and initialized
3. **Active**: Module is active and serving requests
4. **Destruction**: Module is cleaned up and removed

## Best Practices

- Keep modules small and focused
- Declare all dependencies explicitly
- Use feature flags for premium features
- Implement proper cleanup in destroy()
- Test modules in isolation
