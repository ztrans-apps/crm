# Agent Permissions Setup

## Problem
Agents can only access Dashboard and Settings, but they should have access to more features like Chats, Contacts, Tickets, etc.

## Solution
Run the setup script to assign necessary permissions to the agent role.

## Steps

### Option 1: Run Master Script (Recommended)
```bash
psql -d your_database_name -f scripts/setup-agent-access.sql
```

### Option 2: Run Scripts Individually
```bash
# 1. Create missing permissions
psql -d your_database_name -f scripts/create-missing-permissions.sql

# 2. Assign permissions to agent role
psql -d your_database_name -f scripts/assign-agent-permissions.sql
```

### Option 3: Run via Supabase SQL Editor
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the content of `scripts/create-missing-permissions.sql`
4. Run the query
5. Copy and paste the content of `scripts/assign-agent-permissions.sql`
6. Run the query

## What Permissions Are Assigned to Agents?

After running the script, agents will have access to:

### Chat Features
- `chat.view` - View chat conversations
- `chat.send` - Send messages
- `chat.assign_self` - Pick/assign conversations to themselves

### Contact Features
- `contact.view` - View contacts
- `contact.edit` - Edit contact information

### Ticket Features
- `ticket.view` - View tickets
- `ticket.create` - Create new tickets
- `ticket.update` - Update ticket status

### Agent Features
- `agent.view` - View agent list and status

### Handover Features
- `handover.view` - View handover history
- `handover.create` - Handover conversations to other agents

## Verification

After running the script, you can verify the permissions:

```sql
-- Check agent permissions
SELECT 
  r.role_name,
  p.permission_name,
  p.description
FROM role_permissions rp
JOIN roles r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.role_name = 'agent'
ORDER BY p.permission_name;
```

## Troubleshooting

### Error: "Agent role not found"
Make sure the agent role exists in the `roles` table:
```sql
SELECT * FROM roles WHERE role_name = 'agent';
```

If it doesn't exist, create it:
```sql
INSERT INTO roles (role_name, description)
VALUES ('agent', 'Customer service agent');
```

### Error: "Permission not found"
Run the `create-missing-permissions.sql` script first to create all required permissions.

### Changes Not Reflected in UI
1. Clear browser cache
2. Logout and login again
3. Check browser console for errors

## Menu Items That Will Appear for Agents

After setup, agents will see these menu items in the sidebar:
- Dashboard
- Chats
- Contacts
- Tickets
- Agents
- Handover Reports
- Settings

## Owner vs Agent Access

| Feature | Owner | Agent |
|---------|-------|-------|
| Dashboard | ✅ | ✅ |
| WhatsApp Connection | ✅ | ❌ |
| Chats | ✅ | ✅ |
| Contacts | ✅ (full) | ✅ (view/edit) |
| Tickets | ✅ | ✅ |
| Chatbots | ✅ | ❌ |
| Broadcasts | ✅ | ❌ |
| Agents | ✅ | ✅ (view only) |
| Analytics | ✅ | ❌ |
| Quick Replies | ✅ | ❌ (can use, can't manage) |
| Handover Reports | ✅ | ✅ |
| Role Management | ✅ | ❌ |
| System Settings | ✅ | ❌ |
| Personal Settings | ✅ | ✅ |

## Notes

- Agents can view and use quick replies, but only owners can manage (add/edit/delete) them
- Agents can only see conversations assigned to them or unassigned conversations
- Agents can handover conversations to other agents
- Agents cannot access system settings or role management
