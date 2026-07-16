// Objectifs proposés à l'onboarding et profils d'entraînement. Les DONNÉES vivent
// dans goals.json — ce fichier ne fait que les lire et les exposer.
// L'attribut `with { type: 'json' }` permet à Node de charger ce module tel quel
// (`npm run check`), en plus de Vite.
import data from './goals.json' with { type: 'json' }

export const goals = data.goals
export const muscleLabels = data.muscles
export const STRETCHING = data.stretching

export const PUSHUPS_GOAL = 'pushups'
export const HANDSTAND_GOAL = 'handstand'
export const LSIT_GOAL = 'core'

export function getGoal(id) {
  return goals.find((g) => g.id === id) || null
}

export function hasProgram(id) {
  return getGoal(id)?.status === 'available'
}

export function trainingOf(id) {
  return getGoal(id)?.training || null
}

export function muscleLabel(id) {
  return muscleLabels[id] || id
}
