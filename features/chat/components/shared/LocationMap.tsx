'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LocationMapProps {
  latitude: number
  longitude: number
  locationName?: string
}

// Component to handle map center updates
function MapUpdater({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()
  
  useEffect(() => {
    // Fly to new position with smooth animation
    map.flyTo([latitude, longitude], 15, {
      duration: 1.5 // Animation duration in seconds
    })
  }, [latitude, longitude, map])
  
  return null
}

export function LocationMap({ latitude, longitude, locationName }: LocationMapProps) {
  return (
    <div className="w-full h-48 rounded-lg overflow-hidden border">
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>
            {locationName || 'Selected Location'}
            <br />
            <small>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </small>
          </Popup>
        </Marker>
        <MapUpdater latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  )
}
