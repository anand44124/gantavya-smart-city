import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Award,
  Bell,
  Camera,
  CheckCircle2,
  CircleUserRound,
  Coins,
  Download,
  Globe,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { API_URL, authHeaders } from './reportApi'
import { useTranslation } from '../i18n/LanguageContext'
import { LANGUAGES, type LanguageCode } from '../i18n/translations'
import { UserAvatar } from './UserAvatar'
import { AvatarPickerModal } from './AvatarPickerModal'
import { CivicCertificateModal } from './CivicCertificateModal'

type User = {
  id: number
  full_name: string
  email: string
  role: string
  avatar_url?: string | null
  points?: number
  badge_level?: string
}
type RewardTx = { id: number; points: number; reason: string; issue_id: number | null; created_at: string }

export default function LiveProfile() {
  const { language, setLanguage } = useTranslation()
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [transactions, setTransactions] = useState<RewardTx[]>([])
  const [rewards, setRewards] = useState<{ points: number; badge_level: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showInstallGuide, setShowInstallGuide] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  // Avatar Picker Modal State
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)

  // Certificate Modal State
  const [certModalOpen, setCertModalOpen] = useState(false)

  // Delete Account Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [])

  const triggerPwaInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setMessage('Gantavya installed successfully!')
      }
      setDeferredPrompt(null)
    } else {
      setShowInstallGuide((prev) => !prev)
    }
  }

  useEffect(() => {
    // 1. Instantly load from localStorage for zero-wait display
    const localUserStr = localStorage.getItem('civicpulse_user')
    if (localUserStr) {
      try {
        const localUsr = JSON.parse(localUserStr)
        setUser(localUsr)
        setName(localUsr.full_name)
        setRewards({
          points: localUsr.points ?? 50000,
          badge_level: localUsr.badge_level ?? 'Diamond Reformer',
        })
      } catch (e) {
        console.warn('LocalStorage user parse error:', e)
      }
    }

    // 2. Fetch fresh details from server in background
    Promise.all([
      fetch(`${API_URL}/api/auth/me`, { headers: authHeaders() }).then(async (res) => {
        if (!res.ok) throw new Error('Profile could not be loaded from server')
        return (await res.json()) as User
      }),
      fetch(`${API_URL}/api/rewards/my-history`, { headers: authHeaders() })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([usr, rew]) => {
        setUser(usr)
        setName(usr.full_name)
        if (rew) {
          setRewards(rew)
          if (rew.transactions) setTransactions(rew.transactions)
        }
      })
      .catch((cause) => {
        // If already loaded from localStorage, don't show red error
        if (!localStorage.getItem('civicpulse_user')) {
          setError(cause instanceof Error ? cause.message : 'Profile could not be loaded')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name }),
      })
      const value = await response.json()
      if (!response.ok) throw new Error(value.detail || 'Could not save details')
      setUser(value)
      localStorage.setItem('civicpulse_user', JSON.stringify(value))
      window.dispatchEvent(new CustomEvent('civicpulse_user_updated', { detail: value }))
      setMessage('Personal details saved successfully!')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save details')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarSelect = async (avatarUrl: string) => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar_url: avatarUrl }),
    })
    const value = await response.json()
    if (!response.ok) throw new Error(value.detail || 'Could not update avatar')
    setUser(value)
    localStorage.setItem('civicpulse_user', JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('civicpulse_user_updated', { detail: value }))
    setMessage('Profile avatar updated successfully!')
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'Could not delete account')
      localStorage.removeItem('civicpulse_token')
      localStorage.removeItem('civicpulse_user')
      alert('Your account and all associated data have been permanently deleted.')
      window.location.href = '/'
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Deletion failed')
      setDeleting(false)
    }
  }

  if (loading)
    return (
      <div className="page empty-state">
        <LoaderCircle className="spin" size={25} /> Loading profile...
      </div>
    )

  if (error && !user)
    return (
      <div className="page empty-state">
        <strong>{error}</strong>
        <button className="outline-button" onClick={() => window.location.reload()} style={{ marginTop: 12 }}>
          Retry
        </button>
      </div>
    )

  const currentPoints = rewards?.points ?? user?.points ?? 0
  const badgeLevel = rewards?.badge_level ?? user?.badge_level ?? 'Bronze Scout'

  return (
    <div className="page profile-page">
      {/* LUXURY FROSTED PROFILE HERO CARD */}
      <section className="profile-hero-glass-card">
        <div className="profile-hero-main">
          {/* AVATAR WITH TAP TO CHANGE */}
          <div className="profile-avatar-wrapper" onClick={() => setAvatarPickerOpen(true)} title="Tap to change avatar character">
            <UserAvatar avatarUrl={user?.avatar_url} name={user?.full_name} size={80} className="profile-avatar-interactive" />
            <button type="button" className="avatar-edit-badge" title="Change Avatar Character">
              <Camera size={14} />
            </button>
            <div className="avatar-verified-badge" title="Verified Account">
              <UserCheck size={13} />
            </div>
          </div>

          <div className="profile-hero-details">
            <div className="profile-role-kicker">
              <span className="live-dot-green" />
              <span>{user?.role.toUpperCase()} ACCOUNT</span>
            </div>
            <h1 className="profile-user-name">{user?.full_name}</h1>
            <p className="profile-user-email">
              <Mail size={14} /> {user?.email}
            </p>
          </div>
        </div>

        <div className="profile-hero-stats">
          {currentPoints >= 500 ? (
            <button
              type="button"
              className="download-cert-pill-btn"
              onClick={() => setCertModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: 13,
                borderRadius: 9999,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
              }}
            >
              <Award size={18} /> 📜 Download Official Civic Certificate
            </button>
          ) : (
            <div
              className="cert-locked-pill"
              title="Report 1 civic issue or earn 500 points to unlock your official certificate!"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: 'rgba(241, 245, 249, 0.8)',
                color: '#64748b',
                fontWeight: 700,
                fontSize: 12,
                borderRadius: 9999,
                border: '1px solid #cbd5e1',
              }}
            >
              🔒 Earn 500 PTS to Unlock Certificate ({currentPoints}/500)
            </div>
          )}
          <button
            type="button"
            className="change-avatar-pill-btn"
            onClick={() => setAvatarPickerOpen(true)}
          >
            <Sparkles size={16} /> Choose Character Avatar
          </button>
          <div className="profile-stat-box">
            <div className="stat-icon-gold">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="stat-lbl">AVAILABLE BALANCE</span>
              <strong className="stat-val">{currentPoints.toLocaleString()} PTS</strong>
            </div>
          </div>
          <div className="profile-stat-box">
            <div className="stat-icon-emerald">
              <Award size={20} />
            </div>
            <div>
              <span className="stat-lbl">CURRENT TIER</span>
              <strong className="stat-val">{badgeLevel}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 2-COLUMN PROFILE SETTINGS GRID */}
      <div className="profile-dashboard-grid">
        {/* LEFT COLUMN: EDIT DETAILS & LANGUAGE */}
        <div className="profile-col-left">
          {/* PERSONAL INFORMATION CARD */}
          <div className="profile-glass-card">
            <div className="card-header-row">
              <div className="card-header-icon">
                <CircleUserRound size={20} />
              </div>
              <div>
                <h2>Personal Information</h2>
                <p className="card-subtext">Manage your citizen profile name and email</p>
              </div>
            </div>

            <form className="profile-details-form" onSubmit={save}>
              <div className="profile-input-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className="profile-input-group">
                <label>
                  Email Address <span className="verified-lock-tag"><Lock size={11} /> Verified</span>
                </label>
                <input type="email" value={user?.email || ''} disabled className="input-disabled" />
              </div>

              {message && <p className="form-success">{message}</p>}
              {error && <p className="form-error">{error}</p>}

              <button className="primary-button save-profile-btn" disabled={saving} type="submit">
                {saving ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}
                <span>{saving ? 'Saving...' : 'Save Personal Details'}</span>
              </button>
            </form>
          </div>

          {/* LANGUAGE & REGIONAL CARD */}
          <div className="profile-glass-card">
            <div className="card-header-row">
              <div className="card-header-icon teal">
                <Globe size={20} />
              </div>
              <div>
                <h2>Language & Regional Settings</h2>
                <p className="card-subtext">Choose your preferred language for the application</p>
              </div>
            </div>

            <div className="language-select-box">
              <label>Interface Language</label>
              <select
                className="profile-language-dropdown"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* NATIVE PWA APP INSTALL CARD */}
          <div className="profile-glass-card pwa-profile-card">
            <div className="card-header-row space-between">
              <div className="card-header-flex">
                <div className="card-header-icon purple">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h2>Install Gantavya App</h2>
                  <p className="card-subtext">Add to phone home screen for 1-tap launch</p>
                </div>
              </div>
              <span className="pwa-badge-pill">OFFLINE READY</span>
            </div>

            <div className="pwa-card-body">
              <p className="pwa-card-desc">
                Install as a standalone native app on your Android or iPhone for ultra-fast camera reporting and zero-data-loss offline storage.
              </p>
              <div className="pwa-install-actions">
                <button
                  type="button"
                  className="primary-button pwa-install-action-btn"
                  onClick={triggerPwaInstall}
                >
                  <Download size={16} /> Install App on Device
                </button>
              </div>
              {showInstallGuide && (
                <div className="pwa-guide-box">
                  <p><strong>💡 Quick Installation Guide:</strong></p>
                  <ul>
                    <li><strong>Android (Chrome):</strong> Tap <strong>"Install App on Device"</strong> above or tap the 3 dots (⋮) &rarr; <strong>"Install App"</strong>.</li>
                    <li><strong>iPhone (Safari):</strong> Tap the <strong>Share</strong> icon (square with upward arrow) at bottom &rarr; tap <strong>"Add to Home Screen"</strong> (➕).</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: POINTS HISTORY & DANGER ZONE */}
        <div className="profile-col-right">
          {/* REWARDS POINTS HISTORY */}
          <div className="profile-glass-card">
            <div className="card-header-row space-between">
              <div className="card-header-flex">
                <div className="card-header-icon amber">
                  <Coins size={20} />
                </div>
                <div>
                  <h2>Points Ledger</h2>
                  <p className="card-subtext">Recent activity and reward earnings</p>
                </div>
              </div>
              <Link to="/citizen/rewards" className="redeem-passes-link">
                Redeem Passes &rarr;
              </Link>
            </div>

            {transactions.length === 0 ? (
              <div className="empty-points-state">
                <Sparkles size={24} className="text-amber" />
                <p>No transactions yet. Submit your first verified issue to earn 50 points!</p>
              </div>
            ) : (
              <div className="profile-tx-list">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="profile-tx-row">
                    <div className="tx-left">
                      <div className="tx-check-icon">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <strong>{tx.reason}</strong>
                        <small>{new Date(tx.created_at).toLocaleDateString()}</small>
                      </div>
                    </div>
                    <span className="tx-points-pill">+{tx.points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PRIVACY & TRUST CARD */}
          <div className="profile-glass-card trust-card">
            <div className="trust-item">
              <ShieldCheck size={20} className="text-emerald" />
              <div>
                <strong>Municipal Privacy Protection</strong>
                <p>Your reports are encrypted and only accessible to assigned government response units.</p>
              </div>
            </div>
            <div className="trust-item">
              <Bell size={20} className="text-sky" />
              <div>
                <strong>Real-time Status Alerts</strong>
                <p>Live notifications trigger when municipal teams verify and resolve your complaints.</p>
              </div>
            </div>
          </div>

          {/* SESSION / LOGOUT SECTION */}
          <div className="profile-glass-card session-glass-card">
            <div className="session-content">
              <div className="session-icon-box">
                <LogOut size={20} color="#0d9488" />
              </div>
              <div>
                <h3>Session Management</h3>
                <p>Sign out of your Gantavya citizen session on this device.</p>
              </div>
            </div>
            <button
              type="button"
              className="outline-button logout-profile-btn"
              onClick={() => {
                localStorage.removeItem('civicpulse_token')
                localStorage.removeItem('civicpulse_user')
                window.location.href = '/'
              }}
            >
              <LogOut size={15} /> Log Out
            </button>
          </div>

          {/* DANGER ZONE: DELETE ACCOUNT */}
          <div className="profile-glass-card danger-glass-card">
            <div className="danger-content">
              <div className="danger-icon-box">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3>Delete Account</h3>
                <p>Permanently remove your Gantavya account, submissions, and reward points.</p>
              </div>
            </div>
            <button
              type="button"
              className="danger-outline-button"
              onClick={() => setDeleteModalOpen(true)}
            >
              <Trash2 size={15} /> Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* AVATAR PICKER MODAL */}
      <AvatarPickerModal
        isOpen={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        currentAvatar={user?.avatar_url}
        userName={user?.full_name}
        onSelectAvatar={handleAvatarSelect}
      />

      {/* CONFIRM DELETE MODAL */}
      {deleteModalOpen && (
        <div className="modal-backdrop" onClick={() => !deleting && setDeleteModalOpen(false)}>
          <div className="modal-glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-danger-icon">
                <AlertTriangle size={24} />
              </div>
              <h2>Permanently Delete Account?</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to permanently delete account <strong>{user?.email}</strong>?
              </p>
              <p className="danger-warning-text">
                ⚠️ All your submitted civic reports, earned points ({currentPoints.toLocaleString()} PTS), and active transit passes will be erased immediately.
              </p>
              {deleteError && <p className="form-error">{deleteError}</p>}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-solid-button"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
                {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
      {certModalOpen && user && (
        <CivicCertificateModal
          user={{ ...user, points: currentPoints, badge_level: badgeLevel }}
          onClose={() => setCertModalOpen(false)}
        />
      )}
    </div>
  )
}
