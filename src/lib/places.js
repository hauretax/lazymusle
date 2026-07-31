// Les lieux (TICKETS.md T14). Même logique que les types d'activité : l'app ne
// connaît pas les endroits où on va, elle apprend ceux où on est allé.
//
// Sans réseau ni navigateur — donc testé (`npm run check`). La géolocalisation
// et le décodage d'adresse sont dans `lib/weatherApi`.

export const MAX_PLACE_LENGTH = 80

export function normalizePlace(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_PLACE_LENGTH)
}

export function placeKey(raw) {
  return normalizePlace(raw)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // les diacritiques, séparés par NFD
}

// Des coordonnées utilisables, ou null. On borne : au-delà, ce n'est pas un
// point sur Terre, c'est une valeur qui a mal voyagé.
export function cleanCoords(lat, lon) {
  const la = typeof lat === 'string' ? Number(lat) : lat
  const lo = typeof lon === 'string' ? Number(lon) : lon
  if (typeof la !== 'number' || !Number.isFinite(la) || la < -90 || la > 90) return null
  if (typeof lo !== 'number' || !Number.isFinite(lo) || lo < -180 || lo > 180) return null
  // 4 décimales ≈ 11 m : largement assez pour la météo, et ça évite de trimballer
  // une précision au centimètre dont personne n'a besoin.
  return { lat: Math.round(la * 10000) / 10000, lon: Math.round(lo * 10000) / 10000 }
}

// La fiche d'un lieu : un nom, des coordonnées, l'un ou l'autre, ou les deux.
export function cleanPlace(raw) {
  if (!raw || typeof raw !== 'object') return null
  const name = normalizePlace(raw.name)
  const coords = cleanCoords(raw.lat, raw.lon)
  if (!name && !coords) return null
  const out = {}
  if (name) out.name = name
  if (coords) {
    out.lat = coords.lat
    out.lon = coords.lon
  }
  return out
}

// Ce qu'une réponse de géocodage inverse donne de lisible. On préfère le
// quartier à la ville quand les deux existent — « Saint-Merri, Paris » situe
// mieux qu'un « Paris » qui fait 105 km².
export function placeNameFromGeocode(data) {
  if (!data || typeof data !== 'object') return ''
  const bits = []
  const locality = normalizePlace(data.locality)
  const city = normalizePlace(data.city)
  if (locality && placeKey(locality) !== placeKey(city)) bits.push(locality)
  if (city) bits.push(city)
  if (!bits.length) {
    const region = normalizePlace(data.principalSubdivision)
    if (region) bits.push(region)
  }
  return normalizePlace(bits.join(', '))
}

// Les lieux déjà notés, du plus fréquent au moins fréquent. Les coordonnées
// suivent le libellé le plus récent : un même nom peut avoir bougé de quelques
// mètres d'une fois sur l'autre, c'est le dernier relevé qui vaut.
export function knownPlaces(activities = []) {
  const seen = new Map()
  for (const a of Array.isArray(activities) ? activities : []) {
    const place = cleanPlace(a?.place)
    if (!place?.name) continue
    const key = placeKey(place.name)
    const date = String(a?.date ?? '')
    const at = seen.get(key)
    if (at) {
      at.count++
      if (date > at.lastDate) {
        at.lastDate = date
        at.name = place.name
        if (place.lat != null) {
          at.lat = place.lat
          at.lon = place.lon
        }
      }
    } else {
      seen.set(key, { key, name: place.name, lat: place.lat, lon: place.lon, count: 1, lastDate: date })
    }
  }
  return [...seen.values()].sort((a, b) => (
    b.count - a.count || b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name)
  ))
}

// « boi » -> « Bois de Vincennes ». Même règle que les types d'activité : ce qui
// commence par ce qu'on tape d'abord, ce qui le contient ensuite.
export function suggestPlaces(activities = [], input = '', limit = 5) {
  const q = placeKey(input)
  const all = knownPlaces(activities)
  if (!q) return all.slice(0, limit)
  const starts = []
  const contains = []
  for (const p of all) {
    if (p.key === q) continue
    if (p.key.startsWith(q)) starts.push(p)
    else if (p.key.includes(q)) contains.push(p)
  }
  return [...starts, ...contains].slice(0, limit)
}

// Le dernier lieu utilisé : c'est le plus probable pour la prochaine activité,
// et c'est ce qu'on propose quand le GPS n'est pas disponible.
export function lastPlace(activities = []) {
  let best = null
  for (const a of Array.isArray(activities) ? activities : []) {
    const place = cleanPlace(a?.place)
    if (!place) continue
    const date = String(a?.date ?? '')
    if (!best || date > best.date) best = { date, place }
  }
  return best?.place ?? null
}

export function formatCoords(place) {
  if (place?.lat == null || place?.lon == null) return null
  return `${place.lat.toFixed(3)}, ${place.lon.toFixed(3)}`
}
