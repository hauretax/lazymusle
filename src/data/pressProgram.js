// Logique du programme press (L-sit to handstand). Les DONNÉES (axes, étapes,
// dosage, prep) vivent dans pressProgram.json — ce fichier ne fait que les lire.
//
// Même méthode que le L-sit : pas de calendrier (aucune source n'en donne), deux
// axes indépendants, et la séance se dérive de la position sur chacun.
import program from './pressProgram.json' with { type: 'json' }

export const AXES = program.axes
export const PREP = program.prep
export const DOSE = program.dose
export const REST_DAYS = program.restDays
export const ADVANCE_AT = program.advanceAtReps
export const PREREQUISITES = program.prerequisites

export function getAxis(axisId) {
  return AXES.find((a) => a.id === axisId) || null
}

export function getStep(axisId, stepId) {
  return getAxis(axisId)?.steps.find((s) => s.id === stepId) || null
}

export function stepIndex(axisId, stepId) {
  const steps = getAxis(axisId)?.steps
  return steps ? steps.findIndex((s) => s.id === stepId) : -1
}

export function nextStep(axisId, stepId) {
  const steps = getAxis(axisId)?.steps || []
  const i = stepIndex(axisId, stepId)
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null
}

export function isAxisComplete(axisId, stepId) {
  const steps = getAxis(axisId)?.steps || []
  return steps.length > 0 && stepIndex(axisId, stepId) === steps.length - 1
}

// Le but est le press pike depuis le L-sit : il est atteint quand il est FAIT
// proprement, pas quand on se situe dessus. D'où `ready` en plus de la position.
export function isGoalReached(axes, ready = {}) {
  return axes?.press === 'l-pike' && !!ready['l-pike']
}

// Le dosage d'une étape, selon sa nature : descente lente, reps, tenue, levées.
export function doseFor(step) {
  if (!step) return null
  if (step.kind === 'eccentric') return DOSE.eccentric
  if (step.kind === 'hold') return DOSE.hold
  // Les levées de jambes sont des reps, mais pas au dosage du press.
  if (step.id.startsWith('pike-lifts')) return DOSE.lifts
  return DOSE.reps
}

// Une séance : le press d'abord (skill, frais), la compression ensuite.
export function getSession(progress) {
  const axes = progress?.axes
  if (!axes) return null
  const drills = AXES.map((a) => {
    const step = getStep(a.id, axes[a.id])
    const dose = doseFor(step)
    return step && dose ? {
      axisId: a.id,
      axisLabel: a.label,
      emoji: a.emoji,
      step,
      kind: step.kind,
      sets: dose.sets,
      reps: dose.reps ?? null,
      holdSec: dose.holdSec ?? null,
      restSec: dose.restSec,
      note: dose.note,
    } : null
  })
  if (drills.some((d) => !d)) return null
  return { drills }
}

// Le critère de passage d'une étape, après une séance.
//  - reps : une série à `advanceAtReps` propres (Steven Low : « au-delà de 5-6 ») ;
//  - descente et tenue : le chiffre ne dit rien, c'est une question — descentes
//    de 7-10 s contrôlées (Low), genoux qui touchent sur la plupart des séries (Low).
export function meetsCriterion(drill, result) {
  if (!drill || !result) return false
  if (drill.kind === 'reps') return (result.sets ?? []).some((n) => n >= ADVANCE_AT)
  return !!result.confirmed
}

export const CRITERION_QUESTION = {
  eccentric: 'Tes descentes tiennent 7 à 10 s, contrôlées ?',
  hold: 'Les genoux ont touché le visage sur la plupart des tenues ?',
}
