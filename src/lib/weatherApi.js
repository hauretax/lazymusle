// Les appels vers l'extérieur (TICKETS.md T14) : position, adresse, météo.
//
// C'est le SEUL endroit de l'app qui sort sur le réseau. Jusqu'à T13, Reps
// fonctionnait entièrement hors-ligne ; ce fichier assume la rupture, et la
// contient — pour que le reste continue de marcher sans lui.
//
// Règle absolue ici : **rien ne jette, rien ne bloque**. Pas de réseau, GPS
// refusé, service en panne (l'archive Open-Meteo a répondu 502 pendant les
// essais) : on renvoie `{ ok: false, error }` et l'utilisateur remplit à la
// main. On doit pouvoir noter une activité dans un tunnel.
//
// Pas couvert par `npm run check` (réseau, navigateur) : la logique testable
// est dans `lib/weather` et `lib/places`.
import { weatherUrl, hourSlot, pickHour } from './weather.js'
import { cleanCoords, placeNameFromGeocode } from './places.js'

const GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client'

// Au-delà, on rend la main. Mieux vaut un champ vide tout de suite qu'une
// roulette qui tourne pendant qu'on veut juste noter sa marche.
const TIMEOUT_MS = 8000

function withTimeout(ms) {
  const c = new AbortController()
  const id = setTimeout(() => c.abort(), ms)
  return { signal: c.signal, done: () => clearTimeout(id) }
}

async function getJSON(url) {
  const t = withTimeout(TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: t.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null // réseau coupé, CORS, abandon : tout se vaut ici
  } finally {
    t.done()
  }
}

export function canLocate() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

// La position du téléphone. `enableHighAccuracy: false` exprès : pour de la
// météo, le quartier suffit, et le GPS fin coûte du temps et de la batterie.
export function locate() {
  return new Promise((resolve) => {
    if (!canLocate()) {
      return resolve({ ok: false, error: 'Ce navigateur ne sait pas donner ta position.' })
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = cleanCoords(pos?.coords?.latitude, pos?.coords?.longitude)
        resolve(coords
          ? { ok: true, ...coords }
          : { ok: false, error: 'Position illisible.' })
      },
      (err) => {
        const refus = err?.code === 1
        resolve({
          ok: false,
          error: refus
            ? 'Position refusée. Tu peux écrire le lieu à la main.'
            : 'Position introuvable. Tu peux écrire le lieu à la main.',
        })
      },
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 5 * 60 * 1000 },
    )
  })
}

// Coordonnées -> nom lisible. Échec = pas de nom, pas d'erreur affichée : on a
// déjà les coordonnées, qui suffisent à la météo.
export async function describeCoords(lat, lon) {
  const coords = cleanCoords(lat, lon)
  if (!coords) return ''
  const p = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    localityLanguage: 'fr',
  })
  const data = await getJSON(`${GEOCODE_URL}?${p}`)
  return placeNameFromGeocode(data)
}

// La météo de ce lieu, ce jour-là, à cette heure-là.
export async function fetchWeather(lat, lon, day, time, now = new Date()) {
  const url = weatherUrl(lat, lon, day, now)
  const slot = hourSlot(day, time)
  if (!url || !slot) return { ok: false, error: 'Il manque le lieu ou l’heure.' }
  const data = await getJSON(url)
  if (!data) return { ok: false, error: 'Météo indisponible. Tu peux la saisir à la main.' }
  const at = pickHour(data, slot)
  if (!at) return { ok: false, error: 'Pas de relevé pour cette heure-là. À saisir à la main.' }
  return { ok: true, weather: at }
}
