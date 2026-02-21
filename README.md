# WhatsApp CRM System

> Multi-tenant WhatsApp Business CRM with advanced features including RBAC, broadcasting, queue management, and real-time messaging.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [WhatsApp Service](#whatsapp-service)
- [Queue System](#queue-system)
- [RBAC System](#rbac-system)
- [Broadcast System](#broadcast-system)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

WhatsApp CRM adalah sistem Customer Relationship Management berbasis WhatsApp Business API yang dirancang untuk:
- Mengelola multiple WhatsApp business numbers
- Multi-tenant architecture untuk isolasi data
- Role-based access control (RBAC) untuk keamanan
- Broadcasting messages ke multiple contacts
- Queue system untuk message processing
- Real-time messaging dengan Socket.IO
- Chatbot integration
- Analytics dan reporting

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Mobile App  │  │   WhatsApp   │      │
│  │  (Next.js)   │  │   (Future)   │  │   Business   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Next.js Application                      │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │   │
│  │  │   Pages    │  │    API     │  │ Components │    │   │
│  │  │  Routes    │  │   Routes   │  │   & UI     │    │   │
│  │  └────────────┘  └────────────┘  └────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   WhatsApp   │  │    Queue     │  │    RBAC      │      │
│  │   Service    │  │   Workers    │  │   Service    │      │
│  │  (Node.js)   │  │  (BullMQ)    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Supabase   │  │    Redis     │  │    Files     │      │
│  │  (Postgres)  │  │   (Queue)    │  │  (.baileys)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
app/
├── Frontend (Next.js)
│   ├── Pages & Routing
│   ├── Components (UI)
│   └── API Routes
│
├── Core Modules
│   ├── Billing System
│   ├── Module Management
│   └── Queue Management
│
├── Feature Modules
│   ├── WhatsApp Module
│   ├── Broadcast Module
│   ├── CRM Module
│   └── Chatbot Module
│
└── Services
    ├── WhatsApp Service (Separate Node.js)
    ├── Queue Workers (BullMQ)
    └── RBAC Service
```


## ✨ Features

### Core Features
- **Multi-Tenant Architecture**: Complete data isolation per tenant
- **WhatsApp Integration**: Multiple WhatsApp Business numbers per tenant
- **Real-time Messaging**: Socket.IO for instant message updates
- **Message Queue**: BullMQ + Redis for reliable message processing
- **Broadcasting**: Send messages to multiple contacts simultaneously
- **Contact Management**: Organize and manage customer contacts
- **Conversation Management**: Track and manage customer conversations

### Advanced Features
- **RBAC (Role-Based Access Control)**: 
  - 10 predefined roles (Super Admin, Admin, Manager, etc.)
  - 80+ granular permissions
  - Role hierarchy and inheritance
  - Permission templates
- **Broadcast System**:
  - Send messages to multiple contacts simultaneously
  - Schedule broadcasts for future delivery (timezone-aware: WIB → UTC)
  - Template management with WhatsApp categories (MARKETING, UTILITY, AUTHENTICATION)
  - Recipient list management (Excel import with variables, CRM integration)
  - Real-time campaign tracking and analytics
  - Queue-based sending with rate limiting (10 msg/sec)
  - Auto-retry mechanism (3x with exponential backoff)
  - Auto-completion status tracking
  - Real-time WhatsApp-style message preview
  - Campaign scheduler (auto-check every 1 minute)
- **Chatbot Integration**: Automated responses and workflows
- **Quick Replies**: Pre-defined message templates with categories
- **Analytics & Reporting**: Track messages, conversations, and performance
- **Audit Logging**: Complete audit trail for all actions
- **Module System**: Enable/disable features per tenant
- **Billing System**: Track usage and billing per tenant

### WhatsApp Features
- **Session Management**: Auto-reconnect, health monitoring
- **Media Support**: Images, videos, documents, audio
- **Location Sharing**: Send and receive location data
- **Message Status**: Sent, delivered, read tracking
- **Delivery Tracking**: Monitor message delivery rates
- **Circuit Breaker**: Automatic failure recovery
- **Message Deduplication**: Prevent duplicate messages

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **State Management**: Zustand
- **UI Components**: Radix UI, Lucide Icons
- **Real-time**: Socket.IO Client

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes + Express (WhatsApp Service)
- **Database**: Supabase (PostgreSQL)
- **Queue**: BullMQ + Redis (IORedis)
- **WhatsApp**: Baileys (WhatsApp Web API)
- **Real-time**: Socket.IO

### Infrastructure
- **Database**: PostgreSQL (via Supabase)
- **Cache/Queue**: Redis
- **File Storage**: Local filesystem (.baileys_auth)
- **Monitoring**: Sentry (optional)

## 📁 Project Structure

```
whatsapp-crm-nextjs/
├── app/                          # Next.js App Router
│   ├── (app)/                    # Main application routes
│   │   ├── admin/                # Admin pages
│   │   │   ├── monitoring/       # System monitoring
│   │   │   └── rbac/             # RBAC management
│   │   ├── agents/               # Agent management
│   │   ├── broadcasts/           # Broadcasting
│   │   ├── chats/                # Chat interface
│   │   ├── contacts/             # Contact management
│   │   ├── dashboard/            # Dashboard
│   │   ├── settings/             # Settings
│   │   │   ├── billing/          # Billing settings
│   │   │   └── modules/          # Module management
│   │   └── whatsapp/             # WhatsApp connections
│   ├── api/                      # API Routes
│   │   ├── billing/              # Billing API
│   │   ├── broadcast/            # Broadcast API
│   │   ├── conversations/        # Conversations API
│   │   ├── crm/                  # CRM API
│   │   ├── health/               # Health check
│   │   ├── modules/              # Module API
│   │   ├── queue/                # Queue API
│   │   ├── rbac/                 # RBAC API
│   │   └── whatsapp/             # WhatsApp API proxy
│   └── layout.tsx                # Root layout
│
├── components/                   # Shared components
│   ├── layout/                   # Layout components
│   └── ui/                       # UI components
│
├── core/                         # Core modules
│   ├── billing/                  # Billing system
│   ├── modules/                  # Module management
│   └── index.ts                  # Core exports
│
├── features/                     # Feature modules
│   ├── chat/                     # Chat feature
│   │   ├── components/           # Chat components
│   │   ├── hooks/                # Chat hooks
│   │   └── services/             # Chat services
│   └── ...
│
├── lib/                          # Shared libraries
│   ├── api/                      # API clients
│   ├── queue/                    # Queue management
│   │   ├── config.ts             # Queue config
│   │   ├── queue-manager.ts      # Queue manager
│   │   ├── services/             # Queue services
│   │   └── workers/              # Queue workers
│   ├── rbac/                     # RBAC system
│   │   ├── middleware.ts         # RBAC middleware
│   │   ├── permission-service.ts # Permission service
│   │   ├── hooks/                # RBAC hooks
│   │   └── types.ts              # RBAC types
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   └── types/                    # TypeScript types
│
├── modules/                      # Feature modules (modular)
│   ├── broadcast/                # Broadcast module
│   │   ├── components/           # Module components
│   │   └── module.ts             # Module definition
│   ├── chatbot/                  # Chatbot module
│   ├── crm/                      # CRM module
│   └── whatsapp/                 # WhatsApp module
│       ├── components/           # WhatsApp components
│       ├── services/             # WhatsApp services
│       └── module.ts             # Module definition
│
├── whatsapp-service/             # Separate WhatsApp Service
│   ├── src/
│   │   ├── config/               # Service config
│   │   │   └── supabase.js       # Supabase config
│   │   ├── jobs/                 # Background jobs
│   │   │   └── sync-session-status.js
│   │   ├── middleware/           # Express middleware
│   │   ├── routes/               # API routes
│   │   │   ├── auth.js           # Auth routes
│   │   │   ├── health.js         # Health check
│   │   │   ├── messages.js       # Message routes
│   │   │   ├── media.js          # Media routes
│   │   │   ├── location.js       # Location routes
│   │   │   └── sessions.js       # Session routes
│   │   ├── services/             # Services
│   │   │   ├── whatsapp.js       # WhatsApp service
│   │   │   ├── circuitBreaker.js # Circuit breaker
│   │   │   ├── deliveryTracker.js# Delivery tracking
│   │   │   ├── healthMonitor.js  # Health monitoring
│   │   │   ├── messageDeduplicator.js
│   │   │   ├── reconnect-manager.js
│   │   │   └── session-manager.js
│   │   └── server.js             # Main server
│   └── .baileys_auth/            # WhatsApp credentials
│
├── scripts/                      # Utility scripts
│   ├── create-agent-user.js      # Create agent
│   ├── start-workers.ts          # Start queue workers
│   ├── retry-failed-jobs.ts      # Retry failed jobs
│   ├── check-queue.ts            # Check queue status
│   └── whatsapp-service.sh       # Service management
│
├── supabase/                     # Database
│   ├── migrations/               # Database migrations
│   └── database-schema.sql       # Complete schema
│
├── tests/                        # Tests
│   ├── unit/                     # Unit tests
│   ├── service/                  # Service tests
│   └── integration/              # Integration tests
│
├── .env.local                    # Environment variables
├── .env.example                  # Example env file
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── tailwind.config.ts            # Tailwind config
├── next.config.js                # Next.js config
└── README.md                     # This file
```


## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Redis server
- PostgreSQL (via Supabase)
- WhatsApp Business account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd whatsapp-crm-nextjs
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# WhatsApp Service
WHATSAPP_SERVICE_URL=http://localhost:3001

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001

# Optional: Sentry
SENTRY_DSN=
```

4. **Setup database**
```bash
# Run migrations in Supabase dashboard or using CLI
# Import supabase/database-schema.sql
```

5. **Setup storage bucket for broadcast media**
```bash
# Run the storage bucket migration
# This creates the 'broadcast-media' bucket for template images/videos/documents
# See docs/BROADCAST_MEDIA_STORAGE.md for details
```

6. **Start Redis**
```bash
redis-server
```

## ⚙️ Configuration

### Database Setup

1. Create a Supabase project
2. Run migrations from `supabase/migrations/` in order:
   - `20260216000000_create_billing_tables.sql`
   - `20260216000001_create_crm_broadcast_tables.sql`
   - `20260216100000_rbac_system_complete.sql`
   - `20260216110000_rbac_hierarchy_and_templates.sql`
   - `20260216120000_rbac_update_existing.sql`
   - `20260221000000_add_template_wizard_fields.sql`
   - `20260222000000_create_dashboard_analytics_tables.sql`
   - `20260222100000_create_broadcast_media_bucket.sql` (Storage bucket for media)

3. Enable Row Level Security (RLS) on all tables
4. Enable Realtime for:
   - messages
   - conversations
   - contacts
   - conversation_notes
   - conversation_labels

**Storage Setup:**
- The `broadcast-media` bucket is created automatically by the migration
- Used for storing template images, videos, and documents
- Public read access, authenticated write access
- See `docs/BROADCAST_MEDIA_STORAGE.md` for details

### Redis Setup

For local development:
```bash
# Install Redis
brew install redis  # macOS
# or
apt-get install redis-server  # Ubuntu

# Start Redis
redis-server
```

For production, use managed Redis (Redis Cloud, AWS ElastiCache, etc.)

### WhatsApp Service Setup

The WhatsApp service runs separately from the main Next.js app:

1. Credentials are stored in `whatsapp-service/.baileys_auth/`
2. Service runs on port 3001 by default
3. Communicates with main app via HTTP and Socket.IO


## 🏃 Running the Application

### Quick Start (All Services)

Start all services at once:
```bash
./scripts/start-all-services.sh
```

Stop all services:
```bash
./scripts/stop-all-services.sh
```

### Development Mode (Manual)

**⚠️ IMPORTANT: All 3 services must be running for the system to work properly!**

**1. Start the main Next.js application:**
```bash
npm run dev
```
Application will run on `http://localhost:3000`

**2. Start the WhatsApp service:**
```bash
./scripts/whatsapp-service.sh start
```
Service will run on `http://localhost:3001`

**3. Start queue workers (REQUIRED for sending messages!):**
```bash
npm run workers
```
**Without workers, messages will be saved to database but NOT sent to WhatsApp!**

**Workers include:**
- Message send worker
- Broadcast send worker (with rate limiting)
- Broadcast scheduler (auto-checks every 1 minute)
- Webhook delivery worker

### Production Mode

**1. Build the application:**
```bash
npm run build
```

**2. Start the application:**
```bash
npm run start
```

**3. Start WhatsApp service:**
```bash
./scripts/whatsapp-service.sh start
```

**4. Start queue workers:**
```bash
npm run workers
```

### Using Process Manager (PM2)

For production, use PM2 to manage processes:

```bash
# Install PM2
npm install -g pm2

# Start Next.js app
pm2 start npm --name "whatsapp-crm" -- start

# Start WhatsApp service
pm2 start whatsapp-service/src/server.js --name "whatsapp-service"

# Start workers
pm2 start npm --name "queue-workers" -- run workers

# Save configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

## 📱 WhatsApp Service

### Service Management

Use the provided script for easy management:

```bash
# Start service
./scripts/whatsapp-service.sh start

# Stop service
./scripts/whatsapp-service.sh stop

# Restart service
./scripts/whatsapp-service.sh restart

# Check status
./scripts/whatsapp-service.sh status

# View logs
./scripts/whatsapp-service.sh logs
```

### Connecting WhatsApp

1. Open web app: `http://localhost:3000/whatsapp`
2. Click "Add WhatsApp Number" or "Connect"
3. Scan QR code with your WhatsApp Business app
4. Wait for "Connected" status

### Session Persistence

- Sessions auto-reconnect after service restart
- Credentials stored in `.baileys_auth/[session-id]/`
- No QR scan needed after first connection
- Session stays active as long as device is linked in phone

### Troubleshooting WhatsApp

**Messages not being sent to WhatsApp:**
1. Check if workers are running:
   ```bash
   ps aux | grep "start-workers"
   ```
2. If not running, start workers:
   ```bash
   npm run workers
   ```
3. Check worker logs for errors:
   ```bash
   tail -f logs/workers.log
   ```
4. Messages appear in CRM but not in WhatsApp = Workers not running!

**QR Code appears again after restart:**
- Check phone: WhatsApp > Settings > Linked Devices
- If device not listed, scan QR again
- Avoid frequent restarts (wait 30+ seconds between restarts)

**Session disconnected:**
- Service will auto-reconnect within 30 seconds
- Check logs: `./scripts/whatsapp-service.sh logs`
- Restart if needed: `./scripts/whatsapp-service.sh restart`

**Port 3001 already in use:**
```bash
# Kill process on port
lsof -ti:3001 | xargs kill -9

# Or use script
./scripts/whatsapp-service.sh stop
./scripts/whatsapp-service.sh start
```


## 🔄 Queue System

### Architecture

The queue system uses BullMQ + Redis for reliable message processing:

```
Message Request → API → Queue → Worker → WhatsApp Service → WhatsApp
                                  ↓
                            Retry Logic
                                  ↓
                          Dead Letter Queue
```

### Queue Workers

**Start workers:**
```bash
npm run workers
```

This starts all workers including the broadcast scheduler.

**Available workers:**
- `whatsapp-send`: Send WhatsApp messages
- `broadcast-send`: Process broadcast campaigns with rate limiting
- `webhook-delivery`: Deliver webhooks to external services
- `message-status`: Update message status
- `delivery-tracking`: Track delivery metrics

**Broadcast Scheduler:**
- Auto-starts with workers
- Checks for scheduled campaigns every 1 minute
- Converts WIB scheduled time to UTC for processing
- Automatically triggers campaigns when scheduled time arrives

### Queue Management

**Check queue status:**
```bash
npm run check-queue
```

**Retry failed jobs:**
```bash
npm run retry-failed
```

**Queue metrics:**
- Active jobs
- Completed jobs
- Failed jobs
- Waiting jobs
- Delayed jobs

**Monitor workers:**
```bash
# Check worker health
curl http://localhost:3000/api/health/workers

# Check queue debug info
curl http://localhost:3000/api/broadcast/debug/queue

# Check scheduled campaigns
curl http://localhost:3000/api/broadcast/debug/scheduled
```

### Queue Configuration

Edit `lib/queue/config.ts`:
```typescript
export const queueConfig = {
  defaultJobOptions: {
    attempts: 3,           // Retry 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,         // Start with 2s delay
    },
    removeOnComplete: 100, // Keep last 100 completed
    removeOnFail: 500,     // Keep last 500 failed
  },
}
```

### Broadcast Worker Configuration

The broadcast worker has special rate limiting to prevent WhatsApp bans:

```typescript
// lib/queue/workers/broadcast-send.worker.ts
const worker = new Worker('broadcast-send', async (job) => {
  // Process job
}, {
  connection: redis,
  limiter: {
    max: 10,        // Max 10 jobs
    duration: 1000, // Per 1 second
  },
})
```

**Rate Limiting:**
- 10 messages per second maximum
- Prevents WhatsApp rate limit violations
- Automatic backoff on errors

**Retry Logic:**
- 3 attempts per message
- Exponential backoff (2s, 4s, 8s)
- Failed messages marked in database

**Auto-Completion:**
- Worker checks campaign progress after each message
- Auto-completes campaign when all messages processed
- Updates campaign status in real-time

## 🔐 RBAC System

### Role Hierarchy

```
Super Admin (Level 10)
    ↓
Admin (Level 9)
    ↓
Manager (Level 8)
    ↓
Team Lead (Level 7)
    ↓
Senior Agent (Level 6)
    ↓
Agent (Level 5)
    ↓
Junior Agent (Level 4)
    ↓
Viewer (Level 3)
    ↓
Guest (Level 2)
    ↓
Restricted (Level 1)
```

### Permission Categories

- **Conversations**: View, create, update, delete, assign
- **Messages**: Send, view, delete
- **Contacts**: View, create, update, delete, import, export
- **Broadcasts**: View, create, send, delete
- **Agents**: View, create, update, delete, assign
- **Reports**: View, export
- **Settings**: View, update
- **RBAC**: Manage roles, permissions, users
- **Admin**: Full system access

### Using RBAC

**In API Routes:**
```typescript
import { requirePermission } from '@/lib/rbac/middleware'

export async function POST(request: Request) {
  // Check permission
  const hasPermission = await requirePermission('messages.send')
  if (hasPermission !== true) return hasPermission // Returns 403
  
  // Your logic here
}
```

**In Components:**
```typescript
import { usePermissions } from '@/lib/rbac/hooks/usePermissions'

function MyComponent() {
  const { can, canAny, canAll } = usePermissions()
  
  if (!can('messages.send')) {
    return <div>No permission</div>
  }
  
  return <button>Send Message</button>
}
```

**Check multiple permissions:**
```typescript
// User needs ANY of these permissions
if (canAny(['messages.send', 'messages.send_template'])) {
  // Show send button
}

// User needs ALL of these permissions
if (canAll(['contacts.view', 'contacts.export'])) {
  // Show export button
}
```

### Managing Roles

1. Go to Admin > RBAC Management
2. Create/edit roles
3. Assign permissions to roles
4. Assign roles to users


## 📢 Broadcast System

### Overview

The broadcast system allows sending messages to multiple contacts simultaneously with advanced features:

- **Campaign Management**: Create, schedule, and track broadcast campaigns
- **Template System**: Pre-defined message templates with WhatsApp categories
- **Recipient Lists**: Import from Excel or use CRM contacts
- **Scheduling**: Schedule broadcasts for future delivery with timezone support
- **Rate Limiting**: Automatic rate limiting to prevent WhatsApp bans
- **Progress Tracking**: Real-time campaign progress and statistics
- **Auto-Retry**: Failed messages automatically retried up to 3 times

### Campaign Creation

**1. Navigate to Broadcasts:**
```
Dashboard → Broadcasts → Buat Campaign
```

**2. Fill Campaign Details:**
- Campaign Name
- Template (select from pre-defined templates)
- Sender (Agent who will send)
- WhatsApp Account (session to use)
- Recipient List (select or create new)
- Schedule (optional - for future delivery)

**3. Preview:**
- Real-time WhatsApp-style preview
- Shows exactly how message will appear
- Mobile phone POV (customer receiving message)

**4. Send:**
- **Kirim Sekarang** (Send Now): Immediate sending
- **Jadwalkan Kirim** (Schedule Send): Send at specified time

### Template Management

**Template Categories (WhatsApp Business API Standard):**
- **MARKETING**: Promotional messages, offers, announcements
- **UTILITY**: Account updates, order status, reminders
- **AUTHENTICATION**: OTP, verification codes, security alerts

**Creating Templates:**
```
Broadcasts → Template → Add Template
```

**Template Variables:**
- Use `{{1}}`, `{{2}}`, `{{3}}` for dynamic content
- Variables replaced with recipient data during sending
- Example: "Hello {{1}}, your order {{2}} is ready!"

### Template Creation Flow (Meta Standard)

The template creation follows Meta's 6-step standard process for WhatsApp Business templates:

#### Step 1: Basic Information
**Purpose**: Set up template identity and basic configuration

**Fields:**
- **Template Name**: Unique identifier (lowercase, underscores only, no spaces)
  - Example: `order_confirmation`, `promo_flash_sale`
  - Guidelines: Descriptive, cannot be changed after submission
- **Language**: Select template language (English, Indonesian, etc.)
- **Category**: Choose template category
  - MARKETING: Promotional content
  - UTILITY: Transactional updates
  - AUTHENTICATION: Security codes

**Naming Guidelines:**
- Use only letters, numbers, and underscores
- Spaces will be converted to underscores
- Names cannot be changed after submission
- Be descriptive of template purpose

#### Step 2: Header Configuration
**Purpose**: Add optional header to make message more engaging

**Header Format Options:**
- **None**: No header (text-only message)
- **Text**: Text header (max 60 characters)
  - Example: "Special Offer Just for You!"
- **Media**: Image, video, or document header
  - **Image**: Clear and relevant (jpg, jpeg, png, max 5MB)
  - **Video**: Under 16MB, less than 30 seconds
  - **Document**: PDF format only

**Header Guidelines:**
- Text headers limited to 60 characters
- Images should be clear and relevant to message
- Videos should be under 16MB and less than 30 seconds
- Documents should be in PDF format
- Media files enhance engagement but are optional

#### Step 3: Message Body
**Purpose**: Create the main message content

**Fields:**
- **Body (Required)**: Main message text (max 1024 characters)
  - Use clear, concise language
  - Add variables using `{{1}}`, `{{2}}`, `{{3}}` syntax
  - Provide examples for all variables in next step
- **Footer Text (Optional)**: Additional info (max 60 characters)
  - Example: "Reply STOP to unsubscribe"
  - Commonly used for disclaimers or opt-out info

**Body Text Guidelines:**
- Use clear, concise language
- Add variables using the `{{1}}` syntax for dynamic content
- Provide examples for all variables in the next step
- Footer text is optional and limited to 60 characters
- Maximum 1024 characters for body text

**Variable Syntax:**
- `{{1}}` for first variable (e.g., customer name)
- `{{2}}` for second variable (e.g., order number)
- `{{3}}` for third variable (e.g., date)
- Example: "Hello {{1}}, your order {{2}} is ready for pickup!"

#### Step 4: Buttons & Actions
**Purpose**: Add interactive buttons for user engagement

**Button Type Options:**

**1. None**: No buttons (text-only message)

**2. Call to Action (Max 2 buttons):**
- **Call Phone**: Direct call button
  - Button Text: Max 20 characters
  - Phone Number: Include country code (e.g., +6281234567890)
  - Example: "Call Support"
- **Visit Website**: URL button
  - Button Text: Max 20 characters
  - Website URL: Valid URL with https:// prefix
  - Example: "Shop Now" → https://example.com

**3. Quick Reply (Max 3 buttons):**
- Simple response buttons
- Button Text: Max 20 characters each
- Example: "Yes", "No", "Maybe"
- Used for quick user responses

**Button Guidelines:**
- Quick Reply buttons limited to 3 buttons
- Call-to-Action buttons limited to 2 buttons
- Button text limited to 20 characters
- Phone numbers should include country code (e.g., +6281234567890)
- URLs should be valid and include https:// prefix

#### Step 5: Variables & Examples
**Purpose**: Define variable values and provide examples for template approval

**Requirements:**
- If your message body contains variables (`{{1}}`, `{{2}}`, etc.), you must provide example values
- Examples help WhatsApp understand your template usage
- All variables must have corresponding examples

**Example:**
- Template: "Hello {{1}}, your order {{2}} is ready!"
- Variable 1 Example: "John Doe"
- Variable 2 Example: "ORD-12345"

**Guidelines:**
- No variables detected: This step can be skipped
- Provide realistic examples that represent actual usage
- Examples are used for template review and approval
- Variables will be replaced with actual data during broadcast

#### Step 6: Review & Submit
**Purpose**: Final review before template submission

**Review Checklist:**
- **Template Details**: Verify name, language, and category
- **Template Content**: Review header, body, footer, and buttons
- **Variables**: Ensure all variables have examples
- **Preview**: Check how template appears in WhatsApp

**Before You Submit:**
- Review your template carefully - templates cannot be edited after submission
- Ensure all variables have appropriate examples
- Check that your template complies with WhatsApp's guidelines
- Templates typically take 1-2 days (or more) for review

**Template Approval Process:**
- Templates must be approved by WhatsApp before use
- Review typically takes 1-2 days
- You'll be notified of approval status
- Rejected templates can be resubmitted with modifications

**Post-Submission:**
- Template status will show as "Pending" during review
- Approved templates can be used immediately in broadcasts
- Rejected templates will show rejection reason
- You can create new templates while waiting for approval

### Recipient Lists

**Three Import Methods:**

**1. Import Excel:**
- Simple contact list with name and phone
- CSV format: `contacts_name,phone_number`
- Phone format: 6289xxx (no +, -, or spaces)

**2. Import Excel Dengan Variabel:**
- Contact list with custom variables for templates
- CSV format: `contacts_name,phone_number,var1,var2,var3`
- Variables used to personalize messages
- Example: `John Doe,6289123456789,Premium,ORD-123,2024-02-17`

**3. Dari Kontak CRM:**
- Use existing contacts from CRM
- Filter by labels, tags, or segments
- No import needed

**CSV Template Download:**
```
Broadcasts → Daftar Penerima → Download Template
```

### Scheduling Broadcasts

**Timezone Handling:**
- Input time in WIB (Waktu Indonesia Barat)
- Automatically converted to UTC for storage
- Displayed back in WIB in UI

**Scheduler:**
- Runs automatically with workers
- Checks every 1 minute for scheduled campaigns
- Triggers campaigns when scheduled time arrives
- No manual intervention needed

**Manual Trigger (for testing):**
```bash
curl -X POST http://localhost:3000/api/broadcast/scheduler/trigger
```

### Campaign Tracking

**Campaign Status:**
- **Draft**: Not yet sent
- **Scheduled**: Waiting for scheduled time
- **Sending**: Currently being sent
- **Completed**: All messages sent
- **Failed**: Campaign failed

**Recipient Status:**
- **Pending**: Waiting to be sent
- **Sent**: Successfully sent to WhatsApp
- **Failed**: Failed to send (will retry)
- **Delivered**: Delivered to recipient
- **Read**: Read by recipient

**Statistics:**
- Total recipients
- Sent count
- Failed count
- Delivery rate
- Read rate
- Progress percentage

### API Endpoints

**Campaign Management:**
```bash
# Create campaign
POST /api/broadcast/campaigns
Body: {
  name, template_id, sender_id, session_id,
  recipient_list_id, scheduled_at (optional)
}

# List campaigns
GET /api/broadcast/campaigns?status=sending&page=1&limit=10

# Get campaign detail
GET /api/broadcast/campaigns/[id]

# Trigger completion check
POST /api/broadcast/campaigns/[id]/complete
```

**Template Management:**
```bash
# List templates
GET /api/broadcast/templates

# Create template
POST /api/broadcast/templates
Body: { name, content, category, variables }

# Update template
PUT /api/broadcast/templates/[id]

# Delete template
DELETE /api/broadcast/templates/[id]
```

**Recipient Lists:**
```bash
# List recipient lists
GET /api/broadcast/recipient-lists

# Create list
POST /api/broadcast/recipient-lists
Body: { name, source, file (CSV) }

# Get list detail
GET /api/broadcast/recipient-lists/[id]

# Delete list
DELETE /api/broadcast/recipient-lists/[id]
```

**Scheduler Control:**
```bash
# Start scheduler
POST /api/broadcast/scheduler/start

# Stop scheduler
POST /api/broadcast/scheduler/stop

# Manual trigger
POST /api/broadcast/scheduler/trigger
```

**Debug Endpoints:**
```bash
# Queue status
GET /api/broadcast/debug/queue

# Scheduled campaigns
GET /api/broadcast/debug/scheduled

# Worker health
GET /api/health/workers
```

### Rate Limiting

**WhatsApp Rate Limits:**
- Tier 1: 1,000 messages/day
- Tier 2: 10,000 messages/day
- Tier 3: 100,000 messages/day

**System Rate Limiting:**
- 10 messages per second maximum
- Prevents rate limit violations
- Automatic backoff on errors
- Queue-based processing

**Best Practices:**
- Don't send more than your tier limit
- Space out large campaigns
- Monitor delivery rates
- Use templates approved by WhatsApp

### Troubleshooting Broadcasts

**Messages not sending:**
1. Check if workers are running:
   ```bash
   ps aux | grep "start-workers"
   ```
2. Check queue status:
   ```bash
   curl http://localhost:3000/api/broadcast/debug/queue
   ```
3. Check worker logs for errors
4. Verify WhatsApp service is running

**Scheduled campaign not triggering:**
1. Verify scheduler is running:
   ```bash
   curl http://localhost:3000/api/broadcast/scheduler/start
   ```
2. Check scheduled campaigns:
   ```bash
   curl http://localhost:3000/api/broadcast/debug/scheduled
   ```
3. Verify timezone conversion (WIB → UTC)
4. Check worker logs for scheduler activity

**High failure rate:**
1. Check WhatsApp account status
2. Verify phone numbers are valid (6289xxx format)
3. Check if hitting rate limits
4. Review WhatsApp service logs
5. Verify templates are approved

**Campaign stuck in "Sending":**
1. Check if all recipients processed:
   ```bash
   curl http://localhost:3000/api/broadcast/campaigns/[id]
   ```
2. Manually trigger completion:
   ```bash
   curl -X POST http://localhost:3000/api/broadcast/campaigns/[id]/complete
   ```
3. Check for failed jobs in queue
4. Restart workers if needed


## 👨‍💻 Development

### Code Structure

**Modular Architecture:**
- Each feature is a self-contained module
- Modules can be enabled/disabled per tenant
- Clean separation of concerns

**Module Structure:**
```typescript
// modules/mymodule/module.ts
export const myModule = {
  id: 'my-module',
  name: 'My Module',
  description: 'Module description',
  version: '1.0.0',
  enabled: true,
  routes: ['/my-route'],
  permissions: ['mymodule.view', 'mymodule.create'],
}
```

### Adding New Features

1. **Create module directory:**
```bash
mkdir -p modules/myfeature/{components,services}
```

2. **Define module:**
```typescript
// modules/myfeature/module.ts
export const myFeatureModule = {
  id: 'my-feature',
  name: 'My Feature',
  // ... module config
}
```

3. **Register module:**
```typescript
// core/index.ts
import { myFeatureModule } from '@/modules/myfeature/module'

export const modules = [
  // ... existing modules
  myFeatureModule,
]
```

4. **Add permissions:**
```sql
-- In Supabase
INSERT INTO permissions (permission_key, permission_name, category)
VALUES ('myfeature.view', 'View My Feature', 'myfeature');
```

### Testing

**Run tests:**
```bash
# Unit tests
npm run test:unit

# Service tests
npm run test:service

# Integration tests
npm run test:integration

# All tests
npm test

# With coverage
npm run test:coverage
```

### Code Quality

**Linting:**
```bash
npm run lint
```

**Type checking:**
```bash
npx tsc --noEmit
```

### Database Migrations

**Create migration:**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_description.sql
-- Your SQL here
```

**Apply migrations:**
- Via Supabase Dashboard
- Or using Supabase CLI

### Environment Variables

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_HOST`
- `REDIS_PORT`

**Optional:**
- `REDIS_PASSWORD`
- `SENTRY_DSN`
- `NEXT_PUBLIC_APP_URL`
- `WHATSAPP_SERVICE_URL`


## 🚀 Deployment

### Vercel Deployment (Recommended for Next.js)

1. **Push to GitHub**
```bash
git push origin main
```

2. **Import to Vercel**
- Go to vercel.com
- Import your repository
- Configure environment variables
- Deploy

3. **Configure environment variables in Vercel:**
- All variables from `.env.local`
- Set `WHATSAPP_SERVICE_URL` to your WhatsApp service URL

### WhatsApp Service Deployment

**Option 1: VPS/Cloud Server**

1. **Setup server:**
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
npm install -g pm2
```

2. **Deploy service:**
```bash
# Clone repository
git clone <repo-url>
cd whatsapp-crm-nextjs

# Install dependencies
npm install

# Start service with PM2
pm2 start whatsapp-service/src/server.js --name whatsapp-service

# Save PM2 config
pm2 save

# Setup auto-start
pm2 startup
```

3. **Configure Nginx (optional):**
```nginx
server {
    listen 80;
    server_name whatsapp-api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option 2: Docker**

```dockerfile
# Dockerfile for WhatsApp Service
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY whatsapp-service ./whatsapp-service

EXPOSE 3001

CMD ["node", "whatsapp-service/src/server.js"]
```

```bash
# Build and run
docker build -t whatsapp-service .
docker run -d -p 3001:3001 --name whatsapp-service whatsapp-service
```

### Redis Deployment

**Option 1: Redis Cloud**
- Sign up at redis.com
- Create database
- Use connection string in `.env`

**Option 2: AWS ElastiCache**
- Create ElastiCache cluster
- Use endpoint in `.env`

**Option 3: Self-hosted**
```bash
# Install Redis
sudo apt-get install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### Database (Supabase)

1. Create Supabase project
2. Run all migrations
3. Enable RLS on all tables
4. Enable Realtime for required tables
5. Configure connection pooling if needed

### Environment Setup

**Production checklist:**
- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Realtime enabled
- [ ] Redis configured with persistence
- [ ] WhatsApp service running
- [ ] Queue workers running (including scheduler)
- [ ] SSL certificates installed
- [ ] Monitoring setup (Sentry)
- [ ] Backup strategy in place
- [ ] Rate limiting configured
- [ ] Broadcast templates approved by WhatsApp

**Broadcast System Requirements:**
- Redis with persistence enabled (for queue durability)
- Workers running 24/7 (for scheduled broadcasts)
- Sufficient memory for queue processing
- WhatsApp Business API tier limits configured
- Timezone properly configured (for scheduling)

**Scaling Considerations:**
- Use Redis Cluster for high availability
- Run multiple worker instances for load balancing
- Monitor queue depth and processing time
- Set up alerts for failed jobs
- Configure auto-scaling based on queue size


## 🔧 Troubleshooting

### Common Issues

#### 1. WhatsApp Service Won't Start

**Error: Port 3001 already in use**
```bash
# Kill process on port
lsof -ti:3001 | xargs kill -9

# Or use script
./scripts/whatsapp-service.sh stop
./scripts/whatsapp-service.sh start
```

**Error: Cannot find module**
```bash
# Reinstall dependencies
cd whatsapp-service
npm install
```

#### 2. Session Not Auto-Reconnecting

**Check credentials:**
```bash
ls -la whatsapp-service/.baileys_auth/[session-id]/
```

**Check logs:**
```bash
./scripts/whatsapp-service.sh logs
```

**Solution:**
- Ensure `creds.json` exists and has `me` field
- Check phone: WhatsApp > Settings > Linked Devices
- If device not listed, scan QR again

#### 3. Queue Not Processing

**Check Redis:**
```bash
redis-cli ping
# Should return: PONG
```

**Check workers:**
```bash
# Ensure workers are running
ps aux | grep "start-workers"
```

**Restart workers:**
```bash
# Kill workers
pkill -f "start-workers"

# Start again
npm run workers
```

#### 4. Database Connection Issues

**Check Supabase status:**
- Go to Supabase dashboard
- Check project status

**Test connection:**
```bash
# In Node.js
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('profiles').select('count').then(console.log);
"
```

#### 5. Real-time Not Working

**Enable Realtime in Supabase:**
1. Go to Database > Replication
2. Enable replication for tables:
   - messages
   - conversations
   - contacts
   - conversation_notes
   - conversation_labels

**Check table settings:**
```sql
-- Enable REPLICA IDENTITY FULL
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE conversations REPLICA IDENTITY FULL;

-- Add to publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

#### 6. Permission Denied Errors

**Check RLS policies:**
```sql
-- View policies
SELECT * FROM pg_policies WHERE tablename = 'messages';
```

**Check user role:**
```sql
-- Check user's roles
SELECT * FROM user_roles WHERE user_id = 'your-user-id';
```

**Solution:**
- Ensure user has correct role assigned
- Check role has required permissions
- Verify RLS policies allow operation

### Debug Mode

**Enable debug logging:**

**Next.js:**
```bash
DEBUG=* npm run dev
```

**WhatsApp Service:**
```javascript
// whatsapp-service/src/server.js
// Change logger level
logger: pino({ level: 'debug' })
```

### Performance Issues

**Slow queries:**
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

**Add indexes:**
```sql
-- Example: Add index on messages
CREATE INDEX idx_messages_conversation_id 
ON messages(conversation_id);
```

**Redis memory:**
```bash
# Check Redis memory
redis-cli info memory
```

### Broadcast Issues

**Campaign not sending:**
1. Verify all 3 services are running:
   - Next.js app (port 3000)
   - WhatsApp service (port 3001)
   - Queue workers (npm run workers)
2. Check queue status:
   ```bash
   curl http://localhost:3000/api/broadcast/debug/queue
   ```
3. Check worker health:
   ```bash
   curl http://localhost:3000/api/health/workers
   ```

**Scheduled broadcast not triggering:**
1. Check if scheduler is running:
   ```bash
   # Should show "running" status
   curl http://localhost:3000/api/broadcast/scheduler/start
   ```
2. Verify scheduled time is in future (UTC)
3. Check scheduled campaigns:
   ```bash
   curl http://localhost:3000/api/broadcast/debug/scheduled
   ```
4. Review worker logs for scheduler activity

**Messages stuck in queue:**
1. Check Redis connection:
   ```bash
   redis-cli ping
   ```
2. Check failed jobs:
   ```bash
   npm run check-queue
   ```
3. Retry failed jobs:
   ```bash
   npm run retry-failed
   ```
4. Restart workers:
   ```bash
   pkill -f "start-workers"
   npm run workers
   ```

**High failure rate in broadcast:**
1. Verify phone number format (6289xxx, no +/-)
2. Check WhatsApp account tier limits
3. Review rate limiting settings
4. Check WhatsApp service logs:
   ```bash
   ./scripts/whatsapp-service.sh logs
   ```
5. Verify templates are approved by WhatsApp

**Timezone issues:**
- Input time should be in WIB
- System converts to UTC for storage
- Display converts back to WIB
- Check browser timezone settings
- Verify server timezone is set correctly

### Logs Location

- **Next.js**: Console output
- **WhatsApp Service**: `whatsapp-service.log`
- **Queue Workers**: Console output or PM2 logs
- **Supabase**: Supabase Dashboard > Logs

### Getting Help

1. Check logs first
2. Review this troubleshooting section
3. Check GitHub issues
4. Create new issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Relevant logs

