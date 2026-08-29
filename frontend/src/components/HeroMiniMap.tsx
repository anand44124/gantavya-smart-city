import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Globe, Layers, MapPin } from 'lucide-react'
import { API_URL, authHeaders, type Issue } from './reportApi'
import { useTranslation } from '../i18n/LanguageContext'

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export default function HeroMiniMap() {
  const { t } = useTranslation()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [issues, setIssues] = useState<Issue[]>([])
  const [activeLayer, setActiveLayer] = useState<'google_hybrid' | 'google_roadmap'>('google_hybrid')
  const [localityName, setLocalityName] = useState('Your Locality')

  useEffect(() => {
    fetch(`${API_URL}/api/issues`, { headers: authHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setIssues(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current) return

    // Default to local neighborhood coordinates (zoom 16.5)
    let centerLat = 28.6139
    let centerLon = 77.2090
    if (issues.length > 0) {
      centerLat = issues[0].latitude
      centerLon = issues[0].longitude
    }

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLon],
        zoom: 16.5,
        minZoom: 13,
        maxZoom: 19,
        zoomControl: false,
        attributionControl: false,
        dragging: !L.Browser.mobile,
        scrollWheelZoom: false,
      })

      const tileUrl =
        activeLayer === 'google_hybrid'
          ? 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
          : 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'

      L.tileLayer(tileUrl, {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
      }).addTo(map)

      mapRef.current = map

      // Detect User's Real Locality
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const uLat = pos.coords.latitude
            const uLon = pos.coords.longitude
            map.flyTo([uLat, uLon], 16.5, { duration: 1.5 })

            // Add user's blue radar beacon
            const userIcon = L.divIcon({
              className: 'hero-user-location-marker',
              html: `<div class="user-radar-beacon"><span class="beacon-core"></span><span class="beacon-wave"></span></div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })
            L.marker([uLat, uLon], { icon: userIcon }).addTo(map).bindPopup('<b>Your Current Neighborhood</b>')

            // Reverse lookup locality name
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${uLat}&lon=${uLon}&zoom=16`, { headers: { 'User-Agent': 'CivicPulse-App/1.0' } })
              if (res.ok) {
                const data = await res.json()
                const loc = data.address?.suburb || data.address?.neighbourhood || data.address?.residential || data.address?.city_district || data.address?.city || 'Your Neighborhood'
                setLocalityName(loc)
              }
            } catch {}
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        )
      }
    }

    const map = mapRef.current

    // Add local issue markers
    const markers: L.Marker[] = []
    issues.forEach((issue) => {
      if (!issue.latitude || !issue.longitude) return
      const color = issue.status === 'resolved' || issue.status === 'verified_closed' ? '#10b981' : '#ef4444'
      const icon = L.divIcon({
        className: 'hero-map-pin-icon',
        html: `<div class="hero-pulse-dot" style="--pin-color: ${color};"><span class="dot"></span><span class="ring"></span></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      const marker = L.marker([issue.latitude, issue.longitude], { icon })
      marker.bindPopup(`<b>#${issue.id} ${issue.title}</b><br/><small>${issue.department}</small>`)
      marker.addTo(map)
      markers.push(marker)
    })
  }, [issues, activeLayer])

  return (
    <div className="hero-interactive-map-wrapper">
      <div ref={mapContainerRef} className="hero-leaflet-map" />
      <div className="hero-map-radar-sweep" />

      {/* Floating Status Badges Over Real Map */}
      <div className="hero-map-badge top-left">
        <div className="hero-map-badge-icon">
          <MapPin size={15} />
        </div>
        <div>
          <span className="badge-kicker">{t('local_radar_label', 'LOCAL RADAR')}</span>
          <strong className="badge-text">{localityName}</strong>
        </div>
      </div>

      <div className="hero-map-badge bottom-right">
        <div className="hero-pulse-indicator">
          <span className="pulse-dot-green" />
        </div>
        <div>
          <span className="badge-kicker">{t('civic_monitoring_label', 'CIVIC MONITORING')}</span>
          <strong className="badge-text">
            {issues.length > 0
              ? `${issues.length} ${t('active_issues_label', 'active issues')}`
              : t('all_clear_label', 'All clear in area')}
          </strong>
        </div>
      </div>

      {/* Layer Switcher Mini Pill */}
      <div className="hero-map-layer-pill">
        <button
          type="button"
          className={activeLayer === 'google_hybrid' ? 'active' : ''}
          onClick={() => setActiveLayer('google_hybrid')}
        >
          <Globe size={11} /> {t('satellite_label', 'Satellite')}
        </button>
        <button
          type="button"
          className={activeLayer === 'google_roadmap' ? 'active' : ''}
          onClick={() => setActiveLayer('google_roadmap')}
        >
          <Layers size={11} /> {t('road_label', 'Road')}
        </button>
      </div>
    </div>
  )
}
