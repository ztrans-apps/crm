# CRM Effectiveness Dashboard - Setup Guide

## Overview
Dashboard komprehensif untuk monitoring efektivitas CRM, performa WhatsApp, produktivitas agent, dan dampak bisnis.

## Prerequisites

### 1. Database Migration
Jalankan migration untuk membuat tabel analytics:

```bash
# Menggunakan Supabase CLI
supabase db push

# Atau manual via Supabase Dashboard
# Copy isi file: supabase/migrations/20260222000000_create_dashboard_analytics_tables.sql
# Paste di SQL Editor dan execute
```

### 2. Redis Cache (Optional tapi Recommended)
Dashboard menggunakan Redis untuk caching dengan TTL 30 detik.

**Setup Upstash Redis:**
1. Buat account di [https://upstash.com](https://upstash.com)
2. Create new Redis database
3. Copy credentials ke `.env`:

```env
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

**Tanpa Redis:**
Dashboard tetap berfungsi tanpa Redis, hanya tanpa caching (query langsung ke database).

### 3. Install Dependencies

```bash
npm install @upstash/redis recharts
```

## Features

### 📊 KPI Strip
5 metrik utama dengan trend indicators:
- Active Conversations
- Average Response Time (dengan SLA status)
- WhatsApp Delivery Rate
- Open Tickets (dengan breakdown priority)
- Messages Today

### 💬 Conversation Effectiveness
- Bar chart: Conversations per agent
- Line chart: Response time trends
- Gauge chart: SLA compliance
- Pie chart: Resolved vs Open ratio

### 📱 WhatsApp Performance
- Message funnel (Sent → Delivered → Read)
- Broadcast success rate
- Failed messages table
- Active sessions status
- Queue metrics

### 👥 Customer Load
- Area chart: Incoming chats per hour
- Peak hour detection
- New vs Returning customers
- Wait time analysis

### 🎯 Agent Productivity
- Metrics table per agent
- Workload distribution
- Status indicators
- Resolution rates

### 🤖 Automation Impact
- Chatbot vs Human analysis
- Auto-reply success rate
- Time saved calculation
- Escalation rates

### 💼 Business Impact
- Leads generated
- Tickets resolved
- Campaign conversion rates
- Repeat customer rate
- Cost per conversation

## Data Aggregation Worker

### Manual Execution
Jalankan aggregation secara manual:

```bash
# Hourly aggregation
npm run aggregate:hourly

# Daily aggregation
npm run aggregate:daily

# Weekly aggregation
npm run aggregate:weekly
```

### Automated Scheduling

#### Option 1: Vercel Cron (Recommended untuk Vercel deployment)

Tambahkan ke `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/aggregate-metrics?type=hourly",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/aggregate-metrics?type=daily",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/aggregate-metrics?type=weekly",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

Tambahkan CRON_SECRET ke environment variables:

```env
CRON_SECRET=your_random_secret_here
```

#### Option 2: External Cron Service (EasyCron, cron-job.org, dll)

Setup cron jobs untuk hit endpoints:
- Hourly: `GET https://your-domain.com/api/cron/aggregate-metrics?type=hourly`
- Daily: `GET https://your-domain.com/api/cron/aggregate-metrics?type=daily`
- Weekly: `GET https://your-domain.com/api/cron/aggregate-metrics?type=weekly`

Tambahkan header:
```
Authorization: Bearer your_cron_secret
```

#### Option 3: Node Cron (untuk self-hosted)

Install:
```bash
npm install node-cron
```

Buat file `server/cron.ts`:
```typescript
import cron from 'node-cron'
import { aggregateHourlyMetrics, aggregateDailyMetrics, aggregateWeeklyMetrics } from '../lib/workers/dashboard-aggregation.worker'

// Run hourly at minute 0
cron.schedule('0 * * * *', async () => {
  console.log('Running hourly aggregation...')
  await aggregateHourlyMetrics()
})

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily aggregation...')
  await aggregateDailyMetrics()
})

// Run weekly on Sunday at midnight
cron.schedule('0 0 * * 0', async () => {
  console.log('Running weekly aggregation...')
  await aggregateWeeklyMetrics()
})
```

## Performance Optimization

### Caching Strategy
- **KPI metrics**: 30 second TTL
- **Section data**: 30 second TTL
- **Aggregated snapshots**: Permanent (updated by worker)

### Cache Invalidation
Cache otomatis expire setelah TTL. Untuk manual invalidation:

```typescript
import { invalidateDashboardCache, invalidateSectionCache } from '@/lib/cache/redis'

// Invalidate all dashboard cache
await invalidateDashboardCache()

// Invalidate specific section
await invalidateSectionCache('kpi')
```

### Query Optimization
- Semua query sudah menggunakan indexes
- RBAC filtering di database level
- Aggregated data untuk historical queries

## RBAC & Permissions

### Agent Role
- Melihat hanya data mereka sendiri
- Conversations assigned to them
- Their own productivity metrics

### Supervisor/Manager Role
- Melihat data team mereka
- All agents under supervision

### Owner/Admin Role
- Melihat semua data
- Full dashboard access

## Monitoring

### Health Check
Check aggregation worker status:

```bash
curl https://your-domain.com/api/cron/aggregate-metrics?type=hourly
```

Expected response:
```json
{
  "success": true,
  "type": "hourly",
  "timestamp": "2026-02-22T10:00:00.000Z",
  "message": "hourly metrics aggregation completed successfully"
}
```

### Logs
Worker logs tersimpan di:
- Vercel: Function logs
- Self-hosted: Console output

## Troubleshooting

### Dashboard tidak menampilkan data
1. Pastikan migration sudah dijalankan
2. Check apakah ada data di tabel `conversations`, `messages`, dll
3. Jalankan manual aggregation: `npm run aggregate:hourly`
4. Check browser console untuk errors

### Cache tidak bekerja
1. Verify Redis credentials di `.env`
2. Test Redis connection:
```typescript
import { getRedisClient } from '@/lib/cache/redis'
const redis = getRedisClient()
console.log(redis ? 'Connected' : 'Not connected')
```

### Aggregation worker gagal
1. Check database connection
2. Verify Supabase credentials
3. Check worker logs untuk error details
4. Pastikan tabel `analytics_snapshots` exists

### Performance issues
1. Enable Redis caching
2. Run aggregation worker regularly
3. Check database indexes
4. Monitor query performance

## API Endpoints

### Dashboard APIs
- `GET /api/dashboard/kpi` - KPI metrics
- `GET /api/dashboard/conversation-effectiveness` - Conversation metrics
- `GET /api/dashboard/whatsapp-performance` - WhatsApp metrics
- `GET /api/dashboard/customer-load` - Customer traffic
- `GET /api/dashboard/agent-productivity` - Agent metrics
- `GET /api/dashboard/automation-impact` - Automation metrics
- `GET /api/dashboard/business-impact` - Business metrics

### Cron APIs
- `GET /api/cron/aggregate-metrics?type=hourly` - Run hourly aggregation
- `GET /api/cron/aggregate-metrics?type=daily` - Run daily aggregation
- `GET /api/cron/aggregate-metrics?type=weekly` - Run weekly aggregation

## Next Steps

### Phase 9: Real-time Updates (Future)
- WebSocket implementation
- Live metric updates
- Real-time notifications

### Phase 10: Export & Reporting (Future)
- CSV export
- PDF reports
- Scheduled email reports

### Phase 12: Testing (Future)
- Unit tests
- Integration tests
- E2E tests

## Support

Untuk pertanyaan atau issues, silakan buat issue di repository atau hubungi tim development.
