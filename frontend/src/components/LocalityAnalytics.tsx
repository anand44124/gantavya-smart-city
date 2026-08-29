import { useEffect, useRef, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Compass,
  Crosshair,
  FileText,
  LoaderCircle,
  MapPin,
  PieChart,
  Search,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { API_URL, authHeaders, displayStatus, statusColor } from './reportApi'

type LocalityData = {
  locality_query: string | null
  center_lat: number | null
  center_lng: number | null
  radius_km: number
  total_complaints: number
  total_issues: number
  resolved_count: number
  in_progress_count: number
  pending_count: number
  resolution_rate: number
  by_category: Record<string, number>
  by_department: Record<string, number>
  by_status: Record<string, number>
  by_priority: Record<string, number>
  timeline: Array<{ period: string; complaints: number; resolved: number }>
  issues: Array<{
    id: number
    title: string
    category: string
    subtype: string
    department: string
    status: string
    priority: string
    latitude: number
    longitude: number
    report_count: number
    created_at: string | null
  }>
}

type SearchResult = {
  display_name: string
  lat: number
  lon: number
}

// Comprehensive Indian Localities, Circles, Mandirs, and Chowks Database
const KNOWN_INDIAN_LOCALITIES: Array<{ name: string; city: string; lat: number; lng: number; keywords: string[] }> = [
  // Gwalior
  { name: 'Gole Ka Mandir', city: 'Gwalior', lat: 26.2415, lng: 78.2045, keywords: ['gole ka mandir', 'gole mandir', 'gola ka mandir'] },
  { name: 'City Centre', city: 'Gwalior', lat: 26.2023, lng: 78.1884, keywords: ['city centre', 'city center', 'city centre gwalior'] },
  { name: 'Thatipur', city: 'Gwalior', lat: 26.2153, lng: 78.2023, keywords: ['thatipur', 'tatipur', 'gandhi road thatipur'] },
  { name: 'Maharaj Bada (Lashkar)', city: 'Gwalior', lat: 26.2044, lng: 78.1578, keywords: ['maharaj bada', 'bada', 'lashkar', 'victoria market'] },
  { name: 'Morar', city: 'Gwalior', lat: 26.2256, lng: 78.2289, keywords: ['morar', 'morar cantt', 'morar bazar'] },
  { name: 'Hazira', city: 'Gwalior', lat: 26.2341, lng: 78.1756, keywords: ['hazira', 'hajira', 'hazira chowk'] },
  { name: 'Pinto Park', city: 'Gwalior', lat: 26.2478, lng: 78.2189, keywords: ['pinto park', 'pinto park morar'] },
  { name: 'Deendayal Nagar (DD Nagar)', city: 'Gwalior', lat: 26.2589, lng: 78.2145, keywords: ['deendayal nagar', 'dd nagar', 'deendayal'] },
  { name: 'Padav', city: 'Gwalior', lat: 26.2167, lng: 78.1789, keywords: ['padav', 'padav circle', 'padav bridge'] },
  { name: 'Phool Bagh', city: 'Gwalior', lat: 26.2123, lng: 78.1678, keywords: ['phool bagh', 'phoolbagh', 'motimahal'] },
  { name: 'Jayendraganj', city: 'Gwalior', lat: 26.2089, lng: 78.1612, keywords: ['jayendraganj', 'jayendra ganj', 'roxy pul'] },
  { name: 'Bahodapur', city: 'Gwalior', lat: 26.2289, lng: 78.1478, keywords: ['bahodapur', 'bahodapur circle'] },

  // Delhi NCR
  { name: 'Connaught Place', city: 'New Delhi', lat: 28.6315, lng: 77.2167, keywords: ['connaught place', 'cp', 'rajiv chowk'] },
  { name: 'Laxmi Nagar', city: 'Delhi', lat: 28.6306, lng: 77.2775, keywords: ['laxmi nagar', 'vikas marg'] },
  { name: 'Karol Bagh', city: 'New Delhi', lat: 28.6514, lng: 77.1907, keywords: ['karol bagh', 'gaffar market'] },
  { name: 'Lajpat Nagar', city: 'New Delhi', lat: 28.5677, lng: 77.2433, keywords: ['lajpat nagar', 'central market'] },
  { name: 'Hauz Khas', city: 'New Delhi', lat: 28.5494, lng: 77.2001, keywords: ['hauz khas', 'iit delhi'] },
  { name: 'Sector 62', city: 'Noida', lat: 28.6258, lng: 77.3649, keywords: ['sector 62', 'sector 62 noida', 'noida 62'] },
  { name: 'Sector 18 (Atta Market)', city: 'Noida', lat: 28.5708, lng: 77.3259, keywords: ['sector 18', 'noida 18', 'atta market'] },
  { name: 'Cyber City (DLF Phase 2)', city: 'Gurugram', lat: 28.4952, lng: 77.0895, keywords: ['cyber city', 'gurgaon cyber city', 'dlf cyber city'] },

  // Mumbai
  { name: 'Bandra West', city: 'Mumbai', lat: 19.0596, lng: 72.8295, keywords: ['bandra', 'bandra west', 'linking road'] },
  { name: 'Andheri East', city: 'Mumbai', lat: 19.1136, lng: 72.8697, keywords: ['andheri', 'andheri east', 'chakala'] },
  { name: 'Marine Drive / Nariman Point', city: 'Mumbai', lat: 18.9438, lng: 72.8234, keywords: ['marine drive', 'nariman point', 'churchgate'] },
  { name: 'Dadar T.T. Circle', city: 'Mumbai', lat: 19.0178, lng: 72.8478, keywords: ['dadar', 'dadar tt', 'shivaji park'] },

  // Bengaluru
  { name: 'Indiranagar', city: 'Bengaluru', lat: 12.9784, lng: 77.6408, keywords: ['indiranagar', '100 feet road indiranagar'] },
  { name: 'Koramangala', city: 'Bengaluru', lat: 12.9357, lng: 77.6241, keywords: ['koramangala', 'koramangala 5th block'] },
  { name: 'HSR Layout', city: 'Bengaluru', lat: 12.9121, lng: 77.6446, keywords: ['hsr layout', 'hsr'] },
  { name: 'Whitefield', city: 'Bengaluru', lat: 12.9698, lng: 77.7499, keywords: ['whitefield', 'itpl'] },

  // Bhopal & Indore
  { name: 'MP Nagar (Zone 1 & 2)', city: 'Bhopal', lat: 23.2332, lng: 77.4343, keywords: ['mp nagar', 'maharana pratap nagar', 'db mall'] },
  { name: 'Arera Colony', city: 'Bhopal', lat: 23.2156, lng: 77.4289, keywords: ['arera colony', 'arera'] },
  { name: 'Vijay Nagar', city: 'Indore', lat: 22.7533, lng: 75.8937, keywords: ['vijay nagar', 'vijay nagar indore'] },
  { name: 'Rajwada & Sarafa', city: 'Indore', lat: 22.7186, lng: 75.8556, keywords: ['rajwada', 'sarafa', 'chappan dukan'] },
]

export default function LocalityAnalytics() {
  const [data, setData] = useState<LocalityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Search & Filters
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchingAddress, setSearchingAddress] = useState(false)
  const [selectedLocalityName, setSelectedLocalityName] = useState('Gole Ka Mandir, Gwalior')
  const [lat, setLat] = useState<number>(26.2415)
  const [lng, setLng] = useState<number>(78.2045)
  const [radiusKm, setRadiusKm] = useState<number>(5)

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const centerMarkerRef = useRef<L.Marker | null>(null)

  const fetchLocalityStats = async (targetLat?: number, targetLng?: number, targetRadius?: number, textQuery?: string) => {
    setLoading(true)
    setError('')
    try {
      let url = `${API_URL}/api/admin/locality-analytics?radius_km=${targetRadius ?? radiusKm}`
      if (targetLat !== undefined && targetLng !== undefined) {
        url += `&lat=${targetLat}&lng=${targetLng}`
      } else if (textQuery) {
        url += `&query=${encodeURIComponent(textQuery)}`
      } else {
        url += `&lat=${lat}&lng=${lng}`
      }

      const res = await fetch(url, { headers: authHeaders() })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Could not fetch locality analytics')
      }
      const json: LocalityData = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load locality data')
    } finally {
      setLoading(false)
    }
  }

  // Address search via Local Knowledge + Nominatim + Photon
  const handleAddressSearch = async (text: string) => {
    setQuery(text)
    const clean = text.trim().toLowerCase()
    if (clean.length < 2) {
      setSearchResults([])
      return
    }

    // 1. Check known local landmarks dataset first for instant 0ms match
    const localMatches: SearchResult[] = KNOWN_INDIAN_LOCALITIES.filter((item) =>
      item.keywords.some((k) => k.includes(clean) || clean.includes(k)) ||
      item.name.toLowerCase().includes(clean) ||
      item.city.toLowerCase().includes(clean)
    ).map((m) => ({
      display_name: `${m.name}, ${m.city}`,
      lat: m.lat,
      lon: m.lng,
    }))

    if (localMatches.length > 0) {
      setSearchResults(localMatches.slice(0, 6))
    }

    setSearchingAddress(true)
    try {
      // 2. Query Nominatim with India context
      const queries = [clean, `${clean}, India`, `${clean}, Gwalior`, `${clean}, Madhya Pradesh`]
      let onlineResults: SearchResult[] = []

      for (const q of queries) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=4&addressdetails=1`,
            { headers: { 'User-Agent': 'CivicPulse-Admin-Region/1.0' } }
          )
          if (res.ok) {
            const items = await res.json()
            if (Array.isArray(items) && items.length > 0) {
              onlineResults = items.map((it: { display_name: string; lat: string; lon: string }) => ({
                display_name: it.display_name,
                lat: parseFloat(it.lat),
                lon: parseFloat(it.lon),
              }))
              break
            }
          }
        } catch {
          // continue to next query
        }
      }

      // Combine local matches + online results
      const combined = [...localMatches]
      for (const onl of onlineResults) {
        if (!combined.some((c) => Math.abs(c.lat - onl.lat) < 0.005 && Math.abs(c.lon - onl.lon) < 0.005)) {
          combined.push(onl)
        }
      }

      setSearchResults(combined.slice(0, 8))
    } catch (err) {
      console.warn('Geocoding search failed:', err)
    } finally {
      setSearchingAddress(false)
    }
  }

  const selectLocation = (name: string, targetLat: number, targetLng: number) => {
    setSelectedLocalityName(name)
    setLat(targetLat)
    setLng(targetLng)
    setSearchResults([])
    setQuery('')
    void fetchLocalityStats(targetLat, targetLng, radiusKm)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchResults.length > 0) {
      const top = searchResults[0]
      selectLocation(top.display_name.split(',')[0], top.lat, top.lon)
    } else if (query.trim().length > 0) {
      void fetchLocalityStats(undefined, undefined, radiusKm, query.trim())
    }
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const cLat = pos.coords.latitude
        const cLng = pos.coords.longitude
        setLat(cLat)
        setLng(cLng)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${cLat}&lon=${cLng}`,
            { headers: { 'User-Agent': 'CivicPulse-App/1.0' } }
          )
          if (res.ok) {
            const geocode = await res.json()
            const name = geocode.display_name?.split(',').slice(0, 3).join(',') || 'Your Current Location'
            setSelectedLocalityName(name)
          }
        } catch {
          setSelectedLocalityName('Your Current Location')
        }
        void fetchLocalityStats(cLat, cLng, radiusKm)
      },
      (err) => alert(`Unable to retrieve GPS location: ${err.message}`)
    )
  }

  // Initial load
  useEffect(() => {
    void fetchLocalityStats(26.2415, 78.2045, 5)
  }, [])

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
      })

      L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '© Google Maps',
      }).addTo(map)

      markersRef.current = L.layerGroup().addTo(map)

      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedLat = e.latlng.lat
        const clickedLng = e.latlng.lng
        setLat(clickedLat)
        setLng(clickedLng)
        setSelectedLocalityName(`GPS: ${clickedLat.toFixed(4)}°N, ${clickedLng.toFixed(4)}°E`)
        void fetchLocalityStats(clickedLat, clickedLng, radiusKm)
      })

      mapRef.current = map
    }

    const map = mapRef.current

    // Update center and radius circle
    map.setView([lat, lng], radiusKm <= 2 ? 14 : radiusKm <= 5 ? 13 : radiusKm <= 15 ? 12 : 10)

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLatLng([lat, lng])
    } else {
      const centerIcon = L.divIcon({
        className: 'center-radar-pin',
        html: `<div style="background: #2563eb; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px #2563eb;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      centerMarkerRef.current = L.marker([lat, lng], { icon: centerIcon }).addTo(map)
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng])
      circleRef.current.setRadius(radiusKm * 1000)
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map)
    }

    // Render issue pins
    if (markersRef.current && data) {
      markersRef.current.clearLayers()
      data.issues.forEach((issue) => {
        const isResolved = issue.status === 'resolved' || issue.status === 'completed' || issue.status === 'verified_closed'
        const isInProgress = issue.status === 'in_progress' || issue.status === 'assigned'
        const color = isResolved ? '#10b981' : isInProgress ? '#f59e0b' : '#ef4444'

        const pinIcon = L.divIcon({
          className: 'locality-issue-marker',
          html: `<div style="background: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })

        const marker = L.marker([issue.latitude, issue.longitude], { icon: pinIcon })
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 13px; max-width: 220px;">
            <b style="color: #111;">#${issue.id} ${issue.title}</b>
            <div style="margin: 4px 0; color: #555;">${issue.department}</div>
            <div style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: ${color}22; color: ${color};">
              ${displayStatus(issue.status)}
            </div>
          </div>
        `)
        markersRef.current?.addLayer(marker)
      })
    }
  }, [lat, lng, radiusKm, data])

  return (
    <div className="page dashboard-page locality-analytics-page">
      {/* Header */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">CIVICPULSE / ADMIN INTELLIGENCE</p>
          <h1>Regional & Locality Analytics</h1>
          <p className="muted">
            Inspect live complaint volumes, resolution rates, and departmental breakdown for any specific locality, ward, circle, or geographic radius.
          </p>
        </div>
      </div>

      {/* Locality Search & Radius Bar */}
      <section className="dashboard-panel locality-search-panel">
        <form onSubmit={handleSearchSubmit} className="locality-search-grid">
          <div className="search-box-wrapper" style={{ position: 'relative', flex: 1 }}>
            <div className="input-with-icon">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search any locality, circle, or landmark (e.g. Gole Ka Mandir, City Centre, Thatipur, Connaught Place)..."
                value={query}
                onChange={(e) => handleAddressSearch(e.target.value)}
                className="locality-input"
              />
              {searchingAddress && <LoaderCircle size={18} className="spin input-spinner" />}
            </div>

            {searchResults.length > 0 && (
              <div className="locality-autocomplete-dropdown">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    className="autocomplete-item"
                    onClick={() => selectLocation(res.display_name, res.lat, res.lon)}
                  >
                    <MapPin size={15} />
                    <span>{res.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="primary-button" style={{ height: 44, padding: '0 20px' }}>
            <Search size={16} /> Search Place
          </button>

          <button type="button" className="outline-button" onClick={useCurrentLocation} title="Use My Current GPS Position" style={{ height: 44 }}>
            <Crosshair size={16} /> GPS Location
          </button>

          {/* Radius Selector */}
          <div className="radius-selector" style={{ height: 44 }}>
            <span className="radius-label">Radius:</span>
            {[1, 3, 5, 10, 25].map((r) => (
              <button
                key={r}
                type="button"
                className={`radius-pill ${radiusKm === r ? 'active' : ''}`}
                onClick={() => {
                  setRadiusKm(r)
                  void fetchLocalityStats(lat, lng, r)
                }}
              >
                {r} km
              </button>
            ))}
          </div>
        </form>

        {/* Preset Quick Locality Pills */}
        <div className="preset-localities-row">
          <span className="preset-label">Quick Locations:</span>
          {KNOWN_INDIAN_LOCALITIES.slice(0, 10).map((loc) => (
            <button
              key={loc.name}
              type="button"
              className={`preset-pill ${selectedLocalityName.includes(loc.name) ? 'active' : ''}`}
              onClick={() => selectLocation(`${loc.name}, ${loc.city}`, loc.lat, loc.lng)}
            >
              {loc.name} ({loc.city})
            </button>
          ))}
        </div>
      </section>

      {/* Selected Locality Hero Banner */}
      <div className="locality-hero-banner">
        <div className="locality-hero-info">
          <div className="locality-badge">
            <Compass size={16} /> Selected Locality {loading && <LoaderCircle size={14} className="spin" style={{ marginLeft: 6 }} />}
          </div>
          <h2>{selectedLocalityName}</h2>
          <p className="muted">
            Analyzing within <strong>{radiusKm} km radius</strong> (Center Coordinates: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E)
          </p>
        </div>
        <div className="locality-hero-rate">
          <div className="resolution-gauge">
            <div className="gauge-value">{data?.resolution_rate || 0}%</div>
            <div className="gauge-label">Resolution Rate</div>
          </div>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      {/* Metrics Row */}
      {data && (
        <div className="metric-grid locality-metric-grid">
          <div className="metric-card">
            <div className="metric-icon blue">
              <FileText size={20} />
            </div>
            <p>Total Complaints Filed</p>
            <strong>{data.total_complaints}</strong>
            <span>Citizen reports in this region</span>
          </div>

          <div className="metric-card">
            <div className="metric-icon mint">
              <CheckCircle2 size={20} />
            </div>
            <p>Resolved & Fixed</p>
            <strong>{data.resolved_count}</strong>
            <span>{data.resolution_rate}% success rate</span>
          </div>

          <div className="metric-card">
            <div className="metric-icon amber">
              <Clock size={20} />
            </div>
            <p>In Progress / Assigned</p>
            <strong>{data.in_progress_count}</strong>
            <span>Field workers assigned</span>
          </div>

          <div className="metric-card">
            <div className="metric-icon coral">
              <ShieldAlert size={20} />
            </div>
            <p>Pending / Reported</p>
            <strong>{data.pending_count}</strong>
            <span>Awaiting field dispatch</span>
          </div>
        </div>
      )}

      {/* Main Visuals Grid: Interactive Map + Graphs */}
      <div className="locality-visuals-grid">
        {/* Left: Real Leaflet Map */}
        <section className="dashboard-panel map-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">GEOGRAPHIC HEAT RADIUS</p>
              <h2>Real-World Map (Click anywhere to inspect)</h2>
            </div>
            <div className="map-legend">
              <span className="legend-dot mint" /> Resolved
              <span className="legend-dot amber" /> In Progress
              <span className="legend-dot coral" /> Reported
            </div>
          </div>
          <div className="locality-map-wrapper">
            <div ref={mapContainerRef} className="leaflet-locality-map" />
          </div>
        </section>

        {/* Right: Resolution Breakdown Bar Chart & Category Breakdown */}
        <div className="locality-charts-column">
          {/* Complaints vs Resolved Bar Comparison */}
          <section className="dashboard-panel chart-card">
            <div className="panel-heading">
              <h2>
                <BarChart3 size={18} /> Resolution Status Graph
              </h2>
            </div>
            {data && (
              <div className="resolution-bar-chart">
                <div className="chart-bar-group">
                  <div className="bar-label-row">
                    <span>Resolved & Closed</span>
                    <strong>
                      {data.resolved_count} ({data.total_issues ? Math.round((data.resolved_count / data.total_issues) * 100) : 0}%)
                    </strong>
                  </div>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill mint"
                      style={{ width: `${data.total_issues ? (data.resolved_count / data.total_issues) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="chart-bar-group">
                  <div className="bar-label-row">
                    <span>In Progress / Field Assigned</span>
                    <strong>
                      {data.in_progress_count} ({data.total_issues ? Math.round((data.in_progress_count / data.total_issues) * 100) : 0}%)
                    </strong>
                  </div>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill amber"
                      style={{ width: `${data.total_issues ? (data.in_progress_count / data.total_issues) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div className="chart-bar-group">
                  <div className="bar-label-row">
                    <span>Pending Action</span>
                    <strong>
                      {data.pending_count} ({data.total_issues ? Math.round((data.pending_count / data.total_issues) * 100) : 0}%)
                    </strong>
                  </div>
                  <div className="chart-bar-track">
                    <div
                      className="chart-bar-fill coral"
                      style={{ width: `${data.total_issues ? (data.pending_count / data.total_issues) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Department Breakdown */}
          <section className="dashboard-panel chart-card">
            <div className="panel-heading">
              <h2>
                <PieChart size={18} /> Issues by Category
              </h2>
            </div>
            {data && Object.keys(data.by_category).length > 0 ? (
              <div className="category-distribution-list">
                {Object.entries(data.by_category).map(([cat, count]) => {
                  const maxCount = Math.max(...Object.values(data.by_category), 1)
                  const percent = Math.round((count / data.total_issues) * 100)
                  return (
                    <div className="category-dist-row" key={cat}>
                      <div className="cat-header">
                        <span className="cat-title">{cat.replace('_', ' ').toUpperCase()}</span>
                        <span className="cat-count">
                          {count} ({percent}%)
                        </span>
                      </div>
                      <div className="cat-bar-track">
                        <div className="cat-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">No category records in this locality radius.</div>
            )}
          </section>
        </div>
      </div>

      {/* Timeline Trend Graph */}
      {data && data.timeline && (
        <section className="dashboard-panel timeline-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">HISTORICAL PROGRESSION</p>
              <h2>
                <TrendingUp size={18} /> Complaints Received vs Resolved Timeline
              </h2>
            </div>
          </div>
          <div className="timeline-trend-chart">
            {data.timeline.map((point, idx) => {
              const maxVal = Math.max(...data.timeline.map((p) => Math.max(p.complaints, p.resolved)), 4)
              const compHeight = (point.complaints / maxVal) * 120
              const resHeight = (point.resolved / maxVal) * 120

              return (
                <div className="timeline-column" key={idx}>
                  <div className="bars-pair">
                    <div className="trend-bar complaints-bar" style={{ height: `${Math.max(compHeight, 6)}px` }} title={`Filed: ${point.complaints}`}>
                      <span>{point.complaints}</span>
                    </div>
                    <div className="trend-bar resolved-bar" style={{ height: `${Math.max(resHeight, 6)}px` }} title={`Resolved: ${point.resolved}`}>
                      <span>{point.resolved}</span>
                    </div>
                  </div>
                  <div className="timeline-period-label">{point.period}</div>
                </div>
              )
            })}
          </div>
          <div className="timeline-legend">
            <span className="legend-item">
              <i className="legend-box blue" /> Complaints Filed
            </span>
            <span className="legend-item">
              <i className="legend-box green" /> Issues Resolved
            </span>
          </div>
        </section>
      )}

      {/* Locality Detailed Issues Table */}
      <section className="dashboard-panel table-panel">
        <div className="panel-heading">
          <h2>Detailed Issues in this Locality ({data?.issues.length || 0})</h2>
        </div>
        {data && data.issues.length > 0 ? (
          <div className="locality-table-wrapper">
            <table className="locality-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Reports</th>
                </tr>
              </thead>
              <tbody>
                {data.issues.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <span className="issue-id-tag">#{issue.id}</span>
                    </td>
                    <td>
                      <strong>{issue.title}</strong>
                    </td>
                    <td>{issue.department}</td>
                    <td>
                      <span className="category-badge">{issue.category.replace('_', ' ')}</span>
                    </td>
                    <td>
                      <span className={`priority-tag ${issue.priority}`}>{issue.priority}</span>
                    </td>
                    <td>
                      <span className={`table-status ${statusColor(issue.status)}`}>{displayStatus(issue.status)}</span>
                    </td>
                    <td>{issue.report_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No complaints found within this radius. Try increasing the search radius or choosing another area.</div>
        )}
      </section>
    </div>
  )
}
