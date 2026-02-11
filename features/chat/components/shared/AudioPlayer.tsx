// Custom Audio Player - WhatsApp style
'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AudioPlayerProps {
  src: string
  isFromMe?: boolean
}

export function AudioPlayer({ src, isFromMe = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration)
        setIsLoading(false)
        setHasError(false)
      }
    }

    const handleTimeUpdate = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = (e: Event) => {
      // Silently handle error - don't log to console
      setIsLoading(false)
      setHasError(true)
      setIsPlaying(false)
    }

    const handleCanPlay = () => {
      setIsLoading(false)
      setHasError(false)
    }

    const handleLoadStart = () => {
      setIsLoading(true)
      setHasError(false)
    }

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)

    // Check if already loaded
    if (audio.readyState >= 2) {
      handleLoadedMetadata()
    }

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [src])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio || hasError) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => {
        setIsPlaying(true)
      }).catch(() => {
        // Silently handle play error
        setHasError(true)
        setIsPlaying(false)
      })
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration || hasError) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    if (!isNaN(newTime) && isFinite(newTime)) {
      audio.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00'
    
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 && !isNaN(currentTime) ? (currentTime / duration) * 100 : 0

  if (hasError) {
    return (
      <div className="flex items-center gap-2 py-1 min-w-[250px] max-w-[350px]">
        <div className="text-xs text-red-500">Unable to play audio</div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1 min-w-[250px] max-w-[350px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      {/* Play/Pause Button */}
      <Button
        onClick={togglePlayPause}
        disabled={isLoading}
        variant="ghost"
        size="sm"
        className={`h-10 w-10 rounded-full p-0 shrink-0 ${
          isFromMe 
            ? 'bg-white/80 hover:bg-white text-green-600' 
            : 'bg-gray-100 hover:bg-gray-200 text-green-600'
        }`}
      >
        {isLoading ? (
          <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 fill-current ml-0.5" />
        )}
      </Button>

      {/* Waveform / Progress Bar */}
      <div className="flex-1 flex flex-col gap-1">
        {/* Progress bar */}
        <div
          className="h-1 bg-gray-300 rounded-full cursor-pointer relative overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className={`h-full rounded-full transition-all ${
              isFromMe ? 'bg-green-700' : 'bg-green-600'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>

        {/* Time display */}
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-gray-600">
            {formatTime(currentTime)}
          </span>
          <span className="text-[10px] text-gray-500">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
