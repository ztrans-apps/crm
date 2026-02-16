// Media preview modal - WhatsApp style
'use client'

import { useState, useEffect } from 'react'
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MediaPreviewProps {
  isOpen: boolean
  onClose: () => void
  mediaUrl: string
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'location' | 'vcard' | null
  mediaFilename?: string
  // For navigation between multiple media
  allMedia?: Array<{
    url: string
    type: string
    filename?: string
  }>
  currentIndex?: number
  onNavigate?: (index: number) => void
}

export function MediaPreview({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  mediaFilename,
  allMedia,
  currentIndex = 0,
  onNavigate
}: MediaPreviewProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Reset zoom and position when media changes
  useEffect(() => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }, [mediaUrl])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Navigation with arrow keys
  useEffect(() => {
    if (!isOpen || !allMedia || !onNavigate) return

    const handleKeyNav = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate(currentIndex - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < allMedia.length - 1) {
        onNavigate(currentIndex + 1)
      }
    }

    document.addEventListener('keydown', handleKeyNav)
    return () => document.removeEventListener('keydown', handleKeyNav)
  }, [isOpen, allMedia, currentIndex, onNavigate])

  if (!isOpen) return null

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = mediaUrl
    link.download = mediaFilename || 'download'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const canNavigatePrev = allMedia && currentIndex > 0
  const canNavigateNext = allMedia && currentIndex < allMedia.length - 1

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
          {mediaFilename && (
            <span className="text-white text-sm truncate max-w-md">
              {mediaFilename}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mediaType === 'image' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleZoomOut()
                }}
                className="text-white hover:bg-white/10"
                disabled={zoom <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <span className="text-white text-sm min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleZoomIn()
                }}
                className="text-white hover:bg-white/10"
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDownload()
            }}
            className="text-white hover:bg-white/10"
          >
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Media Content */}
      <div 
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {mediaType === 'image' && (
          <img
            src={mediaUrl}
            alt={mediaFilename || 'Preview'}
            className="max-w-full max-h-full object-contain select-none"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out'
            }}
            draggable={false}
          />
        )}

        {mediaType === 'video' && (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-full"
            style={{ maxHeight: '90vh' }}
          >
            Your browser does not support video playback.
          </video>
        )}

        {mediaType === 'audio' && (
          <div className="bg-gray-800 p-8 rounded-lg">
            <div className="text-white text-center mb-4">
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-sm text-gray-300">{mediaFilename || 'Audio'}</p>
            </div>
            <audio
              src={mediaUrl}
              controls
              autoPlay
              className="w-full"
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        )}

        {/* Navigation arrows */}
        {canNavigatePrev && (
          <Button
            variant="ghost"
            size="lg"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate?.(currentIndex - 1)
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 rounded-full"
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}

        {canNavigateNext && (
          <Button
            variant="ghost"
            size="lg"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate?.(currentIndex + 1)
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 h-12 w-12 rounded-full"
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}
      </div>

      {/* Thumbnail strip (if multiple media) */}
      {allMedia && allMedia.length > 1 && (
        <div className="bg-black/50 p-4 flex gap-2 overflow-x-auto">
          {allMedia.map((media, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.stopPropagation()
                onNavigate?.(index)
              }}
              className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-green-500 opacity-100'
                  : 'border-transparent opacity-50 hover:opacity-75'
              }`}
            >
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : media.type === 'video' ? (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-xs">
                  🎥
                </div>
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-white text-xs">
                  📄
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
