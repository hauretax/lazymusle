// Moteur de planning : quels exos un jour donné, dans quel ordre, sans se marcher dessus.
// Les profils (bloc, muscles) vivent dans goals.json ; ici on ne fait que raisonner dessus.
// Logique pure, sans React ni localStorage : testable telle quelle.
import { trainingOf, muscleLabel, STRETCHING } from '../data/goals.js'

// Ordre d'une séance. Le skill se travaille frais, avant que la force ne fatigue :
// Steven Low, "The Fundamentals of Bodyweight Strength Training" —
// échauffement → skill → force → étirements.
export const BLOCK_ORDER = ['skill', 'strength', 'endurance', 'mobility']

export const BLOCK_LABEL = {
  skill: 'Technique',
  strength: 'Force',
  endurance: 'Endurance',
  mobility: 'Souplesse',
}

export function blockRank(block) {
  const i = BLOCK_ORDER.indexOf(block)
  return i === -1 ? BLOCK_ORDER.length : i
}

// Les exos d'un même jour, remis dans l'ordre où les enchaîner.
// Tri stable : à bloc égal, on garde l'ordre d'entrée.
export function orderForDay(goalIds) {
  return goalIds
    .map((id, i) => ({ id, i }))
    .sort((a, b) => {
      const d = blockRank(trainingOf(a.id)?.block) - blockRank(trainingOf(b.id)?.block)
      return d !== 0 ? d : a.i - b.i
    })
    .map((x) => x.id)
}

// Muscles travaillés par les deux exos à la fois.
export function sharedMuscles(goalIdA, goalIdB) {
  const a = trainingOf(goalIdA)?.muscles || []
  const b = new Set(trainingOf(goalIdB)?.muscles || [])
  return a.filter((m) => b.has(m))
}

export function sharedMuscleLabels(goalIdA, goalIdB) {
  return sharedMuscles(goalIdA, goalIdB).map(muscleLabel)
}

// Le plan d'un jour : les exos dans l'ordre, plus les étirements en récupération.
// `stretch: false` pour un jour sans bloc de force (rien à récupérer).
export function dayPlan(goalIds) {
  const ordered = orderForDay(goalIds)
  const plan = ordered.map((id) => ({ goalId: id, block: trainingOf(id)?.block || 'strength' }))
  const needsStretch = plan.some((b) => b.block === 'strength' || b.block === 'endurance')
  if (needsStretch) plan.push({ goalId: null, block: STRETCHING.block })
  return plan
}

// Avertissements pour un jour où plusieurs exos tombent ensemble.
// Deux règles, toutes deux sourcées (voir TICKETS.md T2/T3) :
//  - chevauchement musculaire : les chartes OG donnent les muscles par exo ;
//  - charge de force : le handstand quotidien ne tient que "si tu ne fais pas beaucoup
//    de travail de force" (Douglas Wadle, forum GymnasticBodies).
export function dayWarnings(goalIds) {
  const out = []
  const ordered = orderForDay(goalIds)

  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const shared = sharedMuscleLabels(ordered[i], ordered[j])
      if (shared.length >= 2) {
        out.push({
          type: 'muscles',
          goalIds: [ordered[i], ordered[j]],
          muscles: shared,
        })
      }
    }
  }

  const skills = ordered.filter((id) => trainingOf(id)?.block === 'skill')
  const strengths = ordered.filter((id) => trainingOf(id)?.block === 'strength')
  if (skills.length > 0 && strengths.length > 0) {
    out.push({ type: 'skill-first', goalIds: [skills[0], strengths[0]] })
  }

  return out
}

// Un jour de test se prépare reposé : on signale le skill qui tape sur les mêmes
// muscles la veille d'un test.
export function eveOfTestConflict(testGoalId, otherGoalIds) {
  return otherGoalIds.filter((id) => id !== testGoalId && sharedMuscles(testGoalId, id).length >= 2)
}
