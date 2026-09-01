import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Award, Edit3, Printer, ShieldCheck, X } from 'lucide-react'

type User = {
  full_name: string
  email: string
  points?: number
  badge_level?: string
}

interface CivicCertificateModalProps {
  user: User
  onClose: () => void
}

export function CivicCertificateModal({ user, onClose }: CivicCertificateModalProps) {
  const [recipientName, setRecipientName] = useState(user.full_name || 'Demo Citizen 1')
  const points = user.points ?? 49150
  const badgeLevel = user.badge_level ?? 'Diamond Reformer'
  const certId = `GAN-2026-HONOR-${(user.full_name.length * 77 + points).toString().slice(0, 5)}`
  const dateStr = '31 August 2026'

  useEffect(() => {
    // Prevent background scrolling while certificate is open on mobile/desktop
    const originalStyle = window.getComputedStyle(document.body).overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const modalContent = (
    <div className="certificate-modal-overlay" onClick={onClose}>
      <div className="certificate-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* MODAL ACTION BAR */}
        <div className="certificate-action-bar no-print">
          <div className="cert-action-info">
            <Award className="cert-header-icon" size={20} />
            <div>
              <h3>Official Civic Honor Certificate</h3>
              <p>Printable & Verified Government Certificate of Excellence</p>
            </div>
          </div>
          
          {/* INLINE NAME CHANGER */}
          <div className="cert-name-edit-field">
            <Edit3 size={15} color="#059669" />
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Edit Recipient Name..."
              className="cert-name-input-bar"
              title="Type any name to update certificate dynamically"
            />
          </div>

          <div className="cert-action-btns">
            <button type="button" className="print-cert-btn" onClick={handlePrint}>
              <Printer size={16} /> Print / Save as PDF
            </button>
            <button type="button" className="close-cert-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE CERTIFICATE SCROLL WRAPPER */}
        <div className="certificate-scroll-wrapper">
          <div className="certificate-paper-frame" id="printable-certificate">
          {/* GOLD ORNAMENTAL DOUBLE BORDER */}
          <div className="cert-border-outer">
            <div className="cert-border-inner">
              {/* WATERMARK SEAL */}
              <div className="cert-watermark-bg">
                <img src="/gantavya-icon-celtic-emerald.png" alt="Watermark" />
              </div>

              {/* HEADER LOGOS & ISSUING AUTHORITY */}
              <div className="cert-header">
                <div className="cert-brand-logo">
                  <img src="/gantavya-icon-celtic-emerald.png" alt="Gantavya Emblem" />
                  <span className="cert-devanagari">गंतव्य</span>
                </div>
                <div className="cert-authority-title">
                  <h4>MUNICIPAL CORPORATION & SMART CITY GOVERNANCE AUTHORITY</h4>
                  <h5>NATIONAL CIVIC EXCELLENCE & HONOUR COMMITTEE</h5>
                </div>
                <div className="cert-emblem-badge">
                  <ShieldCheck size={36} color="#059669" />
                  <span>OFFICIAL SEAL</span>
                </div>
              </div>

              {/* CERTIFICATE TITLE */}
              <div className="cert-title-section">
                <div className="cert-ribbon-tag">OFFICIAL CITIZEN HONOR</div>
                <h1 className="cert-main-heading">CERTIFICATE OF CIVIC EXCELLENCE</h1>
                <p className="cert-subheading">THIS CERTIFICATE IS PROUDLY PRESENTED TO</p>
              </div>

              {/* RECIPIENT NAME (DYNAMIC & EDITABLE) */}
              <div className="cert-recipient-box">
                <h2 
                  className="cert-user-name" 
                  contentEditable 
                  suppressContentEditableWarning
                  onBlur={(e) => setRecipientName(e.currentTarget.textContent || recipientName)}
                  title="Click to directly edit name"
                >
                  {recipientName}
                </h2>
                <div className="cert-underline-gold" />
              </div>

              {/* CITATION BODY */}
              <p className="cert-citation-body">
                In recognition of outstanding dedication to urban governance, active civic reporting, and exemplary 
                contributions towards building a cleaner, safer, and smarter municipality. Having accumulated{' '}
                <strong className="highlight-text">{points.toLocaleString()} Civic Points</strong> and earned the distinguished rank of{' '}
                <strong className="highlight-text">{badgeLevel}</strong> on the Gantavya Smart City Portal.
              </p>

              {/* STATS & METADATA BADGES */}
              <div className="cert-meta-grid">
                <div className="cert-meta-card">
                  <span className="meta-lbl">CIVIC RANK TIER</span>
                  <strong className="meta-val">{badgeLevel}</strong>
                </div>
                <div className="cert-meta-card">
                  <span className="meta-lbl">HONOR POINTS EARNED</span>
                  <strong className="meta-val">{points.toLocaleString()} PTS</strong>
                </div>
                <div className="cert-meta-card">
                  <span className="meta-lbl">CERTIFICATE SERIAL ID</span>
                  <strong className="meta-val">{certId}</strong>
                </div>
              </div>

              {/* FOOTER SIGNATURES & OFFICIAL SEALS (EXACT CUSTOM ASSETS) */}
              <div className="cert-footer-signatures">
                <div className="cert-signature-col">
                  <div className="cert-signature-img-space">
                    <img src="/sig_dr_verma.png" alt="Signature Dr. S. K. Verma" className="cert-real-sig-img" />
                  </div>
                  <div className="signature-line" />
                  <strong>Dr. S. K. Verma</strong>
                  <span>Municipal Commissioner</span>
                  <span className="sig-dept">Department of Urban Affairs</span>
                </div>

                <div className="cert-seal-center">
                  <img src="/cert_center_seal_2026.png" alt="Gantavya Smart City 2026 Seal" className="cert-monument-seal-img" />
                </div>

                <div className="cert-signature-col">
                  <div className="cert-signature-img-space">
                    <img src="/sig_arjun_sharma.png" alt="Signature Arjun Sharma" className="cert-real-sig-img" />
                  </div>
                  <div className="signature-line" />
                  <strong>Arjun Sharma</strong>
                  <span>Chief Governance Officer</span>
                  <span className="sig-dept">Gantavya Smart City Portal</span>
                </div>
              </div>

              {/* FOOTER DISCLOSURE & DATE */}
              <div className="cert-footer-meta">
                <span>Date of issue: <strong>{dateStr}</strong></span>
                <span>portal.vercel.app/verify/<strong>{certId}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  )

  return createPortal(modalContent, document.body)
}
