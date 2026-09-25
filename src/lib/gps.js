// Distance d'une course à partir des positions GPS (TICKETS.md T6).
//
// Tout reste sur le téléphone : les positions ne sortent pas, seule la distance
// finale est gardée sur la séance. Sans React ni navigateur : testé par
// `npm run check`. L'appel à `navigator.geolocation` est dans RunSession.

const EARTH_M = 6371000
// Un point moins précis que ça est du bruit : en ville, le GPS « saute » de 50 m
// sur place, et la distance gonflerait toute seule. CHOIX DE L'APP.
export const MAX_ACCURACY_M = 30
// Plus vite que ça à pied, c'est un saut du GPS, pas un sprint (~25 km/h).
export const MAX_SPEED_MS = 7

export function haversine(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_M * Math.asin(Math.sqrt(h))
}

// Ajoute une position au suivi. Renvoie le nouvel état { last, meters } — le
// point retenu devient la référence du suivant ; un point rejeté ne change rien.
export function addPosition(track, p) {
  const t = track ?? { last: null, meters: 0 }
  if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || !Number.isFinite(p.t)) return t
  if (p.accuracy > MAX_ACCURACY_M) return t
  if (!t.last) return { last: p, meters: t.meters }
  const d = haversine(t.last, p)
  const dt = (p.t - t.last.t) / 1000
  if (!(dt > 0)) return t
  if (d / dt > MAX_SPEED_MS) return t
  return { last: p, meters: t.meters + d }
}

export function formatKm(meters) {
  if (!(meters > 0)) return '0,00 km'
  return `${(meters / 1000).toFixed(2).replace('.', ',')} km`
}
