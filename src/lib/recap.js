// « J'ai fait tout ça, voilà où j'en suis » (TICKETS.md T11) : le bilan d'une
// période, entre deux dates choisies.
//
// Comme le calendrier (lib/journal), ça ne stocke RIEN de neuf — c'est une
// lecture. Deux sources selon ce qu'on veut :
// - les jours actifs et les séries se lisent dans `journalEntries`, déjà testé ;
// - les totaux se lisent dans l'état BRUT, pas dans les entrées du journal. Ces
//   entrées portent du texte tout prêt (« 45 min · 5,2 km ») ; additionner du
//   texte, c'est le reparser, donc se tromper un jour.
//
// Sans React ni localStorage : c'est de la donnée utilisateur, donc testé
// (`npm run check`).
import { journalEntries } from './journal.js'
import { dayKey, parseDayKey, daysBetween, isValidDayKey } from './dates.js'
import { normalizeType, typeKey } from './activities.js'
import { measures as MEASURES } from '../data/measures.js'
import { sessionStatus, DONE, ABANDONED, TRIED } from './progress.js'
import { PUSHUPS_GOAL, HANDSTAND_GOAL, LSIT_GOAL, RUN_GOAL } from '../data/goals.js'

// Seules ces mesures s'additionnent. Un poids ne se cumule pas : 4 séances à
// 20 kg ne font pas 80 kg, ça ne veut rien dire.
const SUMMABLE = MEASURES.filter((m) => m.sums).map((m) => m.id)

// Deux dates dans le désordre restent une période valable — on remet d'aplomb
// plutôt que de refuser. `null` si l'une des deux n'est pas une date.
export function normalizeRange(a, b) {
  if (!isValidDayKey(a) || !isValidDayKey(b)) return null
  return a <= b ? { from: a, to: b } : { from: b, to: a }
}

export function entriesBetween(state, from, to) {
  const r = normalizeRange(from, to)
  if (!r) return []
  return journalEntries(state)
    .filter((e) => e && e.day >= r.from && e.day <= r.to)
    .sort((x, y) => x.day.localeCompare(y.day) || String(x.date).localeCompare(String(y.date)))
}

// Les jours où il s'est passé quelque chose, dans l'ordre, sans doublon.
export function activeDays(entries = []) {
  return [...new Set(entries.map((e) => e?.day).filter(Boolean))].sort()
}

// La plus longue suite de jours consécutifs. On avance d'un jour avec `setDate`
// plutôt que d'ajouter 86 400 000 ms : un jour de changement d'heure en fait
// 23 ou 25, et la série se casserait deux fois par an sans raison.
export function longestStreak(days = []) {
  const sorted = [...days].sort()
  let best = 0
  let run = 0
  let previous = null
  for (const day of sorted) {
    if (previous) {
      const next = parseDayKey(previous)
      next.setDate(next.getDate() + 1)
      run = dayKey(next) === day ? run + 1 : 1
    } else {
      run = 1
    }
    if (run > best) best = run
    previous = day
  }
  return best
}

// Les activités notées à la main, regroupées par type. Le nombre de fois, et le
// cumul de ce qui se cumule.
export function activityTotals(list = [], from, to) {
  const r = normalizeRange(from, to)
  if (!r || !Array.isArray(list)) return []
  const seen = new Map()
  for (const a of list) {
    const day = dayKey(a?.date)
    const type = normalizeType(a?.type)
    if (!day || !type || day < r.from || day > r.to) continue
    const key = typeKey(type)
    let at = seen.get(key)
    if (!at) {
      at = { key, type, count: 0, measures: {}, lastDate: '' }
      seen.set(key, at)
    }
    at.count++
    const date = String(a?.date ?? '')
    if (date > at.lastDate) {
      at.lastDate = date
      at.type = type // le libellé le plus récent, comme dans knownTypes
    }
    for (const id of SUMMABLE) {
      const v = a?.measures?.[id]
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        at.measures[id] = Math.round(((at.measures[id] ?? 0) + v) * 100) / 100
      }
    }
  }
  return [...seen.values()].sort((x, y) => (
    y.count - x.count || y.lastDate.localeCompare(x.lastDate) || x.type.localeCompare(y.type)
  ))
}

