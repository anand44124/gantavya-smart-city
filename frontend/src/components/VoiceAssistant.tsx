import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, X, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../i18n/LanguageContext'

interface VoiceAssistantProps {
  onTranscript?: (text: string) => void
  mode?: 'floating' | 'inline'
}

declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

export function speakText(text: string, langCode = 'en-IN') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = langCode
  utterance.rate = 1.0
  window.speechSynthesis.speak(utterance)
}

export default function VoiceAssistant({ onTranscript, mode = 'floating' }: VoiceAssistantProps) {
  const { currentMeta, setLanguage, t } = useTranslation()
  const navigate = useNavigate()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = currentMeta.voiceCode

    recognition.onresult = (event: any) => {
      let current = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        current += event.results[i][0].transcript
      }
      setTranscript(current)
      if (onTranscript) onTranscript(current)

      // Check global voice navigation commands
      const lower = current.toLowerCase()
      if (lower.includes('home') || lower.includes('होम') || lower.includes('முகப்பு')) {
        navigate('/citizen')
      } else if (lower.includes('leaderboard') || lower.includes('लीडरबोर्ड') || lower.includes('रैंक')) {
        navigate('/citizen/leaderboard')
      } else if (lower.includes('report') || lower.includes('शिकायत') || lower.includes('புகார்')) {
        navigate('/citizen/report')
      } else if (lower.includes('my reports') || lower.includes('मेरी रिपोर्ट')) {
        navigate('/citizen/reports')
      } else if (lower.includes('hindi') || lower.includes('हिंदी') || lower.includes('हिन्दी')) {
        setLanguage('hi')
      } else if (lower.includes('english') || lower.includes('इंग्लिश')) {
        setLanguage('en')
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error', event.error)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
  }, [currentMeta, navigate, onTranscript, setLanguage])

  const toggleListening = () => {
    if (!supported || !recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setTranscript('')
      recognitionRef.current.lang = currentMeta.voiceCode
      recognitionRef.current.start()
      setIsListening(true)
      setIsOpen(true)
    }
  }

  if (mode === 'inline') {
    return (
      <button
        type="button"
        className={`voice-inline-btn ${isListening ? 'active' : ''}`}
        onClick={toggleListening}
        title={t('report_voice_dictate')}
      >
        {isListening ? <MicOff size={16} className="pulse-icon" /> : <Mic size={16} />}
        <span>{isListening ? t('report_voice_listening') : t('report_voice_dictate')}</span>
      </button>
    )
  }

  return (
    <div className="voice-floating-container">
      {isOpen && (
        <div className="voice-card-popup">
          <div className="voice-card-header">
            <div className="voice-title">
              <Sparkles size={16} />
              <strong>{t('voice_assistant_title')}</strong>
            </div>
            <button className="icon-btn-sm" onClick={() => setIsOpen(false)}>
              <X size={15} />
            </button>
          </div>
          <p className="voice-lang-info">
            Language: <b>{currentMeta.nativeName}</b> ({currentMeta.voiceCode})
          </p>
          <div className={`voice-wave-box ${isListening ? 'listening' : ''}`}>
            {isListening ? (
              <div className="voice-waves">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            ) : (
              <p className="muted">{t('voice_assistant_hint')}</p>
            )}
          </div>
          {transcript && (
            <div className="voice-transcript-box">
              <small>Transcribed:</small>
              <p>"{transcript}"</p>
            </div>
          )}
          <div className="voice-card-actions">
            <button
              className={`primary-button ${isListening ? 'btn-listening' : ''}`}
              onClick={toggleListening}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              {isListening ? t('voice_assistant_stop') : 'Start Speaking'}
            </button>
          </div>
        </div>
      )}
      <button
        className={`voice-fab ${isListening ? 'listening' : ''}`}
        onClick={() => {
          if (!isOpen) setIsOpen(true)
          toggleListening()
        }}
        aria-label="Voice Assistant"
        title="Open Voice Assistant"
      >
        {isListening ? <MicOff size={22} /> : <Mic size={22} />}
      </button>
    </div>
  )
}
