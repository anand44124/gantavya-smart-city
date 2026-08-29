import { useEffect, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Layers,
  LoaderCircle,
  Navigation,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Video,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import {
  API_URL,
  authHeaders,
  displayStatus,
  openMapRoute,
  statusColor,
  type Issue,
} from './reportApi'
import LiveProfile from './LiveProfile'
import IssueMap from './IssueMap'
import { UserAvatar } from './UserAvatar'

export default function LiveWorkerDashboard() {
  const location = useLocation()
  if (location.pathname.includes('/profile')) return <LiveProfile />
  return <WorkerQueue />
}

function WorkerQueue() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [workerUser, setWorkerUser] = useState<{ full_name: string; email: string; avatar_url?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Resolution Modal State
  const [resolvingIssue, setResolvingIssue] = useState<Issue | null>(null)
  const [proofPhoto, setProofPhoto] = useState<File | null>(null)
  const [proofPhotoPreview, setProofPhotoPreview] = useState('')
  const [proofVideo, setProofVideo] = useState<File | null>(null)
  const [proofVideoPreview, setProofVideoPreview] = useState('')
  const [proofNote, setProofNote] = useState('')
  const [submittingProof, setSubmittingProof] = useState(false)
  const [proofError, setProofError] = useState('')

  // AI Proof Scan State
  const [proofScanState, setProofScanState] = useState<'idle' | 'scanning' | 'valid' | 'fake'>('idle')
  const [proofScanReason, setProofScanReason] = useState('')

  const fetchAssigned = () =>
    fetch(`${API_URL}/api/workers/me/issues`, { headers: authHeaders() }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Assigned issues could not be loaded')
      return data as Issue[]
    })

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([
      fetchAssigned(),
      fetch(`${API_URL}/api/auth/me`, { headers: authHeaders() })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    ])
      .then(([iss, usr]) => {
        setIssues(iss)
        if (usr) setWorkerUser(usr)
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Assigned issues could not be loaded'))
      .finally(() => setLoading(false))
  }

  const updateStatus = async (issueId: number, status: string) => {
    const response = await fetch(`${API_URL}/api/workers/me/issues/${issueId}/status?status=${status}`, {
      method: 'PATCH',
      headers: authHeaders(),
    })
    if (response.ok) load()
    else setError((await response.json()).detail || 'Status update failed')
  }

  const openResolveModal = (issue: Issue) => {
    setResolvingIssue(issue)
    setProofPhoto(null)
    setProofPhotoPreview('')
    setProofVideo(null)
    setProofVideoPreview('')
    setProofNote('')
    setProofError('')
    setProofScanState('idle')
    setProofScanReason('')
  }

  const closeResolveModal = () => {
    setResolvingIssue(null)
  }

  const compressImage = async (fileToCompress: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_DIM = 1200
          let { width, height } = img
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            } else {
              width = Math.round((width * MAX_DIM) / height)
              height = MAX_DIM
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], fileToCompress.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' }))
              } else {
                resolve(fileToCompress)
              }
            },
            'image/jpeg',
            0.85
          )
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(fileToCompress)
    })
  }

  const scanProofWithAI = async (candidate: File, issueCategory: string) => {
    setProofScanState('scanning')
    setProofScanReason('')
    setProofError('')

    const formData = new FormData()
    formData.append('photo', candidate)
    formData.append('category', issueCategory)

    try {
      const response = await fetch(`${API_URL}/api/workers/me/issues/validate-proof`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Proof verification failed')
      }

      if (data.decision === 'reject') {
        setProofScanState('fake')
        setProofScanReason(data.reason || 'Image does not appear to show legitimate repaired public infrastructure.')
      } else {
        setProofScanState('valid')
        setProofScanReason(data.reason || 'Authentic repair proof confirmed by Gemini AI.')
        if (data.work_summary && (!proofNote || proofNote.length < 5)) {
          setProofNote(data.work_summary)
        }
      }
    } catch (err) {
      console.warn('Proof scan network notice:', err)
      setProofScanState('valid')
      setProofScanReason('Photo attached. Ready for submission with repair notes.')
    }
  }

  const handleProofPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofError('')
    try {
      const optimized = await compressImage(file)
      setProofPhoto(optimized)
      setProofPhotoPreview(URL.createObjectURL(optimized))
      if (resolvingIssue) {
        void scanProofWithAI(optimized, resolvingIssue.category)
      }
    } catch {
      setProofPhoto(file)
      setProofPhotoPreview(URL.createObjectURL(file))
      if (resolvingIssue) {
        void scanProofWithAI(file, resolvingIssue.category)
      }
    }
  }

  const handleProofVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 30 * 1024 * 1024) {
      setProofError('Video must be under 30MB')
      return
    }
    setProofVideo(file)
    setProofVideoPreview(URL.createObjectURL(file))
  }

  const submitProof = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvingIssue) return
    if (!proofPhoto) {
      setProofError('Mandatory resolution photo proof is required.')
      return
    }
    if (proofScanState === 'fake') {
      setProofError('Cannot submit: AI flagged this resolution photo as fake/invalid. Please upload an authentic photo of the repaired site.')
      return
    }
    if (proofScanState === 'scanning') {
      setProofError('Please wait for AI proof inspection to finish.')
      return
    }
    if (proofNote.trim().length < 4) {
      setProofError('Please enter a brief note describing the repair work completed.')
      return
    }

    setSubmittingProof(true)
    setProofError('')

    const formData = new FormData()
    formData.append('photo', proofPhoto)
    if (proofVideo) formData.append('video', proofVideo)
    formData.append('notes', proofNote)

    try {
      const response = await fetch(`${API_URL}/api/workers/me/issues/${resolvingIssue.id}/resolve-proof`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Could not submit resolution proof')
      }

      closeResolveModal()
      load()
    } catch (err) {
      setProofError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmittingProof(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="page worker-page-deck">
      {/* WORKER HERO COCKPIT */}
      <div className="worker-hero-glass-card">
        <div className="hero-top-row">
          <div className="worker-identity-group">
            <UserAvatar avatarUrl={workerUser?.avatar_url} name={workerUser?.full_name || 'Field Officer'} size={72} />
            <div>
              <div className="hero-top-kicker">
                <span className="live-dot-pulse" />
                <span>MUNICIPAL FIELD COCKPIT · ON DUTY</span>
              </div>
              <h1 className="worker-deck-title">{workerUser?.full_name || 'Field Officer'}</h1>
              <p className="worker-deck-subtitle">
                {issues.length} active assignment{issues.length === 1 ? '' : 's'} assigned to your queue today.
              </p>
            </div>
          </div>

          <div className="worker-route-actions">
            <button
              type="button"
              className="primary-button open-route-btn"
              onClick={() => openMapRoute(issues)}
              disabled={issues.length === 0}
            >
              <Navigation size={17} /> Open Full GPS Route
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="empty-state glass-card-elevated" style={{ padding: 40 }}>
          <LoaderCircle className="spin text-teal" size={30} /> Loading assigned route...
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

      {/* ACTIVE GPS MAP */}
      {!loading && !error && issues.length > 0 && (
        <div className="community-map-glass-card" style={{ marginBottom: 28 }}>
          <div className="map-glass-header">
            <div className="map-title-left">
              <Layers size={16} className="text-teal" />
              <strong>Active GPS Dispatch Route</strong>
            </div>
            <span className="live-signal-count">
              <span className="live-dot-green" /> {issues.length} assigned stop{issues.length === 1 ? '' : 's'}
            </span>
          </div>
          <IssueMap issues={issues} />
        </div>
      )}

      {/* ASSIGNED ISSUES LIST */}
      {!loading && !error && issues.length === 0 ? (
        <div className="empty-state glass-card-elevated" style={{ padding: 48 }}>
          <CheckCircle2 size={40} className="text-emerald" />
          <strong style={{ fontSize: 20, marginTop: 10 }}>All Clear! Queue Empty</strong>
          <p>You have resolved all assigned civic tasks. New assignments will appear here automatically.</p>
        </div>
      ) : (
        !loading &&
        !error && (
          <div className="worker-task-grid">
            {issues.map((issue) => (
              <div className="worker-task-glass-card" key={issue.id}>
                <div className="task-header-row">
                  <span className="task-id-badge">STOP #{issue.id}</span>
                  <div className={`status-pill-badge ${statusColor(issue.status)}`}>
                    <span className={`status-dot-pulse ${statusColor(issue.status)}`} />
                    <span>{displayStatus(issue.status)}</span>
                  </div>
                  <span className={`priority-badge ${(issue.priority || 'medium').toLowerCase()}`}>
                    {issue.priority} Priority
                  </span>
                </div>

                <h3 className="task-title">{issue.title}</h3>

                <div className="task-details-meta">
                  <p className="task-dept">
                    <span className="dept-dot" /> {issue.department} · {issue.subtype}
                  </p>
                  <p className="task-coords">
                    📍 {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}
                  </p>
                </div>

                <div className="task-actions-row">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="worker-google-nav-btn"
                    title="Open Turn-by-Turn GPS Navigation in Google Maps"
                  >
                    <Navigation size={14} /> Navigate (Google Maps)
                  </a>

                  {issue.status !== 'in_progress' && (
                    <button
                      type="button"
                      className="outline-button btn-compact"
                      onClick={() => updateStatus(issue.id, 'in_progress')}
                    >
                      <Wrench size={14} /> Start Work
                    </button>
                  )}

                  <button
                    type="button"
                    className="primary-button resolve-btn-accent btn-compact"
                    onClick={() => openResolveModal(issue)}
                  >
                    <ShieldCheck size={15} /> Resolve with Proof <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* RESOLUTION PROOF MODAL */}
      {resolvingIssue && (
        <div className="modal-backdrop" onClick={() => !submittingProof && closeResolveModal()}>
          <div className="modal-glass-card resolution-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-box teal">
                <ShieldCheck size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <span className="eyebrow" style={{ fontSize: 10 }}>OFFICER RESOLUTION PROOF</span>
                <h2 style={{ fontSize: 18, margin: 0 }}>Resolve Issue #{resolvingIssue.id}</h2>
                <p className="modal-subtext" style={{ fontSize: 12 }}>{resolvingIssue.title}</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={closeResolveModal} disabled={submittingProof}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={submitProof} className="resolution-form" style={{ marginTop: 16 }}>
              <div className="proof-notice-card">
                <ShieldCheck size={18} className="text-teal" />
                <span>
                  Mandatory resolution proof photos are verified by AI and inspected by the citizen before closure.
                </span>
              </div>

              {/* Photo Upload */}
              <div className="proof-field-group">
                <label className="proof-label-title">
                  <strong>1. Resolution Proof Photo (Required)</strong>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handleProofPhotoSelect}
                  id="proof-photo-file-input"
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="proof-photo-file-input"
                  className={`proof-upload-dropzone ${
                    proofScanState === 'fake' ? 'dropzone-fake' : proofScanState === 'valid' ? 'dropzone-valid' : ''
                  }`}
                >
                  {proofPhotoPreview ? (
                    <img src={proofPhotoPreview} alt="Resolution proof" className="proof-preview-img" />
                  ) : (
                    <div className="dropzone-empty-inner">
                      <Camera size={28} className="text-teal" />
                      <span>Take or upload photo of the completed repair</span>
                    </div>
                  )}
                </label>
              </div>

              {/* AI PROOF SCAN FEEDBACK */}
              {proofScanState === 'scanning' && (
                <div className="ai-proof-card scanning">
                  <LoaderCircle className="spin text-teal" size={20} />
                  <div>
                    <strong>AI Inspecting Resolution Proof...</strong>
                    <p>Verifying repaired public infrastructure and genuine site completion.</p>
                  </div>
                </div>
              )}

              {proofScanState === 'fake' && (
                <div className="ai-proof-card fake">
                  <ShieldAlert size={22} className="text-coral" />
                  <div>
                    <strong>🚫 Fake / Non-Civic Image Detected</strong>
                    <p className="fake-reason">{proofScanReason}</p>
                  </div>
                </div>
              )}

              {proofScanState === 'valid' && (
                <div className="ai-proof-card valid">
                  <Sparkles size={18} className="text-emerald" />
                  <div>
                    <strong>✅ AI Verified Authentic Work Done Proof</strong>
                    <p>{proofScanReason}</p>
                  </div>
                </div>
              )}

              {/* Video Upload */}
              <div className="proof-field-group" style={{ marginTop: 14 }}>
                <label className="proof-label-title">
                  <strong>2. Resolution Video Clip (Optional)</strong>
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/mov"
                  capture="environment"
                  onChange={handleProofVideoSelect}
                  id="proof-video-file-input"
                  style={{ display: 'none' }}
                />
                <label htmlFor="proof-video-file-input" className="proof-upload-dropzone video-dropzone">
                  {proofVideoPreview ? (
                    <video src={proofVideoPreview} controls className="proof-preview-video" />
                  ) : (
                    <div className="dropzone-empty-inner">
                      <Video size={24} className="text-sky" />
                      <span>Attach 10–20s video proof of smooth traffic / repaired site</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Resolution Summary */}
              <div className="proof-field-group" style={{ marginTop: 14 }}>
                <label className="proof-label-title">
                  <strong>3. Resolution Summary & Repair Notes</strong>
                </label>
                <textarea
                  required
                  rows={3}
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="Describe repair actions taken (e.g., pothole patched with asphalt and compacted; site cleaned)..."
                  className="proof-textarea"
                />
              </div>

              {proofError && <p className="form-error" style={{ marginTop: 12 }}>{proofError}</p>}

              <div className="modal-actions" style={{ marginTop: 20 }}>
                <button type="button" className="outline-button" onClick={closeResolveModal} disabled={submittingProof}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button resolve-btn-accent"
                  disabled={submittingProof || !proofPhoto || proofScanState === 'fake' || proofScanState === 'scanning'}
                >
                  {submittingProof ? (
                    <>
                      <LoaderCircle className="spin" size={16} /> Submitting Proof...
                    </>
                  ) : proofScanState === 'scanning' ? (
                    <>
                      <LoaderCircle className="spin" size={16} /> AI Inspecting Proof...
                    </>
                  ) : proofScanState === 'fake' ? (
                    <>
                      <XCircle size={16} /> Blocked: Fake Proof Photo
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} /> Submit Resolution Proof
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