function inRange(date, r) {
  const day = dayKey(date)
  return Boolean(day) && day >= r.from && day <= r.to
}

function sumSeconds(sessions, r, field) {
  let total = 0
  for (const s of sessions ?? []) {
    if (!inRange(s?.date, r)) continue
    const v = s?.[field]
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) total += v
  }
  return Math.round(total)
}

function countSessions(sessions, r) {
  let done = 0
  let abandoned = 0
  let tried = 0
  for (const s of sessions ?? []) {
    if (!inRange(s?.date, r)) continue
    const st = sessionStatus(s)
    if (st === ABANDONED) abandoned++
    else if (st === TRIED) tried++
    else if (st === DONE) done++
  }
  return { done, abandoned, tried, total: done + abandoned + tried }
}

// Ce que les PROGRAMMES ont produit sur la période. Un module sans rien fait
// n'apparaît pas : un bilan qui liste des zéros ne dit rien.
export function programTotals(state, from, to) {
  const r = normalizeRange(from, to)
  if (!r) return []
  const p = state?.programs ?? {}
  const out = []

  const pushups = countSessions(p.pushups?.sessions, r)
  if (pushups.total > 0) {
    let reps = 0
    for (const s of p.pushups.sessions ?? []) {
      if (inRange(s?.date, r) && typeof s?.total === 'number' && s.total > 0) reps += s.total
    }
    out.push({ goalId: PUSHUPS_GOAL, ...pushups, reps })
  }

  const handstand = countSessions(p.handstand?.sessions, r)
  if (handstand.total > 0) {
    out.push({ goalId: HANDSTAND_GOAL, ...handstand, seconds: sumSeconds(p.handstand.sessions, r, 'volume') })
  }

  const lsit = countSessions(p.core?.sessions, r)
  if (lsit.total > 0) {
    out.push({ goalId: LSIT_GOAL, ...lsit, seconds: sumSeconds(p.core.sessions, r, 'volume') })
  }

  const running = countSessions(p.running?.sessions, r)
  if (running.total > 0) {
    out.push({ goalId: RUN_GOAL, ...running, seconds: sumSeconds(p.running.sessions, r, 'runSec') })
  }

  return out
}

// Le premier jour où il s'est passé quelque chose. Sert au raccourci « Tout ».
export function firstActiveDay(state) {
  const days = journalEntries(state).map((e) => e?.day).filter(Boolean).sort()
  return days[0] ?? null
}

// Les raccourcis de période. « Tout » remonte au premier jour enregistré, pas à
// une date arbitraire : la période doit coller à ce qu'il y a vraiment.
export function presetRange(kind, state, now = new Date()) {
  const to = dayKey(now)
  const back = (n) => {
    const d = new Date(now)
    d.setDate(d.getDate() - n)
    return dayKey(d)
  }
  if (kind === '7') return { from: back(6), to }
  if (kind === '30') return { from: back(29), to }
  if (kind === 'month') return { from: dayKey(new Date(now.getFullYear(), now.getMonth(), 1)), to }
  if (kind === 'all') return { from: firstActiveDay(state) ?? to, to }
  return { from: back(6), to }
}

export function recap(state, from, to) {
  const r = normalizeRange(from, to)
  if (!r) return null
  const entries = entriesBetween(state, r.from, r.to)
  const days = activeDays(entries)
  return {
    ...r,
    spanDays: daysBetween(r.from, r.to).length,
    activeDays: days.length,
    streak: longestStreak(days),
    entries: entries.length,
    activities: activityTotals(state?.activities, r.from, r.to),
    programs: programTotals(state, r.from, r.to),
  }
}
