import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useSessionGuard from '../hooks/useSessionGuard'
import { motion } from 'framer-motion'
import BackIcon from '../assets/back.svg'
import '../styles/photo-viewer-screen.css'
import { mapKey, TV_KEYS } from '../platform/remoteKeys'

const MAX_DOTS = 4
const DOT_SIZE = 10
const DOT_GAP = 18
const PILL_WIDTH = 28
const SLIDESHOW_INTERVAL = 4000

export default function PhotoViewerScreen() {
  useSessionGuard()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    photos = [],
    initialIndex = 0,
    albumTitle = 'Wedding',
    albumId = '',
    isSlideshow = false,
    coupleName = '',
    eventDate = '',
    tvToken = null,
  } = location.state || {}

  const totalPhotos = photos.length
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [activeDotInWindow, setActiveDotInWindow] = useState(Math.min(initialIndex, MAX_DOTS - 1))

  const currentPhoto = photos[currentIndex]

  const visibleDots = Math.min(MAX_DOTS, totalPhotos)
  const dotStart = currentIndex - activeDotInWindow

  const goNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= totalPhotos - 1) return prev
      setActiveDotInWindow((d) => Math.min(d + 1, MAX_DOTS - 1))
      return prev + 1
    })
  }

  const goPrev = () => {
    setCurrentIndex((prev) => {
      if (prev <= 0) return prev
      setActiveDotInWindow((d) => Math.max(d - 1, 0))
      return prev - 1
    })
  }

  const goBack = () => {
    navigate('/album', { state: { albumId, albumName: albumTitle, coupleName, eventDate, tvToken, returnIndex: currentIndex } })
  }

  // Slideshow auto-advance
  useEffect(() => {
    if (!isSlideshow) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= totalPhotos - 1) {
          navigate('/album', { state: { albumId, albumName: albumTitle, coupleName, eventDate, tvToken, returnIndex: prev } })
          return prev
        }
        setActiveDotInWindow((d) => Math.min(d + 1, MAX_DOTS - 1))
        return prev + 1
      })
    }, SLIDESHOW_INTERVAL)
    return () => clearInterval(timer)
  }, [isSlideshow, totalPhotos, navigate])

  // Key handling
  useEffect(() => {
    const onKeyDown = (e) => {
      const key = mapKey(e)
      if (key === TV_KEYS.RIGHT) { goNext(); return }
      if (key === TV_KEYS.LEFT) { goPrev(); return }
      if (key === TV_KEYS.BACK) { goBack(); return }
      if (key === TV_KEYS.POWER) { navigate('/'); return }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentIndex, totalPhotos, navigate])

  if (!photos.length) {
    return (
      <div className="photo-viewer-screen">
        <div className="photo-viewer-empty">No photos found</div>
      </div>
    )
  }

  return (
    <motion.div
      className="photo-viewer-screen"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'tween', duration: 0.3, ease: [0, 0, 0.2, 1] }}
      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
    >
      <img
        src={currentPhoto.src}
        alt={currentPhoto.title || `Photo ${currentIndex + 1}`}
        className="photo-viewer-image"
      />

      {isSlideshow ? (
        <button
          className="photo-viewer-exit-slideshow-btn"
          onClick={goBack}
          aria-label="Exit Slideshow"
        >
          <img src={BackIcon} alt="" style={{ marginRight: '8px' }} />
          <span>Exit Slideshow</span>
        </button>
      ) : (
        <button
          className="photo-viewer-back-btn"
          onClick={goBack}
          aria-label="Go back"
        >
          <img src={BackIcon} alt="" />
        </button>
      )}

      <div className="photo-viewer-album-pill">{albumTitle}</div>

      <div className="photo-viewer-bottom-bar">
        <div className="photo-viewer-dots">
          {/* Static background dots */}
          {Array.from({ length: visibleDots }).map((_, i) => (
            <span key={dotStart + i} className="photo-viewer-dot" />
          ))}
          {/* Animated sliding pill */}
          <motion.span
            className="photo-viewer-dot-pill"
            animate={{
              x: activeDotInWindow * (DOT_SIZE + DOT_GAP) - (PILL_WIDTH - DOT_SIZE) / 2,
              // centers 28px pill over 10px dot: offset = -(28-10)/2 = -9
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          />
        </div>
        <div className="photo-viewer-counter">
          {currentIndex + 1} / {totalPhotos}
        </div>
      </div>
    </motion.div>
  )
}
