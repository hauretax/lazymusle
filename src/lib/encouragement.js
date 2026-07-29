// Ce que l'app dit quand on abandonne une séance. Les DONNÉES (paliers, phrases)
// vivent dans data/encouragement.json — ici, juste le choix.
//
// Pas de hasard : la phrase est tirée d'un `seed` (le nombre de pompes faites),
// donc le même écran affiche toujours la même chose — un rendu qui change à chaque
// re-render serait insupportable, et intestable.
import data from '../data/encouragement.json' with { type: 'json' }

export const STRETCH_THRESHOLD = data.stretchThreshold

// Les muscles ont vraiment travaillé : on propose la récupération.
export function shouldStretch(ratio) {
  return Number.isFinite(ratio) && ratio >= STRETCH_THRESHOLD
}

// Paliers rangés du plus exigeant au plus bas ; on prend le premier atteint.
export function abandonMessage(ratio, seed = 0) {
  const r = Number.isFinite(ratio) ? Math.max(0, ratio) : 0
  const bucket = data.buckets.find((b) => r >= b.min) ?? data.buckets[data.buckets.length - 1]
  const lines = bucket.lines
  const n = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0
  return lines[n % lines.length]
}
