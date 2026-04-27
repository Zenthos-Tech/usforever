import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:1337'
const POLL_MS = 2000

function getPairingId() {
  // Prefer explicitly stored pairingId
  const stored = sessionStorage.getItem('pairingId')
  if (stored) return stored

  // Fallback: decode it from the tvToken JWT payload (no verify needed)
  const tvToken = sessionStorage.getItem('tvToken')
  if (!tvToken) return null
  try {
    const payload = JSON.parse(atob(tvToken.split('.')[1]))
    return payload.pairingId || null
  } catch (_) {
    return null
  }
}

export default function useSessionGuard() {
  const navigate = useNavigate()
  const pollRef = useRef(null)

  useEffect(() => {
    const pairingId = getPairingId()
    if (!pairingId) return

    const check = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/tv/pair/status?pairingId=${encodeURIComponent(pairingId)}`
        )
        const data = await res.json()
        if (data.status === 'CANCELLED' || data.status === 'EXPIRED') {
          clearInterval(pollRef.current)
          sessionStorage.removeItem('tvToken')
          sessionStorage.removeItem('weddingId')
          sessionStorage.removeItem('pairingId')
          navigate('/', { replace: true })
        }
      } catch (_) {}
    }

    // Check immediately, then every 4s
    check()
    pollRef.current = setInterval(check, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [navigate])
}
