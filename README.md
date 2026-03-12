# WhatsApp Business CRM Platform

**BANGUN JAYA TRANSINDO**  
Professional WhatsApp Business CRM solution for modern businesses.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.3-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Testing](#testing)
- [Security](#security)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

WhatsApp Business CRM is a comprehensive customer relationship management platform built specifically for WhatsApp Business API. It enables businesses to manage conversations, contacts, broadcasts, and customer relationships efficiently through a modern web interface.

### Key Capabilities

- **Multi-Channel Communication**: Manage WhatsApp conversations with customers
- **Contact Management**: Organize and segment customer contacts
- **Broadcast Messaging**: Send targeted messages to customer groups
- **Analytics & Reporting**: Track conversation metrics and business performance
- **Multi-Agent Support**: Team collaboration with role-based access control
- **Automation**: Chatbots and automated responses
- **Real-time Updates**: Live conversation updates using Supabase Realtime

---

## ✨ Features

### Core Features

- 💬 **WhatsApp Integration**
  - WhatsApp Business API integration
  - Send/receive text, media, and location messages
  - Message templates and quick replies
  - Delivery status tracking

- 👥 **Contact Management**
  - Import/export contacts
  - Contact segmentation and tagging
  - Custom fields and notes
  - Contact history and timeline

- 📢 **Broadcast Campaigns**
  - Schedule broadcast messages
  - Target specific customer segments
  - Campaign analytics and reporting
  - Template message support

- 💬 **Conversation Management**
  - Unified inbox for all conversations
  - Auto-assignment to agents
  - Conversation tagging and filtering
  - Internal notes and collaboration

- 📊 **Analytics & Dashboards**
  - Real-time KPI monitoring
  - Agent productivity metrics
  - Customer engagement analytics
  - Conversation effectiveness tracking
  - WhatsApp performance metrics

- 🤖 **Automation**
  - Chatbot builder
  - Automated responses
  - Business hours management
  - Auto-assignment rules

- � **User Managemeunt**
  - Role-based access control (RBAC)
  - Multi-agent support
  - Agent status tracking
  - Session management

### Advanced Features

- 🔒 **Security**
  - End-to-end encryption for sensitive data
  - Rate limiting and DDoS protection
  - SQL injection prevention
  - XSS protection
  - CSRF protection
  - Audit logging

- 🚀 **Performance**
  - Redis caching
  - Connection pooling
  - Query optimization
  - CDN integration
  - Image optimization

- 🌐 **Internationalization**
  - Multi-language support
  - Timezone handling
  - Date/time localization

- 📱 **Responsive Design**
  - Mobile-first approach
  - Progressive Web App (PWA) ready
  - Touch-optimized interface

---

## 🛠 Tech Stack

### Frontend

- **Framework**: Next.js 16.1.6 (App Router)
- **UI Library**: React 19.2.3
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI, Shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Maps**: Leaflet + React Leaflet
- **Icons**: Lucide React

### Backend

- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Caching**: Upstash Redis
- **File Storage**: Supabase Storage
- **Logging**: Pino

### Infrastructure

- **Hosting**: Vercel
- **Database**: Supabase (PostgreSQL)
- **Cache**: Upstash Redis
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry
- **Analytics**: Custom analytics system

### Development Tools

- **Testing**: Vitest, Playwright, K6
- **Linting**: ESLint
- **Type Checking**: TypeScript
- **Package Manager**: npm
- **Version Control**: Git

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  (Next.js App Router + React + TypeScript + Tailwind)       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  • REST API Routes                                           │
│  • Middleware (Auth, Rate Limiting, Validation)              │
│  • WebSocket (Realtime)                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  • Business Logic                                            │
│  • Data Validation                                           │
│  • Error Handling                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │   Storage    │      │
│  │  (Supabase)  │  │  (Upstash)   │  │  (Supabase)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  External Services                           │
│  • WhatsApp Business API (Meta)                              │
│  • Email Service                                             │
│  • SMS Service                                               │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

Key tables:
- `tenants` - Multi-tenancy support
- `users` - User accounts and profiles
- `contacts` - Customer contacts
- `conversations` - WhatsApp conversations
- `messages` - Individual messages
- `broadcasts` - Broadcast campaigns
- `chatbots` - Chatbot configurations
- `quick_replies` - Quick reply templates
- `api_keys` - API key management
- `audit_logs` - Audit trail
- `security_events` - Security monitoring
- `blocked_entities` - IP/user blocking
- `file_uploads` - File metadata
- `user_consents` - GDPR compliance

### Security Architecture

- **Authentication**: Supabase Auth with JWT
- **Authorization**: Row Level Security (RLS) + RBAC
- **Encryption**: AES-256 for sensitive data
- **Rate Limiting**: Redis-based rate limiting
- **Input Validation**: Zod schemas
- **Output Sanitization**: XSS prevention
- **Audit Logging**: Comprehensive audit trail
- **Intrusion Detection**: Real-time threat monitoring

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- PostgreSQL database (or Supabase account)
- Redis instance (or Upstash account)
- WhatsApp Business API credentials

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/whatsapp-crm.git
cd whatsapp-crm
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Encryption
ENCRYPTION_MASTER_KEY=your_64_char_hex_key
ENCRYPTION_KEY_ROTATION_DAYS=90

# WhatsApp Business API
WHATSAPP_API_URL=your_whatsapp_api_url
WHATSAPP_API_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

4. **Run database migrations**

```bash
# Using Supabase CLI
supabase db push

# Or manually run SQL files in supabase/migrations/
```

5. **Start development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### First-Time Setup

1. **Create admin user**

```bash
npm run create-agent
```

2. **Configure WhatsApp Business API**

- Go to Settings → WhatsApp
- Enter your WhatsApp Business API credentials
- Test the connection

3. **Set up your first chatbot** (optional)

- Go to Chatbots
- Create a new chatbot
- Configure automated responses

---

## ⚙️ Configuration

### Environment Variables

See `.env.example` for all available environment variables.

Key configurations:

- **Database**: Supabase connection strings
- **Cache**: Redis connection details
- **Security**: Encryption keys, rate limits
- **WhatsApp**: API credentials
- **Features**: Enable/disable features
- **Monitoring**: Sentry DSN, log levels

### Feature Flags

Enable/disable features in `lib/config/features.ts`:

```typescript
export const features = {
  chatbots: true,
  broadcasts: true,
  analytics: true,
  fileUploads: true,
  // ... more features
}
```

### Rate Limiting

Configure rate limits in `lib/middleware/rate-limit.ts`:

```typescript
export const rateLimits = {
  api: { requests: 100, window: '1m' },
  messages: { requests: 50, window: '1m' },
  broadcasts: { requests: 10, window: '1h' },
}
```

---

## 🚢 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel**

```bash
vercel login
vercel link
```

2. **Configure environment variables**

Add all environment variables in Vercel Dashboard:
- Settings → Environment Variables
- Add for Production, Preview, and Development

3. **Deploy**

```bash
vercel --prod
```

Or push to GitHub for automatic deployment.

### Environment-Specific Configuration

- **Development**: `.env.local`
- **Production**: `.env.production`
- **Test**: `.env.test`

### Database Migration

Run migrations before deploying:

```bash
# Production migration
npm run migrate:prod
```

### Health Checks

- **Liveness**: `/api/health/live`
- **Readiness**: `/api/health/ready`
- **Workers**: `/api/health/workers`

---

## 🧪 Testing

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### End-to-End Tests

```bash
# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

### Load Tests

```bash
# Run all load tests
npm run test:load

# Run specific load test
npm run test:load:contacts
npm run test:load:messages
npm run test:load:broadcasts

# Check performance readiness
npm run test:performance:check
```

### Test Coverage

Current coverage: **90.6%** (1342 passing / 1479 total)

- Unit tests: 98.6% (997/1011)
- Integration tests: 85%
- E2E tests: 80%

---

## 🔒 Security

### Security Features

- ✅ **Authentication**: Supabase Auth with JWT
- ✅ **Authorization**: Row Level Security (RLS) + RBAC
- ✅ **Encryption**: AES-256 for sensitive data
- ✅ **Rate Limiting**: Redis-based protection
- ✅ **Input Validation**: Zod schemas
- ✅ **SQL Injection Prevention**: Parameterized queries
- ✅ **XSS Protection**: Output sanitization
- ✅ **CSRF Protection**: Token-based
- ✅ **Audit Logging**: Comprehensive audit trail
- ✅ **Intrusion Detection**: Real-time monitoring
- ✅ **DDoS Protection**: Vercel + Cloudflare
- ✅ **Security Headers**: HSTS, CSP, X-Frame-Options

### Security Best Practices

1. **Never commit secrets** to version control
2. **Rotate encryption keys** every 90 days
3. **Review audit logs** regularly
4. **Update dependencies** monthly
5. **Run security scans** before deployment
6. **Monitor security events** in real-time

### Compliance

- **GDPR**: User consent management, data portability, right to deletion
- **CCPA**: California privacy compliance
- **WhatsApp Business Policy**: Compliant with Meta policies

---

## 📚 API Documentation

### REST API

Base URL: `https://voxentra-crm.com/api`

#### Authentication

```bash
# All API requests require authentication
Authorization: Bearer <your_jwt_token>
```

#### Endpoints

**Contacts**
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

**Messages**
- `POST /api/send-message` - Send message
- `POST /api/send-media` - Send media
- `POST /api/send-location` - Send location

**Broadcasts**
- `GET /api/broadcasts` - List broadcasts
- `POST /api/broadcasts` - Create broadcast
- `GET /api/broadcasts/:id` - Get broadcast
- `PUT /api/broadcasts/:id` - Update broadcast

**Analytics**
- `GET /api/dashboard/kpi` - Get KPIs
- `GET /api/dashboard/agent-productivity` - Agent metrics
- `GET /api/dashboard/conversation-effectiveness` - Conversation metrics

See full API documentation at `/api/docs`

### WebSocket API

Real-time updates using Supabase Realtime:

```typescript
// Subscribe to new messages
supabase
  .channel('messages')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => console.log('New message:', payload)
  )
  .subscribe()
```

---

## 📖 Documentation

- **User Guide**: `/docs/USER_GUIDE.md`
- **API Reference**: `/docs/API_REFERENCE.md`
- **Deployment Guide**: `/docs/VERCEL_DEPLOYMENT_GUIDE.md`
- **Security Guide**: `/docs/SECURITY.md`
- **Performance Optimization**: `/docs/PERFORMANCE_OPTIMIZATION.md`
- **Database Schema**: `/docs/DATABASE_SCHEMA.md`

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint for linting
- Write tests for new features
- Update documentation

---

## 📝 License

This project is proprietary software owned by **BANGUN JAYA TRANSINDO**.

All rights reserved. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---

## 📞 Contact

**BANGUN JAYA TRANSINDO**

- **Website**: https://voxentra-crm.com
- **Phone**: +62 817 906 8111
- **Email**: support@voxentra-crm.com
- **Documentation**: https://docs.voxentra-crm.com

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend as a Service
- [Vercel](https://vercel.com/) - Hosting platform
- [Upstash](https://upstash.com/) - Redis service
- [Meta](https://developers.facebook.com/docs/whatsapp) - WhatsApp Business API

---

## 📊 Project Status

- **Version**: 0.1.0
- **Status**: Production
- **Last Updated**: March 2026
- **Maintained**: Yes

### Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced AI chatbots
- [ ] Multi-channel support (Telegram, Instagram)
- [ ] Advanced analytics and reporting
- [ ] Workflow automation
- [ ] Integration marketplace

---

**Built with ❤️ by BANGUN JAYA TRANSINDO**
