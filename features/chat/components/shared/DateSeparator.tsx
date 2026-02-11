// Date separator component for chat messages
'use client'

interface DateSeparatorProps {
  date: Date
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const formatDate = (date: Date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffTime = today.getTime() - messageDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return 'TODAY'
    } else if (diffDays === 1) {
      return 'YESTERDAY'
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      }).toUpperCase()
    }
  }

  return (
    <div className="flex items-center justify-center my-2">
      <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
        {formatDate(date)}
      </div>
    </div>
  )
}
