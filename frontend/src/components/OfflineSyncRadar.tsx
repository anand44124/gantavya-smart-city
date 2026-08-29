import { useEffect, useState } from 'react'
import {
  LoaderCircle,
  RefreshCw,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react'
import { API_URL, authHeaders } from './reportApi'

export default function OfflineSyncRadar() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('')
  const [queueCount, setQueueCount] = useState(0)

  const checkQueue = () => {
    try {
      const raw = localStorage.getItem('civicpulse_offline_queue')
      const queue = raw ? JSON.parse(raw) : []
      setQueueCount(queue.length)
    } catch {
      setQueueCount(0)
    }
  }

  useEffect(() => {
    checkQueue()

    const handleOnline = () => {
      setIsOnline(true)
      void autoDrainQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
      checkQueue()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('civicpulse_queue_updated', checkQueue)

    const timer = setInterval(checkQueue, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('civicpulse_queue_updated', checkQueue)
      clearInterval(timer)
    }
  }, [])

  const autoDrainQueue = async () => {
    try {
      const raw = localStorage.getItem('civicpulse_offline_queue')
      if (!raw) return
      const queue: Array<{
        title: string
        description: string
        category: string
        latitude: number
        longitude: number
        evidence_base64?: string
      }> = JSON.parse(raw)

      if (queue.length === 0) return

      setSyncing(true)
      let synced = 0

      for (const item of queue) {
        const formData = new FormData()
        formData.append('title', item.title)
        if (item.description) formData.append('description', item.description)
        formData.append('category', item.category || 'road_infrastructure')
        formData.append('latitude', String(item.latitude))
        formData.append('longitude', String(item.longitude))

        if (item.evidence_base64) {
          const res = await fetch(item.evidence_base64)
          const blob = await res.blob()
          formData.append('evidence', blob, 'offline_evidence.jpg')
        }

        const response = await fetch(`${API_URL}/api/reports`, {
          method: 'POST',
          headers: authHeaders(),
          body: formData,
        })

        if (response.ok) {
          synced++
        }
      }

      localStorage.removeItem('civicpulse_offline_queue')
      setQueueCount(0)
      if (synced > 0) {
        setSyncSuccessMsg(`✨ Auto-Synced ${synced} Offline Report${synced === 1 ? '' : 's'} to Cloud (+${synced * 50} PTS Awarded)!`)
        setTimeout(() => setSyncSuccessMsg(''), 6000)
      }
    } catch {
      // Keep queue for retry
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      {/* 1. COMPACT TOP OFFLINE BAR (ONLY VISIBLE WHEN INTERNET DISCONNECTED) */}
      {!isOnline && (
        <div className="pwa-offline-bar">
          <div className="pwa-offline-content">
            <span className="pwa-offline-icon-box">
              <WifiOff size={14} />
            </span>
            <div className="pwa-offline-text">
              <strong>Offline Mode Active</strong>
              <span>
                {queueCount > 0
                  ? `${queueCount} report${queueCount === 1 ? '' : 's'} stored locally — will auto-sync on reconnect.`
                  : 'You can still take photos & create reports. Stored safely.'}
              </span>
            </div>
          </div>
          {queueCount > 0 && (
            <button
              className="pwa-sync-btn"
              onClick={autoDrainQueue}
              disabled={syncing}
              title="Attempt reconnection sync"
            >
              {syncing ? <LoaderCircle className="spin" size={12} /> : <RefreshCw size={12} />}
              Sync Now
            </button>
          )}
        </div>
      )}

      {/* 2. AUTO-SYNC SUCCESS TOAST */}
      {syncSuccessMsg && (
        <div className="pwa-sync-toast">
          <Sparkles size={16} color="#10b981" />
          <span>{syncSuccessMsg}</span>
          <button className="toast-close-btn" onClick={() => setSyncSuccessMsg('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  )
}
