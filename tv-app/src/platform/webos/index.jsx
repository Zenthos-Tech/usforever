export const platformApi = {
  name: 'webos',

  init() {
    console.log('webos init')
  },

  exitApp() {
    console.log('webos exit')
  },

  onRemoteKey(handler) {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  },
}