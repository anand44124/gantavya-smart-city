import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

export default function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('gantavya_install_dismissed') === 'true'
  })

  useEffect(() => {
    // Check if already running as installed app
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (isRunningStandalone) {
      setIsStandalone(true)
      return
    }

    // Do NOT show banner on iOS (keep iOS pristine)
    const userAgent = window.navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return
    }

    // Capture Android / Chrome PWA install event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Never render on iOS or if already installed / dismissed or if prompt not ready
  if (isStandalone || dismissed || !deferredPrompt) {
    return null
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      localStorage.setItem('gantavya_install_dismissed', 'true')
      setDismissed(true)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('gantavya_install_dismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="install-app-floating-capsule" role="region" aria-label="Install Mobile App">
      <div className="install-app-icon-box">
        <img src="/gantavya-icon-celtic-emerald.png" alt="Gantavya Icon" />
      </div>
      <div className="install-app-text-col">
        <strong>Install Gantavya App</strong>
        <span>1-Tap Native Android Access</span>
      </div>
      <button
        type="button"
        className="install-now-action-btn"
        onClick={handleInstallClick}
        aria-label="Install Gantavya Native App"
      >
        <Download size={15} />
        <span>Install App</span>
      </button>
      <button
        type="button"
        className="install-capsule-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
      >
        <X size={14} />
      </button>
    </div>
  )
}
