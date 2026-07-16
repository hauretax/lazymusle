// Logique du programme course. Les DONNÉES (les 27 séances) vivent dans
// runProgram.json — ce fichier ne fait que les lire et les exposer.
//
// Contrairement au handstand et au L-sit, le calendrier existe vraiment ici : c'est
// le Couch-to-5K de Josh Clark, publié. On est donc sur le modèle des pompes —
// des séances séquentielles — pas sur celui des axes.
import program from './runProgram.json' with { type: 'json' }

export const weeks = program.weeks
export const WARMUP = program.warmup
export const REST_PATTERN = program.restPattern
export const GOAL_LABEL = program.goalLabel

export const WORKOUTS_PER_WEEK = 3
export const TOTAL_WORKOUTS = weeks.reduce((n, w) => n + w.workouts.length, 0)

// Écart en jours après la n-ième séance. Josh Clark : espacer les 3 séances dans la
// semaine pour récupérer entre les efforts. Même motif que les pompes.
export function gapAfterSession(nCompleted) {
  const p = REST_PATTERN
  return p[(nCompleted - 1 + p.length) % p.length]
}

// Déplie une séance en une liste plate d'intervalles.
//
// Trois formes dans les données, toutes reprises du plan original :
//  - `alternate` + `totalSec` : « alterne 60 s de course et 90 s de marche pendant
//    20 min ». Le dernier intervalle est tronqué si le total tombe au milieu — c'est
//    fidèle à « for a total of 20 minutes ».
//  - `repeat` + `intervals` : « deux répétitions de… »
//  - `intervals` seul : la séquence est donnée telle quelle.
export function expand(workout) {
  if (!workout) return []

  if (workout.alternate) {
    const out = []
    let left = workout.totalSec
    let i = 0
    while (left > 0) {
      const src = workout.alternate[i % workout.alternate.length]
      const sec = Math.min(src.sec, left)
      out.push({ t: src.t, sec })
      left -= sec
      i++
    }
    return out
  }

  const once = workout.intervals ?? []
  const times = workout.repeat ?? 1
  const out = []
  for (let r = 0; r < times; r++) out.push(...once.map((x) => ({ ...x })))
  return out
}

export function workoutSeconds(workout) {
  return expand(workout).reduce((n, x) => n + x.sec, 0)
}

export function runSeconds(workout) {
  return expand(workout).filter((x) => x.t === 'run').reduce((n, x) => n + x.sec, 0)
}

// Position d'une séance dans le plan, à partir de son index global (0..26).
export function locate(index) {
  let i = index
  for (let w = 0; w < weeks.length; w++) {
    const n = weeks[w].workouts.length
    if (i < n) return { weekIndex: w, workoutIndex: i }
    i -= n
  }
  return null
}

export function indexOf(weekIndex, workoutIndex) {
  let n = 0
  for (let w = 0; w < weekIndex; w++) n += weeks[w].workouts.length
  return n + workoutIndex
}

// Description d'une séance : tout ce qu'il faut pour l'afficher et la jouer.
export function getWorkout(index) {
  const at = locate(index)
  if (!at) return null
  const week = weeks[at.weekIndex]
  const workout = week.workouts[at.workoutIndex]
  return {
    index,
    weekIndex: at.weekIndex,
    workoutIndex: at.workoutIndex,
    weekNumber: week.week,
    workoutNumber: at.workoutIndex + 1,
    summary: week.summary,
    note: workout.note ?? null,
    warmup: WARMUP,
    intervals: expand(workout),
    totalSec: workoutSeconds(workout) + WARMUP.sec,
    runSec: runSeconds(workout),
    isFinal: index === TOTAL_WORKOUTS - 1,
  }
}

// Refaire la semaine : Josh Clark le prescrit explicitement, ce n'est pas un échec.
export function firstIndexOfWeek(weekIndex) {
  return indexOf(weekIndex, 0)
}
