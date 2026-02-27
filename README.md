# WhatsApp CRM - Next.js

Modern WhatsApp CRM built with Next.js 16, React 19, and Meta WhatsApp Business Cloud API.

## ✨ Features

- **WhatsApp Business Cloud API** - Official Meta API integration
- **Multi-Number Support** - Register multiple phone numbers per tenant
- **Broadcasting** - Send campaigns to contacts with templates
- **Real-time Chat** - Powered by Supabase Realtime
- **RBAC** - Role-based access control (Owner, Admin, Manager, Supervisor, Agent)
- **Chatbots** - Keyword/greeting triggered auto-responders
- **Contact Management** - Labels, segments, import/export
- **Analytics** - Message stats, delivery rates, agent performance
- **Multi-tenant** - Data isolation per organization

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | Full-stack React framework |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Tailwind CSS 4** | Styling |
| **Supabase** | Database (PostgreSQL) + Auth + Realtime |
| **Meta Cloud API** | WhatsApp Business messaging |
| **Upstash Redis** | Caching (optional) |

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- Meta WhatsApp Business Account
- Redis (optional, for caching)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd whatsapp-crm-nextjs
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env.local` and configure:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# WhatsApp Business Cloud API
WHATSAPP_API_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_verify_token
WHATSAPP_API_VERSION=v21.0
WHATSAPP_API_URL=https://graph.facebook.com/v22.0

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

1. Run RBAC migration in Supabase SQL Editor:
   ```sql
   -- Run: supabase/migrations/001_setup_rbac.sql
   ```

2. Assign Owner role to your user:
   ```sql
   -- Edit and run: scripts/assign-owner-role.sql
   ```

### 4. Run Development Server

```bash
npm run dev
```

Application will run on `http://localhost:3000`

## 📁 Project Structure

```
whatsapp-crm-nextjs/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Main app layout
│   ├── api/                      # API routes
│   └── login/                    # Auth pages
├── components/                   # Shared components
├── features/                     # Feature modules
│   ├── chat/                     # Chat feature
│   ├── contacts/                 # Contacts feature
│   └── broadcast/                # Broadcast feature
├── lib/                          # Shared libraries
│   ├── rbac/                     # RBAC system
│   ├── supabase/                 # Supabase client
│   └── whatsapp/                 # WhatsApp helpers
├── modules/                      # Business modules
│   ├── whatsapp/                 # WhatsApp module
│   └── broadcast/                # Broadcast module
├── supabase/                     # Database migrations
└── scripts/                      # Utility scripts
```

## 🔐 RBAC System

The system uses dynamic role-based access control:

### Roles

1. **Owner** - Full system access
2. **Admin** - Administrative access
3. **Manager** - Team management
4. **Supervisor** - Team oversight
5. **Agent** - Handle conversations
6. **User** - View only

### Key Permissions

- `chat.view.all` - View all conversations
- `chat.reply` - Send messages
- `chat.assign` - Assign conversations
- `contact.manage` - Manage contacts
- `broadcast.manage` - Manage broadcasts
- `analytics.view.all` - View all analytics

## 📱 WhatsApp Integration

### Setup WhatsApp Business Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a Business App
3. Add WhatsApp product
4. Get your credentials:
   - Access Token
   - Phone Number ID
   - Business Account ID

### Configure Webhook

1. In Meta App Dashboard, go to WhatsApp → Configuration
2. Set Webhook URL: `https://your-domain.com/api/webhooks/whatsapp`
3. Set Verify Token: (same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
4. Subscribe to: `messages`, `message_status`

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Environment Variables for Production

```env
# Same as development, but with production URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
WHATSAPP_API_URL=https://graph.facebook.com/v22.0
```

## 📊 Features Guide

### Broadcasting

1. Go to Broadcasts → Create Campaign
2. Select contacts or segments
3. Choose WhatsApp template
4. Schedule or send immediately

### Chatbots

1. Go to Chatbots → Create Bot
2. Set trigger (keyword or greeting)
3. Configure response
4. Activate bot

### Analytics

- Dashboard shows KPIs
- Agent productivity metrics
- Message delivery rates
- Conversation effectiveness

## 🐛 Troubleshooting

### Messages not sending

1. Check WhatsApp API credentials
2. Verify phone number is registered
3. Check webhook is configured
4. Review API logs in Meta Dashboard

### Real-time not working

1. Check Supabase Realtime is enabled
2. Verify RLS policies allow subscriptions
3. Check browser console for errors

### Permission errors

1. Verify user has role assigned in `user_roles` table
2. Check role has required permissions
3. Run: `node scripts/check-user-permissions.js`

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.
