// Le journal : ce qui a été fait, jour par jour, tous modules confondus.
//
// Une seule source : les historiques que chaque programme enregistre déjà. Le
// calendrier est une LECTURE de l'état, il ne stocke rien de neuf — comme la
// grille des niveaux (voir lib/progress). Donc rétroactif, et rien à migrer.
//
// Sans React ni localStorage : c'est de la donnée utilisateur, donc testé
// (`npm run check`).
import { levels as pushupLevels } from '../data/pushupProgram.js'
import * as hs from '../data/handstandProgram.js'
import * as run from '../data/runProgram.js'
import { PUSHUPS_GOAL, HANDSTAND_GOAL, LSIT_GOAL, RUN_GOAL } from '../data/goals.js'
import { sessionStatus, DONE } from './progress.js'
import { activitySummary, ACTIVITY_ID, ACTIVITY_EMOJI } from './activities.js'
import { formatWeather } from './weather.js'
import { dayKey } from './dates.js'

// `dayKey` a déménagé dans lib/dates : les activités libres en ont besoin, et
// elles sont lues ici — l'importer de journal ferait un cycle. Réexporté pour
// que les écrans et `npm run check` continuent de le prendre ici.
export { dayKey }

function entry(goalId, date, title, detail, status = DONE, extra = null) {
  const day = dayKey(date)
  return day ? { day, date, goalId, title, detail, status, ...extra } : null
}

function pushupEntries(p = {}) {
  const out = []
  for (const s of p.sessions ?? []) {
    const level = pushupLevels[s?.levelIndex]
    const nom = level?.name ?? 'Pompes'
    out.push(entry(
      PUSHUPS_GOAL, s?.date,
      s?.isTest ? `${nom} · Test` : `${nom} · Jour ${(s?.dayIndex ?? 0) + 1}`,
      s?.total != null ? `${s.total} pompes` : null,
      sessionStatus(s),
    ))
  }
  // Les tests de niveau sont déjà des séances : seul le test initial manque.
  for (const m of p.maxHistory ?? []) {
    if (m?.kind !== 'initial') continue
    out.push(entry(PUSHUPS_GOAL, m.date, 'Test initial', `${m.reps} pompes`))
  }
  return out.filter(Boolean)
}

function handstandEntries(h = {}) {
  const out = []
  for (const s of h.sessions ?? []) {
    out.push(entry(
      HANDSTAND_GOAL, s?.date,
      hs.levels[s?.levelIndex]?.name ?? 'Handstand',
      s?.volume ? `${s.volume} s tenus` : null,
    ))
  }
  for (const m of h.maxHistory ?? []) {
    out.push(entry(HANDSTAND_GOAL, m?.date, 'Test de tenue max', `${m?.sec} s`))
  }
  return out.filter(Boolean)
}

function lsitEntries(l = {}) {
  return (l.sessions ?? []).map((s) => entry(
    LSIT_GOAL, s?.date,
    s?.mode === 'calibration' ? 'L-sit · calibration' : 'L-sit',
    s?.volume ? `${s.volume} s tenus` : s?.best ? `tenue max ${s.best} s` : null,
  )).filter(Boolean)
}

function runEntries(r = {}) {
  return (r.sessions ?? []).map((s) => {
    const w = run.getWorkout(s?.index)
    const semaine = w?.weekNumber ?? s?.weekNumber
    return entry(
      RUN_GOAL, s?.date,
      semaine ? `Semaine ${semaine} · Séance ${w ? w.workoutNumber : ''}`.trim() : 'Course',
      s?.runSec ? `${Math.round(s.runSec / 60)} min courues` : null,
    )
  }).filter(Boolean)
}

// Les activités notées à la main (TICKETS.md T10). Elles ne sortent d'aucun
// programme : elles portent leur propre identité dans le calendrier, d'où
// l'emoji sur l'entrée — `getGoal('activity')` ne renverrait rien.
function activityEntries(list = []) {
  return (Array.isArray(list) ? list : []).map((a) => entry(
    ACTIVITY_ID, a?.date,
    a?.type || 'Activité',
    activitySummary(a) || null,
    DONE,
    {
      emoji: ACTIVITY_EMOJI,
      activityId: a?.id,
      note: a?.note || null,
      place: a?.place?.name || null,
      weather: formatWeather(a?.weather) || null,
    },
  )).filter(Boolean)
}

export function journalEntries(state) {
  const p = state?.programs ?? {}
  return [
    ...pushupEntries(p.pushups),
    ...handstandEntries(p.handstand),
    ...lsitEntries(p.core),
    ...runEntries(p.running),
    ...activityEntries(state?.activities),
  ]
}

// Map 'AAAA-MM-JJ' -> [entrées du jour], dans l'ordre où elles ont été faites.
export function journalByDay(state) {
  const out = new Map()
  for (const e of journalEntries(state)) {
    if (!out.has(e.day)) out.set(e.day, [])
    out.get(e.day).push(e)
  }
  for (const list of out.values()) {
    list.sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }
  return out
}

// Les cases d'un mois, semaines commencées le LUNDI (on est en France). Les jours
// des mois voisins bouchent les trous : une grille à cases vides se lit mal.
export function monthGrid(year, month) {
  const shift = (new Date(year, month, 1).getDay() + 6) % 7
  const nDays = new Date(year, month + 1, 0).getDate()
  const nCells = Math.ceil((shift + nDays) / 7) * 7
  const out = []
  for (let i = 0; i < nCells; i++) {
    const d = new Date(year, month, i - shift + 1)
    out.push({ key: dayKey(d), number: d.getDate(), inMonth: d.getMonth() === month && d.getFullYear() === year })
  }
  return out
}

// Mois précédent / suivant, sans se tromper sur décembre.
export function shiftMonth({ year, month }, delta) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

// Ce qu'il y a eu dans le mois affiché : des jours d'entraînement, des séances.
export function monthSummary(byDay, cells) {
  let days = 0
  let entries = 0
  for (const c of cells) {
    if (!c.inMonth) continue
    const list = byDay.get(c.key)
    if (!list?.length) continue
    days++
    entries += list.length
  }
  return { days, entries }
}
