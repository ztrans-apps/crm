# Dashboard App

Main dashboard application for regular users.

## Features

- WhatsApp session management
- Chat conversations
- Contact management (CRM)
- Broadcast campaigns
- Quick replies
- Analytics

## Routes

All routes under `app/(app)/` except admin routes:

- `/dashboard` - Main dashboard
- `/whatsapp` - WhatsApp connections
- `/chats` - Chat conversations
- `/contacts` - Contact management
- `/broadcasts` - Broadcast campaigns
- `/chatbots` - Chatbot automation
- `/quick-replies` - Quick reply templates
- `/analytics` - Analytics and reports
- `/tickets` - Support tickets
- `/settings` - User settings

## Access Control

- Requires authentication
- Tenant-based access
- Role-based permissions (agent, manager)

## Layout

Uses `app/(app)/layout.tsx` with:
- Sidebar navigation
- Header with user menu
- Tenant switcher
- Agent status manager
