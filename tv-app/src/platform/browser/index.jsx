export const platformApi = {
  name: 'browser',

  init() {
    console.log('browser platform init')
  },

  exitApp() {
    console.log('browser exit app')
  },

  onRemoteKey(handler) {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  },
}