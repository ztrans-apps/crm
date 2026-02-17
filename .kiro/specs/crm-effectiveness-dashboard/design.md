# CRM Effectiveness Dashboard - Design Document

## Architecture Overview

### System Components
```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Dashboard    │  │ Chart        │  │ Real-time    │      │
│  │ Page         │→ │ Components   │→ │ WebSocket    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Dashboard    │  │ Analytics    │  │ Real-time    │      │
│  │ API          │  │ API          │  │ Events API   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Supabase     │  │ Redis        │  │ Aggregation  │      │
│  │ PostgreSQL   │  │ Cache        │  │ Worker       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### New Tables

#### analytics_snapshots
Stores pre-aggregated metrics for fast dashboard loading
```sql
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_type VARCHAR(50) NOT NULL, -- 'hourly', 'daily', 'weekly'
  snapshot_date TIMESTAMP NOT NULL,
  metrics JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(snapshot_type, snapshot_date)
);

CREATE INDEX idx_analytics_snapshots_type_date 
  ON analytics_snapshots(snapshot_type, snapshot_date DESC);
```

#### agent_activity_logs
Tracks agent status changes for productivity analysis
```sql
CREATE TABLE agent_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES profiles(id),
  status VARCHAR(20) NOT NULL, -- 'online', 'away', 'offline'
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_activity_agent_date 
  ON agent_activity_logs(agent_id, started_at DESC);
```

#### conversation_metrics
Stores conversation-level metrics
```sql
CREATE TABLE conversation_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id),
  agent_id UUID REFERENCES profiles(id),
  first_response_time_seconds INTEGER,
  avg_response_time_seconds INTEGER,
  total_messages INTEGER,
  resolution_time_seconds INTEGER,
  customer_satisfaction_score INTEGER, -- 1-5
  handled_by_bot BOOLEAN DEFAULT FALSE,
  escalated_to_human BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversation_metrics_agent 
  ON conversation_metrics(agent_id, created_at DESC);
```

### Extended Tables

#### messages (add columns)
```sql
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS failed_reason TEXT;
```

#### conversations (add columns)
```sql
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS resolution_time_seconds INTEGER;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS first_response_time_seconds INTEGER;
```

## API Endpoints

### GET /api/dashboard/kpi
Returns KPI strip metrics
```typescript
Response: {
  activeConversations: {
    value: number
    trend: 'up' | 'down' | 'stable'
    change: number // percentage
  }
  avgResponseTime: {
    value: number // seconds
    trend: 'up' | 'down' | 'stable'
    change: number
    slaStatus: 'good' | 'warning' | 'critical'
  }
  whatsappDeliveryRate: {
    value: number // percentage
    trend: 'up' | 'down' | 'stable'
    change: number
  }
  openTickets: {
    value: number
    trend: 'up' | 'down' | 'stable'
    change: number
    byPriority: { high: number, medium: number, low: number }
  }
  messagesToday: {
    value: number
    trend: 'up' | 'down' | 'stable'
    change: number
  }
}
```

### GET /api/dashboard/conversation-effectiveness
```typescript
Query: { dateRange: 'today' | 'week' | 'month', startDate?: string, endDate?: string }

