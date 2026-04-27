import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import LogoTitleSvg from '../assets/logo-title.svg'
import HeartIcon from '../assets/heart.svg'
import CalendarIcon from '../assets/calendar.svg'
import LogoutIcon from '../assets/logout.svg'
import BackIcon from '../assets/back.svg'
import SlideshowIcon from '../assets/slideshow.svg'
import SlideshowIconWhite from '../assets/slideshow-white.svg'
import '../styles/album-open-screen.css'
import useRemoteKeys, { TV_KEYS } from '../hooks/useRemoteKeys'
import useSessionGuard from '../hooks/useSessionGuard'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:1337'

const COLS = 6

const FOCUS_KEYS = {
  BACK: 'back',
  SLIDESHOW: 'slideshow',
  PHOTO: 'photo',
}

export default function AlbumOpenScreen() {
  useSessionGuard()
  const navigate = useNavigate()
  const location = useLocation()

  const albumId = location.state?.albumId || ''
  const albumName = location.state?.albumName || ''
  const coupleName = location.state?.coupleName || ''
  const eventDate = location.state?.eventDate || ''
  const tvToken = location.state?.tvToken || sessionStorage.getItem('tvToken')
  const returnIndex = location.state?.returnIndex ?? 0
  const isSelected = albumId === '__selected__'

  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [focus, setFocus] = useState({ type: FOCUS_KEYS.PHOTO, index: returnIndex })
  const [logoutFocused, setLogoutFocused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const logoutRef = useRef(null)
  const safeAreaRef = useRef(null)

  // Heartbeat so mobile app knows TV is alive
  useEffect(() => {
    if (!tvToken) return
    const hb = () => fetch(`${API_BASE}/api/tv/pair/heartbeat`, {
      method: 'POST', headers: { Authorization: `Bearer ${tvToken}` },
    }).catch(() => {})
    hb()
    const iv = setInterval(hb, 3000)
    return () => clearInterval(iv)
  }, [tvToken])

  // Fetch photos for this album
  useEffect(() => {
    if (!tvToken) { setLoading(false); return }

    setLoading(true)
    const url = isSelected
      ? `${API_BASE}/api/tv/selections`
      : `${API_BASE}/api/tv/albums/${encodeURIComponent(albumName)}/images?limit=60`

    fetch(url, { headers: { Authorization: `Bearer ${tvToken}` } })
      .then((r) => r.json())
      .then((data) => {
        if (isSelected) {
          setPhotos((data.photos || []).map((img, i) => ({ id: i, url: img.url, key: img.key })))
        } else if (data.images) {
          setPhotos(data.images.map((img, i) => ({ id: i, url: img.url, key: img.key })))
        }
      })
      .catch((err) => console.error('album images error:', err))
      .finally(() => setLoading(false))
  }, [albumId, albumName, tvToken, isSelected])

  const totalPhotos = photos.length

  const focusId = useMemo(() => {
    if (focus.type === FOCUS_KEYS.BACK) return 'album-back-btn'
    if (focus.type === FOCUS_KEYS.SLIDESHOW) return 'album-slideshow-btn'
    return `album-photo-${focus.index}`
  }, [focus])

  useEffect(() => {
    if (logoutFocused) {
      logoutRef.current?.focus()
    } else {
      const el = document.getElementById(focusId)
      if (el) {
        el.focus()
        if (focus.type === FOCUS_KEYS.BACK || focus.type === FOCUS_KEYS.SLIDESHOW) {
          safeAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        }
      }
    }
  }, [focusId, logoutFocused, focus.type])

  const photoViewerState = (initialIndex, isSlideshow = false) => ({
    photos: photos.map((p) => ({ src: p.url, title: albumName })),
    initialIndex,
    albumId,
    albumTitle: albumName,
    coupleName,
    eventDate,
    tvToken,
    isSlideshow,
    returnIndex: initialIndex,
  })

  const openFocusedPhoto = () => {
    if (focus.type === FOCUS_KEYS.BACK) {
      navigate('/gallery', { state: { coupleName, eventDate, tvToken } })
      return
    }
    if (focus.type === FOCUS_KEYS.SLIDESHOW) {
      setIsTransitioning(true)
      setTimeout(() => navigate('/photo-viewer', { state: photoViewerState(0, true) }), 280)
      return
    }
    if (focus.type === FOCUS_KEYS.PHOTO) {
      setIsTransitioning(true)
      setTimeout(() => navigate('/photo-viewer', { state: photoViewerState(focus.index) }), 280)
    }
  }

  useRemoteKeys({
    [TV_KEYS.LEFT]: () => {
      if (focus.type === FOCUS_KEYS.SLIDESHOW) { setFocus({ type: FOCUS_KEYS.BACK }); return }
      if (focus.type === FOCUS_KEYS.PHOTO) {
        if (focus.index === 0) { setFocus({ type: FOCUS_KEYS.BACK }); return }
        setFocus((prev) => ({ ...prev, index: prev.index - 1 }))
      }
    },
    [TV_KEYS.RIGHT]: () => {
      if (focus.type === FOCUS_KEYS.BACK) { setFocus({ type: FOCUS_KEYS.SLIDESHOW }); return }
      if (focus.type === FOCUS_KEYS.PHOTO) {
        setFocus((prev) => ({ ...prev, index: (prev.index + 1) % totalPhotos }))
      }
    },
    [TV_KEYS.UP]: () => {
      if (logoutFocused) return
      // SLIDESHOW → logout
      if (focus.type === FOCUS_KEYS.SLIDESHOW) { setLogoutFocused(true); return }
      // BACK → SLIDESHOW
      if (focus.type === FOCUS_KEYS.BACK) { setFocus({ type: FOCUS_KEYS.SLIDESHOW }); return }
      // first row of photos → BACK
      if (focus.type === FOCUS_KEYS.PHOTO) {
        if (focus.index < COLS) { setFocus({ type: FOCUS_KEYS.BACK }); return }
        setFocus((prev) => ({ ...prev, index: prev.index - COLS }))
      }
    },
    [TV_KEYS.DOWN]: () => {
      if (logoutFocused) { setLogoutFocused(false); setFocus({ type: FOCUS_KEYS.SLIDESHOW }); return }
      if (focus.type === FOCUS_KEYS.SLIDESHOW || focus.type === FOCUS_KEYS.BACK) {
        setFocus({ type: FOCUS_KEYS.PHOTO, index: 0 }); return
      }
      if (focus.type === FOCUS_KEYS.PHOTO) {
        const nextIndex = focus.index + COLS
        if (nextIndex < totalPhotos) setFocus({ type: FOCUS_KEYS.PHOTO, index: nextIndex })
      }
    },
    [TV_KEYS.ENTER]: () => {
      if (logoutFocused) { navigate('/'); return }
      openFocusedPhoto()
    },
    [TV_KEYS.BACK]: () => {
      if (logoutFocused) { setLogoutFocused(false); return }
      navigate('/gallery', { state: { coupleName, eventDate, tvToken } })
    },
    [TV_KEYS.POWER]: () => navigate('/'),
  })

  return (
    <motion.div
      className="tv-album-page"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.2, ease: [0, 0, 0.2, 1] }}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', background: '#f7edef', overflow: 'hidden', zIndex: 30, willChange: 'transform' }}
    >
      <div ref={safeAreaRef} className="tv-album-safe-area" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 2 }}>
        <motion.div
          className="tv-album-topbar"
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: isTransitioning ? 0 : 1, y: isTransitioning ? -24 : 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <img src={LogoTitleSvg} alt="Us Forever" className="tv-album-brand-image" />
          <div className="tv-album-meta">
            <div className="tv-album-meta-item">
              <img src={HeartIcon} alt="" className="tv-album-meta-icon" />
              <span className="tv-couple-name">{coupleName}</span>
            </div>
            <div className="tv-album-meta-item">
              <img src={CalendarIcon} alt="" className="tv-album-meta-icon" />
              <span>{eventDate}</span>
            </div>
            <button
              ref={logoutRef}
              className={`tv-album-logout ${logoutFocused ? 'is-focused' : ''}`}
              type="button"
              onClick={() => navigate('/')}
            >
              <img src={LogoutIcon} alt="" className="tv-album-meta-icon" />
              <span>Logout</span>
            </button>
          </div>
        </motion.div>

        <div
          className="tv-album-header"
          style={{ width: 'min(90%, 1400px)', marginLeft: 'auto', marginRight: 'auto', marginTop: '48px', marginBottom: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 5, flexShrink: 0 }}
        >
          <button
            id="album-back-btn"
            type="button"
            className={`tv-album-circle-btn ${focus.type === FOCUS_KEYS.BACK && !logoutFocused ? 'is-focused' : ''}`}
            onClick={() => navigate('/gallery', { state: { coupleName, eventDate, tvToken } })}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <img src={BackIcon} alt="Back" />
          </button>

          <div className="tv-album-title-wrap" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 className="tv-album-title" style={{ margin: 0 }}>{albumName}</h1>
            <div className="tv-album-subtitle">
              {loading ? 'Loading...' : `${totalPhotos} photos`}
            </div>
          </div>

          <button
            id="album-slideshow-btn"
            type="button"
            className={`tv-album-slideshow-btn ${focus.type === FOCUS_KEYS.SLIDESHOW && !logoutFocused ? 'is-focused' : ''}`}
            onClick={() => navigate('/photo-viewer', { state: photoViewerState(0, true) })}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <img src={SlideshowIcon} alt="" className="tv-album-slideshow-icon tv-slideshow-default" />
            <img src={SlideshowIconWhite} alt="" className="tv-album-slideshow-icon tv-slideshow-focused" />
            <span>Start Slideshow</span>
          </button>
        </div>

        <div className="tv-photo-grid" style={{ position: 'relative', zIndex: 1 }}>
          {loading ? (
            <div style={{ color: '#999', fontSize: 18, gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>
              Loading photos...
            </div>
          ) : photos.length === 0 ? (
            <div style={{ color: '#999', fontSize: 18, gridColumn: '1/-1', textAlign: 'center', padding: '40px 0' }}>
              No photos in this album
            </div>
          ) : (
            photos.map((photo, index) => (
              <button
                key={photo.id}
                id={`album-photo-${index}`}
                type="button"
                className={`tv-photo-card ${focus.type === FOCUS_KEYS.PHOTO && focus.index === index ? 'is-focused' : ''}`}
                onClick={() => navigate('/photo-viewer', { state: photoViewerState(index) })}
              >
                <img src={photo.url} alt={`Photo ${index + 1}`} className="tv-photo-image" />
              </button>
            ))
          )}
        </div>
      </div>
    </motion.div>
  )
}
