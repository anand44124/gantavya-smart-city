import { Award, Printer, ShieldCheck, X } from 'lucide-react'

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
  const points = user.points ?? 50000
  const badgeLevel = user.badge_level ?? 'Diamond Reformer'
  const certId = `GAN-2026-HONOR-${(user.full_name.length * 77 + points).toString().slice(0, 5)}`
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handlePrint = () => {
    window.print()
  }

  return (
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
          <div className="cert-action-btns">
            <button type="button" className="print-cert-btn" onClick={handlePrint}>
              <Printer size={16} /> Print / Save as PDF
            </button>
            <button type="button" className="close-cert-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE CERTIFICATE CANVAS */}
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
                  <div className="cert-national-initiatives">
                    <span className="initiative-tag sbm">🧹 SWACHH BHARAT MISSION</span>
                    <span className="initiative-tag di">🇮🇳 DIGITAL INDIA</span>
                  </div>
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

              {/* RECIPIENT NAME */}
              <div className="cert-recipient-box">
                <h2 className="cert-user-name">{user.full_name}</h2>
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

              {/* FOOTER SIGNATURES & OFFICIAL SEALS */}
              <div className="cert-footer-signatures">
                <div className="cert-signature-col">
                  {/* Clean blank space for real signature */}
                  <div className="cert-signature-img-space" />
                  <div className="signature-line" />
                  <strong>Dr. S. K. Verma</strong>
                  <span>Municipal Commissioner</span>
                  <span className="sig-dept">Department of Urban Affairs</span>
                </div>

                <div className="cert-seal-center">
                  <div className="cert-national-ashoka-seal">
                    <svg className="ashoka-chakra-svg" viewBox="0 0 100 100" width="44" height="44">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#d97706" strokeWidth="4" />
                      <circle cx="50" cy="50" r="38" fill="#0f172a" stroke="#d97706" strokeWidth="1.5" />
                      <circle cx="50" cy="50" r="10" fill="#d97706" />
                      {Array.from({ length: 24 }).map((_, i) => (
                        <line
                          key={i}
                          x1="50"
                          y1="50"
                          x2={50 + 38 * Math.cos((i * 15 * Math.PI) / 180)}
                          y2={50 + 38 * Math.sin((i * 15 * Math.PI) / 180)}
                          stroke="#d97706"
                          strokeWidth="1.5"
                        />
                      ))}
                    </svg>
                    <span className="ashoka-seal-text">सत्यमेव जयते</span>
                    <small className="ashoka-seal-sub">GOVT OF INDIA</small>
                  </div>
                </div>

                <div className="cert-signature-col">
                  {/* Clean blank space for real signature */}
                  <div className="cert-signature-img-space" />
                  <div className="signature-line" />
                  <strong>Arjun Sharma</strong>
                  <span>Chief Governance Officer</span>
                  <span className="sig-dept">Gantavya Smart City Portal</span>
                </div>
              </div>

              {/* FOOTER DISCLOSURE & DATE */}
              <div className="cert-footer-meta">
                <span>Date of Issue: <strong>{dateStr}</strong></span>
                <span>Verification: <strong>gantavya-portal.vercel.app/verify/{certId}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
