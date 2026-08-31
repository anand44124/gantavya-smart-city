import React, { useRef, useState, useEffect } from 'react'
import { ChevronRight, Edit3, LoaderCircle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'

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
  length = 4,
  loading,
  error,
  demoOtp,
  resendTimer,
  onVerify,
  onResend,
  onChangeNumber,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''))
  const [isSpinning, setIsSpinning] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const maskedPhone = () => {
    if (phone.length >= 10) {
      return `+91 ${phone.slice(0, 5)} ••• ${phone.slice(-2)}`
    }
    return `+91 ${phone}`
  }

  const handleChange = (index: number, value: string) => {
    const numericChar = value.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[index] = numericChar
    setDigits(newDigits)

    if (numericChar && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    const fullCode = newDigits.join('')
    if (fullCode.length === length && !newDigits.includes('')) {
      triggerVerification(fullCode)
    }
  }

  const triggerVerification = (code: string) => {
    setIsSpinning(true)
    setTimeout(() => {
      onVerify(code)
    }, 450)
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
        triggerVerification(pasted)
      }
    }
  }

  const handleAutoFill = () => {
    const code = demoOtp && demoOtp.length === length ? demoOtp : '4719'
    const newDigits = code.split('').slice(0, length)
    setDigits(newDigits)
    inputRefs.current[length - 1]?.focus()
    triggerVerification(code)
  }

  const fullOtp = digits.join('')
  const isComplete = fullOtp.length === length && !digits.includes('')

  const slotPositions =
    length === 6
      ? ['top', 'top-right', 'bottom-right', 'bottom', 'bottom-left', 'top-left']
      : ['top', 'right', 'bottom', 'left']

  return (
    <div className="orbit-otp-light-card">
      {/* Top Drag Handle Accent */}
      <div className="orbit-card-pill-bar"></div>

      {/* Header Info */}
      <div className="orbit-header-content">
        <h2 className="orbit-title">Verify your number</h2>
        <p className="orbit-subtitle">
          Enter the {length}-digit code sent to <span className="orbit-phone-tag">{maskedPhone()}</span>
        </p>
        <button type="button" className="orbit-edit-btn" onClick={onChangeNumber}>
          <Edit3 size={13} /> Change Number
        </button>
      </div>

      {/* ORBITAL 4-SLOT ROTATING INTERACTIVE STAGE */}
      <div className="orbit-stage-container">
        <div className={`orbit-rotator-wrapper ${isSpinning ? 'spinning' : ''}`}>
          {/* SVG Dotted Orbit Ring */}
          <svg className="orbit-svg-track" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="82" className="orbit-dotted-circle" />
          </svg>

          {/* Central Nucleus Hub */}
          <div className="orbit-center-nucleus">
            <span className="orbit-nucleus-dot"></span>
          </div>

          {/* 4 Orbital Satellite Slot Boxes */}
          {digits.map((digit, i) => {
            const posClass = slotPositions[i] || 'top'
            const isFilled = Boolean(digit)
            return (
              <div
                key={i}
                className={`orbit-satellite-slot pos-${posClass} ${isFilled ? 'filled' : ''}`}
                onClick={() => inputRefs.current[i]?.focus()}
              >
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
                  className="orbit-digit-input"
                  autoComplete="one-time-code"
                />
                {!digit && <span className="orbit-slot-placeholder-dot"></span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Fast Demo Code Helper */}
      {demoOtp && (
        <div className="orbit-fast-demo-banner">
          <div className="orbit-demo-code-text">
            <Sparkles size={14} color="#059669" />
            <span>Fast Demo Code: <strong>{demoOtp}</strong></span>
          </div>
          <button type="button" className="orbit-auto-fill-btn" onClick={handleAutoFill}>
            Auto-Fill & Verify
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="orbit-error-card">
          <span>{error}</span>
        </div>
      )}

      {/* Verify Button */}
      <button
        type="button"
        className="primary-button full orbit-submit-action"
        disabled={loading || !isComplete}
        onClick={() => triggerVerification(fullOtp)}
      >
        {loading || isSpinning ? (
          <>
            <LoaderCircle className="spin" size={18} /> Verifying Code...
          </>
        ) : (
          <>
            <ShieldCheck size={18} /> Verify & Access Portal <ChevronRight size={17} />
          </>
        )}
      </button>

      {/* Resend Footer */}
      <div className="orbit-footer-row">
        {resendTimer > 0 ? (
          <span className="orbit-resend-text">
            Didn't receive the code? Resend in <strong>{resendTimer}s</strong>
          </span>
        ) : (
          <button type="button" className="orbit-resend-active-action" onClick={onResend} disabled={loading}>
            <RefreshCw size={13} /> Resend SMS Code
          </button>
        )}
      </div>
    </div>
  )
}
