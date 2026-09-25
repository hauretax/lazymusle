// Depuis quand : le nombre de jours depuis la dernière séance, tous exos
// confondus, et module par module.
//
// Comme le calendrier (lib/journal), c'est une LECTURE des historiques : rien de
// neuf n'est stocké, donc rétroactif et rien à migrer. Une séance abandonnée ou
// un test raté comptent : ce jour-là, on a fait du sport.
//
// Sans React ni localStorage : testé par `npm run check`.
import { journalEntries } from './journal.js'
import { ACTIVITY_ID } from './activities.js'
import { dayKey, parseDayKey, compareDayKeys } from './dates.js'
import { hasProgram } from '../data/goals.js'

// Map goalId (ou 'activity') -> dernier jour 'AAAA-MM-JJ' où il s'est passé quelque chose.
export function lastDays(state) {
  const out = new Map()
  for (const e of journalEntries(state)) {
    const prev = out.get(e.goalId)
    if (!prev || compareDayKeys(e.day, prev) > 0) out.set(e.goalId, e.day)
  }
  return out
}

// Jours pleins entre ce jour-là et aujourd'hui : 0 = aujourd'hui, 1 = hier.
// En jours de CALENDRIER, pas en tranches de 24 h : une séance d'hier 23 h vue
// ce matin à 7 h, c'est « hier », pas « aujourd'hui ».
export function daysSince(day, today = new Date()) {
  const d = parseDayKey(day)
  const t = parseDayKey(dayKey(today))
  if (!d || !t) return null
  return Math.max(0, Math.round((t - d) / 86400000))
}

// Ce que l'accueil affiche : le compteur global, puis une ligne par module suivi
// (dans l'ordre des objectifs), plus les activités libres s'il y en a eu.
export function sinceSummary(state, today = new Date()) {
  const last = lastDays(state)
  let latest = null
  for (const day of last.values()) {
    if (!latest || compareDayKeys(day, latest) > 0) latest = day
  }
  const line = (goalId) => {
    const day = last.get(goalId) ?? null
    return { goalId, day, days: day ? daysSince(day, today) : null }
  }
  const goals = Array.isArray(state?.goals) ? state.goals : []
  const modules = goals.filter(hasProgram).map(line)
  if (last.has(ACTIVITY_ID)) modules.push(line(ACTIVITY_ID))
  return {
    all: { day: latest, days: latest ? daysSince(latest, today) : null },
    modules,
  }
}

export function formatSince(days) {
  if (days == null) return 'jamais'
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'hier'
  return `${days} jours`
}

// Saut et course le même jour : les deux tapent sur les jambes. On signale sur
// la carte de l'un que l'autre a déjà été fait aujourd'hui. CHOIX DE L'APP :
// le NSCA demande 48-72 h entre deux séances de pliométrie, rien de chiffré
// entre pliométrie et course.
export function sameDayLegs(state, today = new Date()) {
  const last = lastDays(state)
  const t = dayKey(today)
  const goals = Array.isArray(state?.goals) ? state.goals : []
  const both = goals.includes('jump') && goals.includes('running')
  return {
    jump: both && last.get('running') === t, // à afficher sur la carte saut
    run: both && last.get('jump') === t, // à afficher sur la carte course
  }
}
