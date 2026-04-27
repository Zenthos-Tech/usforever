export const platformApi = {
  name: 'androidtv',

  init() {
    console.log('android tv init')
  },

  exitApp() {
    console.log('android tv exit')
  },

  onRemoteKey(handler) {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  },
}