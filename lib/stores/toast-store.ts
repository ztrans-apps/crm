// Toast notification store using Zustand
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: Toast = {
      id,
      duration: 3000, // Default 3 seconds
      ...toast,
    }
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))
  },
  
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  
  clearAll: () => set({ toasts: [] }),
}))

// Helper functions for easy usage
export const toast = {
  success: (message: string, title?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'success', message, title, duration })
  },
  
  error: (message: string, title?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'error', message, title, duration })
  },
  
  warning: (message: string, title?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'warning', message, title, duration })
  },
  
  info: (message: string, title?: string, duration?: number) => {
    useToastStore.getState().addToast({ type: 'info', message, title, duration })
  },
}
