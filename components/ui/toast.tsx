// Toast notification component
'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useToastStore, type Toast, type ToastType } from '@/lib/stores/toast-store'
import { cn } from '@/lib/utils'

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
}

const toastStyles: Record<ToastType, string> = {
  success: 'border-green-500 bg-green-50 dark:bg-green-950',
  error: 'border-red-500 bg-red-50 dark:bg-red-950',
  warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950',
  info: 'border-blue-500 bg-blue-50 dark:bg-blue-950',
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((state) => state.removeToast)
  const [isExiting, setIsExiting] = useState(false)

  const handleRemove = () => {
    setIsExiting(true)
    setTimeout(() => {
      removeToast(toast.id)
    }, 300) // Match animation duration
  }

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove()
      }, toast.duration)

      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id, toast.duration])

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border-l-4 shadow-lg transition-all duration-300',
        isExiting 
          ? 'animate-out slide-out-to-right-full opacity-0' 
          : 'animate-in slide-in-from-right-full',
        toastStyles[toast.type]
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="shrink-0">{toastIcons[toast.type]}</div>
          <div className="ml-3 w-0 flex-1">
            {toast.title && (
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {toast.title}
              </p>
            )}
            <p className={cn(
              'text-sm text-gray-700 dark:text-gray-300',
              toast.title && 'mt-1'
            )}>
              {toast.message}
            </p>
          </div>
          <div className="ml-4 flex shrink-0">
            <button
              type="button"
              className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6c2bd9] focus:ring-offset-2 transition-colors"
              onClick={handleRemove}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  )
}
