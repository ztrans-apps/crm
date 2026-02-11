// Back to bottom button component - Simple gray style
'use client'

import { memo } from 'react'
import { ChevronDown } from 'lucide-react'

interface BackToBottomButtonProps {
  show: boolean
  newMessageCount: number
  onClick: () => void
}

function BackToBottomButton({ show, newMessageCount, onClick }: BackToBottomButtonProps) {
  if (!show) return null

  return (
    <button
      onClick={onClick}
      className="absolute right-6 bottom-6 z-10 flex items-center justify-center w-10 h-10 bg-gray-700 hover:bg-gray-800 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 animate-in fade-in slide-in-from-bottom-2"
      title="Scroll to bottom"
      aria-label="Scroll to bottom"
    >
      <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
      
      {/* Badge counter for new messages */}
      {newMessageCount > 0 && (
        <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full flex items-center justify-center shadow-sm animate-in zoom-in">
          <span className="text-white text-[10px] font-bold leading-none">
            {newMessageCount > 99 ? '99+' : newMessageCount}
          </span>
        </div>
      )}
    </button>
  )
}

// Memoize to prevent unnecessary re-renders
export default memo(BackToBottomButton, (prevProps, nextProps) => {
  return (
    prevProps.show === nextProps.show &&
    prevProps.newMessageCount === nextProps.newMessageCount
  )
})
