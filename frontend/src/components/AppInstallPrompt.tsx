import { useState, useEffect } from 'react'
import { Download, Apple, X, Check, Share2, PlusSquare } from 'lucide-react'

export default function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if already installed / running in standalone app mode
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isRunningStandalone) {
      setIsStandalone(true)
      return
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isAppleDevice)

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

  if (isStandalone || dismissed) {
    return null
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true)
      return
    }

    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
        setDismissed(true)
      }
    } else {
      // Fallback if beforeinstallprompt is not available yet (e.g. desktop Chrome / other browser)
      alert('To install: Tap the 3-dots menu on your browser, then tap "Add to Home screen" or "Install App".')
    }
  }

  return (
    <>
      {/* FLOATING 1-TAP INSTALL CAPSULE */}
      <div className="install-app-floating-capsule" role="region" aria-label="Install Mobile App">
        <div className="install-app-icon-box">
          <img src="/gantavya-icon-celtic-emerald.png" alt="Gantavya Icon" />
        </div>
        <div className="install-app-text-col">
          <strong>Install Gantavya App</strong>
          <span>1-Tap Native Android & iOS Access</span>
        </div>
        <button
          type="button"
          className="install-now-action-btn"
          onClick={handleInstallClick}
          aria-label="Install Gantavya Native App"
        >
          {isIOS ? <Apple size={16} /> : <Download size={16} />}
          <span>{isIOS ? 'Add to iOS' : 'Install App'}</span>
        </button>
        <button
          type="button"
          className="install-capsule-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
        >
          <X size={14} />
        </button>
      </div>

      {/* IOS STEP-BY-STEP INSTRUCTIONS MODAL */}
      {showIOSModal && (
        <div className="ios-install-backdrop" onClick={() => setShowIOSModal(false)}>
          <div className="ios-install-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ios-modal-header">
              <div className="ios-modal-title">
                <Apple size={24} className="text-emerald" />
                <h3>Install on iPhone / iPad</h3>
              </div>
              <button className="ios-modal-close" onClick={() => setShowIOSModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="ios-steps-list">
              <div className="ios-step-item">
                <div className="ios-step-num">1</div>
                <div className="ios-step-text">
                  <p>Tap the <strong>Share</strong> button <Share2 size={16} className="inline-icon" /> at the bottom of Safari.</p>
                </div>
              </div>
              
              <div className="ios-step-item">
                <div className="ios-step-num">2</div>
                <div className="ios-step-text">
                  <p>Scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquare size={16} className="inline-icon" />.</p>
                </div>
              </div>

              <div className="ios-step-item">
                <div className="ios-step-num">3</div>
                <div className="ios-step-text">
                  <p>Tap <strong>"Add"</strong> in the top-right corner to finish!</p>
                </div>
              </div>
            </div>

            <div className="ios-modal-footer">
              <button className="primary-button full-width" onClick={() => setShowIOSModal(false)}>
                <Check size={16} /> Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
