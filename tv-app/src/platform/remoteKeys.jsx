// src/platform/remoteKeys.js
export const TV_KEYS = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  UP: 'UP',
  DOWN: 'DOWN',
  ENTER: 'ENTER',
  BACK: 'BACK',
  POWER: 'POWER',
}

export function mapKey(event) {
  // Samsung back: keyCode 10009, LG back: keyCode 461
  if (event.keyCode === 10009 || event.keyCode === 461) return TV_KEYS.BACK

  // LG Power: keyCode 409, Samsung Power: keyCode 409
  if (event.keyCode === 409) return TV_KEYS.POWER

  switch (event.key) {
    case 'ArrowLeft':
      return TV_KEYS.LEFT
    case 'ArrowRight':
      return TV_KEYS.RIGHT
    case 'ArrowUp':
      return TV_KEYS.UP
    case 'ArrowDown':
      return TV_KEYS.DOWN
    case 'Enter':
      return TV_KEYS.ENTER
    case 'GoBack':
    case 'Escape':
    case 'Backspace':
      return TV_KEYS.BACK
    case 'p':
    case 'P':
    case 'Power':
      return TV_KEYS.POWER
    default:
      return null
  }
}