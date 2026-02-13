// Location Picker with draggable map
'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

interface LocationPickerProps {
  latitude: number
  longitude: number
  onLocationChange: (lat: number, lng: number) => void
}

export function LocationPicker({ 
  latitude, 
  longitude,
  onLocationChange
}: LocationPickerProps) {
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [currentCoords, setCurrentCoords] = useState({ lat: latitude, lng: longitude })

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !containerRef.current || mapRef.current) return

    import('leaflet').then((L) => {
      // @ts-ignore - CSS import
      import('leaflet/dist/leaflet.css')

      // Fix Leaflet default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Initialize map with dragging enabled
      const map = L.map(containerRef.current!, {
        center: [latitude, longitude],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
      })

      // Add tile layer - using alternative tile server to avoid Cloudflare cookie warnings
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Add draggable marker
      const marker = L.marker([latitude, longitude], {
        draggable: true
      }).addTo(map)

      // Update coordinates when marker is dragged
      marker.on('dragend', function() {
        const position = marker.getLatLng()
        setCurrentCoords({ lat: position.lat, lng: position.lng })
        onLocationChange(position.lat, position.lng)
      })

      // Update marker position when map is moved
      map.on('moveend', function() {
        const center = map.getCenter()
        marker.setLatLng(center)
        setCurrentCoords({ lat: center.lat, lng: center.lng })
        onLocationChange(center.lat, center.lng)
      })

      mapRef.current = map
      markerRef.current = marker
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [isClient])

  // Update marker when props change
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([latitude, longitude])
      mapRef.current.setView([latitude, longitude])
      setCurrentCoords({ lat: latitude, lng: longitude })
    }
  }, [latitude, longitude])

  return (
    <div className="w-full">
      {/* Map Container */}
      <div 
        ref={containerRef}
        className="w-full h-[300px] rounded-lg overflow-hidden border-2 border-gray-200 relative"
        style={{ background: '#f0f0f0' }}
      />
      
      {/* Coordinates Display */}
      <div className="mt-3 flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border">
        <MapPin className="h-4 w-4 text-red-500 shrink-0" />
        <div className="flex-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 font-medium">Latitude:</span>
            <span className="text-gray-900 font-mono">{currentCoords.lat.toFixed(6)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-gray-600 font-medium">Longitude:</span>
            <span className="text-gray-900 font-mono">{currentCoords.lng.toFixed(6)}</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-2 text-xs text-center text-gray-500">
        Drag the map or marker to adjust location
      </div>
    </div>
  )
}
