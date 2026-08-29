import { useEffect, useMemo, useState } from 'react'
import {
  Camera,
  ChevronRight,
  Clock3,
  FileText,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { displayStatus, fetchReports } from './reportApi'
import type { Report } from './reportApi'
import { useTranslation } from '../i18n/LanguageContext'

export default function LiveReportList() {
  const { t } = useTranslation()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all')

  const load = () => {
    setLoading(true)
    setError('')
    fetchReports()
      .then(setReports)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Reports could not be loaded'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let active = true
    void fetchReports()
      .then((values) => {
        if (active) setReports(values)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Reports could not be loaded')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const timer = window.setInterval(() => {
      if (active) {
        void fetchReports()
          .then((values) => setReports(values))
          .catch(() => {})
      }
    }, 4000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchQ = `${r.title} ${r.reference} ${r.location}`.toLowerCase().includes(query.toLowerCase())
      const isResolved = r.status === 'resolved' || r.status === 'verified_closed' || r.status === 'completed'
      const matchStatus =
        statusFilter === 'all' || (statusFilter === 'resolved' && isResolved) || (statusFilter === 'active' && !isResolved)
      return matchQ && matchStatus
    })
  }, [reports, query, statusFilter])

  return (
    <div className="page report-list-page">
      {/* FROSTED HEADER HERO */}
      <div className="report-list-hero-card">
        <div className="hero-top-row">
          <div>
            <div className="hero-top-kicker">
              <span className="live-dot-pulse" />
              <span>{t('portal_citizen', 'CITIZEN REPORT TRACKER')}</span>
            </div>
            <h1 className="report-list-title">{t('nav_reports', 'My Reports')}</h1>
            <p className="report-list-subtitle">
              {t('reports_desc', 'Track the live lifecycle of every civic issue you have submitted to municipal authorities.')}
            </p>
          </div>

          <Link className="primary-button hero-report-action-btn" to="/citizen/report">
            <Camera size={17} /> {t('nav_report_btn', 'Report Issue')}
          </Link>
        </div>

        {/* SEARCH & STATUS TABS */}
        <div className="report-list-controls">
          <div className="report-search-box">
            <Search size={17} className="search-icon text-teal" />
            <input
              type="text"
              placeholder="Search by reference (e.g. CP-7E5FEC), title, or location..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="status-filter-pills">
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({reports.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active ({reports.filter((r) => r.status !== 'resolved' && r.status !== 'verified_closed' && r.status !== 'completed').length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === 'resolved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('resolved')}
            >
              Resolved ({reports.filter((r) => r.status === 'resolved' || r.status === 'verified_closed' || r.status === 'completed').length})
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <LoaderCircle className="spin" size={25} /> {t('loading_reports', 'Loading your reports...')}
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

      {!loading && !error && filteredReports.length === 0 && (
        <div className="empty-state glass-card-elevated" style={{ padding: 44 }}>
          <FileText size={36} className="text-muted" />
          <strong style={{ fontSize: 18, marginTop: 10 }}>{t('no_reports_yet', 'No reports found')}</strong>
          <p>{query ? 'Try changing your search keywords or filter tab.' : t('submitted_reports_hint', 'Your submitted reports will appear here.')}</p>
          <Link className="primary-button" to="/citizen/report" style={{ marginTop: 14 }}>
            <Plus size={17} /> {t('nav_report_btn', 'Create your first report')}
          </Link>
        </div>
      )}

      {/* FROSTED REPORT CARDS GRID */}
      {!loading && !error && filteredReports.length > 0 && (
        <div className="citizen-report-grid" style={{ marginTop: 24 }}>
          {filteredReports.map((report) => (
            <Link to={`/citizen/issue/${report.id}`} className="citizen-report-card" key={report.id}>
              <div className="card-top-row">
                <div className={`report-icon-box ${report.color}`}>
                  <FileText size={18} />
                </div>
                <span className="report-ref-badge">{report.reference}</span>
                <span className="report-time-tag">
                  <Clock3 size={12} /> {report.age}
                </span>
              </div>

              <div className="report-card-body">
                <h3 className="report-card-title">{report.title}</h3>
                <p className="report-card-loc">
                  <MapPin size={13} /> {report.location}
                </p>
              </div>

              <div className="report-card-footer">
                <div className={`report-status-badge ${report.color}`}>
                  <span className={`status-dot-pulse ${report.color}`} />
                  <span>{displayStatus(report.status, t)}</span>
                </div>
                <div className="card-arrow-circle">
                  <ChevronRight size={15} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