Response: {
  conversationsPerAgent: Array<{
    agentId: string
    agentName: string
    count: number
    avgResponseTime: number
  }>
  avgResponseTimeOverTime: Array<{
    timestamp: string
    avgSeconds: number
  }>
  slaCompliance: {
    percentage: number
    compliant: number
    nonCompliant: number
  }
  resolvedVsOpen: {
    resolved: number
    open: number
    percentage: number
  }
}
```

### GET /api/dashboard/whatsapp-performance
```typescript
Response: {
  messageFunnel: {
    sent: number
    delivered: number
    read: number
    failed: number
  }
  broadcastSuccessRate: {
    total: number
    successful: number
    failed: number
    percentage: number
  }
  failedMessages: Array<{
    id: string
    recipient: string
    error: string
    timestamp: string
  }>
  activeSessions: Array<{
    sessionId: string
    phoneNumber: string
    status: 'connected' | 'disconnected' | 'reconnecting'
    lastSeen: string
  }>
  queueMetrics: {
    depth: number
    processingRate: number // messages per minute
  }
}
```

### GET /api/dashboard/customer-load
```typescript
Response: {
  incomingChatsPerHour: Array<{
    hour: string
    count: number
  }>
  peakHour: {
    hour: string
    count: number
  }
  newVsReturning: {
    new: number
    returning: number
  }
  avgWaitTime: {
    peak: number // seconds
    offPeak: number
  }
  heatmap: Array<{
    dayOfWeek: number
    hour: number
    count: number
  }>
}
```

### GET /api/dashboard/agent-productivity
```typescript
Response: {
  agentMetrics: Array<{
    agentId: string
    agentName: string
    chatsHandled: number
    resolutionRate: number
    idleTime: number // seconds
    activeTime: number
    avgHandlingTime: number
    status: 'online' | 'away' | 'offline'
    statusDuration: number
  }>
  workloadDistribution: {
    balanced: number
    overloaded: number
    underutilized: number
  }
}
```

### GET /api/dashboard/automation-impact
```typescript
Response: {
  chatbotVsHuman: {
    chatbot: number
    human: number
    percentage: number
  }
  autoReplySuccess: {
    total: number
    successful: number
    percentage: number
  }
  dropOffRate: {
    total: number
    dropped: number
    percentage: number
  }
  topIntents: Array<{
    intent: string
    count: number
    successRate: number
  }>
  timeSaved: {
    hours: number
    estimatedCost: number
  }
  escalationRate: {
    total: number
    escalated: number
    percentage: number
  }
}
```

### GET /api/dashboard/business-impact
```typescript
Response: {
  leadsGenerated: {
    total: number
    trend: 'up' | 'down' | 'stable'
    change: number
  }
  ticketsResolved: {
    today: number
    week: number
    month: number
  }
  campaignConversion: Array<{
    campaignId: string
    campaignName: string
    sent: number
    responded: number
    converted: number
    conversionRate: number
  }>
  repeatCustomerRate: {
    rate: number
    trend: 'up' | 'down' | 'stable'
  }
  costPerConversation: {
    amount: number
    savings: number
  }
}
```

### WebSocket /api/dashboard/realtime
Real-time updates pushed via WebSocket
```typescript
Event: 'dashboard:update'
Payload: {
  type: 'kpi' | 'conversation' | 'whatsapp' | 'customer' | 'agent' | 'automation' | 'business'
  data: any // corresponding to the section
  timestamp: string
}
```

## Frontend Components

### Page Structure
```
app/(app)/dashboard/page.tsx
├── components/
│   ├── KPIStrip.tsx
│   ├── ConversationEffectiveness.tsx
│   ├── WhatsAppPerformance.tsx
│   ├── CustomerLoad.tsx
│   ├── AgentProductivity.tsx
│   ├── AutomationImpact.tsx
│   ├── BusinessImpact.tsx
│   ├── DateRangePicker.tsx
│   └── ExportButton.tsx
└── hooks/
    ├── useDashboardData.ts
    ├── useRealtime.ts
    └── useExport.ts
```

### Component Design

#### KPIStrip Component
```typescript
interface KPICardProps {
  title: string
  value: number | string
  trend: 'up' | 'down' | 'stable'
  change: number
  status?: 'good' | 'warning' | 'critical'
  icon: React.ReactNode
  suffix?: string
}

// Displays 5 KPI cards in a horizontal strip
// Uses color coding for status
// Shows trend arrows and percentage change
```

#### Chart Components
Using Recharts library:
- BarChart for conversations per agent
- LineChart for response time trends
- PieChart for resolved vs open
- FunnelChart for message delivery
- AreaChart for customer load
- HeatMap for traffic patterns
- GaugeChart for SLA compliance

### Real-time Updates

#### useRealtime Hook
```typescript
export function useRealtime(endpoint: string) {
  const [data, setData] = useState(null)
  const [connected, setConnected] = useState(false)
  
  useEffect(() => {
    const ws = new WebSocket(endpoint)
    
    ws.onopen = () => setConnected(true)
    ws.onmessage = (event) => {
      const update = JSON.parse(event.data)
      setData(update.data)
    }
    ws.onclose = () => setConnected(false)
    
    return () => ws.close()
  }, [endpoint])
  
  return { data, connected }
}
```

## Data Aggregation Strategy

### Aggregation Worker
Background worker runs every hour to pre-compute metrics:

```typescript
// lib/workers/dashboard-aggregation.worker.ts

