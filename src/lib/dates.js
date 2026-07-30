// Les jours, en heure LOCALE. Partagé par le journal (lib/journal) et les
// activités libres (lib/activities) — d'où un module à part : le second est lu
// par le premier, l'inverse ferait un cycle d'imports.
//
// Sans React ni localStorage : c'est de la donnée utilisateur, donc testé
// (`npm run check`).

// Clé d'un jour : une séance du soir doit tomber sur le jour qu'affiche le
// téléphone, pas sur celui d'UTC.
export function dayKey(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

// 'AAAA-MM-JJ' -> Date locale à MIDI. Midi et pas minuit : à minuit, une heure
// d'été qui saute ou un fuseau négatif font basculer la date d'un jour.
export function parseDayKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key ?? ''))
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d, 12, 0, 0, 0)
  // Rejette le 31 février : le Date le décalerait silencieusement au 3 mars.
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return date
}

export function isValidDayKey(key) {
  return parseDayKey(key) != null
}

// Ordre chronologique entre deux clés de jour : elles se comparent comme du texte.
export function compareDayKeys(a, b) {
  return String(a).localeCompare(String(b))
}

// Tous les jours de `from` à `to` inclus. Sert au récap d'une période (T11).
export function daysBetween(from, to) {
  const start = parseDayKey(from)
  const end = parseDayKey(to)
  if (!start || !end || start > end) return []
  const out = []
  const d = new Date(start)
  while (d <= end) {
    out.push(dayKey(d))
    d.setDate(d.getDate() + 1)
  }
  return out
}
