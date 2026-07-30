// Les activités libres : ce qu'on a fait de soi-même, noté à la main
// (TICKETS.md T10). Une marche, une course, n'importe quoi — avec sa date, pour
// pouvoir remplir l'agenda après coup.
//
// Différence de fond avec les programmes : il n'y a pas de plan. L'app ne
// propose rien, ne valide rien, ne fait pas progresser de curseur. Elle
// enregistre. C'est un carnet, pas un entraîneur — d'où le type qui se tape au
// clavier plutôt qu'une liste fermée, et des mesures toutes optionnelles.
//
// Sans React ni localStorage : c'est de la donnée utilisateur, donc testé
// (`npm run check`).
import { MEASURE_IDS, DEFAULT_MEASURES, getMeasure } from '../data/measures.js'
import { dayKey, parseDayKey } from './dates.js'

export const ACTIVITY_ID = 'activity' // pour le calendrier : couleur et emoji à part
export const ACTIVITY_EMOJI = '📝'
export const MAX_TYPE_LENGTH = 40
export const MAX_NOTE_LENGTH = 500

// Combien d'entrées passées d'un même type on regarde pour deviner les mesures à
// proposer. Toutes serait pire : une mesure remplie une fois il y a six mois
// reviendrait à vie.
const MEASURE_MEMORY = 5

// Le nom d'activité tel qu'on l'affiche : espaces normalisés, longueur bornée.
// On ne touche NI à la casse NI aux accents — « Marche nordique » s'écrit comme
// l'utilisateur l'a tapé.
export function normalizeType(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TYPE_LENGTH)
}

// La clé qui sert à comparer deux types : « MARCHE », « marche » et « Marché »
// sont la même chose pour l'app, sinon les suggestions se dédoubleraient.
export function typeKey(raw) {
  return normalizeType(raw)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // les diacritiques, séparés par NFD
}

// Ne garde que des mesures connues, positives et finies. Une mesure à 0 n'est
// pas « zéro km », c'est une case qu'on n'a pas remplie : elle disparaît.
export function cleanMeasures(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const id of MEASURE_IDS) {
    const spec = getMeasure(id)
    const n = typeof raw[id] === 'string' ? Number(raw[id].replace(',', '.')) : raw[id]
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) continue
    const capped = Math.min(n, spec.max)
    const decimals = spec.kind === 'duration' ? 0 : (spec.decimals ?? 2)
    const rounded = Math.round(capped * 10 ** decimals) / 10 ** decimals
    if (rounded > 0) out[id] = rounded
  }
  return out
}

// Un jour choisi -> un instant ISO. Le jour du jour garde l'heure qu'il est ;
// un jour passé est daté de midi, parce qu'on ne sait pas à quelle heure c'était
// et que midi ne bascule pas de jour au changement d'heure.
export function dayToISO(day, now = new Date()) {
  const at = parseDayKey(day)
  if (!at) return null
  if (day === dayKey(now)) return new Date(now).toISOString()
  return at.toISOString()
}

// Vrai si le jour est dans le futur. On note ce qu'on a fait, pas ce qu'on fera.
export function isFutureDay(day, now = new Date()) {
  const at = parseDayKey(day)
  if (!at) return false
  return day > dayKey(now)
}

// Ce qui empêche d'enregistrer, en français, ou null si tout va bien.
export function activityError(draft, now = new Date()) {
  if (!normalizeType(draft?.type)) return 'Il manque le nom de l’activité.'
  if (!parseDayKey(draft?.day)) return 'Cette date n’existe pas.'
  if (isFutureDay(draft?.day, now)) return 'On ne note pas une activité dans le futur.'
  return null
}

// Identifiant stable et lisible, sans Math.random : la date de saisie suffit, et
// on suffixe s'il y a déjà quelque chose à cette milliseconde.
function makeId(list, now) {
  const base = `a${new Date(now).getTime()}`
  if (!list.some((a) => a?.id === base)) return base
  let n = 1
  while (list.some((a) => a?.id === `${base}-${n}`)) n++
  return `${base}-${n}`
}

// Plus récent en premier. À égalité de date, le dernier saisi passe devant.
export function sortActivities(list = []) {
  return [...list].sort((a, b) => {
    const d = String(b?.date).localeCompare(String(a?.date))
    return d !== 0 ? d : String(b?.id).localeCompare(String(a?.id))
  })
}

export function addActivity(list = [], draft, now = new Date()) {
  if (activityError(draft, now)) return list
  const activity = {
    id: makeId(list, now),
    date: dayToISO(draft.day, now),
    type: normalizeType(draft.type),
    measures: cleanMeasures(draft.measures),
    note: String(draft.note ?? '').trim().slice(0, MAX_NOTE_LENGTH),
    createdAt: new Date(now).toISOString(),
  }
  return sortActivities([...list, activity])
}

