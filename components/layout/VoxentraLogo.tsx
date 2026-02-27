// components/layout/VoxentraLogo.tsx
'use client'

import Image from 'next/image'

interface VoxentraLogoProps {
  collapsed?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: { icon: 28, text: 'text-sm' },
  md: { icon: 36, text: 'text-lg' },
  lg: { icon: 48, text: 'text-xl' },
  xl: { icon: 64, text: 'text-2xl' },
}

export function VoxentraLogo({ collapsed = false, className = '', size = 'md' }: VoxentraLogoProps) {
  const { icon, text } = sizeMap[size]

  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'} ${className}`}>
      {/* Actual Voxentra Logo */}
      <div className="relative shrink-0">
        <Image
          src="/logo-512.png"
          alt="Voxentra"
          width={icon}
          height={icon}
          className="rounded-lg drop-shadow-md"
          priority
        />
      </div>

      {/* Brand Name - Only when expanded */}
      {!collapsed && (
        <div className="min-w-0">
          <h1 className={`${text} font-bold vx-gradient-text leading-tight tracking-tight`}>
            Voxentra
          </h1>
        </div>
      )}
    </div>
  )
}
