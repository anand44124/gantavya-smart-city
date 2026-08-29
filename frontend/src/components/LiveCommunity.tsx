import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ChevronRight,
  FileText,
  Layers,
  LoaderCircle,
  MapPin,
  Search,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { displayStatus, fetchIssues, statusColor, type Issue } from './reportApi'
import IssueMap from './IssueMap'
import { useTranslation } from '../i18n/LanguageContext'

export default function LiveCommunity() {
  const { t } = useTranslation()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState(() => sessionStorage.getItem('civicpulse_search') || '')
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    sessionStorage.removeItem('civicpulse_search')
    let active = true
    void fetchIssues()
      .then((values) => {
        if (active) setIssues(values)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Community issues could not be loaded')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const categories = [
    { label: 'All', key: 'All' },
    { label: 'Roads 🛣️', key: 'road_infrastructure' },
    { label: 'Sanitation 🗑️', key: 'sanitation' },
    { label: 'Electrical 💡', key: 'street_electrical' },
    { label: 'Water 💧', key: 'water_drainage' },
  ]

  const visible = useMemo(() => {
    return issues.filter((issue) => {
      const matchesQuery = `${issue.title} ${issue.category} ${issue.status} ${issue.department}`
        .toLowerCase()
        .includes(query.toLowerCase())
      const matchesCategory =
        selectedCategory === 'All' ||
        issue.category === selectedCategory ||
        issue.category?.toLowerCase().includes(selectedCategory.toLowerCase())
      return matchesQuery && matchesCategory
    })
  }, [issues, query, selectedCategory])

  const translatePriority = (priority: string) => {
    const p = (priority || '').toLowerCase()
    if (p === 'high') return t('priority_high', 'High Priority')
    if (p === 'medium') return t('priority_medium', 'Medium Priority')
    if (p === 'low') return t('priority_low', 'Low Priority')
    return priority
  }

  return (
    <div className="page community-page">
      {/* FROSTED COMMUNITY HERO */}
      <div className="community-hero-card">
        <div className="hero-top-kicker">
          <Users size={14} className="text-teal" />
          <span>OPEN CITY RADAR · NEIGHBOURHOOD SIGNALS</span>
        </div>
        <h1 className="community-title">{t('nav_community', 'Community Issues')}</h1>
        <p className="community-subtitle">
          {t('community_desc', 'Live clustered signals reported by citizens in your area. Upvote and verify nearby reports.')}
        </p>

        {/* SEARCH & CATEGORY FILTER POD */}
        <div className="community-filter-pod">
          <div className="community-search-bar">
            <Search size={18} className="search-icon text-teal" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('search_issues_placeholder', 'Search category, department, or issue title...')}
            />
            {query && (
              <button type="button" className="clear-query-btn" onClick={() => setQuery('')}>
                Clear
              </button>
            )}
          </div>

          <div className="category-pill-row" style={{ marginTop: 12 }}>
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`category-pill-btn ${selectedCategory === cat.key ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <LoaderCircle className="spin" size={25} /> {t('loading_issues', 'Loading nearby issues...')}
        </div>
      )}

      {error && <div className="form-error">{error}</div>}

      {/* INTERACTIVE GIS MAP IN FROSTED GLASS FRAME */}
      {!loading && !error && (
        <div className="community-map-glass-card">
          <div className="map-glass-header">
            <div className="map-title-left">
              <Layers size={16} className="text-teal" />
              <strong>Live GIS Heatmap & Signal Radar</strong>
            </div>
            <span className="live-signal-count">
              <span className="live-dot-green" /> {visible.length} signals active
            </span>
          </div>
          <IssueMap issues={visible} />
        </div>
      )}

      {/* COMMUNITY ISSUE CARDS GRID */}
      <div className="section-heading" style={{ marginTop: 32 }}>
        <div>
          <p className="eyebrow">{t('near_you_label', 'NEAR YOU')}</p>
          <h2>{t('active_civic_issues_title', 'Active Civic Issues')}</h2>
        </div>
        <span className="results-count-badge">
          {visible.length} {t('active_issues_label', 'issues shown')}
        </span>
      </div>

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state glass-card-elevated" style={{ padding: 40 }}>
          <FileText size={32} className="text-muted" />
          <strong style={{ fontSize: 18, marginTop: 8 }}>{t('no_community_issues', 'No community issues found')}</strong>
          <p>{t('validated_reports_hint', 'Try adjusting your search terms or filter categories.')}</p>
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="community-cards-grid">
          {visible.map((issue) => (
            <Link to={`/citizen/community/${issue.id}`} className="community-issue-card" key={issue.id}>
              <div className="issue-card-top">
                <div className={`issue-category-icon ${statusColor(issue.status)}`}>
                  <MapPin size={18} />
                </div>
                <div className="issue-id-meta">
                  <span className="issue-id-tag">#{issue.id}</span>
                  <span className="issue-report-count">
                    <Activity size={12} /> {issue.report_count} {issue.report_count === 1 ? 'report' : 'reports'}
                  </span>
                </div>
                <span className={`priority-badge ${(issue.priority || 'medium').toLowerCase()}`}>
                  {translatePriority(issue.priority)}
                </span>
              </div>

              <div className="issue-card-content">
                <h3 className="issue-title">{issue.title}</h3>
                <p className="issue-dept">
                  <span className="dept-dot" /> {issue.department}
                </p>
                <p className="issue-coords">
                  📍 {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
                </p>
              </div>

              <div className="issue-card-bottom">
                <div className={`status-pill-badge ${statusColor(issue.status)}`}>
                  <span className={`status-dot-pulse ${statusColor(issue.status)}`} />
                  <span>{displayStatus(issue.status, t)}</span>
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
