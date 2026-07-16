// Logique du programme L-sit. Les DONNÉES (axes, étapes, formule, prep) vivent dans
// lsitProgram.json — ce fichier ne fait que les lire et les exposer.
//
// Même méthode que l'équilibre du handstand : pas de calendrier, pas de chrono à
// s'auto-déclarer. On situe la personne sur deux axes indépendants, et le dosage
// des tenues vient du meilleur relevé EN SÉANCE (l'app mesure, elle ne demande pas).
import program from './lsitProgram.json' with { type: 'json' }
import * as iso from '../lib/isometrics.js'

export const AXES = program.axes
export const PREP = program.prep
export const HOLD = program.hold
export const CALIBRATION = program.calibration
export const REST_DAYS = program.restDays

export function getAxis(axisId) {
  return AXES.find((a) => a.id === axisId) || null
}

export function getStep(axisId, stepId) {
  return getAxis(axisId)?.steps.find((s) => s.id === stepId) || null
}

export function stepIndex(axisId, stepId) {
  const steps = getAxis(axisId)?.steps
  if (!steps) return -1
  return steps.findIndex((s) => s.id === stepId)
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

// Le L-sit est acquis quand les deux axes sont au bout : tenir aux anneaux ET en V-sit.
export function axesComplete(axes) {
  return !!axes && AXES.every((a) => isAxisComplete(a.id, axes[a.id]))
}

// La tenue max dépend de la COMBINAISON support + forme : un L complet sur parallettes
// et un groupé au sol n'ont rien à voir. D'où un relevé par couple.
export function bestKey(axes) {
  if (!axes) return null
  return AXES.map((a) => axes[a.id]).join('/')
}

export function bestFor(axes, bests) {
  const k = bestKey(axes)
  return k && bests ? (bests[k] ?? null) : null
}

export const computeHold = (maxHoldSec) => iso.computeHold(maxHoldSec, HOLD)
export const computeSets = (maxHoldSec) => iso.computeSets(maxHoldSec, HOLD)
export const sessionVolume = (maxHoldSec) => iso.sessionVolume(maxHoldSec, HOLD)

// Une séance : les consignes de l'étape courante de chaque axe, et un dosage.
// Tant qu'on n'a pas de relevé pour cette combinaison, la séance est une simple
// tenue max — c'est elle qui calera les suivantes.
export function getSession(progress) {
  const axes = progress?.axes
  if (!axes) return null

  const drills = AXES.map((a) => ({
    axisId: a.id,
    axisLabel: a.label,
    emoji: a.emoji,
    step: getStep(a.id, axes[a.id]),
  }))
  if (drills.some((d) => !d.step)) return null

  const best = bestFor(axes, progress.bests)

  if (best == null) {
    return {
      mode: 'calibration',
      drills,
      label: CALIBRATION.label,
      how: CALIBRATION.how,
      maxSec: CALIBRATION.maxSec,
      restSec: HOLD.restSec,
    }
  }

  return {
    mode: 'hold',
    drills,
    best,
    hold: computeHold(best),
    sets: computeSets(best),
    restSec: HOLD.restSec,
  }
}
