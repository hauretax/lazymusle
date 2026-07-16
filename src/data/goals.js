// Objectifs proposés à l'onboarding. Les DONNÉES vivent dans goals.json —
// ce fichier ne fait que les lire et les exposer.
import data from './goals.json'

export const goals = data.goals

// Seul module développé à ce jour : les autres objectifs sont en "bientôt".
export const PUSHUPS_GOAL = 'pushups'

export function getGoal(id) {
  return goals.find((g) => g.id === id) || null
}

export function hasProgram(id) {
  return getGoal(id)?.status === 'available'
}
