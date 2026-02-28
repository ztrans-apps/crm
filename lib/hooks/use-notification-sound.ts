// Hook for playing notification sound
'use client'

import { useEffect, useRef, useState } from 'react'

export function useNotificationSound() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const [isEnabled, setIsEnabled] = useState(true)
  const [volume, setVolume] = useState(0.5)

  useEffect(() => {
    // Initialize audio context
    if (typeof window !== 'undefined') {
      // Load from localStorage
      const savedEnabled = localStorage.getItem('notification_sound_enabled')
      const savedVolume = localStorage.getItem('notification_sound_volume')
      
      if (savedEnabled !== null) {
        setIsEnabled(savedEnabled === 'true')
      }
      if (savedVolume !== null) {
        const vol = parseFloat(savedVolume)
        setVolume(vol)
      }
    }
  }, [])

  const play = () => {
    if (!isEnabled) return

    try {
      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }

      const audioContext = audioContextRef.current
      
      // Create oscillator for beep sound
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      // Connect nodes
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Configure sound - pleasant notification tone
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime) // 800 Hz
      
      // Set volume with fade in/out
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      
      // Play for 300ms
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
      
      // Second beep for double notification sound
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator()
        const gainNode2 = audioContext.createGain()
        
        oscillator2.connect(gainNode2)
        gainNode2.connect(audioContext.destination)
        
        oscillator2.type = 'sine'
        oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime) // 1000 Hz (higher pitch)
        
        gainNode2.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode2.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01)
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
        
        oscillator2.start(audioContext.currentTime)
        oscillator2.stop(audioContext.currentTime + 0.2)
      }, 100)
      
    } catch (error) {
      console.log('Could not play notification sound:', error)
    }
  }

  const toggleEnabled = () => {
    const newValue = !isEnabled
    setIsEnabled(newValue)
    localStorage.setItem('notification_sound_enabled', String(newValue))
  }

  const updateVolume = (newVolume: number) => {
    const vol = Math.max(0, Math.min(1, newVolume))
    setVolume(vol)
    localStorage.setItem('notification_sound_volume', String(vol))
  }

  return {
    play,
    isEnabled,
    toggleEnabled,
    volume,
    updateVolume,
  }
}
