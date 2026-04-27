// src/AppShell.jsx
import { useEffect } from 'react'
import { platformApi } from './platform'

export default function AppShell({ children }) {
  useEffect(() => {
    platformApi.init()
  }, [])

  return children
}