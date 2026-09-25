// Logique du programme saut (Air Alert II). Les DONNÉES (tableau des 12 semaines,
// exercices, jours) vivent dans jumpProgram.json — ici on ne fait que les lire.
//
// Contrairement au press, un calendrier EXISTE : c'est le modèle des pompes et
// de la course, une séance à la fois, dans l'ordre.
import program from './jumpProgram.json' with { type: 'json' }

export const EXERCISES = program.exercises
export const WEEKS = program.weeks
export const REST_SEC = program.restSec
export const HEAVY_KG = program.heavyKg
export const REDUCED_FACTOR = program.reducedFactor
export const PER_WEEK = program.sessionsPerWeek
export const TOTAL_WORKOUTS = WEEKS.length * PER_WEEK
export const TEST_EVERY = program.testEveryWeeks * PER_WEEK // en séances

export function locate(index) {
  if (!(index >= 0) || index >= TOTAL_WORKOUTS) return null
  return { weekIndex: Math.floor(index / PER_WEEK), pos: index % PER_WEEK }
}

// Volume réduit : CHOIX DE L'APP (voir le JSON). Jamais sous 1 rep.
function scale(reps, reduced) {
  return reduced ? Math.max(1, Math.round(reps * REDUCED_FACTOR)) : reps
}

export function getWorkout(index, { reduced = false } = {}) {
  const at = locate(index)
  if (!at) return null
  const week = WEEKS[at.weekIndex]
  const exercises = EXERCISES.map((e) => {
    const [sets, reps] = week[e.id]
    return { ...e, sets, reps: scale(reps, reduced) }
  })
  const totalReps = exercises.reduce((n, e) => n + e.sets * e.reps * (e.perLeg ? 2 : 1), 0)
  return {
    index,
    weekIndex: at.weekIndex,
    weekNumber: at.weekIndex + 1,
    sessionNumber: at.pos + 1,
    exercises,
    totalReps,
    reduced,
  }
}

export function firstIndexOfWeek(weekIndex) {
  return Math.max(0, weekIndex) * PER_WEEK
}

// Jours entre deux séances, lus dans le motif d'Air Alert : lun-mer-ven les
// semaines impaires, mar-mer-jeu les paires. D'une semaine à l'autre : du
// dernier jour de l'une au premier de la suivante.
export function gapAfterSession(index) {
  const at = locate(index)
  if (!at) return 1
  const pattern = (w) => ((w + 1) % 2 === 1 ? program.dayPattern.odd : program.dayPattern.even)
  const days = pattern(at.weekIndex)
  if (at.pos < PER_WEEK - 1) return days[at.pos + 1] - days[at.pos]
  return 7 - days[PER_WEEK - 1] + pattern(at.weekIndex + 1)[0]
}

// Détente = hauteur atteinte en sautant − hauteur atteinte bras tendu, pieds à plat.
export function verticalCm(standReach, jumpReach) {
  const s = Number(standReach)
  const j = Number(jumpReach)
  if (!(s > 0) || !(j > 0) || j < s) return null
  return Math.round(j - s)
}

// Un test est dû au départ, puis toutes les 4 semaines, et à la fin. Un seul
// par palier : `atIndex` dit à quelle séance il a été fait.
export function testDue(progress) {
  const index = progress?.finished ? TOTAL_WORKOUTS : (progress?.index ?? 0)
  if (index % TEST_EVERY !== 0 && index !== TOTAL_WORKOUTS) return false
  return !(progress?.maxHistory ?? []).some((t) => t?.atIndex === index)
}

// La détente stagne ou baisse DEUX tests de suite : les deux derniers ne font
// pas mieux que le meilleur d'avant. CHOIX DE L'APP — Air Alert ne prévoit rien.
export function isStalling(tests = []) {
  const cms = tests.map((t) => t?.cm).filter((n) => typeof n === 'number')
  if (cms.length < 3) return false
  const before = Math.max(...cms.slice(0, -2))
  return cms.slice(-2).every((n) => n <= before)
}

export function bestCm(tests = []) {
  const cms = tests.map((t) => t?.cm).filter((n) => typeof n === 'number')
  return cms.length ? Math.max(...cms) : null
}

export function isHeavy(weightKg) {
  return Number(weightKg) > HEAVY_KG
}
