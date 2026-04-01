'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Shield, 
  Database, 
  Webhook, 
  Lock,
  Users,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
  Code,
  Terminal,
  Zap
} from 'lucide-react'

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-vx-purple" />
          <h1 className="text-3xl font-bold">System Documentation</h1>
        </div>
        <p className="text-vx-text-muted">
          Comprehensive documentation for WhatsApp CRM system architecture, security, and operations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="rbac">RBAC</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewSection />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <SecuritySection />
        </TabsContent>

        {/* RBAC Tab */}
        <TabsContent value="rbac" className="space-y-6">
          <RBACSection />
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-6">
          <DatabaseSection />
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook" className="space-y-6">
          <WebhookSection />
        </TabsContent>

        {/* Troubleshooting Tab */}
        <TabsContent value="troubleshooting" className="space-y-6">
          <TroubleshootingSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Overview Section Component
function OverviewSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            System Architecture
          </CardTitle>
          <CardDescription>High-level overview of the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Frontend</h3>
              <ul className="text-sm text-vx-text-muted space-y-1">
                <li>• Next.js 14 (App Router)</li>
                <li>• React 18</li>
                <li>• TypeScript</li>
                <li>• Tailwind CSS</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Backend</h3>
              <ul className="text-sm text-vx-text-muted space-y-1">
                <li>• Next.js API Routes</li>
                <li>• Supabase (PostgreSQL)</li>
                <li>• Row Level Security</li>
                <li>• Real-time subscriptions</li>
              </ul>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Integrations</h3>
              <ul className="text-sm text-vx-text-muted space-y-1">
                <li>• WhatsApp Business API</li>
                <li>• Meta Webhooks</li>
                <li>• Redis (Caching)</li>
                <li>• Vercel (Hosting)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Security Features
              </h3>
              <ul className="text-sm text-vx-text-muted space-y-1 ml-6">
                <li>• Row Level Security (RLS)</li>
                <li>• Role-Based Access Control (RBAC)</li>
                <li>• Tenant Isolation</li>
                <li>• Audit Logging</li>
                <li>• API Key Management</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Core Functionality
              </h3>
              <ul className="text-sm text-vx-text-muted space-y-1 ml-6">
                <li>• Multi-tenant WhatsApp CRM</li>
                <li>• Real-time messaging</li>
                <li>• Contact management</li>
                <li>• Conversation workflows</li>
                <li>• Analytics & reporting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// Security Section Component
function SecuritySection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Architecture
          </CardTitle>
          <CardDescription>Multi-layered security approach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="border-l-4 border-vx-purple pl-4">
              <h3 className="font-semibold mb-2">1. Authentication Layer</h3>
              <p className="text-sm text-vx-text-muted mb-2">
                Supabase Auth with JWT tokens
              </p>
              <ul className="text-sm text-vx-text-muted space-y-1">
                <li>• Email/password authentication</li>
                <li>• Session management</li>
                <li>• Automatic token refresh</li>
                <li>• Secure cookie storage</li>
              </ul>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold mb-2">2. Authorization Layer (RBAC)</h3>
              <p className="text-sm text-vx-text-muted mb-2">
                Dynamic role-based permissions
              </p>
              <ul className="text-sm text-vx-text-muted space-y-1">
                <li>• 92 granular permissions</li>
                <li>• 7 predefined roles</li>
                <li>• Module-based access control</li>
                <li>• Frontend & backend validation</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold mb-2">3. Data Layer (RLS)</h3>
              <p className="text-sm text-vx-text-muted mb-2">
                Database-level security policies
              </p>
              <ul className="text-sm text-vx-text-muted space-y-1">
                <li>• Row Level Security on all tables</li>
                <li>• Tenant isolation</li>
                <li>• User-specific data access</li>
                <li>• Service role for system operations</li>
              </ul>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold mb-2">4. API Security</h3>
              <p className="text-sm text-vx-text-muted mb-2">
                Secure API endpoints
              </p>
              <ul className="text-sm text-vx-text-muted space-y-1">
                <li>• API key authentication</li>
                <li>• Rate limiting</li>
                <li>• CORS configuration</li>
                <li>• Webhook signature verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-800 dark:text-yellow-200 space-y-2 text-sm">
          <p><strong>✓ Always validate on backend:</strong> Never trust frontend checks alone</p>
          <p><strong>✓ Use service role carefully:</strong> Only for system operations that bypass RLS</p>
          <p><strong>✓ Test RLS policies:</strong> Verify policies work as expected before deployment</p>
          <p><strong>✓ Monitor audit logs:</strong> Regular review of security events</p>
          <p><strong>✓ Rotate secrets:</strong> Change API keys and tokens periodically</p>
        </CardContent>
      </Card>
    </>
  )
}

