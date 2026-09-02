export const API_URL = import.meta.env.VITE_API_URL || ''

export type Report = {
  id: number
  reference: string
  title: string
  description: string | null
  location: string
  status: string
  priority: string
  age: string
  color: string
  issueId: number | null
  latitude: number
  longitude: number
  evidenceUrl?: string | null
  videoUrl?: string | null
  createdAt: string
}

export type ResolutionProof = {
  id: number
  issue_id: number
  worker_id: number
  worker_name: string | null
  photo_url: string
  video_url: string | null
  notes: string | null
  created_at: string
}

export type Issue = {
  id: number
  category: string
  subtype: string
  title: string
  status: string
  report_count: number
  priority: string
  department: string
  latitude: number
  longitude: number
  assigned_worker_id: number | null
  assigned_worker_name: string | null
  still_present: number
  marked_fixed: number
  evidence_url?: string | null
  video_url?: string | null
  description?: string | null
  resolution_proofs?: ResolutionProof[]
}

export type StatusEvent = { id: number; issue_id: number; from_status: string | null; to_status: string; note: string | null; created_at: string }
export type Worker = { id: number; name: string; assigned_issue_count: number }

export const displayStatus = (status: string, t?: (key: string, defaultText?: string) => string) => {
  const normStatus = (status || '').toLowerCase().replace(/[^a-z0-9_]/g, '_')
  
  if (t) {
    if (normStatus === 'completed' || normStatus === 'resolved') {
      return t('status_resolved', 'Resolved (Proof Uploaded)')
    }
    if (normStatus === 'verified_closed' || normStatus === 'verified' || normStatus === 'closed') {
      return t('status_verified_closed', 'Citizen Verified / Closed')
    }
    if (normStatus === 'in_progress' || normStatus === 'working') {
      return t('status_in_progress', 'In Progress')
    }
    if (normStatus === 'reported' || normStatus === 'new' || normStatus === 'open') {
      return t('status_reported', 'Reported')
    }
    if (normStatus === 'assigned') {
      return t('status_assigned', 'Assigned')
    }
    if (normStatus === 'acknowledged') {
      return t('status_acknowledged', 'Acknowledged')
    }
    const key = `status_${normStatus}`
    const val = t(key)
    if (val && val !== key) return val
  }

  if (normStatus === 'completed' || normStatus === 'resolved') return 'Resolved (Proof Uploaded)'
  if (normStatus === 'verified_closed' || normStatus === 'verified' || normStatus === 'closed') return 'Citizen Verified / Closed'
  if (normStatus === 'in_progress') return 'In Progress'
  if (normStatus === 'reported') return 'Reported'
  if (normStatus === 'assigned') return 'Assigned'
  if (normStatus === 'acknowledged') return 'Acknowledged'
  return status.replaceAll('_', ' ')
}

export const statusColor = (status: string) => {
  if (status === 'verified_closed' || status === 'verified') return 'mint'
  if (status === 'resolved') return 'mint'
  if (status === 'in_progress' || status === 'assigned') return 'coral'
  return 'amber'
}

