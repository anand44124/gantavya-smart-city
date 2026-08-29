import React from 'react'

export interface AvatarPreset {
  id: string
  name: string
  emoji: string
  gradient: string
  accentColor: string
  description: string
  svgPath: React.ReactNode
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'avatar_1',
    name: 'Leo Guardian',
    emoji: '🦁',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    accentColor: '#f59e0b',
    description: 'Brave City Champion',
    svgPath: (
      <g>
        <circle cx="50" cy="50" r="45" fill="url(#g1)" />
        {/* Lion Mane */}
        <circle cx="50" cy="48" r="32" fill="#d97706" opacity="0.6" />
        <circle cx="50" cy="50" r="26" fill="#fbbf24" />
        {/* Ears */}
        <circle cx="30" cy="30" r="8" fill="#f59e0b" />
        <circle cx="70" cy="30" r="8" fill="#f59e0b" />
        <circle cx="30" cy="30" r="4" fill="#fed7aa" />
        <circle cx="70" cy="30" r="4" fill="#fed7aa" />
        {/* Eyes */}
        <circle cx="41" cy="46" r="4" fill="#1e293b" />
        <circle cx="59" cy="46" r="4" fill="#1e293b" />
        <circle cx="42" cy="45" r="1.5" fill="#ffffff" />
        <circle cx="60" cy="45" r="1.5" fill="#ffffff" />
        {/* Snout & Nose */}
        <ellipse cx="50" cy="56" rx="9" ry="7" fill="#fef3c7" />
        <polygon points="46,53 54,53 50,58" fill="#78350f" />
        <path d="M47 60 Q50 63 53 60" stroke="#78350f" strokeWidth="1.5" fill="none" />
      </g>
    ),
  },
  {
    id: 'avatar_2',
    name: 'Eco Spark',
    emoji: '🦊',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    accentColor: '#10b981',
    description: 'Eco-Smart Sleuth',
    svgPath: (
      <g>
        <circle cx="50" cy="50" r="45" fill="url(#g2)" />
        {/* Fox Ears */}
        <polygon points="22,18 42,38 20,44" fill="#ea580c" />
        <polygon points="78,18 58,38 80,44" fill="#ea580c" />
        <polygon points="26,24 38,38 24,42" fill="#ffedd5" />
        <polygon points="74,24 62,38 76,42" fill="#ffedd5" />
        {/* Head */}
        <ellipse cx="50" cy="52" rx="26" ry="24" fill="#f97316" />
        <polygon points="30,50 50,74 70,50" fill="#fff7ed" />
        {/* Cyber Visor */}
        <path d="M30 42 Q50 38 70 42 L68 50 Q50 46 32 50 Z" fill="#064e3b" />
        <path d="M32 44 Q50 40 68 44" stroke="#34d399" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Nose */}
        <circle cx="50" cy="67" r="3" fill="#1e293b" />
      </g>
    ),
  },
  {
    id: 'avatar_3',
    name: 'Athena Sentinel',
    emoji: '🦉',
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
    accentColor: '#6366f1',
    description: 'Wise Urban Sentinel',
    svgPath: (
      <g>
        <circle cx="50" cy="50" r="45" fill="url(#g3)" />
        {/* Owl Ear Tufts */}
        <polygon points="28,20 40,36 24,38" fill="#4338ca" />
        <polygon points="72,20 60,36 76,38" fill="#4338ca" />
        {/* Head */}
        <circle cx="50" cy="52" r="28" fill="#4f46e5" />
        {/* Eye Feathers */}
        <circle cx="39" cy="48" r="12" fill="#e0e7ff" />
        <circle cx="61" cy="48" r="12" fill="#e0e7ff" />
        {/* Glasses Frame */}
        <circle cx="39" cy="48" r="11" fill="none" stroke="#38bdf8" strokeWidth="2" />
        <circle cx="61" cy="48" r="11" fill="none" stroke="#38bdf8" strokeWidth="2" />
        <line x1="50" y1="48" x2="50" y2="48" stroke="#38bdf8" strokeWidth="2.5" />
        {/* Pupils */}
        <circle cx="39" cy="48" r="5" fill="#0f172a" />
        <circle cx="61" cy="48" r="5" fill="#0f172a" />
        <circle cx="41" cy="46" r="1.5" fill="#ffffff" />
        <circle cx="63" cy="46" r="1.5" fill="#ffffff" />
        {/* Beak */}
        <polygon points="46,55 54,55 50,64" fill="#fbbf24" />
      </g>
    ),
  },
  {
    id: 'avatar_4',
    name: 'Cyber Inspector',
    emoji: '🤖',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    accentColor: '#0284c7',
    description: 'AI Autonomous Drone',
    svgPath: (
      <g>
        <circle cx="50" cy="50" r="45" fill="url(#g4)" />
        {/* Antenna */}
        <line x1="50" y1="18" x2="50" y2="28" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="16" r="4" fill="#f43f5e" />
        {/* Bot Head */}
        <rect x="25" y="28" width="50" height="42" rx="14" fill="#e2e8f0" />
        {/* Screen Display */}
        <rect x="30" y="34" width="40" height="24" rx="8" fill="#0f172a" />
        {/* Cyan Glowing Eyes */}
        <ellipse cx="40" cy="46" rx="4" ry="5" fill="#38bdf8" />
        <ellipse cx="60" cy="46" rx="4" ry="5" fill="#38bdf8" />
        <circle cx="41" cy="44" r="1.5" fill="#ffffff" />
        <circle cx="61" cy="44" r="1.5" fill="#ffffff" />
        {/* Speaker / Grid Mouth */}
        <line x1="38" y1="64" x2="62" y2="64" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: 'avatar_5',
    name: 'Pulse Hero',
    emoji: '⚡',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    accentColor: '#ec4899',
    description: 'High-Velocity Reformer',
    svgPath: (
      <g>
        <circle cx="50" cy="50" r="45" fill="url(#g5)" />
        {/* Hero Head */}
        <circle cx="50" cy="50" r="28" fill="#ffe4e6" />
        {/* Mask */}
        <path d="M26 44 Q50 36 74 44 Q66 58 50 52 Q34 58 26 44 Z" fill="#8b5cf6" />
        {/* Glowing Eyes */}
        <ellipse cx="39" cy="46" rx="4" ry="3" fill="#ffffff" />
        <ellipse cx="61" cy="46" rx="4" ry="3" fill="#ffffff" />
        {/* Lightning Bolt Symbol on Forehead */}
        <polygon points="50,22 45,32 49,32 47,40 55,30 51,30" fill="#facc15" />
        {/* Smile */}
        <path d="M44 64 Q50 68 56 64" stroke="#e11d48" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: 'avatar_6',
    name: 'Gaia Ranger',
    emoji: '🌿',
    gradient: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
    accentColor: '#0d9488',
    description: 'Civic Environmentalist',
    svgPath: (
      <g>
        <circle cx="50" cy="50" r="45" fill="url(#g6)" />
        {/* Hair / Canopy */}
        <circle cx="50" cy="42" r="30" fill="#047857" />
        <circle cx="50" cy="52" r="24" fill="#fed7aa" />
        {/* Botanical Leaves Wreath */}
        <ellipse cx="32" cy="32" rx="7" ry="4" fill="#34d399" transform="rotate(-30 32 32)" />
        <ellipse cx="68" cy="32" rx="7" ry="4" fill="#34d399" transform="rotate(30 68 32)" />
        <ellipse cx="50" cy="26" rx="6" ry="4" fill="#10b981" />
        {/* Eyes */}
        <circle cx="41" cy="50" r="3.5" fill="#064e3b" />
        <circle cx="59" cy="50" r="3.5" fill="#064e3b" />
        <circle cx="42" cy="49" r="1.2" fill="#ffffff" />
        <circle cx="60" cy="49" r="1.2" fill="#ffffff" />
        {/* Cheeks */}
        <circle cx="35" cy="56" r="3.5" fill="#fca5a5" opacity="0.6" />
        <circle cx="65" cy="56" r="3.5" fill="#fca5a5" opacity="0.6" />
        {/* Smile */}
        <path d="M45 61 Q50 65 55 61" stroke="#064e3b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
    ),
  },
]

interface UserAvatarProps {
  avatarUrl?: string | null
  name?: string
  size?: number
  className?: string
  onClick?: () => void
}

export function UserAvatar({
  avatarUrl,
  name = 'User',
  size = 40,
  className = '',
  onClick,
}: UserAvatarProps) {
  // If custom uploaded image
  if (avatarUrl && (avatarUrl.startsWith('data:') || avatarUrl.startsWith('http') || avatarUrl.startsWith('/uploads'))) {
    return (
      <div
        className={`user-avatar-custom ${className}`}
        style={{ width: size, height: size, borderRadius: size > 50 ? '24px' : '50%' }}
        onClick={onClick}
      >
        <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
      </div>
    )
  }

  // If preset character avatar
  if (avatarUrl && avatarUrl.startsWith('avatar_')) {
    const preset = AVATAR_PRESETS.find((p) => p.id === avatarUrl) || AVATAR_PRESETS[0]
    return (
      <div
        className={`user-avatar-character ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: size > 50 ? '24px' : '50%',
          cursor: onClick ? 'pointer' : 'default',
          flexShrink: 0,
        }}
        onClick={onClick}
        title={preset.name}
      >
        <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block', borderRadius: 'inherit' }}>
          <defs>
            <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="g5" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="g6" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          {preset.svgPath}
        </svg>
      </div>
    )
  }

  // Fallback to initials
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CP'

  return (
    <div
      className={`user-avatar-initials ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size > 50 ? '24px' : '50%',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
        color: '#ffffff',
        fontWeight: 800,
        fontSize: size * 0.38,
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
      }}
      onClick={onClick}
    >
      {initials}
    </div>
  )
}