// RBAC Section Component
function RBACSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Role-Based Access Control (RBAC)
          </CardTitle>
          <CardDescription>Dynamic permission system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">System Roles</h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">Owner</Badge>
                  <p className="text-sm text-vx-text-muted">Full system access, all permissions</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">Admin</Badge>
                  <p className="text-sm text-vx-text-muted">Administrative access, manage users & settings</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">Manager</Badge>
                  <p className="text-sm text-vx-text-muted">Team management, view analytics</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">Agent</Badge>
                  <p className="text-sm text-vx-text-muted">Handle conversations, send messages</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">Viewer</Badge>
                  <p className="text-sm text-vx-text-muted">Read-only access to conversations</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <Badge className="mb-2">API User</Badge>
                  <p className="text-sm text-vx-text-muted">API access only, no UI access</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Permission Modules</h3>
              <div className="grid md:grid-cols-3 gap-2 text-sm">
                <div className="p-2 bg-vx-surface-elevated rounded">Chat (view, send, assign)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Contact (view, create, edit, delete)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Ticket (view, create, edit, delete)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Agent (view, create, edit, delete)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Analytics (view, export)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Settings (view, manage)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Broadcast (view, create, send)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Chatbot (view, manage)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Role (view, create, edit, delete)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Report (view, export)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Handover (view, manage)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">API (manage keys)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permission Loading Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <p className="font-semibold">User Authentication</p>
                <p className="text-vx-text-muted">User logs in, JWT token created</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <p className="font-semibold">Permission Provider Loads</p>
                <p className="text-vx-text-muted">Query: user_roles → roles → role_permissions → permissions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <p className="font-semibold">RLS Policy Check</p>
                <p className="text-vx-text-muted">Database verifies user can read RBAC tables</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">4</div>
              <div>
                <p className="font-semibold">Permissions Cached</p>
                <p className="text-vx-text-muted">Stored in React context for fast access</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">5</div>
              <div>
                <p className="font-semibold">UI Renders</p>
                <p className="text-vx-text-muted">Components check permissions to show/hide features</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            Common RBAC Issues & Fixes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-200 space-y-3 text-sm">
          <div>
            <p className="font-semibold">Issue: "Error loading permissions: {}"</p>
            <p className="text-xs mt-1">Fix: Run scripts/quick-fix-permissions.sql</p>
          </div>
          <div>
            <p className="font-semibold">Issue: User can't access any menus</p>
            <p className="text-xs mt-1">Fix: Check RLS policies on RBAC tables allow authenticated SELECT</p>
          </div>
          <div>
            <p className="font-semibold">Issue: Permissions not updating after role change</p>
            <p className="text-xs mt-1">Fix: Logout and login again to refresh permissions</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// Database Section Component
function DatabaseSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Architecture
          </CardTitle>
          <CardDescription>PostgreSQL with Row Level Security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Core Tables</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">profiles</p>
                  <p className="text-xs text-vx-text-muted">User profiles with tenant_id</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">contacts</p>
                  <p className="text-xs text-vx-text-muted">WhatsApp contacts</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">conversations</p>
                  <p className="text-xs text-vx-text-muted">Chat conversations</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">messages</p>
                  <p className="text-xs text-vx-text-muted">Individual messages</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">RBAC Tables</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">roles</p>
                  <p className="text-xs text-vx-text-muted">System roles (Owner, Admin, etc)</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">permissions</p>
                  <p className="text-xs text-vx-text-muted">92 granular permissions</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">user_roles</p>
                  <p className="text-xs text-vx-text-muted">User-role assignments</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">role_permissions</p>
                  <p className="text-xs text-vx-text-muted">Role-permission mappings</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Security Tables</h3>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">audit_logs</p>
                  <p className="text-xs text-vx-text-muted">System audit trail</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="font-semibold">api_keys</p>
                  <p className="text-xs text-vx-text-muted">API authentication keys</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Row Level Security (RLS) Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="font-semibold text-green-900 dark:text-green-100 mb-2">✓ RBAC Tables</p>
              <p className="text-green-800 dark:text-green-200 text-xs">
                Allow authenticated users to SELECT (read permissions)
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="font-semibold text-green-900 dark:text-green-100 mb-2">✓ Tenant Isolation</p>
              <p className="text-green-800 dark:text-green-200 text-xs">
                Users can only access data from their tenant_id
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="font-semibold text-green-900 dark:text-green-100 mb-2">✓ Audit Logs</p>
              <p className="text-green-800 dark:text-green-200 text-xs">
                Allow INSERT for triggers, SELECT for own tenant
              </p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="font-semibold text-green-900 dark:text-green-100 mb-2">✓ Service Role</p>
              <p className="text-green-800 dark:text-green-200 text-xs">
                Full access for system operations (webhooks, background jobs)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="text-orange-900 dark:text-orange-100">
            Common RLS Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="text-orange-800 dark:text-orange-200 space-y-3 text-sm">
          <div>
            <p className="font-semibold">Issue: "new row violates row-level security policy"</p>
            <p className="text-xs mt-1">Cause: Missing INSERT policy or WITH CHECK clause</p>
            <p className="text-xs mt-1">Fix: Add appropriate policy for the operation</p>
          </div>
          <div>
            <p className="font-semibold">Issue: Query returns empty even though data exists</p>
            <p className="text-xs mt-1">Cause: RLS policy blocking SELECT</p>
            <p className="text-xs mt-1">Fix: Verify USING clause allows user to read data</p>
          </div>
          <div>
            <p className="font-semibold">Issue: Service operations failing</p>
            <p className="text-xs mt-1">Cause: Using authenticated client instead of service role</p>
            <p className="text-xs mt-1">Fix: Use service role client for system operations</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// Webhook Section Component
function WebhookSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            WhatsApp Webhook Integration
          </CardTitle>
          <CardDescription>Receiving messages from Meta/Facebook</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Webhook Endpoints</h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs bg-vx-surface-elevated px-2 py-1 rounded">
                      GET /api/whatsapp/webhook
                    </code>
                    <Badge variant="outline">Verification</Badge>
                  </div>
                  <p className="text-xs text-vx-text-muted">
                    Meta calls this to verify webhook configuration
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs bg-vx-surface-elevated px-2 py-1 rounded">
                      POST /api/whatsapp/webhook
                    </code>
                    <Badge variant="outline">Messages</Badge>
                  </div>
                  <p className="text-xs text-vx-text-muted">
                    Receives incoming messages and status updates
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Message Flow</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">1</div>
                  <div>
                    <p className="font-semibold">User sends WhatsApp message</p>
                    <p className="text-xs text-vx-text-muted">Customer sends message via WhatsApp</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">2</div>
                  <div>
                    <p className="font-semibold">Meta forwards to webhook</p>
                    <p className="text-xs text-vx-text-muted">POST request to /api/whatsapp/webhook</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">3</div>
                  <div>
                    <p className="font-semibold">Webhook validates payload</p>
                    <p className="text-xs text-vx-text-muted">Check signature, structure, timestamp</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">4</div>
                  <div>
                    <p className="font-semibold">Process message</p>
                    <p className="text-xs text-vx-text-muted">Create/update contact, conversation, message</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-vx-purple text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">5</div>
                  <div>
                    <p className="font-semibold">Return 200 OK</p>
                    <p className="text-xs text-vx-text-muted">Always return success to prevent retries</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Supported Message Types</h3>
              <div className="grid md:grid-cols-3 gap-2 text-sm">
                <div className="p-2 bg-vx-surface-elevated rounded">Text</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Image</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Video</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Audio</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Document</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Location</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Interactive (Buttons)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Interactive (Lists)</div>
                <div className="p-2 bg-vx-surface-elevated rounded">Status Updates</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Testing Webhooks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Option 1: UI Testing (Recommended)</p>
              <p className="text-blue-800 dark:text-blue-200 text-xs mb-2">
                Navigate to <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/testing</code> page
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4">
                <li>• Visual interface for all message types</li>
                <li>• Test incoming/outgoing messages</li>
                <li>• Simulate full conversations</li>
                <li>• No command line needed</li>
              </ul>
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="font-semibold text-green-900 dark:text-green-100 mb-2">Option 2: Script Testing</p>
              <p className="text-green-800 dark:text-green-200 text-xs mb-2">
                Run: <code className="bg-green-100 dark:bg-green-900 px-1 rounded">node scripts/test-whatsapp-webhook.js</code>
              </p>
              <ul className="text-xs text-green-700 dark:text-green-300 space-y-1 ml-4">
                <li>• Automated testing of all endpoints</li>
                <li>• Test verification, messages, status updates</li>
                <li>• Detailed logging</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-900 dark:text-red-100">
            Common Webhook Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="text-red-800 dark:text-red-200 space-y-3 text-sm">
          <div>
            <p className="font-semibold">Issue: Verification fails (403)</p>
            <p className="text-xs mt-1">Cause: WHATSAPP_WEBHOOK_VERIFY_TOKEN mismatch</p>
            <p className="text-xs mt-1">Fix: Check .env.local matches Meta dashboard</p>
          </div>
          <div>
            <p className="font-semibold">Issue: Messages not saved to database</p>
            <p className="text-xs mt-1">Cause: RLS policy blocking insert or Supabase connection issue</p>
            <p className="text-xs mt-1">Fix: Check logs, verify service role client is used</p>
          </div>
          <div>
            <p className="font-semibold">Issue: Webhook timeout</p>
            <p className="text-xs mt-1">Cause: Slow database queries or external API calls</p>
            <p className="text-xs mt-1">Fix: Optimize queries, use async processing</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// Troubleshooting Section Component
