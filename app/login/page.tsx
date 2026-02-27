// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any).auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Redirect to universal dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      setError(error.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-vx-purple/5 via-vx-surface to-vx-teal/5 p-4">
      <Card className="w-full max-w-md bg-vx-surface border-vx-border shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo-512.png"
              alt="Voxentra"
              width={72}
              height={72}
              className="rounded-2xl drop-shadow-lg"
              priority
            />
          </div>
          <CardTitle className="text-2xl font-bold vx-gradient-text">Voxentra CRM</CardTitle>
          <CardDescription className="text-vx-text-muted">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-vx-text-secondary">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@whatsapp-crm.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-vx-surface-elevated border-vx-border focus:ring-vx-purple/30 focus:border-vx-purple"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-vx-text-secondary">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="bg-vx-surface-elevated border-vx-border focus:ring-vx-purple/30 focus:border-vx-purple"
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-3 rounded-md border border-red-200 dark:border-red-500/20">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-vx-purple hover:bg-vx-purple/90 text-white font-semibold shadow-md"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-vx-text-muted">
            <p>Demo Credentials:</p>
            <p className="font-mono text-xs mt-1 text-vx-text-secondary">
              owner@whatsapp-crm.local / password123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
