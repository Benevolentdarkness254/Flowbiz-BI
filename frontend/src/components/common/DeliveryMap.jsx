// frontend/src/components/common/DeliveryMap.jsx
// Leaflet map component for displaying delivery locations and tracking
import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvent, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Custom div icons for our markers
const createDivIcon = (label, bgColor) => 
  L.divIcon({
    html: `<div style="background-color: ${bgColor}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${label}</div>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  })

export default function DeliveryMap({ location, customerLocation, driverLocation, height = 400 }) {
  const [mapCenter, setMapCenter] = useState([0, 0])
  const [mapZoom, setMapZoom] = useState(1)
  const [points, setPoints] = useState([])
  const [markers, setMarkers] = useState([])

  useEffect(() => {
    const newPoints = []
    const newMarkers = []

    // Add customer location marker (destination) - red
    if (customerLocation && customerLocation.lat && customerLocation.lng) {
      newPoints.push([customerLocation.lat, customerLocation.lng])
      newMarkers.push({
        position: [customerLocation.lat, customerLocation.lng],
        icon: createDivIcon('C', '#dc3545'),
        tooltip: 'Customer Location'
      })
    }

    // Add driver/current location marker - blue
    if (driverLocation && driverLocation.lat && driverLocation.lng) {
      newPoints.push([driverLocation.lat, driverLocation.lng])
      newMarkers.push({
        position: [driverLocation.lat, driverLocation.lng],
        icon: createDivIcon('D', '#0d6efd'),
        tooltip: 'Current Location'
      })
    }

    // Add delivery location marker - green
    if (location && location.lat && location.lng) {
      // Only add if it's significantly different from existing points
      const isDuplicate = newPoints.some(p => 
        Math.abs(p[0] - location.lat) < 0.0001 && Math.abs(p[1] - location.lng) < 0.0001
      )
      
      if (!isDuplicate) {
        newPoints.push([location.lat, location.lng])
        newMarkers.push({
          position: [location.lat, location.lng],
          icon: createDivIcon('L', '#28a745'),
          tooltip: 'Delivery Location'
        })
      }
    }

    setPoints(newPoints)
    setMarkers(newMarkers)

    // Update map view if we have points
    if (newPoints.length > 0) {
      // Calculate center point
      const latSum = newPoints.reduce((sum, p) => sum + p[0], 0)
      const lngSum = newPoints.reduce((sum, p) => sum + p[1], 0)
      const center = [latSum / newPoints.length, lngSum / newPoints.length]
      setMapCenter(center)
      
      // Set appropriate zoom level based on number of points
      if (newPoints.length === 1) {
        setMapZoom(15)
      } else {
        setMapZoom(12) // Good default for multiple points
      }
    }
  }, [location, customerLocation, driverLocation])

  if (points.length === 0) {
    return null // Don't render map if no locations
  }

  return (
    <MapContainer 
      center={mapCenter} 
      zoom={mapZoom} 
      style={{ height, width: '100%', borderRadius: 8, border: '1px solid #dee2e6' }}
      whenCreated={map => {
        // Optional: you can access the leaflet map instance here if needed
      }}
    >
      <TileLayer 
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Draw route if we have at least 2 points */}
      {points.length >= 2 && (
        <Polyline 
          positions={points} 
          color="blue" 
          weight={3} 
          opacity={0.7}
        />
      )}
      
      {/* Add all markers */}
      {markers.map((marker, index) => (
        <Marker 
          key={index} 
          position={marker.position} 
          icon={marker.icon}
        >
          <Popup>{marker.tooltip}</Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}