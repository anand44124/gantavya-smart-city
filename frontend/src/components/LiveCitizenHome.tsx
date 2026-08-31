import { useEffect, useState } from 'react'
import {
  Activity,
  Award,
  Camera,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  FileText,
  Gift,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Train,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { API_URL, authHeaders, displayStatus, fetchReports, type Report } from './reportApi'
import { useTranslation } from '../i18n/LanguageContext'
import { translateBadge } from '../i18n/translations'
import HeroMiniMap from './HeroMiniMap'

export default function LiveCitizenHome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [reports, setReports] = useState<Report[]>([])
  const [rewards, setRewards] = useState<{ points: number; badge_level: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('All Issues')

  const activeReports = reports.filter((r) => r.status !== 'resolved' && r.status !== 'verified_closed').length
  const resolvedReports = reports.filter((r) => r.status === 'resolved' || r.status === 'verified_closed').length

  useEffect(() => {
    let active = true
    const fetchData = () => {
      Promise.all([
        fetchReports(),
        fetch(`${API_URL}/api/rewards/my-history`, { headers: authHeaders() })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ])
        .then(([reps, rew]) => {
          if (!active) return
          setReports(reps)
          if (rew) setRewards(rew)
        })
        .catch((cause) => {
          if (!active) return
          setError(cause instanceof Error ? cause.message : 'Activity could not be loaded')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }

    fetchData()
    const timer = window.setInterval(fetchData, 4000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/citizen/report?title=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      navigate('/citizen/report')
    }
  }

  const categoryChips = [
    { label: 'All Issues', q: '' },
    { label: 'Potholes 🛣️', q: 'Pothole on road' },
    { label: 'Garbage 🗑️', q: 'Garbage dump cleanup' },
    { label: 'Lighting 💡', q: 'Broken streetlight' },
    { label: 'Water 💧', q: 'Water pipeline leak' },
  ]

  return (
    <div className="page citizen-dashboard">
      {/* GRAND LUXURY FROSTED GLASS HERO SECTION */}
      <section className="glass-panoramic-hero master-hero-card">
        <div className="hero-top-kicker">
          <span className="live-dot-pulse" />
          <span>{t('hero_kicker', 'SMART CIVIC GOVERNANCE · REAL-TIME CITIZEN ACTION')}</span>
        </div>

        <div className="hero-grid-layout">
          <div className="hero-copy-col">
            <h1 className="hero-main-title">
              Live Peacefully.
              <span className="hero-sub-gradient"> Shape Your City.</span>
            </h1>
            <p className="hero-lead-text">
              Spot an issue in your neighbourhood? Snap a photo, let AI verify and dispatch municipal workers on live GIS, and earn free public transit passes.
            </p>

            {/* FROSTED SEGMENTED CATEGORY PILLS */}
            <div className="glass-search-capsule-wrapper">
              <div className="category-pill-row">
                {categoryChips.map((chip) => (
                  <button
                    key={chip.label}
                    className={`category-pill-btn ${selectedFilter === chip.label ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedFilter(chip.label)
                      setSearchQuery(chip.q)
                    }}
                    type="button"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* MASTER FROSTED SEARCH & ACTION CAPSULE */}
              <form className="glass-search-input-row" onSubmit={handleSearch}>
                <div className="search-input-box">
                  <div className="search-icon-circle">
                    <Search size={18} className="hero-search-icon" />
                  </div>
                  <input
                    type="text"
                    placeholder="Describe the issue or landmark to report (e.g. broken road, streetlight)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="search-divider" />
                <button
                  type="button"
                  className="filter-sliders-btn"
                  onClick={() => navigate('/citizen/community')}
                  title="Filter Community Issues"
                >
                  <SlidersHorizontal size={17} />
                </button>
                <button type="submit" className="glass-action-pill-btn">
                  <Camera size={16} />
                  <span>Report Now</span>
                </button>
              </form>

              {/* TRUST & FEATURE MICRO-BADGES */}
              <div className="hero-trust-badges">
                <span className="trust-badge">
                  <ShieldCheck size={14} className="text-emerald" /> AI Vision Verified
                </span>
                <span className="trust-badge">
                  <Zap size={14} className="text-amber" /> Real-time GIS Dispatch
                </span>
                <span className="trust-badge">
                  <Train size={14} className="text-sky" /> Free Transit Rewards
                </span>
              </div>
            </div>
          </div>

          <div className="hero-map-col">
            <div className="hero-mini-map-glass-card">
              <HeroMiniMap />
            </div>
          </div>
        </div>
      </section>

      {/* REWARDS & TRANSIT PASS BANNER */}
      {rewards && (
        <section className="home-rewards-banner glass-card-elevated">
          <div className="rewards-badge-col">
            <div className="banner-medal-icon-box">
              <Award size={28} className="banner-medal-icon" />
            </div>
            <div>
              <span className="eyebrow">{t('rewards_status_label', 'YOUR REWARDS STATUS')}</span>
              <strong className="tier-name">{translateBadge(rewards.badge_level, t)}</strong>
            </div>
          </div>

          <div className="rewards-points-col">
            <div className="points-pill">
              <Sparkles size={16} />
              <span>
                <b>{rewards.points.toLocaleString()}</b> {t('civic_points_label', 'Civic Points')}
              </span>
            </div>
            <Link to="/citizen/rewards" className="primary-button hero-rewards-btn">
              <Gift size={16} /> Redeem Transit Passes <ChevronRight size={15} />
            </Link>
          </div>
        </section>
      )}

      {/* CITIZEN IMPACT METRICS */}
      <section className="citizen-overview" aria-label="Your report summary">
        <div className="overview-intro">
          <div>
            <p className="eyebrow">{t('your_impact_label', 'YOUR IMPACT')}</p>
            <h2>{t('your_impact_desc', 'Every report creates a visible trail.')}</h2>
          </div>
        </div>

        <div className="citizen-stat-grid">
          <div className="citizen-stat glass-card-hover">
            <div className="stat-icon-circle blue">
              <FileText size={20} />
            </div>
            <div>
              <span>{t('stat_reported', 'Total Reported')}</span>
              <strong>{reports.length}</strong>
            </div>
          </div>

          <div className="citizen-stat active glass-card-hover">
            <div className="stat-icon-circle amber">
              <Activity size={20} />
            </div>
            <div>
              <span>{t('stat_in_progress', 'In Progress')}</span>
              <strong>{activeReports}</strong>
            </div>
          </div>

          <div className="citizen-stat done glass-card-hover">
            <div className="stat-icon-circle green">
              <CircleCheckBig size={20} />
            </div>
            <div>
              <span>{t('stat_resolved', 'Resolved')}</span>
              <strong>{resolvedReports}</strong>
            </div>
          </div>

          <div className="citizen-stat points-stat glass-card-hover">
            <div className="stat-icon-circle gold">
              <Trophy size={20} />
            </div>
            <div>
              <span>{t('stat_my_points', 'My Points')}</span>
              <strong>{rewards?.points?.toLocaleString() ?? 0}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* RECENT ACTIVITY SECTION */}
      <section className="activity-section">
        <div className="section-heading citizen-section-heading">
          <div>
            <p className="eyebrow">{t('recent_activity_label', 'RECENT ACTIVITY')}</p>
            <h2>{t('latest_reports_title', 'Your latest reports')}</h2>
          </div>
          <Link to="/citizen/reports" className="view-all-link">
            {t('view_all_link', 'View all')} <ChevronRight size={16} />
          </Link>
        </div>

        {loading && (
          <div className="empty-state">
            <LoaderCircle className="spin" size={22} /> Loading activity...
          </div>
        )}

        {error && (
          <div className="form-error">
            {error}
            <Link className="outline-button" to="/citizen/reports" style={{ marginTop: 8 }}>
              View reports
            </Link>
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="empty-state citizen-empty">
            <FileText size={28} />
            <strong>Your report history starts here.</strong>
            <p>Share the first issue you notice around you and earn your first 50 points.</p>
            <Link className="primary-button" to="/citizen/report" style={{ marginTop: 12 }}>
              <Plus size={17} /> {t('nav_report_btn')}
            </Link>
          </div>
        )}

        {!loading && !error && reports.length > 0 && (
          <div className="citizen-report-grid">
            {reports.slice(0, 4).map((report) => (
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
      </section>

      {/* COMMUNITY CITIZEN BANNER */}
      <section className="community-banner citizen-community glass-card-elevated">
        <div className="community-icon-box">
          <Users size={24} />
        </div>
        <div>
          <p className="eyebrow">{t('neighbourhood_view_label', 'NEIGHBOURHOOD VIEW')}</p>
          <strong>{t('community_banner_title', 'See what your community is improving.')}</strong>
          <p>{t('community_banner_desc', 'Explore nearby signals, upvote complaints, and earn verification points.')}</p>
        </div>
        <Link className="round-arrow" to="/citizen/community" aria-label="Explore community reports">
          <ChevronRight size={20} />
        </Link>
      </section>
    </div>
  )
}
