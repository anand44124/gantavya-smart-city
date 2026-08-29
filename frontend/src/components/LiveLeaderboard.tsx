import { useEffect, useState } from 'react'
import { Award, CheckCircle2, Crown, Flame, Medal, Shield, Sparkles, Star, Trophy } from 'lucide-react'
import { API_URL, authHeaders } from './reportApi'
import { useTranslation } from '../i18n/LanguageContext'
import { translateBadge } from '../i18n/translations'

type LeaderboardEntry = {
  rank: number
  user_id: number
  name: string
  points: number
  badge_level: string
  reports_count: number
}

type RewardTx = {
  id: number
  points: number
  reason: string
  issue_id: number | null
  created_at: string
}

type MyHistory = {
  points: number
  badge_level: string
  transactions: RewardTx[]
}

const BADGE_TIERS = [
  { threshold: 0, name: 'Bronze Scout', color: '#cd7f32', icon: Shield },
  { threshold: 100, name: 'Silver Vigilante', color: '#9e9e9e', icon: Medal },
  { threshold: 300, name: 'Gold Civic Champion', color: '#d4af37', icon: Trophy },
  { threshold: 600, name: 'Platinum City Guardian', color: '#4a90e2', icon: Crown },
  { threshold: 1000, name: 'Diamond Reformer', color: '#9c27b0', icon: Sparkles },
]

export default function LiveLeaderboard() {
  const { t } = useTranslation()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [myHistory, setMyHistory] = useState<MyHistory | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/rewards/leaderboard`).then((r) => r.json()),
      fetch(`${API_URL}/api/rewards/my-history`, { headers: authHeaders() }).then((r) => r.json()),
    ])
      .then(([lbData, myData]) => {
        if (Array.isArray(lbData)) setLeaderboard(lbData)
        if (myData && typeof myData.points === 'number') setMyHistory(myData)
      })
      .catch((err) => console.warn('Could not load rewards:', err))
      .finally(() => setLoading(false))
  }, [])

  const currentPoints = myHistory?.points || 0
  const currentBadge = myHistory?.badge_level || 'Bronze Scout'

  // Calculate next tier progress
  let nextTier = BADGE_TIERS[1]
  let prevThreshold = 0
  for (let i = 0; i < BADGE_TIERS.length; i++) {
    if (currentPoints >= BADGE_TIERS[i].threshold) {
      prevThreshold = BADGE_TIERS[i].threshold
      nextTier = BADGE_TIERS[i + 1] || BADGE_TIERS[i]
    }
  }
  const progressPercent =
    nextTier.threshold === prevThreshold
      ? 100
      : Math.min(100, Math.round(((currentPoints - prevThreshold) / (nextTier.threshold - prevThreshold)) * 100))

  return (
    <div className="page leaderboard-page">
      <div className="leaderboard-hero">
        <div className="hero-kicker">
          <Trophy size={16} /> CIVIC REWARDS & GAMIFICATION
        </div>
        <h1>{t('rewards_title')}</h1>
        <p>{t('rewards_subtitle')}</p>
      </div>

      {/* MY REWARD STATS CARD */}
      <div className="my-rewards-card">
        <div className="rewards-card-header">
          <div>
            <span className="eyebrow">{t('rewards_status_label', 'YOUR REWARDS STATUS')}</span>
            <div className="badge-pill">
              <Award size={18} />
              <strong>{translateBadge(currentBadge, t)}</strong>
            </div>
          </div>
          <div className="points-display">
            <span className="points-num">{currentPoints}</span>
            <span className="points-lbl">{t('civic_points_label', 'Civic Points')}</span>
          </div>
        </div>

        <div className="tier-progress-track">
          <div className="progress-label-row">
            <span>{t('current_tier_label', 'Current')}: <b>{translateBadge(currentBadge, t)}</b></span>
            <span>{t('next_tier_label', 'Next')}: <b>{translateBadge(nextTier.name, t)}</b> ({nextTier.threshold} pts)</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="rewards-earn-grid">
          <div className="earn-card">
            <CheckCircle2 size={16} className="earn-icon" />
            <div>
              <strong>+50 {t('rewards_points', 'Points')}</strong>
              <p>{t('rewards_earn_submit', 'Per verified report')}</p>
            </div>
          </div>
          <div className="earn-card">
            <Star size={16} className="earn-icon gold" />
            <div>
              <strong>+100 {t('rewards_points', 'Points')}</strong>
              <p>{t('rewards_earn_confirm', 'On resolution confirm')}</p>
            </div>
          </div>
          <div className="earn-card">
            <Flame size={16} className="earn-icon flame" />
            <div>
              <strong>+15 {t('rewards_points', 'Points')}</strong>
              <p>{t('rewards_earn_verify', 'Community verify')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* LEADERBOARD TABLE */}
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2>
            <Trophy size={20} /> {t('rewards_title', 'City Leaderboard')}
          </h2>
          <span className="muted">{t('rewards_subtitle', 'Top Civic Contributors')}</span>
        </div>

        {loading ? (
          <p className="empty-notice">{t('loading_leaderboard', 'Loading city leaderboard...')}</p>
        ) : leaderboard.length === 0 ? (
          <p className="empty-notice">{t('no_leaderboard_yet', 'No ranked citizen reports yet. Submit a report to get on the leaderboard!')}</p>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.map((user) => (
              <div key={user.user_id} className={`leaderboard-row rank-${user.rank}`}>
                <div className="rank-col">
                  {user.rank === 1 ? (
                    <span className="medal gold"><Crown size={18} /> 1</span>
                  ) : user.rank === 2 ? (
                    <span className="medal silver">2</span>
                  ) : user.rank === 3 ? (
                    <span className="medal bronze">3</span>
                  ) : (
                    <span className="rank-num">#{user.rank}</span>
                  )}
                </div>
                <div className="user-col">
                  <strong>{user.name}</strong>
                  <span className="badge-tag">{translateBadge(user.badge_level, t)}</span>
                </div>
                <div className="reports-col">
                  <span>{user.reports_count} {t('stat_reported', 'reports')}</span>
                </div>
                <div className="points-col">
                  <strong>{user.points}</strong>
                  <small>pts</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MY ACTIVITY LEDGER */}
      {myHistory && myHistory.transactions?.length > 0 && (
        <div className="dashboard-panel">
          <div className="panel-header">
            <h2>{t('rewards_history_title')}</h2>
            <span className="muted">{myHistory.transactions.length} transactions</span>
          </div>
          <div className="tx-list">
            {myHistory.transactions.map((tx) => (
              <div key={tx.id} className="tx-row">
                <div className="tx-reason">
                  <CheckCircle2 size={16} className="tx-icon" />
                  <div>
                    <strong>{tx.reason}</strong>
                    <small>{new Date(tx.created_at).toLocaleString()}</small>
                  </div>
                </div>
                <span className="tx-points">+{tx.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
