// Les photos (TICKETS.md T12) : une par jour, ou quand on en a envie, et
// rattachable à une activité.
//
// DEUX ENDROITS, et c'est le cœur du ticket :
// - la **fiche** de chaque photo (id, jour, taille…) vit dans l'état, à côté du
//   reste. Elle pèse ~100 octets : mille photos tiennent dans le localStorage.
//   C'est ce qui permet au calendrier et au récap de rester synchrones et purs.
// - l'**image** elle-même vit dans IndexedDB (`lib/photoStore`). Le localStorage
//   plafonne à ~5 Mo : une seule photo de téléphone le remplit, et le
//   dépassement ferait perdre toute la progression, pas seulement la photo.
//
// Ce fichier ne contient que la partie sans navigateur — donc testée
// (`npm run check`). Le canvas et IndexedDB sont dans `lib/photoStore`.
import { dayKey, parseDayKey } from './dates.js'

// Le plus grand côté après redimensionnement, et la qualité JPEG. C'est un
// choix de l'app : on garde un souvenir, pas un original. Sans ça, la
// sauvegarde de T13 pèserait ~200 Mo pour 30 photos ; là elle en pèse ~10.
export const MAX_EDGE = 1600
export const QUALITY = 0.82
export const OUTPUT_TYPE = 'image/jpeg'

// Au-delà, on ne tente même pas de décoder : c'est une vidéo ou un RAW, et le
// navigateur d'un téléphone y laisserait l'onglet.
export const MAX_SOURCE_BYTES = 40 * 1024 * 1024

// Les dimensions après redimensionnement. On ne grossit JAMAIS une petite image :
// ça ne gagne aucun détail et ça multiplie le poids.
export function fitWithin(width, height, max = MAX_EDGE) {
  const w = Math.round(Number(width) || 0)
  const h = Math.round(Number(height) || 0)
  if (w <= 0 || h <= 0) return null
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = max / Math.max(w, h)
  return {
    width: Math.max(1, Math.round(w * ratio)),
    height: Math.max(1, Math.round(h * ratio)),
  }
}

// Ce qui empêche d'ajouter un fichier, en français, ou null si ça passe.
export function photoError(file) {
  if (!file) return 'Aucune image choisie.'
  if (!String(file.type ?? '').startsWith('image/')) return 'Ce fichier n’est pas une image.'
  if (Number(file.size) > MAX_SOURCE_BYTES) return 'Cette image est trop lourde.'
  return null
}

// L'identifiant se calcule à part, parce qu'il faut le connaître AVANT de poser
// la fiche : l'image part dans IndexedDB en premier, sous ce nom-là.
export function nextPhotoId(list = [], now = new Date()) {
  const base = `p${new Date(now).getTime()}`
  const taken = new Set((Array.isArray(list) ? list : []).map((p) => p?.id))
  if (!taken.has(base)) return base
  let n = 1
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

// Plus récente en premier, comme les activités.
export function sortPhotos(list = []) {
  return [...list].sort((a, b) => {
    const d = String(b?.date).localeCompare(String(a?.date))
    return d !== 0 ? d : String(b?.id).localeCompare(String(a?.id))
  })
}

// La fiche d'une photo. `day` dit à quel jour elle appartient — pas forcément
// aujourd'hui : on peut ajouter au 12 juillet depuis le calendrier. Un jour
// illisible retombe sur aujourd'hui plutôt que de perdre la photo.
export function makePhoto(meta, id, now = new Date()) {
  const day = meta?.day && parseDayKey(meta.day) ? meta.day : dayKey(now)
  if (!day || !id) return null
  return {
    id,
    day,
    // Le jour du jour garde l'heure qu'il est ; un jour passé est daté de midi,
    // même règle que les activités — sinon l'ordre dans la journée n'a pas de sens.
    date: day === dayKey(now) ? new Date(now).toISOString() : parseDayKey(day).toISOString(),
    activityId: meta?.activityId ?? null,
    width: Math.round(Number(meta?.width) || 0),
    height: Math.round(Number(meta?.height) || 0),
    bytes: Math.round(Number(meta?.bytes) || 0),
  }
}

export function insertPhoto(list = [], photo) {
  if (!photo?.id) return Array.isArray(list) ? list : []
  const sans = (Array.isArray(list) ? list : []).filter((p) => p?.id !== photo.id)
  return sortPhotos([...sans, photo])
}

export function addPhoto(list = [], meta, now = new Date()) {
  const safe = Array.isArray(list) ? list : []
  const photo = makePhoto(meta, nextPhotoId(safe, now), now)
  if (!photo) return { list: safe, id: null }
  return { list: insertPhoto(safe, photo), id: photo.id }
}

export function removePhoto(list = [], id) {
  return list.filter((p) => p?.id !== id)
}

// Supprimer une activité ne doit PAS emporter ses photos : elles redeviennent
// des photos du jour. Perdre un souvenir en corrigeant une faute de frappe
// serait le pire des échanges.
export function detachActivity(list = [], activityId) {
  if (!activityId) return list
  return list.map((p) => (p?.activityId === activityId ? { ...p, activityId: null } : p))
}

export function photosOfDay(list = [], day) {
  return sortPhotos((Array.isArray(list) ? list : []).filter((p) => p?.day === day))
}

export function photosOfActivity(list = [], activityId) {
  if (!activityId) return []
  return sortPhotos((Array.isArray(list) ? list : []).filter((p) => p?.activityId === activityId))
}

// Combien de photos par jour : c'est ce que lit le calendrier pour marquer ses
// cases, sans jamais toucher à IndexedDB.
export function photoCountByDay(list = []) {
  const out = new Map()
  for (const p of Array.isArray(list) ? list : []) {
    if (!p?.day) continue
    out.set(p.day, (out.get(p.day) ?? 0) + 1)
  }
  return out
}

export function photosBetween(list = [], from, to) {
  if (!parseDayKey(from) || !parseDayKey(to)) return []
  const [a, b] = from <= to ? [from, to] : [to, from]
  return sortPhotos((Array.isArray(list) ? list : []).filter((p) => p?.day >= a && p?.day <= b))
}

// Le poids total, pour le dire à l'utilisateur avant qu'il exporte (T13).
export function totalBytes(list = []) {
  let n = 0
  for (const p of Array.isArray(list) ? list : []) {
    const b = Number(p?.bytes)
    if (Number.isFinite(b) && b > 0) n += b
  }
  return n
}

export function formatBytes(n) {
  const bytes = Number(n) || 0
  if (bytes < 1024) return `${Math.round(bytes)} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`
  const mo = bytes / (1024 * 1024)
  return `${(mo < 10 ? Math.round(mo * 10) / 10 : Math.round(mo)).toString().replace('.', ',')} Mo`
}
