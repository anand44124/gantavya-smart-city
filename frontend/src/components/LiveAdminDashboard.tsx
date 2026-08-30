import { useCallback, useEffect, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LoaderCircle,
  Map,
  MapPin,
  Radar,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  API_URL,
  authHeaders,
  displayStatus,
  fetchIssues,
  fetchWorkers,
  statusColor,
  type Issue,
  type Worker,
} from './reportApi'
import IssueMap from './IssueMap'
import LocalityAnalytics from './LocalityAnalytics'
import { UserAvatar } from './UserAvatar'

type Summary = { total_issues: number; open: number; high_priority: number; resolved: number }
type Analytics = {
  total: number
  open: number
  resolved: number
  high_priority: number
  sla_breaches: number
  recurring: number
  by_category: Record<string, number>
  by_department: Record<string, number>
  by_status: Record<string, number>
}
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export default function LiveAdminDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const activeTab = location.pathname.includes('/locality') || location.pathname.includes('/region')
    ? 'locality'
    : location.pathname.includes('/issues')
    ? 'issues'
    : location.pathname.includes('/map')
    ? 'map'
    : location.pathname.includes('/workers')
    ? 'workers'
    : location.pathname.includes('/sla')
    ? 'sla'
    : 'overview'

  const fetchDashboard = () =>
    Promise.all([
      fetch(`${API_URL}/api/admin/summary`, { headers: authHeaders() }),
      fetch(`${API_URL}/api/admin/analytics`, { headers: authHeaders() }),
    ]).then(async ([summaryResponse, analyticsResponse]) => {
      const summaryData = await summaryResponse.json()
      const analyticsData = await analyticsResponse.json()
      if (!summaryResponse.ok) throw new Error(summaryData.detail || 'Admin data could not be loaded')
      if (!analyticsResponse.ok) throw new Error(analyticsData.detail || 'Analytics could not be loaded')
      return { summary: summaryData as Summary, analytics: analyticsData as Analytics }
    })

  const load = () => {
    setLoading(true)
    setError('')
    void fetchDashboard()
      .then(({ summary: s, analytics: a }) => {
        setSummary(s)
        setAnalytics(a)
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Admin data could not be loaded'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    void fetchDashboard()
      .then(({ summary: s, analytics: a }) => {
        if (active) {
          setSummary(s)
          setAnalytics(a)
        }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Admin data could not be loaded')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="page admin-page-deck">
      {/* EXECUTIVE COMMAND HEADER */}
      <div className="admin-executive-hero-card">
        <div className="hero-top-row">
          <div>
            <div className="hero-top-kicker">
              <span className="live-dot-pulse" />
              <span>MUNICIPAL COMMAND DECK · GWALIOR CENTRAL</span>
            </div>
            <h1 className="admin-deck-title">Municipal Executive Operations</h1>
            <p className="admin-deck-subtitle">
              Real-time dispatch coordination, AI verification audits, and GIS regional intelligence.
            </p>
          </div>

          <div className="admin-quick-meta-pill">
            <div className="meta-sub-col">
              <span className="meta-lbl">ACTIVE RADAR</span>
              <strong>Gwalior Urban</strong>
            </div>
            <div className="meta-sub-divider" />
            <div className="meta-sub-col">
              <span className="meta-lbl">SYSTEM STATUS</span>
              <strong className="text-emerald">● 100% Operational</strong>
            </div>
          </div>
        </div>

        {/* UNIFIED ADMIN NAVIGATION TABS */}
        <div className="admin-deck-tabs-bar">
          <button
            type="button"
            className={`deck-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => navigate('/admin')}
          >
            <LayoutDashboard size={16} /> Operations Overview
          </button>
          <button
            type="button"
            className={`deck-tab-btn ${activeTab === 'locality' ? 'active' : ''}`}
            onClick={() => navigate('/admin/locality')}
          >
            <Radar size={16} /> Locality GIS Radar
          </button>
          <button
            type="button"
            className={`deck-tab-btn ${activeTab === 'issues' ? 'active' : ''}`}
            onClick={() => navigate('/admin/issues')}
          >
            <FileText size={16} /> Issue Review & Dispatch
          </button>
          <button
            type="button"
            className={`deck-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
            onClick={() => navigate('/admin/map')}
          >
            <Map size={16} /> Fullscreen GIS Map
          </button>
          <button
            type="button"
            className={`deck-tab-btn ${activeTab === 'workers' ? 'active' : ''}`}
            onClick={() => navigate('/admin/workers')}
          >
            <Users size={16} /> Field Staff Roster
          </button>
          <button
            type="button"
            className={`deck-tab-btn ${activeTab === 'sla' ? 'active' : ''}`}
            onClick={() => navigate('/admin/sla')}
          >
            <Clock size={16} /> SLA Simulator
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'locality' && <LocalityAnalytics />}
      {activeTab === 'issues' && <IssueReview />}
      {activeTab === 'map' && <AdminMap />}
      {activeTab === 'workers' && <WorkerRoster />}
      {activeTab === 'sla' && <SlaSection />}

      {activeTab === 'overview' && (
        <div className="admin-overview-content">
          {loading && (
            <div className="empty-state glass-card-elevated" style={{ padding: 40 }}>
              <LoaderCircle className="spin text-teal" size={32} />
              <p style={{ marginTop: 12, fontWeight: 700 }}>Synchronizing live municipal telemetry...</p>
            </div>
          )}

          {error && (
            <div className="form-error">
              {error}
              <button className="outline-button" onClick={load} style={{ marginTop: 8 }}>
                Retry
              </button>
            </div>
          )}

          {!loading && !error && summary && analytics && (
            <>
              {/* METRIC HIGHLIGHTS */}
              <div className="admin-metric-grid">
                <div className="admin-metric-card">
                  <div className="metric-icon-box blue">
                    <FileText size={22} />
                  </div>
                  <div>
                    <span className="metric-lbl">TOTAL CIVIC ISSUES</span>
                    <strong className="metric-num">{summary.total_issues}</strong>
                    <span className="metric-foot">Clustered & Persisted</span>
                  </div>
                </div>

                <div className="admin-metric-card">
                  <div className="metric-icon-box amber">
                    <Radio size={22} />
                  </div>
                  <div>
                    <span className="metric-lbl">OPEN IN QUEUE</span>
                    <strong className="metric-num">{summary.open}</strong>
                    <span className="metric-foot">Pending Resolution</span>
                  </div>
                </div>

                <div className="admin-metric-card">
                  <div className="metric-icon-box coral">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <span className="metric-lbl">HIGH PRIORITY / HAZARDS</span>
                    <strong className="metric-num">{summary.high_priority}</strong>
                    <span className="metric-foot">Urgent Attention Required</span>
                  </div>
                </div>

                <div className="admin-metric-card">
                  <div className="metric-icon-box emerald">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <span className="metric-lbl">RESOLVED & VERIFIED</span>
                    <strong className="metric-num">{summary.resolved}</strong>
                    <span className="metric-foot">AI & Citizen Confirmed</span>
                  </div>
                </div>
              </div>

              {/* ANALYTICS PANELS GRID */}
              <div className="admin-analytics-grid">
                <AnalyticsPanel title="Issues by Category" values={analytics.by_category} />
                <AnalyticsPanel title="Issues by Department" values={analytics.by_department} />
                <AnalyticsPanel title="Status Breakdown" values={analytics.by_status} />
              </div>

              {/* QUICK DISPATCH CALLOUT */}
              <div className="admin-quick-dispatch-banner">
                <div className="dispatch-banner-content">
                  <div className="dispatch-icon-orb">
                    <Wrench size={24} />
                  </div>
                  <div>
                    <h3>Direct Field Dispatch</h3>
                    <p>Assign verified complaints to nearby municipal workers and monitor resolution proof.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => navigate('/admin/issues')}
                >
                  Open Dispatch Board &rarr;
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function IssueReview() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [modalReports, setModalReports] = useState<any[]>([])

  useEffect(() => {
    if (selectedIssue) {
      fetch(`${API_URL}/api/issues/${selectedIssue.id}/reports`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setModalReports(Array.isArray(data) ? data : []))
        .catch(() => setModalReports([]))
    } else {
      setModalReports([])
    }
  }, [selectedIssue])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([fetchIssues(), fetchWorkers()])
      .then(([issueValues, workerValues]) => {
        setIssues(issueValues)
        setWorkers(workerValues)
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Issues could not be loaded'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const assign = async (issueId: number, workerId: number) => {
    if (!workerId) return setError('Choose a staff member first')
    setBusy(issueId)
    const response = await fetch(`${API_URL}/api/admin/issues/${issueId}/assign`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ worker_id: workerId }),
    })
    const data = await response.json()
    setBusy(null)
    if (!response.ok) return setError(data.detail || 'Assignment failed')
    setIssues((current) =>
      current.map((issue) => (issue.id === issueId ? { ...issue, ...data, status: 'assigned' } : issue))
    )
    if (selectedIssue?.id === issueId) {
      setSelectedIssue((prev) => (prev ? { ...prev, ...data, status: 'assigned' } : null))
    }
  }

  const resolve = async (issueId: number, status: string) => {
    setBusy(issueId)
    const response = await fetch(`${API_URL}/api/issues/${issueId}/status`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const data = await response.json()
    setBusy(null)
    if (!response.ok) return setError(data.detail || 'Status update failed')
    setIssues((current) =>
      current.map((issue) => (issue.id === issueId ? { ...issue, ...data } : issue))
    )
    if (selectedIssue?.id === issueId) {
      setSelectedIssue((prev) => (prev ? { ...prev, ...data, status } : null))
    }
  }

  const [filterTab, setFilterTab] = useState<'active' | 'resolved' | 'all'>('active')
  const [searchQuery, setSearchQuery] = useState('')

  const isResolved = (status: string) => {
    const s = (status || '').toLowerCase()
    return s === 'resolved' || s === 'completed' || s === 'verified_closed' || s === 'verified' || s === 'closed'
  }

  const activeCount = issues.filter((i) => !isResolved(i.status)).length
  const resolvedCount = issues.filter((i) => isResolved(i.status)).length

  const filteredIssues = issues.filter((issue) => {
    const query = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !query ||
      issue.title.toLowerCase().includes(query) ||
      issue.department.toLowerCase().includes(query) ||
      String(issue.id).includes(query)

    if (!matchesSearch) return false

    if (filterTab === 'active') return !isResolved(issue.status)
    if (filterTab === 'resolved') return isResolved(issue.status)
    return true
  })

  return (
    <div className="admin-sub-section">
      <div className="section-header-row">
        <div>
          <h2>Issue Review & Field Worker Allocation</h2>
          <p className="muted">Inspect citizen photo evidence, assign field staff, and monitor repair progress.</p>
        </div>
        <button type="button" className="outline-button" onClick={load}>
          <RefreshCw size={14} /> Refresh Queue
        </button>
      </div>

      {/* FILTER TABS & SEARCH CONTROLS */}
      <div className="admin-queue-filter-bar">
        <div className="admin-filter-pills-row">
          <button
            type="button"
            className={`admin-filter-pill ${filterTab === 'active' ? 'active' : ''}`}
            onClick={() => setFilterTab('active')}
          >
            ⚡ Active Queue ({activeCount})
          </button>
          <button
            type="button"
            className={`admin-filter-pill ${filterTab === 'resolved' ? 'active resolved-active' : ''}`}
            onClick={() => setFilterTab('resolved')}
          >
            ✅ Resolved & Repaired ({resolvedCount})
          </button>
          <button
            type="button"
            className={`admin-filter-pill ${filterTab === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTab('all')}
          >
            🌐 All Issues ({issues.length})
          </button>
        </div>

        <div className="admin-search-box-wrapper">
          <Search size={15} className="admin-search-icon" />
          <input
            type="text"
            placeholder="Search by ID, title, or department..."
            className="admin-queue-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading && (
        <div className="empty-state glass-card-elevated" style={{ padding: 30 }}>
          <LoaderCircle className="spin text-teal" size={24} /> Loading issue queue...
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {!loading && filteredIssues.length === 0 && (
        <div className="empty-state glass-card-elevated" style={{ padding: 40 }}>
          <FileText size={32} className="text-muted" />
          <strong style={{ fontSize: 18, marginTop: 8 }}>
            {filterTab === 'resolved' ? 'No resolved issues in this view' : 'No active issue records'}
          </strong>
          <p>
            {filterTab === 'resolved'
              ? 'When issues are marked resolved by staff, they will appear in this resolved archive.'
              : 'Validated complaints will appear here after citizen reports pass AI checks.'}
          </p>
        </div>
      )}

      {!loading && filteredIssues.length > 0 && (
        <div className="admin-issues-table-grid">
          {filteredIssues.map((issue) => (
            <div className={`admin-issue-card ${isResolved(issue.status) ? 'issue-card-resolved' : ''}`} key={issue.id}>
              <div className="issue-header-line">
                <span className="issue-chip-id">#{issue.id}</span>
                <span className={`status-pill-badge ${statusColor(issue.status)}`}>
                  <span className={`status-dot-pulse ${statusColor(issue.status)}`} />
                  {displayStatus(issue.status)}
                </span>
                <span className={`priority-badge ${(issue.priority || 'medium').toLowerCase()}`}>
                  {issue.priority} Priority
                </span>
              </div>

              <h3 className="admin-issue-title">{issue.title}</h3>

              {/* Photo Evidence Thumbnail Preview */}
              {issue.evidence_url && (
                <div className="admin-evidence-preview-box" onClick={() => setSelectedIssue(issue)}>
                  <img
                    src={`${API_URL}${issue.evidence_url}`}
                    alt={issue.title}
                    className="admin-thumb-img"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  <div className="admin-thumb-overlay">
                    <span className="thumb-zoom-tag"><Eye size={13} /> View Photo Proof</span>
                  </div>
                </div>
              )}

              {issue.description && (
                <p className="admin-issue-desc-snippet">{issue.description.slice(0, 110)}...</p>
              )}

              <div className="admin-issue-meta">
                <span>📍 {issue.department}</span>
                <span>• {issue.report_count} {issue.report_count === 1 ? 'report' : 'reports'}</span>
                <span>• Staff: <b>{issue.assigned_worker_name || 'Unassigned'}</b></span>
              </div>

              <div className="admin-action-row">
                <select
                  defaultValue={issue.assigned_worker_id || ''}
                  onChange={(e) => (e.currentTarget.dataset.worker = e.currentTarget.value)}
                  className="admin-worker-select"
                >
                  <option value="">Select Field Staff</option>
                  {workers.map((w) => (
                    <option value={w.id} key={w.id}>
                      {w.name} ({w.assigned_issue_count} active)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="primary-button btn-compact"
                  disabled={busy === issue.id}
                  onClick={(e) => {
                    const select = e.currentTarget.parentElement?.querySelector('select')
                    void assign(issue.id, Number(select?.dataset.worker || select?.value))
                  }}
                >
                  Assign
                </button>

                <button
                  type="button"
                  className="outline-button btn-compact"
                  onClick={() => setSelectedIssue(issue)}
                  title="Inspect full photo and location"
                >
                  <Eye size={13} /> Review
                </button>

                <button
                  type="button"
                  className="outline-button btn-compact"
                  disabled={busy === issue.id}
                  onClick={() => resolve(issue.id, 'acknowledged')}
                >
                  Acknowledge
                </button>

                <button
                  type="button"
                  className="success-button btn-compact"
                  disabled={busy === issue.id}
                  onClick={() => resolve(issue.id, 'resolved')}
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL EVIDENCE REVIEW MODAL */}
      {selectedIssue && (() => {
        const photoUrl = selectedIssue.evidence_url || (modalReports.length > 0 ? (modalReports[0].evidence_url || modalReports[0].evidenceUrl) : null)
        const videoUrl = selectedIssue.video_url || (modalReports.length > 0 ? (modalReports[0].video_url || modalReports[0].videoUrl) : null)

        return (
          <div className="evidence-modal-backdrop" onClick={() => setSelectedIssue(null)}>
            <div className="evidence-modal-card glass-card-elevated" onClick={(e) => e.stopPropagation()}>
              <div className="evidence-modal-header">
                <div className="modal-header-titles">
                  <span className="issue-chip-id">#{selectedIssue.id}</span>
                  <span className={`status-pill-badge ${statusColor(selectedIssue.status)}`}>
                    {displayStatus(selectedIssue.status)}
                  </span>
                  <span className={`priority-badge ${(selectedIssue.priority || 'medium').toLowerCase()}`}>
                    {selectedIssue.priority} Priority
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-button modal-close-btn"
                  onClick={() => setSelectedIssue(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <h2 className="evidence-modal-title">{selectedIssue.title}</h2>

              <div className="evidence-modal-body-grid">
                {/* Evidence Media Column */}
                <div className="evidence-media-col">
                  {photoUrl ? (
                    <div className="evidence-full-img-wrapper">
                      <img
                        src={`${API_URL}${photoUrl}`}
                        alt={selectedIssue.title}
                        className="evidence-full-img"
                      />
                      <span className="evidence-live-badge"><Sparkles size={13} /> Verified Citizen Photo</span>
                    </div>
                  ) : (
                    <div className="no-photo-placeholder">
                      <ImageIcon size={36} className="text-muted" />
                      <p>Citizen Photo Attached</p>
                    </div>
                  )}

                  {videoUrl && (
                    <div className="evidence-video-wrapper" style={{ marginTop: 12 }}>
                      <video src={`${API_URL}${videoUrl}`} controls className="evidence-full-video" />
                    </div>
                  )}
                </div>

                {/* Details & Location Column */}
                <div className="evidence-details-col">
                  <div className="evidence-detail-group">
                    <label className="evidence-detail-label">Department & Category</label>
                    <p className="evidence-detail-val"><b>{selectedIssue.department}</b> ({selectedIssue.category} / {selectedIssue.subtype})</p>
                  </div>

                  {selectedIssue.description && (
                    <div className="evidence-detail-group">
                      <label className="evidence-detail-label">Citizen Complaint Description</label>
                      <p className="evidence-detail-val evidence-desc-text">{selectedIssue.description}</p>
                    </div>
                  )}

                  <div className="evidence-detail-group">
                    <label className="evidence-detail-label">GPS Coordinates & Map Navigation</label>
                    <p className="evidence-detail-val">
                      <MapPin size={14} className="text-sky" /> {selectedIssue.latitude.toFixed(5)}, {selectedIssue.longitude.toFixed(5)}
                    </p>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedIssue.latitude},${selectedIssue.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="google-maps-link-btn"
                    >
                      <ExternalLink size={13} /> Open Directions in Google Maps
                    </a>
                  </div>

                  <div className="evidence-modal-actions-box">
                    <label className="evidence-detail-label">Admin Actions & Dispatch</label>
                    <div className="modal-actions-row">
                      <button
                        type="button"
                        className="modal-action-btn ack-btn"
                        disabled={busy === selectedIssue.id}
                        onClick={() => resolve(selectedIssue.id, 'acknowledged')}
                      >
                        <CheckCircle2 size={16} /> Acknowledge Issue
                      </button>
                      <button
                        type="button"
                        className="modal-action-btn resolve-btn"
                        disabled={busy === selectedIssue.id}
                        onClick={() => resolve(selectedIssue.id, 'resolved')}
                      >
                        <CheckCircle2 size={16} /> Mark as Resolved
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function AdminMap() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchIssues()
      .then(setIssues)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Map could not be loaded'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-sub-section">
      <div className="community-map-glass-card">
        <div className="map-glass-header">
          <div className="map-title-left">
            <Layers size={18} className="text-teal" />
            <strong>Fullscreen City GIS Incident Layer</strong>
          </div>
          <span className="live-signal-count">
            <span className="live-dot-green" /> {issues.length} points plotted
          </span>
        </div>
        {loading ? (
          <div className="empty-state" style={{ height: 400 }}>
            <LoaderCircle className="spin" size={24} /> Loading map data...
          </div>
        ) : error ? (
          <div className="form-error">{error}</div>
        ) : (
          <IssueMap issues={issues} />
        )}
      </div>
    </div>
  )
}

function WorkerRoster() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchWorkers()
      .then(setWorkers)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Workers could not be loaded'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="admin-sub-section">
      <div className="section-header-row">
        <div>
          <h2>Municipal Field Staff Roster</h2>
          <p className="muted">Active officers on duty across road, sanitation, and electrical departments.</p>
        </div>
      </div>

      {loading && (
        <div className="empty-state glass-card-elevated" style={{ padding: 30 }}>
          <LoaderCircle className="spin text-teal" size={24} /> Loading field roster...
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {!loading && !error && (
        <div className="admin-worker-grid">
          {workers.map((worker) => (
            <div className="admin-worker-card" key={worker.id}>
              <div className="worker-card-left">
                <UserAvatar name={worker.name} size={50} />
                <div>
                  <div className="worker-id-tag">OFFICER #{worker.id}</div>
                  <h3 className="worker-name">{worker.name}</h3>
                  <span className="worker-dept-badge">Public Works Department</span>
                </div>
              </div>
              <div className="worker-card-right">
                <span className="workload-pill">
                  <b>{worker.assigned_issue_count}</b> active tasks
                </span>
                <span className="worker-live-status">
                  <span className="live-dot-green" /> On Duty
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SlaSection() {
  const [days, setDays] = useState(0)
  const [data, setData] = useState<
    Array<{
      issue_id: number
      sla_days: number
      overdue: boolean
      overdue_days: number
      escalation_label: string
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSla = (simulation: number) =>
    fetch(`${API_URL}/api/admin/sla?days=${simulation}`, { headers: authHeaders() }).then(
      async (response) => {
        const value = await response.json()
        if (!response.ok) throw new Error(value.detail || 'SLA data could not be loaded')
        return value.issues as typeof data
      }
    )

  const load = (simulation: number) => {
    setLoading(true)
    setError('')
    void fetchSla(simulation)
      .then(setData)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'SLA data could not be loaded'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    void fetchSla(days)
      .then((values) => {
        if (active) setData(values)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'SLA data could not be loaded')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [days])

  return (
    <div className="admin-sub-section">
      <div className="admin-glass-panel">
        <div className="panel-header-line">
          <div>
            <h2>SLA Escalation Engine & Time Simulator</h2>
            <p className="muted">Test category-specific deadlines and simulated time offsets safely.</p>
          </div>
          <div className="simulation-pills-row">
            <button type="button" className="outline-button btn-compact" onClick={() => load(days)} style={{ marginRight: 8 }}>
              <RefreshCw size={13} /> Recalculate
            </button>
            <span className="sim-lbl">Offset:</span>
            {[0, 1, 3, 7].map((val) => (
              <button
                key={val}
                type="button"
                className={`sim-btn ${days === val ? 'active' : ''}`}
                onClick={() => setDays(val)}
              >
                +{val} Day{val === 1 ? '' : 's'}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="empty-state" style={{ padding: 30 }}>
            <LoaderCircle className="spin text-teal" size={24} /> Calculating SLA projections...
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        {!loading && !error && (
          <div className="sla-issues-list">
            {data.map((item) => (
              <div className={`sla-row-card ${item.overdue ? 'overdue' : 'ontime'}`} key={item.issue_id}>
                <div className="sla-left">
                  <span className="sla-issue-num">ISSUE #{item.issue_id}</span>
                  <div>
                    <strong>{item.overdue ? '⚠️ SLA Breached' : '✅ Within Normal SLA'}</strong>
                    <p className="sla-sub">
                      {item.sla_days}-day limit ·{' '}
                      {item.overdue ? `${item.overdue_days} days overdue` : 'No escalation trigger'}
                    </p>
                  </div>
                </div>
                <span className={`sla-status-pill ${item.overdue ? 'breached' : 'ontime'}`}>
                  {item.escalation_label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsPanel({ title, values }: { title: string; values: Record<string, number> }) {
  const max = Math.max(...Object.values(values), 1)
  return (
    <div className="admin-glass-panel">
      <div className="panel-header-line">
        <h3>{title}</h3>
        <BarChart3 size={18} className="text-teal" />
      </div>
      {Object.entries(values).length === 0 ? (
        <p className="empty-notice">No telemetry data recorded yet.</p>
      ) : (
        <div className="analytics-bars-wrap">
          {Object.entries(values).map(([k, v]) => (
            <div className="analytics-bar-item" key={k}>
              <div className="bar-labels">
                <span>{label(k)}</span>
                <b>{v}</b>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${Math.max((v / max) * 100, v ? 8 : 0)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
