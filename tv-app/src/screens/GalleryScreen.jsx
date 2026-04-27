import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import LogoTitleSvg from '../assets/logo-title.svg'
import HeartIcon from '../assets/heart.svg'
import CalendarIcon from '../assets/calendar.svg'
import LogoutIcon from '../assets/logout.svg'
import SelectedHeart from '../assets/selected.svg'
import DefaultCoverImg from '../assets/engagement-card.png'
import SelectedCoverImg from '../assets/selected-card.png'
import useRemoteKeys, { TV_KEYS } from '../hooks/useRemoteKeys'
import useSessionGuard from '../hooks/useSessionGuard'
import '../styles/gallery-screen.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:1337'
const GRID_COLS = 3

export default function GalleryScreen() {
  useSessionGuard()
  const navigate = useNavigate()
  const location = useLocation()
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [activeAlbumId, setActiveAlbumId] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [logoutFocused, setLogoutFocused] = useState(false)
  const cardRefs = useRef([])
  const logoutRef = useRef(null)
  const scrollAreaRef = useRef(null)

  const [coupleName, setCoupleName] = useState(location.state?.coupleName || '')
  const [eventDate, setEventDate] = useState(location.state?.eventDate || '')
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(false)

  const tvToken = location.state?.tvToken || sessionStorage.getItem('tvToken')

  const tvLogout = async () => {
    if (tvToken) {
      try {
        await fetch(`${API_BASE}/api/tv/pair/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tvToken}` },
        })
      } catch (_) {}
    }
    sessionStorage.removeItem('tvToken')
    sessionStorage.removeItem('weddingId')
    sessionStorage.removeItem('pairingId')
    navigate('/')
  }

  // Fetch albums + counts
  const fetchAlbums = React.useCallback(async () => {
    if (!tvToken) return
    try {
      const data = await fetch(`${API_BASE}/api/tv/albums`, {
        headers: { Authorization: `Bearer ${tvToken}` },
      }).then((r) => r.json())

      if (data.albums && data.albums.length > 0) {
        const mapped = data.albums
          .filter((a) => {
            const t = (a.event || '').toLowerCase()
            return !t.includes('selected') && !t.includes('favourite') && !t.includes('favorite')
          })
          .map((a) => ({
            id: a.event,
            title: a.event,
            count: a.photoCount ?? null,
            image: a.coverUrl || null,
            isFavorite: false,
          }))

        // Always append "Selected Moments" from the selections endpoint
        const selData = await fetch(`${API_BASE}/api/tv/selections`, {
          headers: { Authorization: `Bearer ${tvToken}` },
        }).then((r) => r.json()).catch(() => ({ count: 0, photos: [] }))

        const selCount = selData.count ?? (selData.photos || []).length
        const allAlbums = selCount > 0
          ? [...mapped, { id: '__selected__', title: 'Selected Moments', count: selCount, image: SelectedCoverImg, isFavorite: true }]
          : mapped

        setAlbums(allAlbums)
      }
    } catch (err) {
      console.error('albums error:', err)
    }
  }, [tvToken])

  // Fetch real wedding info + albums on mount, then auto-refresh every 30s
  useEffect(() => {
    if (!tvToken) return

    fetch(`${API_BASE}/api/tv/wedding`, {
      headers: { Authorization: `Bearer ${tvToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.brideName && data.groomName) setCoupleName(`${data.brideName} & ${data.groomName}`)
        if (data.weddingDate) setEventDate(data.weddingDate)
      })
      .catch((err) => console.error('wedding info error:', err))

    setLoading(true)
    fetchAlbums().finally(() => setLoading(false))

    const interval = setInterval(() => fetchAlbums(), 30000)

    // Heartbeat every 20s so backend knows TV is alive
    const heartbeat = () => fetch(`${API_BASE}/api/tv/pair/heartbeat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tvToken}` },
    }).catch(() => {})
    heartbeat()
    const hbInterval = setInterval(heartbeat, 3000)

    return () => { clearInterval(interval); clearInterval(hbInterval) }
  }, [tvToken, fetchAlbums])

  useEffect(() => {
    if (!isTransitioning) {
      const el = cardRefs.current[focusedIndex]
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [focusedIndex, isTransitioning])

  const openAlbum = (album) => {
    if (isTransitioning) return
    setActiveAlbumId(album.id)
    setIsTransitioning(true)
    requestAnimationFrame(() => {
      navigate('/album', {
        state: {
          albumId: album.id,
          albumName: album.title,
          coupleName,
          eventDate,
          tvToken,
          fromGallery: true,
        },
      })
    })
  }

  useEffect(() => {
    if (logoutFocused) {
      logoutRef.current?.focus()
      scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      cardRefs.current[focusedIndex]?.focus()
    }
  }, [logoutFocused, focusedIndex])

  useRemoteKeys({
    [TV_KEYS.UP]: () => {
      if (isTransitioning) return
      if (logoutFocused) return
      if (focusedIndex >= GRID_COLS) {
        setFocusedIndex((prev) => prev - GRID_COLS)
      } else {
        setLogoutFocused(true)
      }
    },
    [TV_KEYS.DOWN]: () => {
      if (isTransitioning) return
      if (logoutFocused) { setLogoutFocused(false); return }
      const next = focusedIndex + GRID_COLS
      if (next < albums.length) setFocusedIndex(next)
    },
    [TV_KEYS.RIGHT]: () => {
      if (isTransitioning) return
      if (logoutFocused) return
      setFocusedIndex((prev) => Math.min(prev + 1, albums.length - 1))
    },
    [TV_KEYS.LEFT]: () => {
      if (isTransitioning) return
      if (logoutFocused) return
      setFocusedIndex((prev) => Math.max(prev - 1, 0))
    },
    [TV_KEYS.ENTER]: () => {
      if (isTransitioning) return
      if (logoutFocused) { tvLogout(); return }
      openAlbum(albums[focusedIndex])
    },
    [TV_KEYS.BACK]: () => {
      if (isTransitioning) return
      if (logoutFocused) { setLogoutFocused(false); return }
      navigate('/welcome', { state: { coupleName, eventDate, tvToken } })
    },
    [TV_KEYS.POWER]: () => tvLogout(),
  })

  return (
    <motion.div
      className="tv-gallery-page"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0, scale: isTransitioning ? 0.985 : 1 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ type: 'tween', duration: 0.2, ease: [0, 0, 0.2, 1] }}
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', willChange: 'transform', backfaceVisibility: 'hidden' }}
    >
      <div className="tv-gallery-safe-area">
        <motion.div
          className="tv-gallery-topbar"
          animate={{ opacity: isTransitioning ? 0.45 : 1, scale: isTransitioning ? 0.985 : 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="tv-gallery-brand">
            <img src={LogoTitleSvg} alt="Us Forever" className="tv-gallery-brand-image" />
          </div>

          <div className="tv-gallery-meta">
            <div className="tv-gallery-meta-item">
              <img src={HeartIcon} alt="" className="tv-gallery-meta-icon" />
              <span className="tv-couple-name">{coupleName}</span>
            </div>
            <div className="tv-gallery-meta-item">
              <img src={CalendarIcon} alt="" className="tv-gallery-meta-icon" />
              <span>{eventDate}</span>
            </div>
            <button
              ref={logoutRef}
              className={`tv-gallery-logout ${logoutFocused ? 'is-focused' : ''}`}
              onClick={tvLogout}
              type="button"
            >
              <img src={LogoutIcon} alt="" className="tv-gallery-meta-icon" />
              <span>Logout</span>
            </button>
          </div>
        </motion.div>

        <div className="tv-gallery-scroll-area" ref={scrollAreaRef}>
          <motion.h1
            className="tv-gallery-heading"
            animate={{ opacity: isTransitioning ? 0 : 1, y: isTransitioning ? -14 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            Your Albums
          </motion.h1>

          <div className="tv-gallery-row">
            {loading ? (
              <div style={{ color: '#999', fontSize: 18, margin: 'auto' }}>Loading albums...</div>
            ) : (
              albums.map((album, index) => {
                const isActive = activeAlbumId === album.id
                const isInactive = activeAlbumId && activeAlbumId !== album.id

                return (
                  <motion.button
                    key={album.id}
                    ref={(el) => { cardRefs.current[index] = el }}
                    type="button"
                    className={`tv-album-card ${focusedIndex === index ? 'is-focused' : ''}`}
                    onFocus={() => { if (!isTransitioning) setFocusedIndex(index) }}
                    onClick={() => openAlbum(album)}
                    animate={{
                      opacity: isInactive ? 0 : 1,
                      scale: isActive ? 1.08 : focusedIndex === index ? 1.05 : 1,
                      filter: isInactive ? 'blur(4px)' : 'none',
                    }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{ pointerEvents: isTransitioning ? 'none' : 'auto', transformOrigin: 'center center' }}
                  >
                    <div className="tv-album-image-wrap">
                      <img src={album.image || DefaultCoverImg} alt={album.title} className="tv-album-image" />
                    </div>
                    <div className={`tv-album-footer footer-${album.id}`}>
                      <div className="tv-album-title">{album.title}</div>
                      {album.isFavorite ? (
                        <img src={SelectedHeart} alt="" className="tv-gallery-meta-icon" />
                      ) : album.count !== null ? (
                        <div className="tv-album-count">{album.count} photos</div>
                      ) : null}
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

