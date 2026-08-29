import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  FileText,
  Gift,
  Globe,
  Home,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageCircle,
  Plus,
  Search,
  ShieldAlert,
  Timer,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import './App.css'
import RealReportForm from './components/RealReportForm'
import LiveCitizenHome from './components/LiveCitizenHome'
import LiveReportList from './components/LiveReportList'
import LiveAdminDashboard from './components/LiveAdminDashboard'
import LiveWorkerDashboard from './components/LiveWorkerDashboard'
import LiveProfile from './components/LiveProfile'
import LiveCommunity from './components/LiveCommunity'
import LiveLeaderboard from './components/LiveLeaderboard'
import CivicRewardsCenter from './components/CivicRewardsCenter'
import LiveIssueDetails, { LiveCommunityIssue } from './components/LiveIssueDetails'
import VoiceAssistant from './components/VoiceAssistant'
import OfflineSyncRadar from './components/OfflineSyncRadar'

import { UserAvatar } from './components/UserAvatar'
import { displayStatus, fetchActivity, type StatusEvent } from './components/reportApi'
import { LanguageProvider, useTranslation } from './i18n/LanguageContext'
import { LANGUAGES, type LanguageCode } from './i18n/translations'

type Role = 'citizen' | 'admin' | 'worker'
type SessionUser = { id: number; full_name: string; email: string; role: Role; avatar_url?: string | null; points?: number; badge_level?: string }
const API_URL = import.meta.env.VITE_API_URL || ''

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

function SplashScreenOverlay() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // Stage 1: pure white (0.4s) -> Stage 2: progressive calligraphy drawing reveal (1.6s) -> Stage 3: hold (0.6s) -> Stage 4: fade out (0.6s)
    const fadeTimer = window.setTimeout(() => {
      setFading(true)
    }, 2600)

    const removeTimer = window.setTimeout(() => {
      setVisible(false)
    }, 3200)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(removeTimer)
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    setFading(true)
    window.setTimeout(() => {
      setVisible(false)
    }, 350)
  }

  return (
    <div className={`splash-screen-minimal ${fading ? 'fade-out' : ''}`} onClick={dismiss} title="Tap anywhere to enter">
      <div className="splash-calligraphy-wrapper">
        <img
          src="/gantavya-calligraphy-art.jpg"
          alt="गंतव्य"
          className="splash-calligraphy-img"
        />
      </div>
    </div>
  )
}

