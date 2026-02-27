// components/ui/progress.tsx
import * as React from "react"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative h-4 w-full overflow-hidden rounded-full bg-vx-surface-hover ${className}`}
        {...props}
      >
        <div
          className="h-full bg-vx-purple transition-all duration-300 ease-in-out"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
