// Logique du programme handstand. Les DONNÉES (niveaux, formule, prep) vivent dans
// handstandProgram.json — ce fichier ne fait que les lire et les exposer.
//
// Différence de fond avec les pompes : il n'y a PAS de calendrier jour-par-jour.
// Aucune source sérieuse n'en donne (voir `_sources._attention` dans le JSON). Le
// programme se dérive de la tenue max : test → tenues à 60-70 % → volume cible.
import program from './handstandProgram.json' with { type: 'json' }

export const levels = program.levels
export const TEST = program.test
export const PREP = program.prep
export const BAIL = program.bail
export const HOLD = program.hold
export const PRACTICE = program.practice
export const REST_DAYS = program.restDays

// Durée d'une tenue de travail : 60-70 % de la tenue max (Prilepin isométrique).
// Jamais jusqu'à l'échec — c'est tout l'intérêt du pourcentage.
//
// L'arrondi s'adapte : à 5 s près une fois que c'est assez long, à la seconde en
// dessous — sinon le pas de 5 s fausse le pourcentage sur les tenues courtes
// (12 s de max donneraient 10 s de travail, soit 83 %, pas 65 %).
// Et jamais plus que la tenue max : prescrire l'infaisable n'aide personne.
export function computeHold(maxHoldSec) {
  if (!(maxHoldSec > 0)) return 0
  const raw = maxHoldSec * HOLD.pct
  const step = raw >= HOLD.roundToAbove ? HOLD.roundTo : 1
  const rounded = Math.round(raw / step) * step
  return Math.min(maxHoldSec, Math.max(1, rounded))
}

// Nombre de tenues : celui qui approche le mieux le volume cible, plafonné pour
// que la séance reste courte (le skill se travaille frais, pas en s'épuisant).
//
// Le volume ne tombe pas toujours dans les 36-65 s de la source : à tenue donnée,
// seuls des multiples entiers sont atteignables. Un vrai débutant (tenue max de
// quelques secondes) reste sous la fourchette une fois le plafond de séries atteint —
// c'est assumé : il lui faut d'abord du conditionnement, pas du volume.
export function computeSets(maxHoldSec) {
  const hold = computeHold(maxHoldSec)
  if (hold <= 0) return 0
  const ideal = HOLD.volumeTarget / hold
  return Math.min(HOLD.maxSets, Math.max(1, Math.round(ideal)))
}

export function sessionVolume(maxHoldSec) {
  return computeHold(maxHoldSec) * computeSets(maxHoldSec)
}

// Description d'une séance, dérivée de la tenue max du moment.
export function getSession(levelIndex, maxHoldSec) {
  const level = levels[levelIndex]
  if (!level) return null

  if (level.mode === 'practice') {
    const attempts = Math.max(1, Math.round((level.minutes ?? PRACTICE.minutes) * 60
      / (PRACTICE.attemptSec + PRACTICE.restSec)))
    return {
      levelIndex,
      levelName: level.name,
      mode: 'practice',
      exercise: level.exercise,
      how: level.how,
      goal: level.goal,
      attempts,
      attemptSec: PRACTICE.attemptSec,
      restSec: PRACTICE.restSec,
    }
  }

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

// Le niveau est validé quand la tenue max atteint SON objectif. Comparer une tenue
// à l'objectif d'un autre niveau n'a pas de sens : au mur et en équilibre libre,
// ce sont deux exercices différents.
export function reachedGoal(levelIndex, maxHoldSec) {
  const level = levels[levelIndex]
  return !!level && maxHoldSec != null && maxHoldSec >= level.goal
}

export function isLastLevel(levelIndex) {
  return levelIndex === levels.length - 1
}