// Modifier : une faute de frappe ne doit pas rester à vie. L'identifiant et la
// date de saisie ne bougent pas — c'est la même entrée, corrigée.
export function updateActivity(list = [], id, draft, now = new Date()) {
  const at = list.find((a) => a?.id === id)
  if (!at || activityError(draft, now)) return list
  const updated = {
    ...at,
    date: draft.day === dayKey(at.date) ? at.date : dayToISO(draft.day, now),
    type: normalizeType(draft.type),
    measures: cleanMeasures(draft.measures),
    note: String(draft.note ?? '').trim().slice(0, MAX_NOTE_LENGTH),
  }
  return sortActivities(list.map((a) => (a?.id === id ? updated : a)))
}

export function removeActivity(list = [], id) {
  return list.filter((a) => a?.id !== id)
}

// Les types déjà enregistrés, du plus utilisé au moins utilisé. C'est ce qui
// nourrit les suggestions : l'app ne connaît pas les activités à l'avance, elle
// apprend celles de la personne.
export function knownTypes(list = []) {
  const seen = new Map()
  for (const a of list) {
    const type = normalizeType(a?.type)
    if (!type) continue
    const key = typeKey(type)
    const at = seen.get(key)
    const date = String(a?.date ?? '')
    if (at) {
      at.count++
      // Le libellé le plus récent gagne : c'est la dernière façon dont on l'écrit.
      if (date > at.lastDate) {
        at.lastDate = date
        at.type = type
      }
    } else {
      seen.set(key, { key, type, count: 1, lastDate: date })
    }
  }
  return [...seen.values()].sort((a, b) => (
    b.count - a.count || b.lastDate.localeCompare(a.lastDate) || a.type.localeCompare(b.type)
  ))
}

// « mar » -> « Marche ». On propose ce qui commence par ce qu'on tape d'abord,
// puis ce qui le contient — taper le début d'un mot est le geste courant.
export function suggestTypes(list = [], input = '', limit = 6) {
  const q = typeKey(input)
  const all = knownTypes(list)
  if (!q) return all.slice(0, limit).map((t) => t.type)
  const starts = []
  const contains = []
  for (const t of all) {
    if (t.key === q) continue // déjà tapé en entier : ne rien proposer
    if (t.key.startsWith(q)) starts.push(t.type)
    else if (t.key.includes(q)) contains.push(t.type)
  }
  return [...starts, ...contains].slice(0, limit)
}

// Quelles mesures proposer pour ce type. On regarde les dernières fois qu'on l'a
// noté : retaper « Marche » repropose km + durée, pas des séries. Type inconnu →
// les mesures par défaut.
export function measuresForType(list = [], type) {
  const key = typeKey(type)
  if (!key) return [...DEFAULT_MEASURES]
  const recent = sortActivities(list.filter((a) => typeKey(a?.type) === key)).slice(0, MEASURE_MEMORY)
  const used = new Set()
  for (const a of recent) {
    for (const id of Object.keys(a?.measures ?? {})) {
      if (MEASURE_IDS.includes(id)) used.add(id)
    }
  }
  if (!used.size) return [...DEFAULT_MEASURES]
  return MEASURE_IDS.filter((id) => used.has(id)) // toujours dans l'ordre des données
}

// ---------- Affichage ----------

function frNumber(n, decimals) {
  const fixed = Number(n).toFixed(decimals)
  const trimmed = decimals > 0 ? fixed.replace(/\.?0+$/, '') : fixed
  return trimmed.replace('.', ',')
}

// Une durée en minutes -> « 45 min », « 1 h 30 », « 2 h ».
export function formatDuration(min) {
  const total = Math.round(Number(min) || 0)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

export function formatMeasure(id, value) {
  const spec = getMeasure(id)
  if (!spec || value == null) return null
  if (spec.kind === 'duration') return formatDuration(value)
  const n = frNumber(value, spec.decimals ?? 2)
  return spec.unit ? `${n} ${spec.unit}` : `${n} ${spec.label.toLowerCase()}`
}

// « 5,2 km · 45 min » — dans l'ordre des données, pas dans celui de la saisie.
export function activitySummary(a) {
  const parts = []
  for (const id of MEASURE_IDS) {
    const v = a?.measures?.[id]
    if (v == null) continue
    const txt = formatMeasure(id, v)
    if (txt) parts.push(txt)
  }
  return parts.join(' · ')
}
