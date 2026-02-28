// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from '@/lib/stores/toast-store'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any).auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Login berhasil!')
      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Modal Card Container */}
      <div className="w-full max-w-6xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          {/* Left Side - Illustration */}
          <div className="lg:w-1/2 bg-gradient-to-br from-gray-50 via-purple-50 to-indigo-50 dark:from-gray-900 dark:via-purple-950 dark:to-indigo-950 p-12 flex items-center justify-center">
            <div className="max-w-md w-full space-y-8">
              {/* Illustration */}
              <div className="relative w-full aspect-square max-w-sm mx-auto">
                <Image
                  src="/img-login.png"
                  alt="Login Illustration"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                />
              </div>
              
              {/* Title & Description */}
              <div className="text-center space-y-4">
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Voxentra CRM Platform
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg">
                  Unleash Your Business Success with Voxentra CRM's Excellence Platform
                </p>
              </div>

              {/* Pagination Dots */}
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="lg:w-1/2 p-8 lg:p-12 flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="w-full max-w-md space-y-8">
              {/* Logo */}
              <div className="flex justify-center">
                <Image
                  src="/only-icon.png"
                  alt="Voxentra Logo"
                  width={80}
                  height={80}
                  className="drop-shadow-lg"
                  priority
                />
              </div>

              {/* Title */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-wide">
                  VOXENTRA <span className="font-light text-gray-500 dark:text-gray-400">HUB</span>
                </h2>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm text-gray-600 dark:text-gray-400">
                    Username or email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="johnsmith007"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#6c2bd9] focus:border-transparent rounded-lg transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm text-gray-600 dark:text-gray-400">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#6c2bd9] focus:border-transparent rounded-lg transition-all"
                  />
                  <div className="flex justify-end">
                    <Link 
                      href="/forgot-password" 
                      className="text-sm text-gray-500 hover:text-[#6c2bd9] dark:text-gray-400 dark:hover:text-[#6c2bd9] transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-[#6c2bd9] hover:bg-[#5a24b8] text-white font-medium text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