export function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${localStorage.getItem('civicpulse_token') || ''}` }
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json()
  if (!response.ok) throw new Error(data.detail || fallback)
  return data as T
}

type RawReport = {
  id: number
  reference_code: string
  title: string
  description?: string | null
  status: string
  priority?: string | null
  department?: string | null
  latitude: number
  longitude: number
  created_at: string
  issue_id?: number | null
  evidence_url?: string | null
  video_url?: string | null
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Just now'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'Recently'
  
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 45) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) {
    const isToday = now.getDate() === date.getDate() && now.getMonth() === date.getMonth() && now.getFullYear() === date.getFullYear()
    if (isToday) {
      return `Today · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    return `${diffHour}h ago`
  }
  if (diffDay === 1) {
    return `Yesterday · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  if (diffDay < 7) {
    return `${diffDay}d ago`
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function mapReport(value: RawReport): Report {
  return {
    id: value.id,
    reference: value.reference_code,
    title: value.title,
    description: value.description ?? null,
    location: `${value.latitude.toFixed(4)}, ${value.longitude.toFixed(4)}`,
    status: value.status,
    priority: value.priority || 'medium',
    age: formatRelativeTime(value.created_at),
    color: statusColor(value.status),
    issueId: value.issue_id ?? null,
    latitude: value.latitude,
    longitude: value.longitude,
    evidenceUrl: value.evidence_url ?? `/api/reports/${value.id}/evidence`,
    videoUrl: value.video_url ?? (value.video_url ? `/api/reports/${value.id}/video` : null),
    createdAt: value.created_at,
  }
}

export async function fetchReports(): Promise<Report[]> {
  const response = await fetch(`${API_URL}/api/reports`, { headers: authHeaders() })
  const values = await readJson<RawReport[]>(response, 'Reports could not be loaded')
  return values.map(mapReport)
}

export async function fetchReport(id: string): Promise<Report> {
  const response = await fetch(`${API_URL}/api/reports/${id}`, { headers: authHeaders() })
  return mapReport(await readJson<RawReport>(response, 'Report not found'))
}

export async function fetchIssues(): Promise<Issue[]> {
  const response = await fetch(`${API_URL}/api/issues`, { headers: authHeaders() })
  return readJson(response, 'Issues could not be loaded')
}

export async function fetchIssue(id: string): Promise<Issue> {
  const response = await fetch(`${API_URL}/api/issues/${id}`, { headers: authHeaders() })
  return readJson(response, 'Issue not found')
}

export async function fetchIssueEvents(id: number): Promise<StatusEvent[]> {
  const response = await fetch(`${API_URL}/api/issues/${id}/events`, { headers: authHeaders() })
  return readJson(response, 'Timeline could not be loaded')
}

export async function fetchIssueReports(id: number): Promise<Report[]> {
  const response = await fetch(`${API_URL}/api/issues/${id}/reports`, { headers: authHeaders() })
  const values = await readJson<RawReport[]>(response, 'Linked reports could not be loaded')
  return values.map(mapReport)
}

export async function fetchWorkers(): Promise<Worker[]> {
  const response = await fetch(`${API_URL}/api/workers`, { headers: authHeaders() })
  return readJson(response, 'Workers could not be loaded')
}

export async function fetchActivity(): Promise<StatusEvent[]> {
  const response = await fetch(`${API_URL}/api/reports/activity`, { headers: authHeaders() })
  return readJson(response, 'Activity could not be loaded')
}

export async function fetchEvidenceUrl(reportId: number): Promise<string> {
  const response = await fetch(`${API_URL}/api/reports/${reportId}/evidence`, { headers: authHeaders() })
  if (!response.ok) throw new Error('Evidence not found')
  return URL.createObjectURL(await response.blob())
}

export async function confirmResolution(issueId: number, decision: 'accept' | 'reject', feedback?: string): Promise<Issue> {
  const response = await fetch(`${API_URL}/api/issues/${issueId}/citizen-confirm`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, feedback: feedback || '' }),
  })
  return readJson<Issue>(response, 'Could not record resolution confirmation')
}

export async function submitResolutionProof(issueId: number, photo: File, video: File | null, note: string): Promise<Issue> {
  const formData = new FormData()
  formData.append('photo', photo)
  if (video) formData.append('video', video)
  formData.append('note', note)

  const response = await fetch(`${API_URL}/api/workers/me/issues/${issueId}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('civicpulse_token') || ''}` },
    body: formData,
  })
  return readJson<Issue>(response, 'Failed to submit resolution proof')
}

export function openMapRoute(points: Array<{ latitude: number; longitude: number }>) {
  if (!points.length) return
  const route = points.map((point) => `${point.latitude},${point.longitude}`).join(';')
  window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(route)}`, '_blank', 'noopener')
}

