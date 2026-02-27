// components/layout/VoxentraLogo.tsx
'use client'

interface VoxentraLogoProps {
  collapsed?: boolean
  className?: string
}

export function VoxentraLogo({ collapsed = false, className = '' }: VoxentraLogoProps) {
  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} ${className}`}>
      {/* Logo Icon - Speech bubble inspired by Voxentra logo */}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 rounded-xl vx-gradient flex items-center justify-center shadow-md">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-5 h-5 text-white"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
            <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
      </div>

      {/* Brand Name - Only when expanded */}
      {!collapsed && (
        <div className="min-w-0">
          <h1 className="text-lg font-bold vx-gradient-text leading-tight">
            Voxentra
          </h1>
        </div>
      )}
    </div>
  )
}
