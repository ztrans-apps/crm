// components/layout/ThemeToggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="relative h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="relative h-9 w-9 text-vx-text-secondary hover:text-vx-purple hover:bg-vx-surface-hover transition-all duration-300"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <Sun className={`h-4 w-4 absolute transition-all duration-500 ${
        theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
      }`} />
      <Moon className={`h-4 w-4 absolute transition-all duration-500 ${
        theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
      }`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
