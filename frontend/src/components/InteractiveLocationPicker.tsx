import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Compass,
  Crosshair,
  ExternalLink,
  Globe,
  Layers,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react'

// Fix default Leaflet icon paths
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const customPinIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `<div class="pulse-pin"><div class="pin-head"></div><div class="pin-pulse"></div></div>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -38],
})

interface LocationValue {
  latitude: number
  longitude: number
  accuracy?: number
  address?: string
  source?: 'exif' | 'gps' | 'manual'
}

interface Props {
  value: LocationValue | null
  onChange: (loc: LocationValue) => void
  onAddressResolved?: (address: string) => void
}

type MapLayerType = 'google_hybrid' | 'google_roadmap' | 'osm'

const MAP_LAYERS: Record<MapLayerType, { url: string; maxZoom: number; attribution: string; subdomains?: string[] }> = {
  google_hybrid: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '© Google Maps Satellite',
    subdomains: ['0', '1', '2', '3'],
  },
  google_roadmap: {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '© Google Maps',
    subdomains: ['0', '1', '2', '3'],
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  },
}

export default function InteractiveLocationPicker({ value, onChange, onAddressResolved }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('google_hybrid')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [locating, setLocating] = useState(false)
  const [address, setAddress] = useState(value?.address || '')
  const [resolvingAddress, setResolvingAddress] = useState(false)

  const defaultLat = value?.latitude || 28.6139 // New Delhi default
  const defaultLon = value?.longitude || 77.2090

  // Granular address formatter
  const formatDetailedAddress = (data: any): string => {
    if (!data) return ''
    if (!data.address) return data.display_name || ''
    const a = data.address
    const parts: string[] = []

    // 1. POI or Landmark
    if (a.amenity || a.shop || a.tourism || a.building || a.leisure || a.office) {
      parts.push(a.amenity || a.shop || a.tourism || a.building || a.leisure || a.office)
    }
    // 2. House / Building Number
    if (a.house_number) {
      parts.push(`#${a.house_number}`)
    }
    // 3. Street / Road / Highway
    if (a.road || a.pedestrian || a.footway || a.street || a.path || a.highway) {
      parts.push(a.road || a.pedestrian || a.footway || a.street || a.path || a.highway)
    }
    // 4. Neighbourhood / Suburb / Sector / Colony
    if (a.suburb || a.neighbourhood || a.residential || a.colony || a.quarter || a.city_district) {
      parts.push(a.suburb || a.neighbourhood || a.residential || a.colony || a.quarter || a.city_district)
    }
    // 5. City / Town / District
    if (a.city || a.town || a.village || a.county) {
      parts.push(a.city || a.town || a.village || a.county)
    }
    // 6. Postal Code
    if (a.postcode) {
      parts.push(`PIN ${a.postcode}`)
    }

    if (parts.length > 0) return parts.join(', ')
    return data.display_name || ''
  }

  // Reverse Geocoding
  const fetchAddress = async (lat: number, lon: number) => {
    try {
      setResolvingAddress(true)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'CivicPulse-GIS/1.0' } }
      )
      if (res.ok) {
        const data = await res.json()
        const formatted = formatDetailedAddress(data)
        setAddress(formatted)
        if (onAddressResolved) onAddressResolved(formatted)
        return formatted
      }
    } catch (e) {
      console.warn('Reverse geocoding failed:', e)
    } finally {
      setResolvingAddress(false)
    }
    return ''
  }

  // Switch Map Layer (Google Satellite vs Google Roadmap vs OSM)
  const setLayer = (layerType: MapLayerType) => {
    setActiveLayer(layerType)
    if (!mapRef.current) return
    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current)
    }
    const config = MAP_LAYERS[layerType]
    const newLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      attribution: config.attribution,
      subdomains: config.subdomains || ['a', 'b', 'c'],
    }).addTo(mapRef.current)
    tileLayerRef.current = newLayer
  }

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const initialLat = value?.latitude || defaultLat
    const initialLon = value?.longitude || defaultLon

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: value?.latitude ? 18 : 15,
      zoomControl: true,
    })

    const layerConfig = MAP_LAYERS[activeLayer]
    const tileLayer = L.tileLayer(layerConfig.url, {
      maxZoom: layerConfig.maxZoom,
      attribution: layerConfig.attribution,
      subdomains: layerConfig.subdomains || ['a', 'b', 'c'],
    }).addTo(map)

    tileLayerRef.current = tileLayer

    const marker = L.marker([initialLat, initialLon], {
      icon: customPinIcon,
      draggable: true,
    }).addTo(map)

    marker.bindPopup('<b>Exact Issue Location</b><br/>Drag pin or tap map to adjust pinpoint spot.').openPopup()

    marker.on('dragend', async () => {
      const pos = marker.getLatLng()
      const lat = Number(pos.lat.toFixed(6))
      const lon = Number(pos.lng.toFixed(6))
      const resolved = await fetchAddress(lat, lon)
      onChange({ latitude: lat, longitude: lon, address: resolved, source: 'manual' })
    })

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const lat = Number(e.latlng.lat.toFixed(6))
      const lon = Number(e.latlng.lng.toFixed(6))
      marker.setLatLng([lat, lon])
      marker.openPopup()
      const resolved = await fetchAddress(lat, lon)
      onChange({ latitude: lat, longitude: lon, address: resolved, source: 'manual' })
    })

    mapRef.current = map
    markerRef.current = marker

    // Initial Address Lookup
    if (value?.latitude && !value.address) {
      void fetchAddress(value.latitude, value.longitude)
    }

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      tileLayerRef.current = null
    }
  }, [])

  // Sync external value updates
  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return
    const currentMarker = markerRef.current.getLatLng()
    if (
      Math.abs(currentMarker.lat - value.latitude) > 0.00001 ||
      Math.abs(currentMarker.lng - value.longitude) > 0.00001
    ) {
      markerRef.current.setLatLng([value.latitude, value.longitude])
      mapRef.current.setView([value.latitude, value.longitude], 18, { animate: true })
      if (value.address) setAddress(value.address)
      else void fetchAddress(value.latitude, value.longitude)
    }
  }, [value?.latitude, value?.longitude])

  // Live GPS snap
  const snapToGps = () => {
    if (!navigator.geolocation) return alert('GPS not supported on this device/browser.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false)
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lon = Number(pos.coords.longitude.toFixed(6))
        const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 5

        if (mapRef.current && markerRef.current) {
          markerRef.current.setLatLng([lat, lon])
          mapRef.current.flyTo([lat, lon], 18, { duration: 1.2 })
          markerRef.current.openPopup()
        }

        const resolved = await fetchAddress(lat, lon)
        onChange({ latitude: lat, longitude: lon, accuracy: acc, source: 'gps', address: resolved })
      },
      (err) => {
        setLocating(false)
        alert('Could not acquire high-accuracy GPS: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Search Address / Landmark
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&addressdetails=1&limit=1`,
        { headers: { 'User-Agent': 'CivicPulse-GIS/1.0' } }
      )
      if (res.ok) {
        const results = await res.json()
        if (results && results.length > 0) {
          const first = results[0]
          const lat = Number(parseFloat(first.lat).toFixed(6))
          const lon = Number(parseFloat(first.lon).toFixed(6))

          if (mapRef.current && markerRef.current) {
            markerRef.current.setLatLng([lat, lon])
            mapRef.current.flyTo([lat, lon], 18, { duration: 1.2 })
            markerRef.current.openPopup()
          }

          const formatted = formatDetailedAddress(first)
          setAddress(formatted)
          if (onAddressResolved) onAddressResolved(formatted)
          onChange({ latitude: lat, longitude: lon, source: 'manual', address: formatted })
        } else {
          alert('No matching landmark or street found. Try adding city name (e.g. "MG Road, Bengaluru").')
        }
      }
    } catch {
      alert('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const currentLat = value ? value.latitude : defaultLat
  const currentLon = value ? value.longitude : defaultLon
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${currentLat},${currentLon}`

  return (
    <div className="interactive-location-picker">
      {/* Search and GPS Control Bar */}
      <div className="map-toolbar">
        <form onSubmit={handleSearch} className="map-search-form">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search landmark, street, colony (e.g. '12th Main Road, Indiranagar')..."
          />
          <button type="submit" className="map-search-btn" disabled={searching || !searchQuery.trim()}>
            {searching ? <LoaderCircle className="spin" size={14} /> : 'Search'}
          </button>
        </form>

        <div className="map-toolbar-actions">
          <button
            type="button"
            className="map-snap-gps-btn"
            onClick={snapToGps}
            disabled={locating}
            title="Snap to My Exact Live GPS"
          >
            {locating ? <LoaderCircle className="spin" size={15} /> : <Crosshair size={15} />}
            <span>{locating ? 'Locating...' : 'Snap to GPS'}</span>
          </button>
        </div>
      </div>

      {/* Layer Toggle Switcher (Google Satellite / Google Maps / OSM) */}
      <div className="map-layer-selector">
        <div className="layer-options">
          <button
            type="button"
            className={`layer-btn ${activeLayer === 'google_hybrid' ? 'active' : ''}`}
            onClick={() => setLayer('google_hybrid')}
          >
            <Globe size={13} /> Google Satellite (Hybrid)
          </button>
          <button
            type="button"
            className={`layer-btn ${activeLayer === 'google_roadmap' ? 'active' : ''}`}
            onClick={() => setLayer('google_roadmap')}
          >
            <Layers size={13} /> Google Maps
          </button>
          <button
            type="button"
            className={`layer-btn ${activeLayer === 'osm' ? 'active' : ''}`}
            onClick={() => setLayer('osm')}
          >
            OpenStreetMap
          </button>
        </div>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="google-maps-external-link"
          title="Open this exact point in Google Maps App / Web"
        >
          <ExternalLink size={13} /> Open in Google Maps
        </a>
      </div>

      {/* Embedded Leaflet Map with Google Maps / Satellite Tiles */}
      <div className="map-container-wrapper">
        <div ref={mapContainerRef} className="leaflet-map-element" />
        <div className="map-instruction-overlay">
          <Navigation size={13} />
          <span>Tap anywhere on map or drag pin to fine-tune exact spot</span>
        </div>
      </div>

      {/* Active Coordinates & Granular Resolved Address Card */}
      <div className="map-location-summary">
        <div className="location-summary-header">
          <div className="location-summary-badges">
            <span className="badge-pin-mode">
              <MapPin size={13} />
              {value?.source === 'exif'
                ? 'Camera EXIF Photo GPS'
                : value?.source === 'gps'
                ? 'High-Accuracy Live GPS'
                : 'Map Pinpoint Location'}
            </span>
            {value?.accuracy && (
              <span className="badge-pin-acc">
                <Compass size={13} />
                ±{value.accuracy}m Accuracy
              </span>
            )}
          </div>
          <div className="location-coords-text">
            <b>Lat:</b> {currentLat.toFixed(6)} · <b>Lon:</b> {currentLon.toFixed(6)}
          </div>
        </div>

        {resolvingAddress ? (
          <div className="location-address-row resolving">
            <LoaderCircle className="spin" size={14} />
            <span>Resolving exact street address...</span>
          </div>
        ) : address ? (
          <div className="location-address-row">
            📍 <b>Exact Street & Landmark:</b> {address}
          </div>
        ) : (
          <div className="location-address-row muted">
            📍 Drag the pin or click on the map to resolve exact street and road names.
          </div>
        )}
      </div>
    </div>
  )
}
