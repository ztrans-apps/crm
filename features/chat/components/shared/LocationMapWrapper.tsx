// Client-only wrapper for LocationMap to avoid SSR issues
'use client'

import dynamic from 'next/dynamic'

// Dynamically import LocationMap with no SSR
const LocationMap = dynamic(
  () => import('./LocationMap').then(mod => ({ default: mod.LocationMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full max-w-[300px]">
        <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
          <div className="w-full h-[200px] bg-gray-200 animate-pulse flex items-center justify-center">
            <span className="text-gray-400 text-sm">Loading map...</span>
          </div>
          <div className="p-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }
)

interface LocationMapWrapperProps {
  latitude: number
  longitude: number
  address?: string
  name?: string
  isFromMe?: boolean
}

export function LocationMapWrapper(props: LocationMapWrapperProps) {
  return <LocationMap {...props} />
}
