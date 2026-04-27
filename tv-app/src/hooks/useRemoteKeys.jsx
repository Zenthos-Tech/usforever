import { useEffect, useRef } from 'react'
import { platformApi } from '../platform'
import { mapKey, TV_KEYS } from '../platform/remoteKeys'

export default function useRemoteKeys(handlers = {}) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const cleanup = platformApi.onRemoteKey((event) => {
      const key = mapKey(event)
      if (!key) return

      const fn = handlersRef.current[key]
      if (fn) {
        event.preventDefault()
        fn(event)
      }
    })

    return cleanup
  }, [])
}

export { TV_KEYS }