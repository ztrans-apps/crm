// components/ui/textarea.tsx
import * as React from "react"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={`flex min-h-[80px] w-full rounded-md border border-vx-border bg-vx-surface px-3 py-2 text-sm text-vx-text placeholder:text-vx-text-muted focus:outline-none focus:ring-2 focus:ring-vx-purple/30 focus:border-vx-purple/50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