async function aggregateHourlyMetrics() {
  const now = new Date()
  const hourStart = new Date(now.setMinutes(0, 0, 0))
  
  // Aggregate conversation metrics
  const conversationMetrics = await aggregateConversations(hourStart)
  
  // Aggregate message metrics
  const messageMetrics = await aggregateMessages(hourStart)
  
  // Aggregate agent metrics
  const agentMetrics = await aggregateAgentActivity(hourStart)
  
  // Store snapshot
  await storeSnapshot('hourly', hourStart, {
    conversations: conversationMetrics,
    messages: messageMetrics,
    agents: agentMetrics
  })
}
```

### Caching Strategy
- Redis cache for frequently accessed metrics (TTL: 30 seconds)
- Snapshot-based queries for historical data
- Real-time queries only for current hour data

## Performance Optimizations

### Database Indexes
```sql
-- Conversations
CREATE INDEX idx_conversations_status_date ON conversations(status, created_at DESC);
CREATE INDEX idx_conversations_agent_date ON conversations(assigned_agent_id, created_at DESC);

-- Messages
CREATE INDEX idx_messages_status_date ON messages(delivery_status, created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);

-- Agent Activity
CREATE INDEX idx_agent_activity_date ON agent_activity_logs(started_at DESC);
```

### Query Optimization
- Use materialized views for complex aggregations
- Implement pagination for large datasets
- Use EXPLAIN ANALYZE to optimize slow queries

### Frontend Optimization
- Lazy load chart components
- Virtualize long lists
- Debounce real-time updates
- Use React.memo for expensive components

## Security & Permissions

### RBAC Integration
```typescript
// Agents see only their own data
if (userRole === 'agent') {
  query = query.eq('agent_id', userId)
}

// Supervisors see their team data
if (userRole === 'supervisor') {
  const teamIds = await getTeamMemberIds(userId)
  query = query.in('agent_id', teamIds)
}

// Owners/admins see all data
// No filter applied
```

### Audit Logging
Log access to sensitive business metrics:
```typescript
await auditLog({
  userId,
  action: 'view_business_impact',
  resource: 'dashboard',
  timestamp: new Date()
})
```

## Testing Strategy

### Unit Tests
- Test data aggregation functions
- Test chart data transformations
- Test permission filters

### Integration Tests
- Test API endpoints with mock data
- Test WebSocket connections
- Test caching behavior

### E2E Tests
- Test dashboard loading
- Test date range filtering
- Test real-time updates
- Test export functionality

## Deployment Plan

### Phase 1: Foundation (Week 1)
- Create database tables and indexes
- Implement basic API endpoints
- Build KPI strip component

### Phase 2: Core Metrics (Week 2)
- Implement conversation effectiveness
- Implement WhatsApp performance
- Implement customer load analysis

### Phase 3: Advanced Features (Week 3)
- Implement agent productivity
- Implement automation impact
- Implement business impact

### Phase 4: Real-time & Polish (Week 4)
- Implement WebSocket real-time updates
- Implement export functionality
- Performance optimization
- Testing and bug fixes

## Monitoring & Alerts

### Dashboard Health Metrics
- API response times
- WebSocket connection stability
- Cache hit rates
- Query performance

### Alerts
- Dashboard load time > 3 seconds
- API error rate > 1%
- WebSocket disconnection rate > 5%
- Cache miss rate > 20%

## Future Enhancements
- Predictive analytics using ML
- Custom dashboard builder
- Mobile responsive design
- Advanced filtering and drill-down
- Scheduled reports via email
- Integration with external BI tools
