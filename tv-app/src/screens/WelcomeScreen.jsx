import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/welcome-screen.css';
import logo from '../assets/logo-title.svg';
import bgImage from '../assets/background.jpeg';
import useRemoteKeys, { TV_KEYS } from '../hooks/useRemoteKeys'
import useSessionGuard from '../hooks/useSessionGuard';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:1337'

export default function WelcomeScreen() {
  useSessionGuard()
  const location = useLocation();
  const navigate = useNavigate();
  const btnRef = useRef(null);

  const [coupleName, setCoupleName] = useState(location.state?.coupleName || null)
  const [eventDate, setEventDate] = useState(location.state?.eventDate || null)

  // Heartbeat so mobile app knows TV is alive
  useEffect(() => {
    const tvToken = location.state?.tvToken || sessionStorage.getItem('tvToken')
    if (!tvToken) return
    const hb = () => fetch(`${API_BASE}/api/tv/pair/heartbeat`, {
      method: 'POST', headers: { Authorization: `Bearer ${tvToken}` },
    }).catch(() => {})
    hb()
    const iv = setInterval(hb, 3000)
    return () => clearInterval(iv)
  }, [])

  // Fetch real wedding data if tvToken is available
  useEffect(() => {
    const tvToken = location.state?.tvToken || sessionStorage.getItem('tvToken')
    if (!tvToken) return

    fetch(`${API_BASE}/api/tv/wedding`, {
      headers: { Authorization: `Bearer ${tvToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.brideName && data.groomName) {
          setCoupleName(`${data.brideName} & ${data.groomName}`)
        }
        if (data.weddingDate) {
          setEventDate(data.weddingDate)
        }
      })
      .catch((err) => console.error('Failed to fetch wedding info:', err))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      btnRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const displayName = coupleName || ''
  const displayDate = eventDate || ''

  useRemoteKeys({
    [TV_KEYS.ENTER]: () => navigate('/gallery', { state: { coupleName: displayName, eventDate: displayDate } }),
    [TV_KEYS.BACK]: () => navigate('/'),
    [TV_KEYS.POWER]: () => navigate('/'),
  });

  return (
    <div className="tv-welcome-page">
      <img src={bgImage} alt="" className="tv-welcome-bg-img" />
      <div className="tv-welcome-overlay" />

      <div className="tv-safe-area">
        <div className="tv-welcome-header">
          <img src={logo} alt="us forever" className="tv-welcome-logo" />
        </div>

        <div className="tv-welcome-card">
          <div className="tv-welcome-script">Welcome to your forever</div>
          <h1 className="tv-welcome-title">{displayName}</h1>
          <p className="tv-welcome-subtitle">Memories · {displayDate}</p>

          <button
            ref={btnRef}
            type="button"
            className="tv-welcome-enter-btn"
            onClick={() => navigate('/gallery', { state: { coupleName: displayName, eventDate: displayDate } })}
          >
            ENTER
          </button>
        </div>
      </div>
    </div>
  );
}
