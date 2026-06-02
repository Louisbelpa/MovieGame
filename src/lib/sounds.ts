// Système sonore minimaliste — Web Audio API
const _AudioContext = typeof window !== 'undefined'
  ? (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)
  : null

let ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (!_AudioContext) return null
  if (!ctx) ctx = new _AudioContext()
  return ctx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.15) {
  if (localStorage.getItem('sound_muted') === 'true') return
  try {
    const c = getCtx()
    if (!c) return
    const osc = c.createOscillator()
    const gainNode = c.createGain()
    osc.connect(gainNode)
    gainNode.connect(c.destination)
    osc.frequency.value = freq
    osc.type = type
    gainNode.gain.setValueAtTime(gain, c.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
    osc.start(c.currentTime)
    osc.stop(c.currentTime + duration)
  } catch {
    // Ignore audio errors silently
  }
}

export const Sounds = {
  correct: () => {
    playTone(880, 0.15, 'sine', 0.12)
    setTimeout(() => playTone(1100, 0.2, 'sine', 0.10), 80)
  },
  wrong: () => {
    playTone(220, 0.25, 'sawtooth', 0.08)
  },
  win: () => {
    const freqs = [523, 659, 784, 1047]
    freqs.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.12), i * 80)
    })
  },
  lose: () => {
    playTone(330, 0.3, 'sawtooth', 0.08)
    setTimeout(() => playTone(220, 0.4, 'sawtooth', 0.06), 150)
  },
  click: () => playTone(800, 0.06, 'sine', 0.05),
  hint:  () => playTone(660, 0.12, 'sine', 0.08),
}

export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem('sound_muted') === 'true'
  } catch {
    return false
  }
}

export function toggleSound(): boolean {
  const next = !isSoundMuted()
  try {
    localStorage.setItem('sound_muted', String(next))
  } catch {
    // ignore
  }
  return next
}
