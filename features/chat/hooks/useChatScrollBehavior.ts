// Custom hook for chat scroll behavior with back-to-bottom button
// Logic: Detect if user is at BOTTOM, not at TOP
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'

interface UseChatScrollBehaviorProps {
  messagesContainerRef: React.RefObject<HTMLDivElement | null> | React.RefObject<HTMLDivElement>
  messages: any[]
  conversationId?: string | null
  enabled?: boolean
}

interface UseChatScrollBehaviorReturn {
  showBackToBottom: boolean
  newMessageCount: number
  isUserAtBottom: boolean
  scrollToBottom: (behavior?: 'smooth' | 'instant') => void
  handleScroll: () => void
  resetCounter: () => void
}

const BOTTOM_THRESHOLD = 200 // pixels from bottom - about 3 messages

export function useChatScrollBehavior({
  messagesContainerRef,
  messages,
  conversationId,
  enabled = true,
}: UseChatScrollBehaviorProps): UseChatScrollBehaviorReturn {
  const [showBackToBottom, setShowBackToBottom] = useState(false)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [isUserAtBottom, setIsUserAtBottom] = useState(true)
  
  const prevMessagesLengthRef = useRef(0)
  const isInitialLoadRef = useRef(true)

  // Check if user is at bottom of chat - CORRECT LOGIC
  const checkIsAtBottom = useCallback((): boolean => {
    if (!messagesContainerRef.current) return true
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    
    // CORRECT: Check distance from BOTTOM, not from TOP
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    
    return distanceFromBottom < BOTTOM_THRESHOLD
  }, [messagesContainerRef])

  // Scroll to bottom function
  const scrollToBottom = useCallback((behavior: 'smooth' | 'instant' = 'smooth') => {
    if (!messagesContainerRef.current || !enabled) return
    
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        if (behavior === 'instant') {
          // Instant scroll - no animation
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        } else {
          // Smooth scroll
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth',
          })
        }
      }
    })
  }, [messagesContainerRef, enabled])

  // Reset counter
  const resetCounter = useCallback(() => {
    setNewMessageCount(0)
  }, [])

  // Handle scroll event - NO THROTTLE for better responsiveness
  const handleScroll = useCallback(() => {
    if (!enabled) return
    
    const atBottom = checkIsAtBottom()
    
    setIsUserAtBottom(atBottom)
    
    // Button logic: show when NOT at bottom
    setShowBackToBottom(!atBottom)
    
    // Reset counter if user scrolled to bottom
    if (atBottom) {
      setNewMessageCount(0)
    }
  }, [enabled, checkIsAtBottom])

  // Handle new messages
  useEffect(() => {
    if (!enabled || messages.length === 0) return

    const currentLength = messages.length
    const prevLength = prevMessagesLengthRef.current

    // Skip initial load
    if (prevLength === 0) {
      prevMessagesLengthRef.current = currentLength
      return
    }

    // Check if there are new messages (not initial load)
    if (currentLength > prevLength) {
      const newMessagesAdded = currentLength - prevLength
      
      // Check if the latest message is from me (user sent it)
      const latestMessage = messages[messages.length - 1]
      const isMyMessage = latestMessage?.is_from_me === true
      
      if (isMyMessage) {
        // User sent the message - ALWAYS auto scroll
        scrollToBottom('smooth')
        setNewMessageCount(0)
        setShowBackToBottom(false)
      } else {
        // Message from other person
        // Check if user is currently at bottom
        const atBottom = checkIsAtBottom()
        
        if (atBottom) {
          // User is at bottom - auto scroll to show new message
          scrollToBottom('smooth')
          setNewMessageCount(0)
        } else {
          // User scrolled up - DON'T auto scroll, just show badge
          setNewMessageCount(prev => prev + newMessagesAdded)
          setShowBackToBottom(true)
        }
      }
    }

    prevMessagesLengthRef.current = currentLength
  }, [messages.length, scrollToBottom, enabled, messages, checkIsAtBottom])

  // AUTO SCROLL when conversation changes
  useEffect(() => {
    if (!enabled || !conversationId) return
    
    // Reset state for new conversation
    setShowBackToBottom(false)
    setNewMessageCount(0)
    setIsUserAtBottom(true)
    prevMessagesLengthRef.current = 0
    isInitialLoadRef.current = true
    
    return () => {}
  }, [conversationId, enabled])

  // Scroll to bottom when messages load for new conversation
  // Use useLayoutEffect to run synchronously after DOM updates but before paint
  useLayoutEffect(() => {
    if (!enabled || !conversationId || messages.length === 0) return
    
    // Only for initial load of a conversation
    if (isInitialLoadRef.current) {
      const container = messagesContainerRef.current
      if (container) {
        // Scroll instantly to bottom - no animation, no delay
        container.scrollTop = container.scrollHeight
        isInitialLoadRef.current = false
      }
    }
  }, [conversationId, messages.length, enabled, messagesContainerRef])

  return {
    showBackToBottom,
    newMessageCount,
    isUserAtBottom,
    scrollToBottom,
    handleScroll,
    resetCounter,
  }
}
