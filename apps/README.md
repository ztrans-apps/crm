# Apps Layer

This directory contains the application entry points for different user types.

## Structure

```
apps/
├── dashboard/          # Main dashboard for regular users
├── admin/              # Administration panel
└── agent/              # Simplified agent interface
```

## Current Implementation

Currently, all apps share the same Next.js app directory structure under `app/(app)/`.

The apps layer provides:
- **Logical separation** of concerns
- **Documentation** for each app type
- **Reference layouts** for future physical separation
- **Clear boundaries** between user types

## Future Migration

To fully separate apps physically:

### Option 1: Monorepo with Turborepo
```
apps/
├── dashboard/          # Separate Next.js app
├── admin/              # Separate Next.js app
└── agent/              # Separate Next.js app
```

Each app would be a standalone Next.js application sharing:
- `/core` - Core business logic
- `/modules` - Business modules
- `/packages` - Shared packages

### Option 2: Route Groups (Current)
```
app/
├── (dashboard)/        # Dashboard routes
├── (admin)/            # Admin routes
└── (agent)/            # Agent routes
```

Using Next.js route groups for logical separation.

### Option 3: Subdomains
```
dashboard.example.com   # Dashboard app
admin.example.com       # Admin app
agent.example.com       # Agent app
```

Deploy same app with different entry points based on subdomain.

## App Characteristics

### Dashboard App
- **Users**: Regular users, managers
- **Features**: Full feature set
- **Routes**: `/dashboard`, `/whatsapp`, `/chats`, `/contacts`, etc.
- **Layout**: Full sidebar with all features

### Admin App
- **Users**: Tenant owners, admins
- **Features**: Administration features
- **Routes**: `/admin/*`
- **Layout**: Admin-focused navigation

### Agent App
- **Users**: Customer service agents
- **Features**: Chat-focused features
- **Routes**: `/agent/*` or simplified dashboard
- **Layout**: Minimal UI focused on chat operations

## Access Control

Each app has different access requirements:

```typescript
// Dashboard
- Requires: Authentication
- Roles: agent, manager, admin, owner
- Permissions: Based on role

// Admin
- Requires: Authentication + Admin role
- Roles: admin, owner
- Permissions: admin.access

// Agent
- Requires: Authentication + Agent role
- Roles: agent
- Permissions: chat.view, chat.reply
```

## Benefits of Apps Layer

1. **Clear Separation**: Each app has clear purpose and boundaries
2. **Scalability**: Easy to split into separate deployments
3. **Maintainability**: Easier to maintain focused codebases
4. **Performance**: Can optimize each app independently
5. **Security**: Better isolation between user types
6. **White-labeling**: Easy to customize per app type

## Current Status

✅ Logical separation documented
✅ Reference layouts created
✅ Access control defined
⚠️ Physical separation pending (future enhancement)

## Migration Path

When ready to physically separate:

1. Choose migration strategy (monorepo, route groups, or subdomains)
2. Move pages to respective app directories
3. Update routing configuration
4. Update build/deploy scripts
5. Test each app independently
6. Deploy separately if needed

## Notes

- Current implementation uses shared layout in `app/(app)/layout.tsx`
- Admin routes are under `app/(app)/admin/`
- Agent routes can use same pages with role-based UI differences
- Full separation is optional and can be done incrementally
