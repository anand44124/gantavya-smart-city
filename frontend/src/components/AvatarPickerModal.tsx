import { useState } from 'react'
import { Camera, Check, Sparkles, Upload, X } from 'lucide-react'
import { AVATAR_PRESETS, UserAvatar } from './UserAvatar'

interface AvatarPickerModalProps {
  currentAvatar?: string | null
  userName?: string
  isOpen: boolean
  onClose: () => void
  onSelectAvatar: (avatarUrl: string) => Promise<void>
}

export function AvatarPickerModal({
  currentAvatar,
  userName = 'User',
  isOpen,
  onClose,
  onSelectAvatar,
}: AvatarPickerModalProps) {
  const [selected, setSelected] = useState<string>(currentAvatar || 'avatar_1')
  const [customFile, setCustomFile] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB.')
      return
    }

    setError('')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUri = reader.result as string
      setCustomFile(dataUri)
      setSelected(dataUri)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      await onSelectAvatar(selected)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save avatar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !saving && onClose()}>
      <div className="avatar-picker-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-row">
          <div>
            <div className="avatar-picker-kicker">
              <Sparkles size={14} className="text-teal" />
              <span>CUSTOMIZE PROFILE IDENTITY</span>
            </div>
            <h2>Choose Your Avatar</h2>
            <p className="modal-subtext">Pick an animated civic character or upload your own photo.</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={saving}>
            <X size={18} />
          </button>
        </div>

        {/* CURRENT AVATAR PREVIEW */}
        <div className="avatar-preview-section">
          <UserAvatar avatarUrl={selected} name={userName} size={90} className="avatar-orb-large" />
          <div className="avatar-preview-info">
            <strong>
              {selected.startsWith('avatar_')
                ? AVATAR_PRESETS.find((p) => p.id === selected)?.name
                : 'Custom Photo'}
            </strong>
            <p>
              {selected.startsWith('avatar_')
                ? AVATAR_PRESETS.find((p) => p.id === selected)?.description
                : 'Your uploaded profile picture'}
            </p>
          </div>
        </div>

        {/* 6 ANIMATED PRESET CHARACTERS */}
        <div className="presets-heading">
          <Sparkles size={16} /> <span>3D Animated Civic Characters</span>
        </div>

        <div className="avatar-presets-grid">
          {AVATAR_PRESETS.map((preset) => {
            const isChosen = selected === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                className={`preset-card-btn ${isChosen ? 'chosen' : ''}`}
                onClick={() => {
                  setSelected(preset.id)
                  setError('')
                }}
              >
                <div className="preset-avatar-wrap">
                  <UserAvatar avatarUrl={preset.id} name={preset.name} size={54} />
                  {isChosen && (
                    <div className="chosen-check-pill">
                      <Check size={12} />
                    </div>
                  )}
                </div>
                <span className="preset-name">{preset.name}</span>
                <span className="preset-emoji">{preset.emoji}</span>
              </button>
            )
          })}
        </div>

        {/* CUSTOM UPLOAD OPTION */}
        <div className="custom-upload-section">
          <label className="custom-upload-box">
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            <div className="upload-box-content">
              <div className="upload-icon-circle">
                {customFile ? <Camera size={18} /> : <Upload size={18} />}
              </div>
              <div>
                <strong>{customFile ? 'Custom Photo Loaded' : 'Upload Custom Profile Picture'}</strong>
                <p>JPG, PNG, WebP up to 5MB</p>
              </div>
            </div>
            {customFile && selected === customFile && (
              <span className="custom-selected-tag">Selected</span>
            )}
          </label>
        </div>

        {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}

        <div className="modal-footer-actions">
          <button type="button" className="outline-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="primary-button save-avatar-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving Avatar...' : 'Set Profile Avatar'}
          </button>
        </div>
      </div>
    </div>
  )
}