function TroubleshootingSection() {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Common Issues & Solutions
          </CardTitle>
          <CardDescription>Quick fixes for frequent problems</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {/* Permission Issues */}
            <div className="border-l-4 border-red-500 pl-4">
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Permission Loading Errors
              </h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded">
                  <p className="font-semibold text-red-800 dark:text-red-200">Error: "Error loading permissions: {}"</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    <strong>Cause:</strong> RLS policies blocking RBAC table access
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    <strong>Fix:</strong> Run <code className="bg-red-100 dark:bg-red-900 px-1 rounded">scripts/quick-fix-permissions.sql</code>
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" asChild>
                    <a href="/docs/PERMISSION_FIX_README.md" target="_blank">
                      <FileText className="h-3 w-3 mr-1" />
                      View Guide
                    </a>
                  </Button>
                </div>

                <div className="p-3 bg-red-50 dark:bg-red-950 rounded">
                  <p className="font-semibold text-red-800 dark:text-red-200">User can't access any menus</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                    <strong>Steps:</strong>
                  </p>
                  <ol className="text-xs text-red-700 dark:text-red-300 mt-1 ml-4 space-y-1">
                    <li>1. Run diagnostic: <code className="bg-red-100 dark:bg-red-900 px-1 rounded">scripts/diagnose-permission-issue.sql</code></li>
                    <li>2. Apply fix: <code className="bg-red-100 dark:bg-red-900 px-1 rounded">scripts/quick-fix-permissions.sql</code></li>
                    <li>3. Logout, clear cache, login again</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* RLS Issues */}
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                Row Level Security Errors
              </h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded">
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    Error: "new row violates row-level security policy for table audit_logs"
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    <strong>Fix:</strong> Run <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">scripts/fix-audit-logs-rls.sql</code>
                  </p>
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded">
                  <p className="font-semibold text-orange-800 dark:text-orange-200">
                    Query returns empty but data exists
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    <strong>Cause:</strong> RLS policy USING clause blocking access
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    <strong>Fix:</strong> Check policy allows user's tenant_id or auth.uid()
                  </p>
                </div>
              </div>
            </div>

            {/* Webhook Issues */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Webhook Issues
              </h3>
              <div className="space-y-2 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                  <p className="font-semibold text-blue-800 dark:text-blue-200">
                    Webhook verification fails
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    <strong>Check:</strong> WHATSAPP_WEBHOOK_VERIFY_TOKEN in .env.local
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    <strong>Test:</strong> Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/testing</code> page or run test script
                  </p>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded">
                  <p className="font-semibold text-blue-800 dark:text-blue-200">
                    Messages not appearing in database
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    <strong>Check:</strong> Logs in Vercel/terminal, Supabase connection, RLS policies
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Diagnostic Scripts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs">scripts/diagnose-permission-issue.sql</code>
                <Badge>Permissions</Badge>
              </div>
              <p className="text-xs text-vx-text-muted">
                Comprehensive diagnosis of permission loading issues
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs">scripts/before-fix-snapshot.sql</code>
                <Badge>RLS</Badge>
              </div>
              <p className="text-xs text-vx-text-muted">
                Document current RLS state before applying fixes
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <code className="text-xs">scripts/test-whatsapp-webhook.js</code>
                <Badge>Webhook</Badge>
              </div>
              <p className="text-xs text-vx-text-muted">
                Test all webhook endpoints automatically
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-900 dark:text-green-100 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Quick Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="text-green-800 dark:text-green-200 space-y-3 text-sm">
          <div>
            <p className="font-semibold">Fix Permission Loading:</p>
            <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded block mt-1">
              scripts/quick-fix-permissions.sql
            </code>
          </div>
          <div>
            <p className="font-semibold">Fix Audit Logs RLS:</p>
            <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded block mt-1">
              scripts/fix-audit-logs-rls.sql
            </code>
          </div>
          <div>
            <p className="font-semibold">Test Webhooks:</p>
            <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded block mt-1">
              node scripts/test-whatsapp-webhook.js
            </code>
          </div>
          <div>
            <p className="font-semibold">UI Testing:</p>
            <code className="text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded block mt-1">
              http://localhost:3000/testing
            </code>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
