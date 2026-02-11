// Location Map component - WhatsApp style with Leaflet
'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, ExternalLink } from 'lucide-react'

interface LocationMapProps {
  latitude: number
  longitude: number
  address?: string
  name?: string
  isFromMe?: boolean
}

export function LocationMap({ 
  latitude, 
  longitude, 
  address, 
  name,
  isFromMe = false 
}: LocationMapProps) {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !containerRef.current || mapRef.current) return

    // Dynamically import Leaflet only on client side
    import('leaflet').then((L) => {
      // Import CSS
      import('leaflet/dist/leaflet.css')

      // Fix Leaflet default marker icon issue in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Initialize map
      const map = L.map(containerRef.current!, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: false,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
      })

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Add marker
      const marker = L.marker([latitude, longitude]).addTo(map)
      
      // Add popup if name or address exists
      if (name || address) {
        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif;">
            ${name ? `<strong style="display: block; margin-bottom: 4px;">${name}</strong>` : ''}
            ${address ? `<span style="font-size: 12px; color: #666;">${address}</span>` : ''}
          </div>
        `
        marker.bindPopup(popupContent)
      }

      mapRef.current = map
    })

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [isClient, latitude, longitude, name, address])

  // Generate Google Maps link
  const getGoogleMapsLink = () => {
    return `https://www.google.com/maps?q=${latitude},${longitude}`
  }

  return (
    <div className="w-full max-w-[300px]">
      <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
        {/* Leaflet Map */}
        <div 
          ref={containerRef}
          className="w-full h-[200px] relative z-0"
          style={{ background: '#f0f0f0' }}
        />

        {/* Location Info */}
        <div className="p-3">
          <div className="flex items-start gap-2 mb-2">
            <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {name && (
                <p className="text-sm font-medium text-gray-900 truncate mb-1">
                  {name}
                </p>
              )}
              {address ? (
                <p className="text-xs text-gray-600 line-clamp-2">
                  {address}
                </p>
              ) : (
                <p className="text-xs text-gray-500 font-mono">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
          
          {/* Open in Google Maps button */}
          <a
            href={getGoogleMapsLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  )
}
