// components/ui/badge.tsx
import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-vx-teal/10 text-vx-teal',
      secondary: 'bg-vx-surface-hover text-vx-text-secondary',
      outline: 'border border-vx-border text-vx-text-secondary',
      destructive: 'bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400',
      success: 'bg-vx-teal/10 text-vx-teal'
    }

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
