import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import LogoTitleSvg from '../assets/logo-title.svg'
import LogoSvg from '../assets/logo.svg'
import '../styles/signin-screen.css'
import useRemoteKeys, { TV_KEYS } from '../hooks/useRemoteKeys'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:1337'
const POLL_INTERVAL_MS = 3000

export default function SignInScreen() {
  const navigate = useNavigate()

  const [pairingId, setPairingId] = useState(null)
  const [qrPayload, setQrPayload] = useState(null)
  const [countdownStart, setCountdownStart] = useState(null) // { receivedAt, ttlSeconds }
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [error, setError] = useState(null)

  const pollRef = useRef(null)
  const timerRef = useRef(null)

  // Start a new pairing session
  async function startPairing() {
    try {
      setError(null)
      const tvDeviceId = localStorage.getItem('tvDeviceId')
      const res = await fetch(`${API_BASE}/api/tv/pair/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareType: 'family', tvDeviceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start pairing')

      setPairingId(data.pairingId)
      setQrPayload(data.qrPayload)
      setCountdownStart({ receivedAt: Date.now(), ttlSeconds: data.ttlSeconds || 60 })
    } catch (err) {
      setError('Could not connect to server')
      console.error('startPairing error:', err)
      // Auto-retry after 5 seconds
      setTimeout(() => startPairing(), 5000)
    }
  }

  // Poll for status
  async function pollStatus(id) {
    try {
      const res = await fetch(`${API_BASE}/api/tv/pair/status?pairingId=${id}`)
      const data = await res.json()

      if (!res.ok || data.status === 'EXPIRED' || data.status === 'CANCELLED') {
        clearInterval(pollRef.current)
        startPairing()
        return
      }

      if (data.status === 'PAIRED' && data.tvToken && data.weddingId) {
        clearInterval(pollRef.current)
        clearInterval(timerRef.current)
        sessionStorage.setItem('tvToken', data.tvToken)
        sessionStorage.setItem('weddingId', data.weddingId)
        sessionStorage.setItem('pairingId', id)
        navigate('/welcome', {
          state: {
            weddingId: data.weddingId,
            tvToken: data.tvToken,
          },
        })
      }
    } catch (err) {
      console.error('pollStatus error:', err)
    }
  }

  // On mount — try to resume existing session first, then start fresh pairing
  useEffect(() => {
    async function init() {
      const tvDeviceId = localStorage.getItem('tvDeviceId')
      if (tvDeviceId) {
        try {
          const res = await fetch(`${API_BASE}/api/tv/pair/resume?tvDeviceId=${encodeURIComponent(tvDeviceId)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.active && data.tvToken && data.weddingId) {
              clearInterval(pollRef.current)
              clearInterval(timerRef.current)
              sessionStorage.setItem('tvToken', data.tvToken)
              sessionStorage.setItem('weddingId', data.weddingId)
              sessionStorage.setItem('pairingId', data.pairingId)
              navigate('/welcome', { state: { weddingId: data.weddingId, tvToken: data.tvToken } })
              return
            }
          }
        } catch (_) {}
      }
      startPairing()
    }
    init()
    return () => {
      clearInterval(pollRef.current)
      clearInterval(timerRef.current)
    }
  }, [])

  // When pairingId changes — start polling
  useEffect(() => {
    if (!pairingId) return
    clearInterval(pollRef.current)
    pollRef.current = setInterval(() => pollStatus(pairingId), POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
  }, [pairingId])

  // Countdown timer — uses relative time from when response was received, not client clock
  useEffect(() => {
    if (!countdownStart) return
    clearInterval(timerRef.current)

    const { receivedAt, ttlSeconds } = countdownStart
    const update = () => {
      const elapsed = Math.floor((Date.now() - receivedAt) / 1000)
      const secs = Math.max(0, ttlSeconds - elapsed)
      setRemainingSeconds(secs)
      if (secs === 0) clearInterval(timerRef.current)
    }
    update()
    timerRef.current = setInterval(update, 1000)
    return () => clearInterval(timerRef.current)
  }, [countdownStart])

  function formatTime(secs) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Extract short code from pairingId (last 6 chars, uppercase)
  const shortCode = pairingId ? pairingId.replace(/-/g, '').slice(-6).toUpperCase() : null
  const codeChars = shortCode ? shortCode.split('') : []

  useRemoteKeys({
    [TV_KEYS.ENTER]: () => navigate('/welcome', {
      state: { coupleName: 'Ayesha & Rahul', eventDate: 'November 14, 2024' },
    }),
  })

  return (
    <motion.div
      className="signin-tv-shell"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="signin-tv-screen">
        <div className="signin-tv-brand">
          <img src={LogoTitleSvg} alt="Us Forever" className="signin-tv-brand-image" />
        </div>

        <div className="signin-tv-title-wrap">
          <h1 className="signin-tv-title">
            <span className="signin-tv-title-line1">Sign In to Your</span>
            <span className="signin-tv-title-line2">Forever</span>
          </h1>
        </div>

        <div className="signin-tv-card">
          <h2 className="signin-tv-card-title">Connect Your Phone</h2>
          <p className="signin-tv-card-subtitle">
            Scan the QR code or
            <br />
            enter the code below
          </p>

          <div className="signin-tv-qr-wrap">
            {qrPayload ? (
              <QRCodeSVG
                value={qrPayload}
                size={256}
                level="H"
                bgColor="#ffffff"
                fgColor="#1a1a1a"
                imageSettings={{
                  src: LogoSvg,
                  width: 40,
                  height: 40,
                  excavate: true,
                }}
                className="signin-tv-qr-image"
              />
            ) : (
              <div className="signin-tv-qr-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 14 }}>
                {error || 'Loading...'}
              </div>
            )}
          </div>

          <div className="signin-tv-divider-row">
            <div className="signin-tv-divider-line" />
            <span className="signin-tv-divider-text">or</span>
            <div className="signin-tv-divider-line" />
          </div>

          <div className="signin-tv-code-row">
            {codeChars.length > 0
              ? codeChars.map((char, index) => (
                  <div key={index} className="signin-tv-code-box is-filled">{char}</div>
                ))
              : Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="signin-tv-code-box">—</div>
                ))
            }
          </div>

          <div className="signin-tv-refresh-text">
            {remainingSeconds > 0 ? `Refreshes in ${formatTime(remainingSeconds)}` : 'Refreshing...'}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
