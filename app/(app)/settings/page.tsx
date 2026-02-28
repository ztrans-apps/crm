// app/(app)/settings/page.tsx
'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, User, Bell, Lock, Volume2, Palette, Globe, Moon, Sun, Monitor } from 'lucide-react'
import { PermissionGuard } from '@/lib/rbac/components/PermissionGuard'
import { useNotificationSound } from '@/lib/hooks/use-notification-sound'

export default function SettingsPage() {
  const { isEnabled, toggleEnabled, volume, updateVolume, play } = useNotificationSound()
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  return (
    <PermissionGuard 
      permission={['settings.manage']}
      fallback={
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      }
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b border-vx-border bg-vx-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-vx-purple to-vx-teal flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-vx-text">Settings</h1>
              <p className="text-sm text-vx-text-secondary">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details and profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-vx-purple to-vx-teal flex items-center justify-center text-white text-2xl font-bold">
                      OA
                    </div>
                    <div className="flex-1">
                      <Button variant="outline" size="sm">Change Avatar</Button>
                      <p className="text-xs text-vx-text-muted mt-1">JPG, PNG or GIF. Max 2MB</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="john@example.com" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+62 812 3456 7890" />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline">Cancel</Button>
                    <Button className="bg-vx-purple hover:bg-vx-purple/90">Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Sound Notifications</CardTitle>
                  <CardDescription>Configure audio alerts for incoming messages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-vx-surface-elevated">
                    <div className="space-y-0.5">
                      <Label htmlFor="sound-notifications" className="text-base font-medium cursor-pointer">
                        Enable Sound Notifications
                      </Label>
                      <p className="text-sm text-vx-text-muted">
                        Play sound when new messages arrive
                      </p>
                    </div>
                    <Switch
                      id="sound-notifications"
                      checked={isEnabled}
                      onCheckedChange={toggleEnabled}
                    />
                  </div>

                  {isEnabled && (
                    <div className="space-y-4 p-4 rounded-lg border border-vx-border bg-vx-surface">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="volume" className="text-sm font-medium flex items-center gap-2">
                          <Volume2 className="h-4 w-4 text-vx-purple" />
                          Volume Level
                        </Label>
                        <span className="text-sm font-semibold text-vx-purple">{Math.round(volume * 100)}%</span>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="range"
                          id="volume"
                          min="0"
                          max="100"
                          step="5"
                          value={Math.round(volume * 100)}
                          onChange={(e) => updateVolume(parseInt(e.target.value) / 100)}
                          className="w-full h-2 bg-vx-surface-elevated rounded-lg appearance-none cursor-pointer accent-vx-purple"
                          style={{
                            background: `linear-gradient(to right, rgb(108, 43, 217) 0%, rgb(108, 43, 217) ${volume * 100}%, rgb(46, 34, 68) ${volume * 100}%, rgb(46, 34, 68) 100%)`
                          }}
                        />
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={play}
                        className="w-full border-vx-purple text-vx-purple hover:bg-vx-purple hover:text-white"
                      >
                        <Volume2 className="h-4 w-4 mr-2" />
                        Test Sound
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Desktop Notifications</CardTitle>
                  <CardDescription>Manage browser notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-vx-surface-elevated">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Browser Notifications</Label>
                      <p className="text-sm text-vx-text-muted">Show desktop notifications for new messages</p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-vx-surface-elevated">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Email Notifications</Label>
                      <p className="text-sm text-vx-text-muted">Receive email alerts for important updates</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Choose your preferred color scheme</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        theme === 'light' 
                          ? 'border-vx-purple bg-vx-purple/5' 
                          : 'border-vx-border hover:border-vx-purple/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                          <Sun className="h-6 w-6 text-yellow-500" />
                        </div>
                        <span className="text-sm font-medium">Light</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        theme === 'dark' 
                          ? 'border-vx-purple bg-vx-purple/5' 
                          : 'border-vx-border hover:border-vx-purple/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center">
                          <Moon className="h-6 w-6 text-blue-400" />
                        </div>
                        <span className="text-sm font-medium">Dark</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setTheme('system')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        theme === 'system' 
                          ? 'border-vx-purple bg-vx-purple/5' 
                          : 'border-vx-border hover:border-vx-purple/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white to-gray-900 border border-gray-400 flex items-center justify-center">
                          <Monitor className="h-6 w-6 text-gray-600" />
                        </div>
                        <span className="text-sm font-medium">System</span>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Language & Region</CardTitle>
                  <CardDescription>Set your language and regional preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select 
                      id="language"
                      className="w-full px-3 py-2 rounded-lg border border-vx-border bg-vx-surface text-vx-text"
                    >
                      <option>English</option>
                      <option>Bahasa Indonesia</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select 
                      id="timezone"
                      className="w-full px-3 py-2 rounded-lg border border-vx-border bg-vx-surface text-vx-text"
                    >
                      <option>Asia/Jakarta (GMT+7)</option>
                      <option>Asia/Singapore (GMT+8)</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline">Cancel</Button>
                    <Button className="bg-vx-purple hover:bg-vx-purple/90">Update Password</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-vx-surface-elevated">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Enable 2FA</Label>
                      <p className="text-sm text-vx-text-muted">Require authentication code when signing in</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions for your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" className="w-full">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PermissionGuard>
  )
}
