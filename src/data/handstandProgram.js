// Logique du programme handstand. Les DONNÉES (niveaux, formule, prep) vivent dans
// handstandProgram.json — ce fichier ne fait que les lire et les exposer.
//
// Différence de fond avec les pompes : il n'y a PAS de calendrier jour-par-jour.
// Aucune source sérieuse n'en donne (voir `_sources._attention` dans le JSON). Le
// programme se dérive de la tenue max : test → tenues à 60-70 % → volume cible.
import program from './handstandProgram.json' with { type: 'json' }
import * as iso from '../lib/isometrics.js'

export const levels = program.levels
export const AXES = program.axes
export const TEST = program.test
export const PREP = program.prep
export const BAIL = program.bail
export const HOLD = program.hold
export const PRACTICE = program.practice
export const REST_DAYS = program.restDays

// Dosage des tenues : formule commune à tous les modules de tenue (lib/isometrics.js),
// paramétrée par le `hold` de ce programme.
export const computeHold = (maxHoldSec) => iso.computeHold(maxHoldSec, HOLD)
export const computeSets = (maxHoldSec) => iso.computeSets(maxHoldSec, HOLD)
export const sessionVolume = (maxHoldSec) => iso.sessionVolume(maxHoldSec, HOLD)

// ---- Niveau « L'équilibre » : deux axes indépendants ----
// On ne mesure pas un temps ici : on situe la personne sur « monter » et sur
// « rattraper ». Les deux avancent à leur rythme (voir `_axesNote` dans le JSON).

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

// L'étape à travailler : celle où on en est. La suivante n'arrive que quand
// on valide celle-ci — pas de saut, la progression n'est pas linéaire.
export function nextStep(axisId, stepId) {
  const steps = getAxis(axisId)?.steps || []
  const i = stepIndex(axisId, stepId)
  return i >= 0 && i < steps.length - 1 ? steps[i + 1] : null
}

export function isAxisComplete(axisId, stepId) {
  const steps = getAxis(axisId)?.steps || []
  return steps.length > 0 && stepIndex(axisId, stepId) === steps.length - 1
}

// Le handstand est « tenu » quand les deux axes sont au bout : monter en force
// ET corriger en continu.
export function axesComplete(axes) {
  return !!axes && AXES.every((a) => isAxisComplete(a.id, axes[a.id]))
}

// Description d'une séance, dérivée de l'état du niveau.
export function getSession(levelIndex, progress) {
  const level = levels[levelIndex]
  if (!level) return null

  if (level.mode === 'axes') {
    const axes = progress?.axes
    if (!axes) return null
    const attempts = Math.max(1, Math.round((PRACTICE.minutes * 60)
      / (PRACTICE.attemptSec + PRACTICE.restSec)))
    return {
      levelIndex,
      levelName: level.name,
      mode: 'axes',
      exercise: level.exercise,
      how: level.how,
      // Une séance = travailler l'étape courante de chaque axe.
      drills: AXES.map((a) => ({
        axisId: a.id,
        axisLabel: a.label,
        emoji: a.emoji,
        step: getStep(a.id, axes[a.id]),
      })).filter((d) => d.step),
      attempts,
      attemptSec: PRACTICE.attemptSec,
      restSec: PRACTICE.restSec,
    }
  }

  const maxHoldSec = progress?.maxHold
  return {
    levelIndex,
    levelName: level.name,
    mode: 'hold',
    exercise: level.exercise,
    how: level.how,
    goal: level.goal,
    hold: computeHold(maxHoldSec),
    sets: computeSets(maxHoldSec),
    restSec: HOLD.restSec,
  }
}

// Le niveau est validé quand la tenue max atteint SON objectif. Ne vaut que pour les
// niveaux chronométrés : au niveau « L'équilibre », c'est les axes qui font foi, pas
// un temps. Comparer une tenue à l'objectif d'un autre niveau n'a aucun sens.
export function reachedGoal(levelIndex, maxHoldSec) {
  const level = levels[levelIndex]
  if (!level || level.mode !== 'hold') return false
  return maxHoldSec != null && maxHoldSec >= level.goal
}

export function isLastLevel(levelIndex) {
  return levelIndex === levels.length - 1
}