function AppContent() {
  const [user, setUser] = useState<SessionUser | null>(() => {
    const raw = localStorage.getItem('civicpulse_user')
    return raw ? JSON.parse(raw) : null
  })

  useEffect(() => {
    const handleUserUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<SessionUser>
      if (customEvent.detail) {
        setUser(customEvent.detail)
      } else {
        const raw = localStorage.getItem('civicpulse_user')
        if (raw) setUser(JSON.parse(raw))
      }
    }
    window.addEventListener('civicpulse_user_updated', handleUserUpdated)
    return () => window.removeEventListener('civicpulse_user_updated', handleUserUpdated)
  }, [])

  const logout = () => {
    localStorage.removeItem('civicpulse_token')
    localStorage.removeItem('civicpulse_user')
    setUser(null)
  }

  return (
    <BrowserRouter>
      <SplashScreenOverlay />
      <Routes>
        {user ? (
          <Route path="*" element={<Platform user={user} logout={logout} />} />
        ) : (
          <>
            <Route path="/register" element={<AuthPage mode="register" onAuth={setUser} />} />
            <Route path="*" element={<AuthPage mode="login" onAuth={setUser} />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

function LanguageSelector() {
  const { language, setLanguage } = useTranslation()
  return (
    <div className="language-selector-wrapper" title="Change Language / भाषा चुनें">
      <Globe size={16} className="lang-icon" />
      <select
        className="language-dropdown"
        value={language}
        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
        aria-label="Select Application Language"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function Platform({ user, logout }: { user: SessionUser; logout: () => void }) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = user.role === 'admin'
  const isWorker = user.role === 'worker'
  const [searchOpen, setSearchOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState<StatusEvent[]>([])

  const navItems = isAdmin
    ? [
        ['/admin', 'Overview'],
        ['/admin/locality', '📍 Locality Analytics'],
        ['/admin/issues', 'Issues'],
        ['/admin/map', 'Map'],
        ['/admin/workers', 'Workers'],
        ['/admin/sla', 'SLA'],
      ]
    : isWorker
    ? [
        ['/worker', 'Dashboard'],
        ['/worker/issues', 'Assigned issues'],
        ['/worker/profile', 'Profile'],
      ]
    : [
        ['/citizen', t('nav_home')],
        ['/citizen/report', t('nav_report_btn')],
        ['/citizen/community', t('nav_community')],
        ['/citizen/rewards', '🎁 Rewards'],
        ['/citizen/leaderboard', t('nav_leaderboard')],
        ['/citizen/reports', t('nav_reports')],
        ['/citizen/profile', t('nav_profile')],
      ]

  useEffect(() => {
    if (!notesOpen) return
    void fetchActivity()
      .then(setEvents)
      .catch(() => setEvents([]))
  }, [notesOpen])

  return (
    <div className={`app-shell ${user.role}`}>
      <header className="topbar">
        <Link className="brand gantavya-brand" to={isAdmin ? '/admin' : isWorker ? '/worker' : '/citizen'}>
          <img src="/gantavya-icon-celtic-emerald.png" alt="Gantavya" className="gantavya-brand-img" />
          <span className="gantavya-brand-text">गंतव्य</span>
        </Link>
        <nav className="desktop-nav">
          {navItems.map(([path, label]) => (
            <Link className={location.pathname === path ? 'active' : ''} to={path} key={path}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="top-right-group">
          <div className="desktop-only-action">
            <LanguageSelector />
          </div>
          <div className="role-switcher">
            <span className="role-dot" />
            <span className="role-user-name">{user.full_name}</span>
            <span className="role-badge-tag">{isAdmin ? 'Admin' : isWorker ? 'Worker' : 'Citizen'}</span>
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label="Search"
              onClick={() => {
                setSearchOpen((val) => !val)
                setNotesOpen(false)
              }}
            >
              <Search size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => {
                setNotesOpen((val) => !val)
                setSearchOpen(false)
              }}
            >
              <Bell size={18} />
              {events.length > 0 && <i />}
            </button>
            <button
              className="topbar-avatar-btn"
              onClick={() => navigate(isAdmin ? '/admin' : isWorker ? '/worker/profile' : '/citizen/profile')}
              title={`${user.full_name} (${user.role}) - Open Profile`}
            >
              <UserAvatar avatarUrl={user.avatar_url} name={user.full_name} size={34} />
            </button>
            <button className="icon-button topbar-logout-btn" onClick={logout} title={t('nav_logout', 'Log out')}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <form
            className="search-dropdown-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault()
              const target = isAdmin ? '/admin/issues' : isWorker ? '/worker/issues' : '/citizen/community'
              sessionStorage.setItem('civicpulse_search', query)
              navigate(target)
              setSearchOpen(false)
            }}
          >
            <Search size={18} className="search-card-icon" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={isAdmin ? 'Search issues by keyword, locality, ID...' : 'Search community issues, localities...'}
              className="search-card-input"
            />
            <button type="submit" className="search-card-submit-btn">
              Search
            </button>
            <button type="button" className="search-card-close-btn" onClick={() => setSearchOpen(false)} aria-label="Close search">
              <X size={16} />
            </button>
          </form>
        </div>
      )}

      {notesOpen && (
        <div className="notifications-overlay" onClick={() => setNotesOpen(false)}>
          <div className="notifications-dropdown-card" onClick={(e) => e.stopPropagation()}>
            <div className="notif-header">
              <div className="notif-title-group">
                <div className="notif-icon-circle">
                  <Bell size={16} />
                </div>
                <div>
                  <h4 className="notif-title">Activity & Notifications</h4>
                  <span className="notif-subtitle">{events.length} recent status updates</span>
                </div>
              </div>
              <button
                type="button"
                className="notif-close-btn"
                onClick={() => setNotesOpen(false)}
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>

            <div className="notif-list">
              {events.length === 0 ? (
                <div className="notif-empty-state">
                  <Bell size={28} className="notif-empty-icon" />
                  <p>No recent notifications</p>
                  <small>Status updates for your reported issues will appear here.</small>
                </div>
              ) : (
                events.slice(0, 10).map((event) => {
                  const statusLabel = displayStatus(event.to_status)
                  const isResolved = event.to_status?.toLowerCase().includes('resolved') || event.to_status?.toLowerCase().includes('closed')
                  const isAssigned = event.to_status?.toLowerCase().includes('assigned') || event.to_status?.toLowerCase().includes('progress')

                  return (
                    <div
                      key={event.id}
                      className="notif-item"
                      onClick={() => {
                        navigate(`/citizen/issue/${event.issue_id}`)
                        setNotesOpen(false)
                      }}
                    >
                      <div className={`notif-status-dot ${isResolved ? 'resolved' : isAssigned ? 'progress' : 'pending'}`} />
                      <div className="notif-item-body">
                        <div className="notif-item-header">
                          <span className="notif-issue-tag">Issue #{event.issue_id}</span>
                          <span className={`notif-badge ${isResolved ? 'resolved' : isAssigned ? 'progress' : 'pending'}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="notif-item-text">
                          Status updated to <strong>{statusLabel}</strong>
                        </p>
                        <span className="notif-item-time">
                          {new Date(event.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {events.length > 0 && (
              <div className="notif-footer">
                <button
                  type="button"
                  className="notif-view-all-btn"
                  onClick={() => {
                    navigate('/citizen/reports')
                    setNotesOpen(false)
                  }}
                >
                  View All Reported Issues <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isAdmin || isWorker ? (
        <aside className="side-nav">
          <div className="side-label">Workspace</div>
          {(isAdmin
            ? [
                ['/admin', 'Overview', LayoutDashboard],
                ['/admin/issues', 'Issues', FileText],
                ['/admin/map', 'Live map', Map],
                ['/admin/workers', 'Workers', Users],
                ['/admin/settings', 'Settings', Menu],
              ]
            : [
                ['/worker', 'My route', LayoutDashboard],
                ['/worker/issues', 'Assigned issues', FileText],
                ['/worker/profile', 'Profile', CircleUserRound],
              ]
          ).map(([path, label, Icon]) => (
            <Link className={location.pathname === path ? 'active' : ''} to={path as string} key={path as string}>
              <Icon size={18} />
              {label as string}
            </Link>
          ))}
        </aside>
      ) : null}

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to={isAdmin ? '/admin' : isWorker ? '/worker' : '/citizen'} replace />} />
          <Route path="/citizen" element={<LiveCitizenHome />} />
          <Route path="/citizen/report" element={<RealReportForm />} />
          <Route path="/citizen/reports" element={<LiveReportList />} />
          <Route path="/citizen/community" element={<LiveCommunity />} />
          <Route path="/citizen/community/:id" element={<LiveCommunityIssue />} />
          <Route path="/citizen/rewards" element={<CivicRewardsCenter />} />
          <Route path="/citizen/leaderboard" element={<LiveLeaderboard />} />
          <Route path="/citizen/profile" element={<LiveProfile />} />
          <Route path="/citizen/issue/:id" element={<LiveIssueDetails />} />
          <Route path="/admin/*" element={<LiveAdminDashboard />} />
          <Route path="/worker/*" element={<LiveWorkerDashboard />} />
        </Routes>
      </main>

      {/* GLOBAL VOICE ASSISTANT FOR CITIZENS */}
      {!isAdmin && !isWorker && <VoiceAssistant mode="floating" />}

      {/* DIRECT REAL WHATSAPP LAUNCHER (OPENS OFFICIAL WHATSAPP APP) */}
      {!isAdmin && !isWorker && (
        <a
          href="https://wa.me/14155238886?text=Hi%20Gantavya%2C%20I%20want%20to%20report%20a%20civic%20issue"
          target="_blank"
          rel="noopener noreferrer"
          className="floating-wa-btn"
          aria-label="Chat with Real WhatsApp Bot"
          title="Open Real WhatsApp Grievance Bot"
        >
          <MessageCircle size={18} />
          <span>WhatsApp Bot</span>
          <span className="wa-pulse-dot"></span>
        </a>
      )}

      {/* PWA INSTALL BANNER & OFFLINE RADAR */}
      <OfflineSyncRadar />

      {/* MOBILE APP-STYLE BOTTOM NAVIGATION FOR ALL ROLES */}
      {isAdmin ? (
        <nav className="bottom-nav">
          <NavItem to="/admin" icon={<LayoutDashboard size={19} />} label="Overview" />
          <NavItem to="/admin/issues" icon={<FileText size={19} />} label="Issues" />
          <NavItem to="/admin/map" icon={<Map size={19} />} label="GIS Map" />
          <NavItem to="/admin/workers" icon={<Users size={19} />} label="Workers" />
          <NavItem to="/admin/settings" icon={<Menu size={19} />} label="Settings" />
        </nav>
      ) : isWorker ? (
        <nav className="bottom-nav">
          <NavItem to="/worker" icon={<Map size={20} />} label="My Route" />
          <NavItem to="/worker/issues" icon={<Wrench size={20} />} label="Assigned" />
          <NavItem to="/worker/profile" icon={<CircleUserRound size={20} />} label="Profile" />
        </nav>
      ) : (
        <nav className="bottom-nav">
          <NavItem to="/citizen" icon={<Home size={20} />} label={t('nav_home', 'Home')} />
          <NavItem to="/citizen/community" icon={<Globe size={20} />} label={t('nav_community', 'Community')} />
          <Link to="/citizen/report" className="report-action" aria-label="Report an issue">
            <Plus size={24} />
          </Link>
          <NavItem to="/citizen/rewards" icon={<Gift size={20} />} label={t('nav_rewards', 'Rewards')} />
          <NavItem to="/citizen/profile" icon={<CircleUserRound size={20} />} label={t('nav_profile', 'Profile')} />
        </nav>
      )}

      {/* AUTO INACTIVITY SESSION PROTECTION (2 MIN TIMEOUT + 30S COUNTDOWN) */}
      <InactivitySessionGuard onLogout={logout} timeoutMinutes={2} warningSeconds={30} />
    </div>
  )
}

function AuthPage({ mode, onAuth }: { mode: 'login' | 'register'; onAuth: (user: SessionUser) => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [forgotModalOpen, setForgotModalOpen] = useState(false)
  const [sessionExpiredNotice] = useState<string | null>(() => {
    const notice = sessionStorage.getItem('gantavya_session_expired')
    if (notice) {
      sessionStorage.removeItem('gantavya_session_expired')
      return notice
    }
    return null
  })

  const demoLogin = async (role: 'citizen' | 'admin' | 'worker') => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/auth/demo-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Demo authentication failed')
      localStorage.setItem('civicpulse_token', result.access_token)
      localStorage.setItem('civicpulse_user', JSON.stringify(result.user))
      onAuth(result.user)
      navigate(result.user.role === 'admin' ? '/admin' : result.user.role === 'worker' ? '/worker' : '/citizen')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    // Client-side password validation for register
    if (mode === 'register') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.')
        setLoading(false)
        return
      }
      if (!/\d/.test(password) && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        setError('Password must contain at least one number or special character.')
        setLoading(false)
        return
      }
    }

    const payload = mode === 'register' 
      ? { full_name: fullName.trim(), email: email.trim(), password }
      : { email: email.trim(), password }

    try {
      const response = await fetch(`${API_URL}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(result.detail || 'Too many login attempts. Please wait a few minutes before retrying.')
        }
        let msg = 'Authentication failed. Please check your credentials.'
        if (typeof result.detail === 'string') {
          msg = result.detail
        } else if (Array.isArray(result.detail) && result.detail.length > 0) {
          msg = result.detail.map((d: any) => d.msg || d.message).join(', ')
        }
        throw new Error(msg)
      }
      localStorage.setItem('civicpulse_token', result.access_token)
      localStorage.setItem('civicpulse_user', JSON.stringify(result.user))
      onAuth(result.user)
      navigate(result.user.role === 'admin' ? '/admin' : result.user.role === 'worker' ? '/worker' : '/citizen')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Network error. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Link className="brand gantavya-brand" to="/">
            <img src="/gantavya-icon-celtic-emerald.png" alt="Gantavya" className="gantavya-brand-img" />
            <span className="gantavya-brand-text">गंतव्य</span>
          </Link>
          <LanguageSelector />
        </div>
        <p className="eyebrow">{t('app_subtitle', 'SMART CIVIC GOVERNANCE')}</p>
        <h1>{mode === 'login' ? t('welcome_back_title', 'Welcome back') : t('create_acc_title', 'Create account')}</h1>
        <p className="card-subtext">
          {mode === 'login'
            ? t('signin_subtext', 'Sign in to continue improving your city.')
            : t('signup_subtext', 'Report issues, track progress, and earn civic points in real time.')}
        </p>

        {sessionExpiredNotice && (
          <div className="session-expired-alert">
            <ShieldAlert size={18} className="session-alert-icon" />
            <span>{sessionExpiredNotice}</span>
          </div>
        )}

        {mode === 'login' && (
          <div className="demo-accounts-box">
            <p className="demo-label">{t('quick_demo_access', 'Quick Demo Access')}</p>
            <div className="demo-buttons">
              <button
                type="button"
                className="demo-pill-btn citizen-btn"
                onClick={() => demoLogin('citizen')}
                disabled={loading}
              >
                {t('demo_citizen', 'Citizen Demo')}
              </button>
              <button
                type="button"
                className="demo-pill-btn admin-btn"
                onClick={() => demoLogin('admin')}
                disabled={loading}
              >
                {t('demo_admin', 'Admin Demo')}
              </button>
              <button
                type="button"
                className="demo-pill-btn worker-btn"
                onClick={() => demoLogin('worker')}
                disabled={loading}
              >
                {t('demo_worker', 'Worker Demo')}
              </button>
            </div>
          </div>
        )}
        <form className="report-form" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              {t('full_name_label', 'Full name')}
              <input
                name="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            {t('email_label', 'Email')}
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('password_label', 'Password')}</span>
              {mode === 'login' && (
                <button
                  type="button"
                  className="forgot-password-link-btn"
                  onClick={() => setForgotModalOpen(true)}
                >
                  {t('forgot_password_btn', 'Forgot password?')}
                </button>
              )}
            </div>
            <input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters with numbers"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button full" disabled={loading}>
            {loading ? t('connecting', 'Connecting...') : mode === 'login' ? t('sign_in_btn', 'Sign in') : t('create_acc_btn', 'Create account')} <ChevronRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? t('new_to_cp', 'New to Gantavya?') : t('already_have_acc', 'Already have an account?')}{' '}
          <Link to={mode === 'login' ? '/register' : '/'}>
            {mode === 'login' ? t('create_an_acc', 'Create an account') : t('sign_in_btn', 'Sign in')}
          </Link>
        </p>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
        onResetSuccess={(userEmail) => {
          setEmail(userEmail)
          setForgotModalOpen(false)
        }}
      />
    </div>
  )
}

function ForgotPasswordModal({
  isOpen,
  onClose,
  onResetSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onResetSuccess: (email: string) => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'email' | 'otp' | 'success'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen) return null

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        let msg = 'Could not send verification code'
        if (typeof data.detail === 'string') msg = data.detail
        else if (Array.isArray(data.detail)) msg = data.detail.map((d: any) => d.msg).join(', ')
        throw new Error(msg)
      }
      setStep('otp')
    } catch (err: any) {
      setError(err.message || 'Failed to request verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPwd = newPassword.trim()
    const cleanConfirm = confirmPassword.trim()

    if (cleanPwd.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }
    if (!/\d/.test(cleanPwd) && !/[!@#$%^&*(),.?":{}|<>]/.test(cleanPwd)) {
      setError('Password must contain at least one number or special character.')
      return
    }
    if (cleanPwd !== cleanConfirm) {
      setError('Passwords do not match. Please re-enter.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          new_password: cleanPwd,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        let msg = 'Password reset failed'
        if (typeof data.detail === 'string') msg = data.detail
        else if (Array.isArray(data.detail)) msg = data.detail.map((d: any) => d.msg).join(', ')
        throw new Error(msg)
      }
      setSuccessMsg(data.message || 'Password successfully reset!')
      setStep('success')
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep('email')
    setEmail('')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-glass-card forgot-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon teal">
            <KeyRound size={22} />
          </div>
          <div>
            <h2>{t('forgot_password_title', 'Reset Your Password')}</h2>
            <p className="card-subtext">{t('forgot_password_sub', 'Securely recover your Gantavya citizen account')}</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {step === 'email' && (
          <form className="forgot-step-form" onSubmit={handleRequestOtp}>
            <p className="forgot-instruction">
              Enter your registered email address and we'll dispatch a 6-digit OTP verification code to reset your password.
            </p>
            <label>
              <span>{t('email_label', 'Registered Email Address')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoFocus
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="primary-button full" disabled={loading}>
              {loading ? 'Sending OTP code...' : 'Send Verification OTP'} <ChevronRight size={16} />
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form className="forgot-step-form" onSubmit={handleResetPassword}>
            <div className="email-sent-banner">
              <div className="email-sent-icon">📬</div>
              <div>
                <p className="email-sent-title">OTP Sent Successfully</p>
                <p className="email-sent-desc">
                  A 6-digit verification code has been dispatched to your registered email. Please check your Inbox or Spam folder.
                </p>
              </div>
            </div>

            <label>
              <span>6-Digit Verification Code (OTP)</span>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 839201"
                style={{ fontSize: 18, letterSpacing: 4, textAlign: 'center', fontWeight: 800 }}
                autoFocus
              />
            </label>

            <label>
              <span>{t('new_password_label', 'New Password')}</span>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters with numbers"
              />
            </label>

            <label>
              <span>{t('confirm_password_label', 'Confirm New Password')}</span>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <div className="modal-actions-row">
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setStep('email')
                  setError('')
                }}
                disabled={loading}
              >
                Back
              </button>
              <button className="primary-button flex-1" disabled={loading}>
                {loading ? 'Updating Password...' : 'Reset & Save Password'}
              </button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="forgot-success-state">
            <CheckCircle2 size={52} className="success-icon-green" />
            <h3>Password Reset Complete!</h3>
            <p>{successMsg}</p>
            <button
              type="button"
              className="primary-button full"
              onClick={() => onResetSuccess(email)}
            >
              Sign In With New Password <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function InactivitySessionGuard({
  onLogout,
  timeoutMinutes = 15,
  warningSeconds = 60,
}: {
  onLogout: () => void
  timeoutMinutes?: number
  warningSeconds?: number
}) {
  const lastActiveRef = useRef<number>(Date.now())
  const [showWarning, setShowWarning] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(warningSeconds)

  const resetTimer = useCallback(() => {
    lastActiveRef.current = Date.now()
    setShowWarning(false)
    setSecondsRemaining(warningSeconds)
  }, [warningSeconds])

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    const handleActivity = () => {
      if (!showWarning) {
        lastActiveRef.current = Date.now()
      }
    }

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }))

    const totalSeconds = timeoutMinutes * 60
    const warningThreshold = totalSeconds - warningSeconds

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActiveRef.current) / 1000)
      if (elapsed >= totalSeconds) {
        clearInterval(interval)
        sessionStorage.setItem(
          'gantavya_session_expired',
          `Your session automatically logged out after ${timeoutMinutes} minutes of inactivity for your security.`
        )
        onLogout()
      } else if (elapsed >= warningThreshold) {
        setShowWarning(true)
        setSecondsRemaining(Math.max(1, totalSeconds - elapsed))
      } else if (showWarning) {
        setShowWarning(false)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
      events.forEach((ev) => window.removeEventListener(ev, handleActivity))
    }
  }, [timeoutMinutes, warningSeconds, showWarning, onLogout])

  if (!showWarning) return null

  return (
    <div className="modal-backdrop inactivity-modal-backdrop">
      <div className="modal-glass-card inactivity-warning-card">
        <div className="inactivity-icon-pulse">
          <Timer size={36} />
        </div>
        <h3>Session Inactivity Warning</h3>
        <p className="inactivity-msg">
          You have been idle for a while. For account security, your session will automatically log out in:
        </p>
        <div className="inactivity-countdown-box">
          <span className="inactivity-countdown-number">{secondsRemaining}</span>
          <span className="inactivity-countdown-label">seconds</span>
        </div>
        <div className="modal-actions-row" style={{ width: '100%', marginTop: 12 }}>
          <button type="button" className="outline-button" onClick={onLogout}>
            Log Out Now
          </button>
          <button type="button" className="primary-button flex-1" onClick={resetTimer}>
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  )
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const location = useLocation()
  return (
    <Link className={location.pathname === to ? 'nav-item active' : 'nav-item'} to={to}>
      {icon}
      <span>{label}</span>
    </Link>
  )
}

export default App

