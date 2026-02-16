# Agent App

Simplified interface for customer service agents.

## Features

- Chat conversations (focused view)
- Quick replies
- Contact lookup
- Ticket management
- Agent status management

## Routes

Agent-specific routes (can be same as dashboard but with simplified UI):

- `/agent/chats` - Chat conversations
- `/agent/tickets` - Support tickets
- `/agent/contacts` - Contact lookup
- `/agent/quick-replies` - Quick replies

## Access Control

- Requires authentication
- Requires agent role
- Tenant-based access
- Limited permissions (no admin access)

## Layout

Simplified layout focused on chat operations:
- Minimal sidebar
- Quick access to chats
- Agent status indicator
- No admin features

## Permissions

Accessible to users with:
- Role: `agent`
- Permissions: `chat.view`, `chat.reply`, `contact.view`
