import { useEffect, useMemo, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  LoaderCircle,
  MapPin,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Wrench,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import CivicReceiptModal from './CivicReceiptModal'
import {
  API_URL,
  authHeaders,
  confirmResolution,
  displayStatus,
  fetchEvidenceUrl,
  fetchIssue,
  fetchIssueEvents,
  fetchIssueReports,
  fetchReport,
  formatRelativeTime,
  statusColor,
  type Issue,
  type Report,
  type StatusEvent,
} from './reportApi'
import { useTranslation } from '../i18n/LanguageContext'

function LifecycleStepper({ status }: { status: string }) {
  const steps = [
    { key: 'reported', label: 'Reported' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved', label: 'Resolved (Proof Uploaded)' },
    { key: 'verified_closed', label: 'Citizen Verified / Closed' },
  ]

  const getStepState = (stepKey: string) => {
    const statusOrder = ['reported', 'assigned', 'in_progress', 'resolved', 'verified_closed']
    const normalizedStatus = status === 'completed' ? 'resolved' : status === 'verified' ? 'verified_closed' : status
    const currentIndex = statusOrder.indexOf(normalizedStatus)
    const stepIndex = statusOrder.indexOf(stepKey)

    if (currentIndex > stepIndex) return 'done'
    if (currentIndex === stepIndex) return 'active'
    return 'pending'
  }

  return (
    <div className="lifecycle-stepper">
      {steps.map((step, idx) => {
        const state = getStepState(step.key)
        return (
          <div key={step.key} className={`stepper-node ${state}`}>
            <div className="stepper-marker">
              {state === 'done' ? (
                <CheckCircle2 size={15} />
              ) : state === 'active' ? (
                <Sparkles size={15} />
              ) : (
                <span>{idx + 1}</span>
              )}
            </div>
            <span className="stepper-text">{step.label}</span>
            {idx < steps.length - 1 && <div className="stepper-line" />}
          </div>
        )
      })}
    </div>
  )
}

function TimelineNode({
  event,
  isLatest,
}: {
  event: StatusEvent
  isLatest: boolean
}) {
  const normStatus = (event.to_status || '').toLowerCase()
  
  let Icon = FileText
  let colorClass = 'blue'
  if (normStatus === 'assigned') {
    Icon = Users
    colorClass = 'purple'
  } else if (normStatus === 'in_progress') {
    Icon = Wrench
    colorClass = 'amber'
  } else if (normStatus === 'resolved' || normStatus === 'completed') {
    Icon = Camera
    colorClass = 'green'
  } else if (normStatus === 'verified_closed' || normStatus === 'verified') {
    Icon = Sparkles
    colorClass = 'mint'
  }

  return (
    <div className={`timeline-node-card ${isLatest ? 'is-latest' : ''}`}>
      <div className={`timeline-node-orb ${colorClass}`}>
        <Icon size={15} />
      </div>
      <div className="timeline-node-content">
        <div className="timeline-node-header">
          <div className="timeline-status-pill-group">
            <span className={`status-pill ${colorClass}`}>
              {displayStatus(event.to_status)}
            </span>
            {isLatest && <span className="latest-live-tag">LATEST UPDATE</span>}
          </div>
          <span className="timeline-time-text">
            <Clock size={11} /> {formatRelativeTime(event.created_at)}
          </span>
        </div>
        <p className="timeline-note-text">{event.note || 'Status updated in municipal dispatch ledger.'}</p>
      </div>
    </div>
  )
}

export default function LiveIssueDetails() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const [report, setReport] = useState<Report | null>(null)
  const [issue, setIssue] = useState<Issue | null>(null)
  const [events, setEvents] = useState<StatusEvent[]>([])
  const [evidence, setEvidence] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reopenPromptOpen, setReopenPromptOpen] = useState(false)
  const [reopenFeedback, setReopenFeedback] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  const cleanedEvents = useMemo(() => {
    if (!events || events.length === 0) return []
    const res: StatusEvent[] = []
    for (const ev of events) {
      const prev = res[res.length - 1]
      if (prev && prev.to_status === ev.to_status && prev.note === ev.note) {
        continue
      }
      res.push(ev)
    }
    return res
  }, [events])

  const loadData = () => {
    setLoading(true)
    setError('')
    void fetchReport(id)
      .then(async (val) => {
        setReport(val)
        const [timeline, photo, issueData] = await Promise.all([
          val.issueId ? fetchIssueEvents(val.issueId) : Promise.resolve([]),
          fetchEvidenceUrl(val.id).catch(() => ''),
          val.issueId ? fetchIssue(String(val.issueId)).catch(() => null) : Promise.resolve(null),
        ])
        setEvents(timeline)
        setEvidence(photo)
        if (issueData) setIssue(issueData)
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'Report not found')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const interval = window.setInterval(() => {
      // Background silent sync
      void fetchReport(id).then(async (val) => {
        setReport(val)
        if (val.issueId) {
          const [timeline, issueData] = await Promise.all([
            fetchIssueEvents(val.issueId),
            fetchIssue(String(val.issueId)).catch(() => null),
          ])
          setEvents(timeline)
          if (issueData) setIssue(issueData)
        }
      }).catch(() => {})
    }, 3500)

    return () => {
      window.clearInterval(interval)
      if (evidence) URL.revokeObjectURL(evidence)
    }
  }, [id])

  const handleCitizenConfirm = async (decision: 'accept' | 'reject') => {
    if (!issue) return
    setActionLoading(true)
    try {
      await confirmResolution(issue.id, decision, reopenFeedback)
      setActionMessage(
        decision === 'accept'
          ? '🎉 Resolution confirmed! +100 Civic Points awarded to your account.'
          : '⚠️ Feedback sent to officer. Ticket reopened as In Progress.'
      )
      setReopenPromptOpen(false)
      loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading)
    return (
      <div className="page empty-state">
        <LoaderCircle className="spin" size={26} /> Loading report...
      </div>
    )

  if (error || !report)
    return (
      <div className="page empty-state">
        <strong>{error || 'Report not found'}</strong>
        <Link className="outline-button" to="/citizen/reports">
          Back to reports
        </Link>
      </div>
    )

  const currentStatus = issue ? issue.status : report.status
  const isAwaitingCitizenReview = currentStatus === 'resolved'

  return (
    <div className="page issue-details-page">
      <Link className="back-link" to="/citizen/reports">
        ← Back to reports
      </Link>

      <div className="detail-title">
        <div>
          <p className="eyebrow">REPORT {report.reference}</p>
          <h1>{report.title}</h1>
          <p className="muted">
            <MapPin size={14} /> {report.location}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="outline-button btn-compact"
            onClick={() => setReceiptOpen(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.8)',
              borderColor: 'rgba(13, 148, 136, 0.4)',
              color: '#0d9488',
              fontWeight: 700,
              fontSize: 12,
              padding: '6px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 9999,
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.1)',
            }}
          >
            <Printer size={14} /> Official Civic Slip
          </button>
          <span className={`priority ${statusColor(currentStatus)}`}>{displayStatus(currentStatus)}</span>
        </div>
      </div>

      {/* CIVIC RECEIPT MODAL */}
      <CivicReceiptModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        data={{
          reference_code: report.reference,
          title: report.title,
          category: (report as any).category || issue?.category || 'Road Infrastructure',
          department: (report as any).department || issue?.department || 'Public Works Department',
          status: currentStatus,
          created_at: report.createdAt || new Date().toISOString(),
          latitude: report.latitude,
          longitude: report.longitude,
          reporter_name: 'Verified Citizen Reporter',
          points_awarded: 50,
        }}
      />

      {/* LIFECYCLE STEPPER */}
      <LifecycleStepper status={currentStatus} />

      {/* CITIZEN CONFIRMATION ACTION PANEL */}
      {isAwaitingCitizenReview && (
        <div className="citizen-confirm-card">
          <div className="confirm-header">
            <Sparkles size={20} className="confirm-star" />
            <div>
              <h3>{t('citizen_review_heading')}</h3>
              <p>{t('citizen_review_desc')}</p>
            </div>
          </div>
          <div className="confirm-actions">
            <button
              className="primary-button btn-confirm"
              disabled={actionLoading}
              onClick={() => handleCitizenConfirm('accept')}
            >
              <CheckCircle2 size={17} /> {t('citizen_confirm_btn')}
            </button>
            <button
              className="outline-button btn-reopen"
              disabled={actionLoading}
              onClick={() => setReopenPromptOpen(true)}
            >
              <RefreshCw size={15} /> {t('citizen_reopen_btn')}
            </button>
          </div>
        </div>
      )}

      {/* REOPEN PROMPT MODAL */}
      {reopenPromptOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>{t('citizen_reopen_btn')}</h3>
            <p className="muted">{t('citizen_reopen_prompt')}</p>
            <textarea
              rows={3}
              required
              value={reopenFeedback}
              onChange={(e) => setReopenFeedback(e.target.value)}
              placeholder="e.g. Pothole asphalt is not level / rubble left on roadside..."
            />
            <div className="modal-actions">
              <button className="outline-button" onClick={() => setReopenPromptOpen(false)}>
                Cancel
              </button>
              <button
                className="primary-button"
                disabled={actionLoading || !reopenFeedback.trim()}
                onClick={() => handleCitizenConfirm('reject')}
              >
                Submit Rework Request
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMessage && <p className="form-success">{actionMessage}</p>}

      {/* OFFICER RESOLUTION PROOFS */}
      {issue?.resolution_proofs && issue.resolution_proofs.length > 0 && (
        <div className="resolution-proof-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">OFFICER VERIFICATION</p>
              <h2>Resolution Proof from Field Team</h2>
            </div>
          </div>

          <div className="proofs-grid">
            {issue.resolution_proofs.map((proof) => {
              const photoSrc = proof.photo_url.startsWith('http') || proof.photo_url.startsWith('blob:') ? proof.photo_url : `${API_URL}${proof.photo_url}`
              const videoSrc = proof.video_url ? (proof.video_url.startsWith('http') || proof.video_url.startsWith('blob:') ? proof.video_url : `${API_URL}${proof.video_url}`) : null
              return (
                <div key={proof.id} className="proof-card">
                  <div className="proof-photo-wrapper">
                    <img src={photoSrc} alt="Resolution photo proof" className="proof-image" />
                    <span className="proof-badge">
                      <ShieldCheck size={14} /> Field Proof
                    </span>
                  </div>
                  {videoSrc && (
                    <div className="proof-video-wrapper">
                      <video src={videoSrc} controls className="proof-video-player" />
                    </div>
                  )}
                  <div className="proof-meta">
                    <p className="proof-notes">"{proof.notes || 'Repairs completed and site cleared.'}"</p>
                    <div className="proof-footer">
                      <span>Officer: <b>{proof.worker_name || 'Assigned Officer'}</b></span>
                      <small>{formatRelativeTime(proof.created_at)}</small>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ORIGINAL CITIZEN EVIDENCE (PHOTO & VIDEO) */}
      <div className="citizen-evidence-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ORIGINAL REPORT EVIDENCE</p>
            <h2>Citizen Submission Media</h2>
          </div>
        </div>

        <div className="evidence-media-grid">
          {evidence ? (
            <div className="evidence-box">
              <img className="evidence-photo" src={evidence} alt="Submitted civic evidence" />
              <span className="media-label"><Camera size={13} /> Original Photo</span>
            </div>
          ) : (
            <div className="evidence-placeholder">
              <Camera size={28} />
              <span>Evidence photo unavailable</span>
            </div>
          )}

          {report.videoUrl && (
            <div className="evidence-box">
              <video
                className="evidence-video-player"
                src={report.videoUrl.startsWith('http') || report.videoUrl.startsWith('blob:') ? report.videoUrl : `${API_URL}${report.videoUrl}`}
                controls
              />
              <span className="media-label"><Video size={13} /> Citizen Video Clip</span>
            </div>
          )}
        </div>
      </div>

      {report.description && (
        <div className="problem-context-card">
          <div className="context-card-header">
            <div className="context-icon-orb">
              <FileText size={17} />
            </div>
            <div>
              <span className="context-kicker">PROBLEM CONTEXT & AI SUMMARY</span>
              <h3 className="context-title">Citizen Submission Details</h3>
            </div>
          </div>
          <p className="context-body-text">{report.description}</p>
        </div>
      )}

      {/* LUXURY AUDIT TIMELINE CARD */}
      <div className="audit-timeline-card">
        <div className="timeline-card-header">
          <div className="timeline-header-left">
            <div className="timeline-header-icon">
              <Clock size={17} />
            </div>
            <div>
              <span className="timeline-kicker">MUNICIPAL AUDIT TRAIL</span>
              <h3 className="timeline-heading">Lifecycle & Event Timeline</h3>
            </div>
          </div>
          <span className="timeline-events-counter">
            {cleanedEvents.length} Recorded Milestone{cleanedEvents.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="timeline-stream-container">
          <div className="timeline-track-line" />
          {cleanedEvents.length === 0 ? (
            <div className="timeline-node-card is-latest">
              <div className="timeline-node-orb blue">
                <FileText size={15} />
              </div>
              <div className="timeline-node-content">
                <div className="timeline-node-header">
                  <span className="status-pill blue">Reported</span>
                  <span className="timeline-time-text">{report.age}</span>
                </div>
                <p className="timeline-note-text">Civic issue reported and logged into city queue.</p>
              </div>
            </div>
          ) : (
            cleanedEvents.map((event, index) => (
              <TimelineNode
                key={event.id || index}
                event={event}
                isLatest={index === cleanedEvents.length - 1}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function LiveCommunityIssue() {
  const { id = '' } = useParams()
  const [issue, setIssue] = useState<Awaited<ReturnType<typeof fetchIssue>> | null>(null)
  const [events, setEvents] = useState<StatusEvent[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [evidence, setEvidence] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    setError('')
    void fetchIssue(id)
      .then(async (value) => {
        const [timeline, linked] = await Promise.all([fetchIssueEvents(value.id), fetchIssueReports(value.id)])
        const photo = linked[0] ? await fetchEvidenceUrl(linked[0].id).catch(() => '') : ''
        setIssue(value)
        setEvents(timeline)
        setReports(linked)
        setEvidence(photo)
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Issue not found'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    return () => {
      if (evidence) URL.revokeObjectURL(evidence)
    }
  }, [id])

  const verify = async (result: 'still_present' | 'fixed') => {
    const response = await fetch(`${API_URL}/api/issues/${id}/verify`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    })
    const data = await response.json()
    if (!response.ok) return setError(data.detail || 'Verification failed')
    setIssue(data)
    setMessage(
      result === 'fixed'
        ? '🎉 Marked as looking fixed (+15 Civic Points earned)!'
        : 'Confirmed still present (+15 Civic Points earned)!'
    )
  }

  if (loading)
    return (
      <div className="page empty-state">
        <LoaderCircle className="spin" size={26} /> Loading community issue...
      </div>
    )

  if (error || !issue)
    return (
      <div className="page empty-state">
        <strong>{error || 'Issue not found'}</strong>
        <Link className="outline-button" to="/citizen/community">
          Back to community
        </Link>
      </div>
    )

  return (
    <div className="page">
      <Link className="back-link" to="/citizen/community">
        Back to community
      </Link>
      <div className="detail-title">
        <div>
          <p className="eyebrow">{issue.department}</p>
          <h1>{issue.title}</h1>
          <p className="muted">
            {issue.category.replaceAll('_', ' ')} · {issue.report_count} report
            {issue.report_count === 1 ? '' : 's'} · {issue.latitude.toFixed(4)}, {issue.longitude.toFixed(4)}
          </p>
        </div>
        <span className={`priority ${statusColor(issue.status)}`}>{displayStatus(issue.status)}</span>
      </div>

      <LifecycleStepper status={issue.status} />

      {evidence ? (
        <img className="evidence-photo" src={evidence} alt="Community evidence" />
      ) : (
        <div className="evidence-placeholder">
          <Camera size={28} />
          <span>No evidence photo yet</span>
        </div>
      )}

      {/* RESOLUTION PROOFS IF RESOLVED */}
      {issue.resolution_proofs && issue.resolution_proofs.length > 0 && (
        <div className="resolution-proof-section">
          <h3>Officer Resolution Proof</h3>
          <div className="proofs-grid">
            {issue.resolution_proofs.map((p) => (
              <div key={p.id} className="proof-card">
                <img src={p.photo_url} alt="Resolution photo" className="proof-image" />
                {p.video_url && <video src={p.video_url} controls className="proof-video-player" />}
                <p className="proof-notes">"{p.notes || 'Repairs completed.'}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="verify-actions">
        <button className="outline-button" onClick={() => verify('still_present')}>
          <ShieldCheck size={16} /> Still present ({issue.still_present})
        </button>
        <button className="primary-button" onClick={() => verify('fixed')}>
          <CheckCircle2 size={16} /> Looks fixed ({issue.marked_fixed})
        </button>
      </div>

      {message && <p className="form-success">{message}</p>}

      {/* LUXURY AUDIT TIMELINE CARD */}
      <div className="audit-timeline-card" style={{ marginTop: 24, marginBottom: 28 }}>
        <div className="timeline-card-header">
          <div className="timeline-header-left">
            <div className="timeline-header-icon">
              <Clock size={17} />
            </div>
            <div>
              <span className="timeline-kicker">MUNICIPAL AUDIT TRAIL</span>
              <h3 className="timeline-heading">Community Issue Timeline</h3>
            </div>
          </div>
          <span className="timeline-events-counter">{events.length} Events</span>
        </div>

        <div className="timeline-stream-container">
          <div className="timeline-track-line" />
          {events.length === 0 ? (
            <div className="timeline-node-card is-latest">
              <div className="timeline-node-orb blue">
                <FileText size={15} />
              </div>
              <div className="timeline-node-content">
                <div className="timeline-node-header">
                  <span className="status-pill blue">Reported</span>
                </div>
                <p className="timeline-note-text">Issue reported by community.</p>
              </div>
            </div>
          ) : (
            events.map((event, index) => (
              <TimelineNode
                key={event.id || index}
                event={event}
                isLatest={index === events.length - 1}
              />
            ))
          )}
        </div>
      </div>

      <div className="section-heading">
        <div>
          <p className="eyebrow">LINKED SIGNALS</p>
          <h2>Reports on this issue</h2>
        </div>
      </div>
      <div className="report-stack">
        {reports.map((r) => (
          <Link to={`/citizen/issue/${r.id}`} className="report-card" key={r.id}>
            <div className={`report-icon ${r.color}`} />
            <div className="report-copy">
              <div className="card-meta">
                <span>{r.reference}</span>
                <span>{r.age}</span>
              </div>
              <h3>{r.title}</h3>
            </div>
            <ChevronRight className="card-arrow" size={17} />
          </Link>
        ))}
      </div>
    </div>
  )
}
