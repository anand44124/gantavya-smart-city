import { useEffect, useState } from 'react'
import {
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react'

type CivicReceiptProps = {
  isOpen: boolean
  onClose: () => void
  data: {
    reference_code: string
    title: string
    category: string
    department?: string
    status: string
    created_at: string
    latitude: number
    longitude: number
    reporter_name?: string
    points_awarded?: number
    sla_due_at?: string
  }
}

export default function CivicReceiptModal({ isOpen, onClose, data }: CivicReceiptProps) {
  const [dispensed, setDispensed] = useState(false)
  const [ledActive, setLedActive] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setLedActive(true)
      const timer = setTimeout(() => {
        setDispensed(true)
      }, 200)
      return () => clearTimeout(timer)
    } else {
      setDispensed(false)
      setLedActive(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  // Generate scannable barcode lines
  const renderBarcodeBars = () => {
    const bars = []
    const seed = data.reference_code.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    for (let i = 0; i < 48; i++) {
      const isThick = ((seed * (i + 13)) % 7) > 3
      const isWide = ((seed * (i + 7)) % 11) > 6
      bars.push(
        <div
          key={i}
          style={{
            height: '42px',
            width: isThick ? '3.5px' : isWide ? '2px' : '1px',
            backgroundColor: '#0f172a',
            borderRadius: '1px',
            display: 'inline-block',
            marginRight: isWide ? '3px' : '2px',
          }}
        />
      )
    }
    return bars
  }

  const formattedDate = new Date(data.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const formattedTime = new Date(data.created_at || Date.now()).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-card civic-receipt-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440, padding: '24px 20px', position: 'relative' }}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(0,0,0,0.06)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <X size={16} />
        </button>

        {/* METALLIC HARDWARE DISPENSER */}
        <div className="printer-machine" style={{ marginBottom: -8 }}>
          <div className="printer-slit"></div>
          <div className={`printer-led ${ledActive ? 'active' : ''}`}></div>
        </div>

        {/* LUXURY TICKET SLIP */}
        <div className="paper-tray" style={{ perspective: 1000 }}>
          <div
            className={`ticket ${dispensed ? 'dispensed' : ''} print-receipt-card`}
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '24px 20px 20px',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
              border: '1px solid rgba(226, 232, 240, 0.9)',
              position: 'relative',
            }}
          >
            {/* Cutouts */}
            <div className="ticket-cutout-left" style={{ top: '64%' }}></div>
            <div className="ticket-cutout-right" style={{ top: '64%' }}></div>

            {/* Header / Seal */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <img src="/gantavya-icon-celtic-emerald.png" alt="Gantavya" style={{ width: 34, height: 34, borderRadius: 8 }} />
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(16, 185, 129, 0.15))',
                  padding: '4px 12px',
                  borderRadius: 9999,
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  marginBottom: 6,
                }}
              >
                <ShieldCheck size={14} color="#0d9488" />
                <span style={{ fontSize: 11, fontWeight: 800, color: '#0d9488', letterSpacing: '0.6px' }}>
                  OFFICIAL GANTAVYA RECEIPT
                </span>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: '0 0 2px' }}>
                गंतव्य · Smart City Grid
              </h2>
              <p style={{ fontSize: 11.5, color: '#64748b', margin: 0, fontWeight: 600 }}>
                Gantavya Infrastructure & Mobility Network
              </p>
            </div>

            <div className="dotted-line" style={{ margin: '14px 0' }}></div>

            {/* ISSUE DETAILS */}
            <div style={{ marginBottom: 14 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.5px',
                }}
              >
                Report Reference
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                  {data.reference_code || 'CP-TRACK'}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 9999,
                    background:
                      data.status === 'verified_closed' || data.status === 'resolved'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(2, 132, 199, 0.15)',
                    color:
                      data.status === 'verified_closed' || data.status === 'resolved' ? '#059669' : '#0284c7',
                  }}
                >
                  ● {data.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <h3
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1e293b',
                  margin: '8px 0 4px',
                  lineHeight: 1.35,
                }}
              >
                {data.title}
              </h3>
            </div>

            {/* META 2x2 GRID */}
            <div className="meta-grid" style={{ marginBottom: 14 }}>
              <div>
                <div className="meta-label">Category</div>
                <div className="meta-val" style={{ textTransform: 'capitalize' }}>
                  {data.category.replace('_', ' ')}
                </div>
              </div>
              <div>
                <div className="meta-label right">Citizen Reward</div>
                <div className="meta-val right points" style={{ color: '#0d9488', fontWeight: 800 }}>
                  ⭐ +{data.points_awarded || 50} PTS
                </div>
              </div>
              <div>
                <div className="meta-label">Filed At</div>
                <div className="meta-val">
                  {formattedDate} · {formattedTime}
                </div>
              </div>
              <div>
                <div className="meta-label right">Coordinates</div>
                <div className="meta-val right" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                  {data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}
                </div>
              </div>
            </div>

            {/* VERIFICATION BADGE */}
            <div className="civic-card-badge" style={{ margin: '14px 0 16px' }}>
              <div className="badge-left">
                <div className="badge-avatar" style={{ background: '#0d9488', color: '#fff' }}>
                  CP
                </div>
                <div>
                  <div className="badge-name">{data.reporter_name || 'Verified Citizen Reporter'}</div>
                  <div className="badge-id">AI Cryptographic Hash Verified</div>
                </div>
              </div>
              <div className="badge-tag" style={{ background: '#ecfdf5', color: '#059669' }}>
                Authentic
              </div>
            </div>

            {/* SCANNABLE BARCODE SECTION */}
            <div className="barcode-section" style={{ textAlign: 'center' }}>
              <div className="barcode-lines" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {renderBarcodeBars()}
              </div>
              <div className="barcode-num" style={{ fontSize: 12, letterSpacing: '2px', fontWeight: 700, color: '#475569' }}>
                {data.reference_code} · {data.created_at ? new Date(data.created_at).getTime().toString().slice(-8) : '93827104'}
              </div>
            </div>
          </div>
        </div>

        {/* PRINT / DOWNLOAD ACTIONS */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            type="button"
            className="primary-button full"
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
              color: '#ffffff',
              fontWeight: 800,
            }}
          >
            <Printer size={16} /> Print / Save Civic Slip
          </button>
          <button
            type="button"
            className="outline-button"
            onClick={onClose}
            style={{ fontWeight: 700, padding: '0 16px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
