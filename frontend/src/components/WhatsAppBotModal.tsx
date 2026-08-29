import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Send,
  Camera,
  MapPin,
  ShieldCheck,
  RotateCcw,
  CheckCheck,
  Clock,
} from 'lucide-react'
import { API_URL } from './reportApi'

interface Message {
  id: string
  sender: 'user' | 'bot'
  text: string
  image?: string
  time: string
  isStatus?: boolean
}

interface Props {
  isOpen: boolean
  onClose: () => void
}

export const WhatsAppBotModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: '👋 *नमस्ते! Gantavya (गंतव्य) Smart City AI Bot में आपका स्वागत है।*\n\n📸 *शिकायत दर्ज करने के लिए:*\n1. सड़क के गड्ढे (Pothole), कचरे या टूटी लाइट की *Photo* भेजें।\n2. साथ में अपना *Location Pin (📍)* भेजें।\n\n🎁 हर मान्य शिकायत पर *+50 Civic Points* पाएं!\n*(सत्र 2 मिनट की निष्क्रियता पर स्वतः समाप्त होता है)*',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [inputText, setInputText] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120) // 2-min countdown
  const [isTerminated, setIsTerminated] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<any>(null)


  // 2-Minute Inactivity Auto-Terminate Timer
  const resetTimer = () => {
    setTimeLeft(120)
    setIsTerminated(false)
  }

  useEffect(() => {
    if (!isOpen) return

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTerminated(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (!isOpen) return null

  const handleSendMessage = async (customText?: string, customImg?: string, customLoc?: { lat: number; lng: number }) => {
    if (isTerminated) {
      resetTimer()
    }

    const textToSend = customText !== undefined ? customText : inputText
    const imageToSend = customImg !== undefined ? customImg : selectedImage

    if (!textToSend.trim() && !imageToSend && !customLoc) return

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const userMsgId = Date.now().toString()

    const newMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      image: imageToSend || undefined,
      time: nowTime,
    }

    setMessages((prev) => [...prev, newMsg])
    setInputText('')
    setSelectedImage(null)
    setLoading(true)
    resetTimer()

    try {
      const res = await fetch(`${API_URL}/api/webhooks/whatsapp/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: '919876543210',
          text: textToSend,
          image_base64: imageToSend || undefined,
          latitude: customLoc?.lat,
          longitude: customLoc?.lng,
        }),
      })

      const data = await res.json()
      const botReply = data.reply || 'नमस्ते! आपकी शिकायत प्राप्त हुई।'

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: '⚠️ सर्वर से कनेक्ट करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setSelectedImage(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSendLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleSendMessage('📍 Current GPS Location Attached', undefined, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          })
        },
        () => {
          handleSendMessage('📍 Sector 14, Main Road, Delhi', undefined, {
            lat: 28.6139,
            lng: 77.2090,
          })
        }
      )
    } else {
      handleSendMessage('📍 Sector 14, Main Road, Delhi', undefined, {
        lat: 28.6139,
        lng: 77.2090,
      })
    }
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="wa-modal-backdrop" onClick={onClose}>
      <div className="wa-phone-frame" onClick={(e) => e.stopPropagation()}>
        {/* WhatsApp Header */}
        <div className="wa-header">
          <div className="wa-header-left">
            <div className="wa-avatar-badge">
              <img src="/gantavya-celtic-emerald.png" alt="Gantavya DP" className="wa-avatar-img" />
              <span className="wa-online-dot"></span>
            </div>
            <div className="wa-header-info">
              <div className="wa-bot-name-row">
                <strong>Gantavya AI (गंतव्य)</strong>
                <ShieldCheck size={15} className="wa-verified-badge" />
              </div>
              <span className="wa-status-text">Official Smart City 24/7 AI Bot</span>
            </div>
          </div>

          <div className="wa-header-actions">
            <div className="wa-timer-pill" title="Auto-terminates after 2 mins of inactivity">
              <Clock size={12} />
              <span>{isTerminated ? 'Terminated' : formatCountdown(timeLeft)}</span>
            </div>
            <button className="wa-close-btn" onClick={onClose} aria-label="Close WhatsApp">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* WhatsApp Body Chat Area */}
        <div className="wa-chat-body">
          <div className="wa-encryption-notice">
            <ShieldCheck size={13} />
            <span>Messages are end-to-end encrypted & verified by Gemini 3.6 Vision AI</span>
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`wa-bubble ${m.sender === 'user' ? 'user' : 'bot'}`}>
              {m.image && (
                <div className="wa-bubble-image">
                  <img src={m.image} alt="User Upload" />
                </div>
              )}
              <div className="wa-bubble-text" dangerouslySetInnerHTML={{ __html: m.text.replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
              <div className="wa-bubble-meta">
                <span className="wa-msg-time">{m.time}</span>
                {m.sender === 'user' && <CheckCheck size={14} className="wa-double-check" />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="wa-bubble bot typing">
              <span className="wa-typing-dot"></span>
              <span className="wa-typing-dot"></span>
              <span className="wa-typing-dot"></span>
            </div>
          )}

          {isTerminated && (
            <div className="wa-terminated-banner">
              <RotateCcw size={14} />
              <span>2-Minute Inactivity: Session terminated. Type or tap below to restart fresh.</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="wa-chips-row">
          <button className="wa-chip" onClick={() => fileInputRef.current?.click()}>
            <Camera size={13} /> Photo Pothole
          </button>
          <button className="wa-chip" onClick={handleSendLocation}>
            <MapPin size={13} /> Share Location
          </button>
          <button className="wa-chip" onClick={() => handleSendMessage('🎟️ Check My Points & Metro Pass')}>
            🎟️ Metro Pass
          </button>
        </div>

        {/* Selected Image Preview (if any) */}
        {selectedImage && (
          <div className="wa-image-preview-bar">
            <img src={selectedImage} alt="Preview" />
            <span>Photo ready to inspect with Gemini AI</span>
            <button onClick={() => setSelectedImage(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* WhatsApp Footer Input Bar */}
        <div className="wa-footer">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleImagePick}
          />
          <button
            className="wa-icon-action"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Photo"
          >
            <Camera size={20} />
          </button>
          <button
            className="wa-icon-action"
            onClick={handleSendLocation}
            title="Attach Location"
          >
            <MapPin size={20} />
          </button>

          <input
            type="text"
            className="wa-input"
            placeholder="Type a message or send photo..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage()
            }}
          />

          <button
            className="wa-send-btn"
            onClick={() => handleSendMessage()}
            disabled={loading || (!inputText.trim() && !selectedImage)}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
