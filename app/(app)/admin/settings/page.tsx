'use client'

// Admin Settings Page - Auto Assignment Configuration
// Halaman untuk konfigurasi auto-assignment dan settings lainnya

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PermissionGuard } from '@/lib/rbac'
import { Settings, Users, Clock, Save, RefreshCw } from 'lucide-react'

interface AutoAssignmentSettings {
  enabled: boolean
  strategy: 'round_robin' | 'least_busy' | 'random'
  assign_to_roles: string[]
  only_active_agents: boolean
  max_conversations_per_agent: number | null
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AutoAssignmentSettings>({
    enabled: false,
    strategy: 'round_robin',
    assign_to_roles: ['agent'],
    only_active_agents: true,
    max_conversations_per_agent: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'auto_assignment')
        .single<{ setting_value: AutoAssignmentSettings }>()

      if (error) throw error

      if (data?.setting_value) {
        setSettings(data.setting_value)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      showMessage('error', 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // @ts-ignore - Supabase type inference issue with JSONB columns
      const { error } = await supabase
        .from('system_settings')
        // @ts-ignore
        .update({
          setting_value: settings,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('setting_key', 'auto_assignment')

      if (error) throw error

      showMessage('success', 'Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      showMessage('error', 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <PermissionGuard 
      permission={['role.view', 'user.manage_roles']}
      mode="any"
      fallback={
        <div className="p-8">
          <div className="text-center text-red-600">
            You don't have permission to access settings
          </div>
        </div>
      }
    >
      <div className="p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8" />
            System Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Configure auto-assignment and other system-wide settings
          </p>
        </div>

        {/* Success/Error Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Auto Assignment Settings */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Auto Assignment</h2>
          </div>

          <div className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Enable Auto Assignment</h3>
                <p className="text-sm text-gray-600">
                  Automatically assign incoming conversations to agents
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Strategy */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Assignment Strategy
              </label>
              <select
                value={settings.strategy}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  strategy: e.target.value as 'round_robin' | 'least_busy' | 'random' 
                })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!settings.enabled}
              >
                <option value="round_robin">Round Robin (Bergiliran)</option>
                <option value="least_busy">Least Busy (Paling Sedikit Chat)</option>
                <option value="random">Random (Acak)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {settings.strategy === 'round_robin' && 'Assign conversations to agents in rotation'}
                {settings.strategy === 'least_busy' && 'Assign to agent with fewest active conversations'}
                {settings.strategy === 'random' && 'Assign to random available agent'}
              </p>
            </div>

            {/* Assign to Roles */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Assign to Roles
              </label>
              <div className="space-y-2">
                {['agent', 'supervisor'].map((role) => (
                  <label key={role} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.assign_to_roles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSettings({
                            ...settings,
                            assign_to_roles: [...settings.assign_to_roles, role]
                          })
                        } else {
                          setSettings({
                            ...settings,
                            assign_to_roles: settings.assign_to_roles.filter(r => r !== role)
                          })
                        }
                      }}
                      className="mr-2"
                      disabled={!settings.enabled}
                    />
                    <span className="capitalize">{role}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select which roles can receive auto-assigned conversations
              </p>
            </div>

            {/* Only Active Agents */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={settings.only_active_agents}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  only_active_agents: e.target.checked 
                })}
                className="mr-2"
                disabled={!settings.enabled}
              />
              <label className="text-sm">
                Only assign to active agents (is_active = true)
              </label>
            </div>

            {/* Max Conversations Per Agent */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Conversations Per Agent
              </label>
              <input
                type="number"
                value={settings.max_conversations_per_agent || ''}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  max_conversations_per_agent: e.target.value ? parseInt(e.target.value) : null 
                })}
                placeholder="No limit"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!settings.enabled}
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum number of active conversations per agent (leave empty for no limit)
              </p>
            </div>
          </div>
        </div>

        {/* Business Hours (Coming Soon) */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 opacity-50">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-400">Business Hours</h2>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">Coming Soon</span>
          </div>
          <p className="text-sm text-gray-500">
            Configure business hours for auto-assignment and auto-replies
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={loadSettings}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </PermissionGuard>
  )
}
