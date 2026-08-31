import React, { useRef, useState, useEffect } from 'react'
import { ChevronRight, Edit3, LoaderCircle, RefreshCw, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'

interface ModernOtpInputProps {
  phone: string
  length?: number
  loading: boolean
  error?: string
  demoOtp?: string
  resendTimer: number
  onVerify: (otp: string) => void
  onResend: () => void
  onChangeNumber: () => void
}

export const ModernOtpInput: React.FC<ModernOtpInputProps> = ({
  phone,
  length = 6,
  loading,
  error,
  demoOtp,
  resendTimer,
  onVerify,
  onResend,
  onChangeNumber,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = numericChar
    setDigits(newDigits)

    if (numericChar && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto submit if all filled
    const fullCode = newDigits.join('')
    if (fullCode.length === length && !newDigits.includes('')) {
      onVerify(fullCode)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        setDigits(newDigits)
        inputRefs.current[index - 1]?.focus()
      } else {
        const newDigits = [...digits]
        newDigits[index] = ''
        setDigits(newDigits)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      const newDigits = Array(length).fill('')
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i]
      }
      setDigits(newDigits)
      const nextIndex = Math.min(pasted.length, length - 1)
      inputRefs.current[nextIndex]?.focus()

      if (pasted.length === length) {
        onVerify(pasted)
      }
    }
  }

  const handleAutoFill = () => {
    if (demoOtp && demoOtp.length === length) {
      const newDigits = demoOtp.split('')
      setDigits(newDigits)
      inputRefs.current[length - 1]?.focus()
      onVerify(demoOtp)
    }
  }

  const fullOtp = digits.join('')
  const isComplete = fullOtp.length === length && !digits.includes('')

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div className="modern-reel-otp-container">
      {/* Visual Header */}
      <div className="otp-device-icon-header">
        <div className="otp-icon-pulse-wrapper">
          <div className="otp-pulse-ring-1"></div>
          <div className="otp-pulse-ring-2"></div>
          <div className="otp-center-icon-badge">
            <Smartphone size={24} className="otp-smartphone-icon" />
            <span className="otp-signal-dot"></span>
          </div>
        </div>

        <div className="otp-header-info">
          <h3>Verification Code</h3>
          <p>
            Enter the 6-digit verification code sent to{' '}
            <span className="otp-highlight-phone">+91 {phone}</span>
          </p>
          <button type="button" className="otp-edit-number-btn" onClick={onChangeNumber}>
            <Edit3 size={12} /> Change Number
          </button>
        </div>
      </div>

      {/* 6 Individual Pin Boxes */}
      <div className="otp-boxes-grid">
        {digits.map((digit, i) => (
          <div key={i} className={`otp-box-wrapper ${digit ? 'filled' : ''}`}>
            <input
              ref={(el) => {
                inputRefs.current[i] = el
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="otp-box-digit-input"
              autoComplete="one-time-code"
            />
            {!digit && <div className="otp-empty-placeholder-dot"></div>}
          </div>
        ))}
      </div>

      {/* Demo Smart Helper */}
      {demoOtp && (
        <div className="otp-demo-card">
          <div className="otp-demo-badge">
            <Sparkles size={14} color="#d97706" />
            <span>Fast Demo Code: <strong>{demoOtp}</strong></span>
          </div>
          <button type="button" className="otp-demo-fill-action" onClick={handleAutoFill}>
            Instant Auto-Fill & Verify
          </button>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="otp-error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Main Submit Action */}
      <button
        type="button"
        className="primary-button full otp-verify-submit-btn"
        disabled={loading || !isComplete}
        onClick={() => onVerify(fullOtp)}
      >
        {loading ? (
          <>
            <LoaderCircle className="spin" size={18} /> Verifying Secure OTP...
          </>
        ) : (
          <>
            <ShieldCheck size={18} /> Verify & Access Portal <ChevronRight size={17} />
          </>
        )}
      </button>

      {/* Resend & Timer */}
      <div className="otp-footer-resend-row">
        {resendTimer > 0 ? (
          <div className="resend-countdown-badge">
            <RefreshCw size={13} className="spin-slow muted" />
            <span>Resend code in <strong>{formatTimer(resendTimer)}</strong></span>
          </div>
        ) : (
          <button type="button" className="resend-active-btn" onClick={onResend} disabled={loading}>
            <RefreshCw size={13} /> Resend SMS Code
          </button>
        )}
      </div>
    </div>
  )
}
