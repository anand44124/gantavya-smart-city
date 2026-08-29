import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Crosshair,
  ExternalLink,
  Globe,
  Layers,
  MapPin,
} from 'lucide-react'
import type { Issue } from './reportApi'
import { displayStatus, statusColor } from './reportApi'
import { useTranslation } from '../i18n/LanguageContext'

// Fix default Leaflet icon paths
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

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

function createPinIcon(status: string) {
  const isResolved = status === 'resolved' || status === 'verified_closed'
  const isInProgress = status === 'in_progress'
  const colorClass = isResolved ? 'pin-mint' : isInProgress ? 'pin-amber' : 'pin-coral'

  return L.divIcon({
    className: 'custom-issue-marker',
    html: `<div class="issue-pulse-pin ${colorClass}"><div class="pin-dot"></div><div class="pin-wave"></div></div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32],
  })
}

export default function IssueMap({
  issues,
}: {
  issues: Array<Pick<Issue, 'id' | 'title' | 'latitude' | 'longitude' | 'status' | 'category' | 'department' | 'subtype'>>
}) {
  const { t } = useTranslation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersGroupRef = useRef<L.FeatureGroup | null>(null)

  const [activeLayer, setActiveLayer] = useState<MapLayerType>('google_hybrid')
  const [selectedIssue, setSelectedIssue] = useState<Pick<Issue, 'id' | 'title' | 'latitude' | 'longitude' | 'status'> | null>(null)

  // Switch Map Layer
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

  // Initialize and Render Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [28.6139, 77.209],
        zoom: 13,
        zoomControl: true,
      })

      const layerConfig = MAP_LAYERS[activeLayer]
      const tileLayer = L.tileLayer(layerConfig.url, {
        maxZoom: layerConfig.maxZoom,
        attribution: layerConfig.attribution,
        subdomains: layerConfig.subdomains || ['a', 'b', 'c'],
      }).addTo(map)

      tileLayerRef.current = tileLayer
      markersGroupRef.current = L.featureGroup().addTo(map)
      mapRef.current = map
    }

    const map = mapRef.current
    const markersGroup = markersGroupRef.current

    if (markersGroup) {
      markersGroup.clearLayers()
      const markerList: L.Marker[] = []

      issues.forEach((issue) => {
        if (!issue.latitude || !issue.longitude) return
        const marker = L.marker([issue.latitude, issue.longitude], {
          icon: createPinIcon(issue.status),
        })

        const googleNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`
        const popupContent = `
          <div class="map-popup-card">
            <div class="popup-tag ${statusColor(issue.status)}">${displayStatus(issue.status)}</div>
            <strong class="popup-title">#${issue.id} ${issue.title}</strong>
            <p class="popup-coords">${issue.latitude.toFixed(5)}, ${issue.longitude.toFixed(5)}</p>
            <div class="popup-actions">
              <a href="${googleNavUrl}" target="_blank" rel="noopener noreferrer" class="popup-nav-btn">
                🧭 Open in Google Maps
              </a>
            </div>
          </div>
        `

        marker.bindPopup(popupContent)
        marker.on('click', () => setSelectedIssue(issue))
        marker.addTo(markersGroup)
        markerList.push(marker)
      })

      if (markerList.length > 0) {
        map.fitBounds(markersGroup.getBounds().pad(0.15))
      }
    }
  }, [issues])

  // Center on User's Current GPS
  const centerMyGps = () => {
    if (!navigator.geolocation || !mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        mapRef.current?.flyTo([lat, lon], 16, { duration: 1.2 })

        // Add a blue my-location pulse marker
        const myPinIcon = L.divIcon({
          className: 'custom-my-location-marker',
          html: `<div class="my-location-pulse"><div class="my-dot"></div><div class="my-wave"></div></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        })
        if (mapRef.current) {
          L.marker([lat, lon], { icon: myPinIcon })
            .bindPopup('<b>Your Current Location</b>')
            .addTo(mapRef.current)
            .openPopup()
        }
      },
      () => {},
      { enableHighAccuracy: true }
    )
  }

  return (
    <div className="issue-interactive-map-panel">
      {/* Top Map Toolbar */}
      <div className="issue-map-toolbar">
        <div className="issue-map-title">
          <MapPin size={16} className="text-sky" />
          <span>
            <b>{t('live_gis_map', 'Live GIS Map')}</b> · {issues.length} {t('active_signals', 'active signals')}
          </span>
        </div>

        <div className="issue-map-controls">
          <div className="layer-options">
            <button
              type="button"
              className={`layer-btn ${activeLayer === 'google_hybrid' ? 'active' : ''}`}
              onClick={() => setLayer('google_hybrid')}
            >
              <Globe size={12} /> {t('satellite_label', 'Google Satellite')}
            </button>
            <button
              type="button"
              className={`layer-btn ${activeLayer === 'google_roadmap' ? 'active' : ''}`}
              onClick={() => setLayer('google_roadmap')}
            >
              <Layers size={12} /> {t('road_label', 'Google Maps')}
            </button>
            <button
              type="button"
              className={`layer-btn ${activeLayer === 'osm' ? 'active' : ''}`}
              onClick={() => setLayer('osm')}
            >
              OSM
            </button>
          </div>

          <button
            type="button"
            className="gps-quick-center-btn"
            onClick={centerMyGps}
            title={t('my_location_btn', 'My Location')}
          >
            <Crosshair size={14} /> {t('my_location_btn', 'My Location')}
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="issue-map-body">
        <div ref={mapContainerRef} className="leaflet-full-element" />
      </div>

      {/* Footer / Selected Issue Bar */}
      {selectedIssue && (
        <div className="issue-map-footer-card">
          <div className="footer-issue-copy">
            <span className={`table-status ${statusColor(selectedIssue.status)}`}>
              {displayStatus(selectedIssue.status, t)}
            </span>
            <strong>#{selectedIssue.id} {selectedIssue.title}</strong>
            <span className="muted">
              ({selectedIssue.latitude.toFixed(5)}, {selectedIssue.longitude.toFixed(5)})
            </span>
          </div>

          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedIssue.latitude},${selectedIssue.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-google-nav-btn"
          >
            <ExternalLink size={13} /> {t('navigate_gmaps_btn', 'Navigate in Google Maps')}
          </a>
        </div>
      )}
    </div>
  )
}
