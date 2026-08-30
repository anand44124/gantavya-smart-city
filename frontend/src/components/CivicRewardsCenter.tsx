import { useEffect, useState } from 'react'
import {
  Bus,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Gift,
  LoaderCircle,
  QrCode,
  ShieldCheck,
  Sparkles,
  Train,
  Zap,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { API_URL, authHeaders } from './reportApi'

type RewardItem = {
  id: string
  title: string
  subtitle: string
  points_cost: number
  transit_mode: string
  category: string
  icon: string
  validity_hours: number
}

type RedeemedPass = {
  id: number
  pass_code: string
  reward_type: string
  title: string
  subtitle: string
  points_spent: number
  transit_mode: string
  city: string
  barcode_num: string
  status: string
  expires_at: string
  created_at: string
}

type CatalogData = {
  catalog: RewardItem[]
  daily_cap: number
  daily_earned_today: number
  daily_remaining: number
  current_balance: number
  badge_level: string
}

export default function CivicRewardsCenter() {
  const [data, setData] = useState<CatalogData | null>(null)
  const [myPasses, setMyPasses] = useState<RedeemedPass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'catalog' | 'passes'>('catalog')
  const [transitPreference, setTransitPreference] = useState<'all' | 'metro' | 'bus'>('all')

  // Dispenser Animation Modal State
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null)
  const [transitModeChoice, setTransitModeChoice] = useState<'metro' | 'bus'>('metro')
  const [dispensing, setDispensing] = useState(false)
  const [dispensedPass, setDispensedPass] = useState<RedeemedPass | null>(null)
  const [dispenserLedActive, setDispenserLedActive] = useState(false)
  const [ticketDropped, setTicketDropped] = useState(false)
  const [redeemError, setRedeemError] = useState('')

  const DEFAULT_CATALOG: CatalogData = {
    catalog: [
      { id: 'delhi_metro_single', title: 'Single Metro Journey Pass', subtitle: 'Valid on all DMRC/Metro lines', points_cost: 150, transit_mode: 'metro', category: 'transit', icon: 'Train', validity_hours: 24 },
      { id: 'dtc_bus_day_pass', title: 'Daily City Bus Pass', subtitle: 'Unlimited rides on AC & Non-AC buses', points_cost: 100, transit_mode: 'bus', category: 'transit', icon: 'Bus', validity_hours: 24 },
      { id: 'metro_weekly_pass', title: 'Weekly Urban Explorer Pass', subtitle: '7 days unlimited metro transit', points_cost: 650, transit_mode: 'metro', category: 'transit', icon: 'Zap', validity_hours: 168 },
    ],
    daily_cap: 500,
    daily_earned_today: 100,
    daily_remaining: 400,
    current_balance: (() => {
      try {
        const u = JSON.parse(localStorage.getItem('civicpulse_user') || '{}')
        return u.points ?? 50000
      } catch {
        return 50000
      }
    })(),
    badge_level: 'Diamond Reformer',
  }

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [catRes, passesRes] = await Promise.all([
        fetch(`${API_URL}/api/rewards/catalog`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/rewards/my-passes`, { headers: authHeaders() }),
      ])
      if (!catRes.ok) throw new Error('Could not load rewards catalog')
      const catData = await catRes.json()
      const passesData = passesRes.ok ? await passesRes.json() : []
      setData(catData)
      setMyPasses(passesData)
    } catch {
      setData(DEFAULT_CATALOG)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAll()
  }, [])

  const openRedeemModal = (reward: RewardItem) => {
    setSelectedReward(reward)
    setTransitModeChoice(reward.transit_mode === 'bus' ? 'bus' : 'metro')
    setDispensing(false)
    setDispensedPass(null)
    setDispenserLedActive(false)
    setTicketDropped(false)
    setRedeemError('')
  }

  const closeRedeemModal = () => {
    setSelectedReward(null)
    setDispensedPass(null)
    setDispensing(false)
    setDispenserLedActive(false)
    setTicketDropped(false)
    setRedeemError('')
  }

  const triggerDispense = async () => {
    if (!selectedReward) return
    setDispensing(true)
    setRedeemError('')

    try {
      const res = await fetch(`${API_URL}/api/rewards/redeem`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reward_id: selectedReward.id,
          transit_mode: transitModeChoice,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.detail || 'Redemption failed')
      }

      setDispensedPass(result)
      setDispenserLedActive(true)

      // Animate ticket sliding out
      setTimeout(() => {
        setTicketDropped(true)
      }, 250)

      // Confetti burst
      setTimeout(() => {
        confetti({
          particleCount: 85,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#38bdf8', '#fbbf24', '#22c55e', '#ec4899', '#a855f7'],
        })
        void fetchAll() // Refresh balance & pass list
      }, 1200)
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : 'Redemption failed')
      setDispenserLedActive(false)
    } finally {
      setDispensing(false)
    }
  }

  const filteredCatalog = (data?.catalog || []).filter((item) => {
    if (transitPreference === 'metro') return item.transit_mode === 'metro'
    if (transitPreference === 'bus') return item.transit_mode === 'bus'
    return true
  })

  // Barcode pattern generator
  const renderBarcodeBars = () => {
    const widths = [2, 4, 1, 3, 2, 5, 1, 4, 2, 3, 1, 4, 2, 5, 2, 1, 3, 4, 2, 1, 5, 3, 2, 4, 1, 3, 2, 4, 5, 1, 3, 2]
    return widths.map((w, i) => (
      <div
        key={i}
        style={{
          width: `${w}px`,
          backgroundColor: '#0f172a',
          borderRadius: '1px',
          flexShrink: 0,
        }}
      />
    ))
  }

  if (loading) {
    return (
      <div className="page empty-state">
        <LoaderCircle className="spin" size={28} /> Loading Civic Rewards Center...
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="page empty-state">
        <strong>{error}</strong>
        <button className="outline-button" onClick={fetchAll} style={{ marginTop: 12 }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="page rewards-page">
      {/* HEADER BANNER */}
      <div className="rewards-hero-header">
        <div className="rewards-hero-content">
          <div className="hero-kicker">
            <Sparkles size={15} /> GANTAVYA REWARDS & PUBLIC TRANSIT
          </div>
          <h1>Gantavya Transit & Rewards Center</h1>
          <p className="muted">
            Turn your verified civic reports into real-world rewards: Free Metro Passes, City Electric Bus Tickets, EV Charging Credits, and Municipal Rebates.
          </p>
        </div>

        {/* CITIZEN WALLET BALANCE CARD */}
        {data && (
          <div className="rewards-balance-card">
            <div className="balance-top">
              <span className="balance-lbl">Available Balance</span>
              <span className="balance-tier-badge">{data.badge_level}</span>
            </div>
            <div className="balance-number">
              <Coins className="coin-icon" size={32} />
              <span>{data.current_balance.toLocaleString()}</span>
              <small>PTS</small>
            </div>
            <div className="daily-cap-track">
              <div className="daily-cap-info">
                <span>Daily Reporting Cap: <b>100 pts/day</b></span>
                <span>{data.daily_earned_today}/100 pts</span>
              </div>
              <div className="daily-cap-progress-bg">
                <div
                  className="daily-cap-progress-fill"
                  style={{ width: `${Math.min(100, (data.daily_earned_today / 100) * 100)}%` }}
                />
              </div>
              <small className="cap-hint">Prevents spam reports while rewarding authentic quality contributions.</small>
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div className="rewards-nav-tabs">
        <button
          className={`rewards-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <Gift size={17} /> Available Rewards ({filteredCatalog.length})
        </button>
        <button
          className={`rewards-tab-btn ${activeTab === 'passes' ? 'active' : ''}`}
          onClick={() => setActiveTab('passes')}
        >
          <CreditCard size={17} /> My Transit Wallet & Passes ({myPasses.length})
        </button>
      </div>

      {/* TAB 1: REWARDS CATALOG */}
      {activeTab === 'catalog' && (
        <div className="rewards-catalog-section">
          {/* TRANSIT TYPE FILTER */}
          <div className="transit-mode-filter">
            <span className="filter-lbl">Filter by Transport:</span>
            <button
              className={`filter-chip ${transitPreference === 'all' ? 'active' : ''}`}
              onClick={() => setTransitPreference('all')}
            >
              All Rewards
            </button>
            <button
              className={`filter-chip ${transitPreference === 'metro' ? 'active' : ''}`}
              onClick={() => setTransitPreference('metro')}
            >
              <Train size={15} /> Metro Passes
            </button>
            <button
              className={`filter-chip ${transitPreference === 'bus' ? 'active' : ''}`}
              onClick={() => setTransitPreference('bus')}
            >
              <Bus size={15} /> Govt / Electric Buses
            </button>
          </div>

          <div className="rewards-grid">
            {filteredCatalog.map((item) => {
              const canAfford = (data?.current_balance || 0) >= item.points_cost
              return (
                <div className={`reward-card ${canAfford ? 'affordable' : 'locked'}`} key={item.id}>
                  <div className="reward-card-header">
                    <div className="reward-icon-box">{item.icon}</div>
                    <div className="reward-cost-tag">
                      <Coins size={14} /> {item.points_cost.toLocaleString()} PTS
                    </div>
                  </div>

                  <h3>{item.title}</h3>
                  <p className="reward-subtitle">{item.subtitle}</p>

                  <div className="reward-perks-list">
                    <div className="perk-row">
                      <Clock size={14} />
                      <span>Validity: <b>{item.validity_hours >= 24 ? `${item.validity_hours / 24} Day(s)` : `${item.validity_hours} Hours`}</b></span>
                    </div>
                    <div className="perk-row">
                      <QrCode size={14} />
                      <span>Instant Digital Scannable Barcode Pass</span>
                    </div>
                    <div className="perk-row">
                      <ShieldCheck size={14} />
                      <span>Valid across state transport & automated turnstiles</span>
                    </div>
                  </div>

                  <button
                    className={`redeem-action-btn ${canAfford ? 'btn-ready' : 'btn-disabled'}`}
                    disabled={!canAfford}
                    onClick={() => openRedeemModal(item)}
                  >
                    {canAfford ? (
                      <>
                        <Zap size={16} /> Redeem {item.points_cost} PTS
                      </>
                    ) : (
                      <>
                        Need {(item.points_cost - (data?.current_balance || 0)).toLocaleString()} more PTS
                      </>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MY PASSES WALLET */}
      {activeTab === 'passes' && (
        <div className="my-passes-section">
          {myPasses.length === 0 ? (
            <div className="empty-state">
              <CreditCard size={32} />
              <h3>No Redeemed Passes Yet</h3>
              <p>Redeem your Civic Points for free Metro & Government Electric Bus passes!</p>
              <button className="primary-button" onClick={() => setActiveTab('catalog')}>
                <Gift size={16} /> Explore Rewards Catalog
              </button>
            </div>
          ) : (
            <div className="passes-grid">
              {myPasses.map((p) => {
                const isExpired = new Date(p.expires_at) < new Date()
                return (
                  <div className={`pass-wallet-card ${isExpired ? 'expired' : 'active'}`} key={p.id}>
                    <div className="pass-card-top">
                      <div className="pass-mode-icon">
                        {p.transit_mode === 'metro' ? '🚇' : p.transit_mode === 'bus' ? '🚌' : '🏛️'}
                      </div>
                      <div className="pass-status-pill">
                        {isExpired ? 'Expired' : 'Active Pass'}
                      </div>
                    </div>

                    <h4>{p.title}</h4>
                    <p className="pass-code-mono">{p.pass_code}</p>

                    <div className="pass-details-row">
                      <div>
                        <span className="lbl">Valid Until</span>
                        <strong>{new Date(p.expires_at).toLocaleString()}</strong>
                      </div>
                      <div className="right">
                        <span className="lbl">Points Spent</span>
                        <strong className="pts-spent">-{p.points_spent} PTS</strong>
                      </div>
                    </div>

                    <div className="mini-barcode">
                      <div className="barcode-bars-row">{renderBarcodeBars()}</div>
                      <span className="barcode-mono-num">{p.barcode_num}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* HARDWARE DISPENSER MODAL (Exact match from reference) */}
      {selectedReward && (
        <div className="modal-backdrop dispenser-modal-backdrop">
          <div className="modal-content dispenser-modal-content">
            <div className="dispenser-modal-top">
              <h3>Civic Score Redemption</h3>
              <button className="icon-btn-sm" onClick={closeRedeemModal}>
                ✕
              </button>
            </div>

            {/* If public transport has both options, allow toggle */}
            {selectedReward.category === 'transit' && (
              <div className="transit-choice-selector">
                <button
                  type="button"
                  className={`choice-btn ${transitModeChoice === 'metro' ? 'active' : ''}`}
                  onClick={() => setTransitModeChoice('metro')}
                  disabled={ticketDropped || dispensing}
                >
                  <Train size={16} /> Metro Rail Pass
                </button>
                <button
                  type="button"
                  className={`choice-btn ${transitModeChoice === 'bus' ? 'active' : ''}`}
                  onClick={() => setTransitModeChoice('bus')}
                  disabled={ticketDropped || dispensing}
                >
                  <Bus size={16} /> Govt Electric Bus Pass
                </button>
              </div>
            )}

            {/* HARDWARE DISPENSER CONTAINER */}
            <div className="dispenser-container">
              {/* Metallic Golden Hardware Dispenser Bar */}
              <div className="printer-machine">
                <div className="printer-slit"></div>
                <div className={`printer-led ${dispenserLedActive ? 'active' : ''}`}></div>
              </div>

              {/* Dispensed Ticket Paper */}
              <div className="paper-tray">
                <div className={`ticket ${ticketDropped ? 'dispensed' : ''}`}>
                  <div className="ticket-cutout-left"></div>
                  <div className="ticket-cutout-right"></div>

                  <div className="ticket-icon">
                    {transitModeChoice === 'metro' ? '🚇' : transitModeChoice === 'bus' ? '🚌' : '🏛️'}
                  </div>
                  <h2 className="ticket-heading">Pass Issued!</h2>
                  <p className="ticket-subheading">{selectedReward.title}</p>

                  <div className="dotted-line"></div>

                  <div className="meta-grid">
                    <div>
                      <div className="meta-label">Pass ID</div>
                      <div className="meta-val">{dispensedPass?.pass_code || '0128034399434'}</div>
                    </div>
                    <div>
                      <div className="meta-label right">Score Redeemed</div>
                      <div className="meta-val right points">⭐ {selectedReward.points_cost} PTS</div>
                    </div>
                    <div>
                      <div className="meta-label">Date & Time</div>
                      <div className="meta-val">Today · {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div>
                      <div className="meta-label right">Status</div>
                      <div className="meta-val right status">Confirmed</div>
                    </div>
                  </div>

                  {/* Citizen Identity Card Badge */}
                  <div className="civic-card-badge">
                    <div className="badge-left">
                      <div className="badge-avatar">CP</div>
                      <div>
                        <div className="badge-name">Verified Citizen</div>
                        <div className="badge-id">Smart City Transit Pass</div>
                      </div>
                    </div>
                    <div className="badge-tag">Tier 1 Citizen</div>
                  </div>

                  {/* Scannable Turnstile Barcode */}
                  <div className="barcode-section">
                    <div className="barcode-lines">{renderBarcodeBars()}</div>
                    <div className="barcode-num">{dispensedPass?.barcode_num || '2 8937261 273618'}</div>
                  </div>
                </div>
              </div>
            </div>

            {redeemError && <p className="form-error" style={{ marginTop: 12 }}>{redeemError}</p>}

            {/* ACTION BUTTONS */}
            <div className="dispenser-actions">
              {!ticketDropped ? (
                <button
                  className="btn-redeem"
                  onClick={triggerDispense}
                  disabled={dispensing}
                >
                  {dispensing ? (
                    <>
                      <LoaderCircle className="spin" size={18} /> Printing Transit Pass...
                    </>
                  ) : (
                    <>
                      <Zap size={18} /> Redeem {selectedReward.points_cost} Civic Score
                    </>
                  )}
                </button>
              ) : (
                <button
                  className="btn-redeem success-btn"
                  onClick={() => {
                    closeRedeemModal()
                    setActiveTab('passes')
                  }}
                >
                  <CheckCircle2 size={18} /> View in My Transit Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
