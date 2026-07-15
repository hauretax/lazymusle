// Logique du programme. Les DONNÉES (niveaux, séries, réglages de pause) vivent
// dans pushupProgram.json — ce fichier ne fait que les lire et les exposer.
import program from './pushupProgram.json'

export const GOAL = program.goal
export const REST_PATTERN = program.restPattern
export const levels = program.levels

// Écart en jours à attendre après la n-ième séance terminée (n = 1, 2, 3, ...).
export function gapAfterSession(nCompleted) {
  const p = REST_PATTERN
  return p[(nCompleted - 1 + p.length) % p.length]
}

// Pause (s) après une série, adaptée à l'effort : plus la série est lourde,
// plus la pause est longue. clamp(base + reps*perRep, min, max).
export function computeRest(reps) {
  const r = program.rest
  const raw = r.base + reps * r.perRep
  const rounded = Math.round(raw / r.roundTo) * r.roundTo
  return Math.min(r.max, Math.max(r.min, rounded))
}

export const TOTAL_DAYS = levels.reduce((n, l) => n + l.workouts.length + 1, 0)

export function daysInLevel(levelIndex) {
  return levels[levelIndex].workouts.length + 1
}

export function isTestDay(levelIndex, dayIndex) {
  return dayIndex >= levels[levelIndex].workouts.length
}

// Placement selon le max au test initial. Aligné sur les tests de l'app (20 / 50).
export function pickLevelIndex(reps) {
  if (reps < 20) return 0
  if (reps < 50) return 1
  return 2
}

// Description d'une séance (normale ou test).
export function getDay(levelIndex, dayIndex) {
  const level = levels[levelIndex]
  if (!level) return null
  const test = isTestDay(levelIndex, dayIndex)
  if (test) {
    return {
      levelIndex,
      dayIndex,
      levelName: level.name,
      dayNumber: dayIndex + 1,
      totalDays: daysInLevel(levelIndex),
      isTest: true,
      target: level.test,
      values: [`${level.test}+`], // une seule "série" : le max à battre
    }
  }
  return {
    levelIndex,
    dayIndex,
    levelName: level.name,
    dayNumber: dayIndex + 1,
    totalDays: daysInLevel(levelIndex),
    isTest: false,
    target: null,
    values: level.workouts[dayIndex],
  }
}

// Toutes les séances restantes à partir de (levelIndex, dayIndex), tests compris.
export function remainingDays(levelIndex, dayIndex) {
  const res = []
  if (levelIndex == null) return res
  for (let L = levelIndex; L < levels.length; L++) {
    const start = L === levelIndex ? dayIndex : 0
    const n = daysInLevel(L)
    for (let D = start; D < n; D++) {
      res.push({ levelIndex: L, dayIndex: D, isTest: D >= levels[L].workouts.length })
    }
  }
  return res
}

// "12+" => { target: 12, isMax: true } ; 12 => { target: 12, isMax: false }
export function parseSet(value) {
  if (typeof value === 'string' && value.endsWith('+')) {
    return { target: parseInt(value, 10), isMax: true }
  }
  return { target: value, isMax: false }
}

export function sessionMinTotal(values) {
  return values.reduce((sum, v) => sum + parseSet(v).target, 0)
}
