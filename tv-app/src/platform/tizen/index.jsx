export const platformApi = {
  name: 'tizen',

  init() {
    console.log('tizen init')
  },

  exitApp() {
    console.log('tizen exit')
  },

  onRemoteKey(handler) {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  },
}