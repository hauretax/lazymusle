// Son (bip) + vibration pour signaler la fin d'une pause.
// L'AudioContext doit être créé/repris suite à un geste utilisateur (iOS).

let ctx = null

export function primeAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) ctx = new AC()
    }
    if (ctx && ctx.state === 'suspended') ctx.resume()
  } catch {
    /* audio indisponible : on ignore */
  }
}

export function beep({ freq = 880, duration = 0.15, when = 0 } = {}) {
  if (!ctx) return
  try {
    const t = ctx.currentTime + when
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + duration + 0.02)
  } catch {
    /* ignore */
  }
}

export function vibrate(pattern = [120, 60, 120]) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}

// Signal complet de fin de pause : deux bips + vibration.
export function endOfRestSignal() {
  beep({ freq: 660, duration: 0.14, when: 0 })
  beep({ freq: 990, duration: 0.18, when: 0.18 })
  vibrate([150, 80, 150])
}

// Petit tic de décompte (3, 2, 1).
export function tick() {
  beep({ freq: 520, duration: 0.07 })
}
