// Les conditions d'une activité : température et hygrométrie (TICKETS.md T14).
//
// Ce fichier ne fait AUCUN appel réseau — il construit les URL, choisit la bonne
// heure dans une réponse, et valide ce qu'on saisit à la main. C'est donc testé
// (`npm run check`). Les `fetch` sont dans `lib/weatherApi`.
//
// Principe du ticket : l'app propose, elle n'impose pas. Tout ce qui vient
// d'Open-Meteo peut être remplacé à la main — parce qu'elle aura tort dès que
// quelqu'un s'entraîne à l'intérieur.
import data from '../data/weather.json' with { type: 'json' }
import { parseDayKey, dayKey } from './dates.js'
import { cleanCoords } from './places.js'

export const WEATHER_CODES = data.codes

// Au-delà, Open-Meteo bascule sur son archive : l'API de prévision ne remonte
// qu'à ~92 jours. C'est leur limite, pas la nôtre.
export const FORECAST_PAST_DAYS = 92

export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
export const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
export const HOURLY_FIELDS = 'temperature_2m,relative_humidity_2m,weather_code'

// Bornes de saisie : au-delà, c'est une faute de frappe, pas une mesure.
export const MIN_TEMPERATURE = -60
export const MAX_TEMPERATURE = 60

export function weatherLabel(code) {
  const at = WEATHER_CODES[String(code)]
  return at ? at.label : null
}

export function weatherEmoji(code) {
  const at = WEATHER_CODES[String(code)]
  return at ? at.emoji : null
}

// « HH:MM » -> minutes depuis minuit, ou null. Sert à valider comme à trier.
export function parseTime(time) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(time ?? '').trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export function isValidTime(time) {
  return parseTime(time) != null
}

// « 9:5 » -> « 09:05 », et null si ce n'est pas une heure. C'est cette forme-là
// qu'on range, jamais ce que l'utilisateur a tapé.
export function normalizeTime(time) {
  const m = parseTime(time)
  if (m == null) return null
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return null
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// L'heure ronde à interroger. Open-Meteo donne du horaire : 14h37 se lit à 14h.
// On n'arrondit pas au plus proche — à 14h59 on est toujours dans l'heure de 14h,
// et demander 15h donnerait une météo qui n'a pas encore eu lieu.
export function hourSlot(day, time) {
  if (!parseDayKey(day)) return null
  const minutes = parseTime(time)
  if (minutes == null) return null
  return `${day}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:00`
}

// Quelle API interroger. La prévision couvre les ~92 derniers jours heure par
// heure ; l'archive prend le relais au-delà.
export function needsArchive(day, now = new Date()) {
  const at = parseDayKey(day)
  if (!at) return false
  const today = parseDayKey(dayKey(now))
  const jours = Math.round((today - at) / 86400000)
  return jours > FORECAST_PAST_DAYS
}

export function weatherUrl(lat, lon, day, now = new Date()) {
  if (!parseDayKey(day)) return null
  // `cleanCoords` et pas `Number()` : `Number(null)` vaut 0, donc des coordonnées
  // absentes donneraient la météo du point (0,0), en plein golfe de Guinée —
  // silencieusement, et avec l'air d'un vrai relevé.
  const at = cleanCoords(lat, lon)
  if (!at) return null
  const base = needsArchive(day, now) ? ARCHIVE_URL : FORECAST_URL
  const p = new URLSearchParams({
    latitude: at.lat.toFixed(4),
    longitude: at.lon.toFixed(4),
    hourly: HOURLY_FIELDS,
    start_date: day,
    end_date: day,
    timezone: 'auto',
  })
  return `${base}?${p}`
}

// Extrait l'heure voulue d'une réponse Open-Meteo. Renvoie null plutôt que des
// valeurs approximatives : mieux vaut un champ vide à remplir qu'un chiffre faux.
export function pickHour(response, slot) {
  const h = response?.hourly
  if (!h || !Array.isArray(h.time) || !slot) return null
  const i = h.time.indexOf(slot)
  if (i < 0) return null
  const t = h.temperature_2m?.[i]
  const hum = h.relative_humidity_2m?.[i]
  const code = h.weather_code?.[i]
  // Une réponse peut porter l'heure sans la mesure (données pas encore
  // consolidées) : sans température, il n'y a rien à afficher.
  if (typeof t !== 'number' || !Number.isFinite(t)) return null
  return {
    temperature: Math.round(t * 10) / 10,
    humidity: typeof hum === 'number' && Number.isFinite(hum) ? Math.round(hum) : null,
    code: typeof code === 'number' && Number.isFinite(code) ? code : null,
    source: 'auto',
  }
}

// Ce qu'on garde d'une saisie manuelle. `indoor` dit « la météo dehors ne
// s'applique pas ici » — c'est ça qui empêche d'aller la chercher.
export function cleanWeather(raw) {
  if (!raw || typeof raw !== 'object') return null
  const t = typeof raw.temperature === 'string'
    ? Number(raw.temperature.replace(',', '.'))
    : raw.temperature
  const h = typeof raw.humidity === 'string' ? Number(raw.humidity) : raw.humidity

  const out = {}
  if (typeof t === 'number' && Number.isFinite(t) && t >= MIN_TEMPERATURE && t <= MAX_TEMPERATURE) {
    out.temperature = Math.round(t * 10) / 10
  }
  if (typeof h === 'number' && Number.isFinite(h) && h >= 0 && h <= 100) {
    out.humidity = Math.round(h)
  }
  if (typeof raw.code === 'number' && Number.isFinite(raw.code)) out.code = raw.code
  if (raw.indoor) out.indoor = true
  if (out.temperature == null && out.humidity == null && !out.indoor) return null
  out.source = raw.source === 'auto' ? 'auto' : 'manual'
  return out
}

// « 26,2 °C · 54 % · ⛅ Partiellement nuageux »
export function formatWeather(w) {
  if (!w) return ''
  const parts = []
  if (w.temperature != null) parts.push(`${String(w.temperature).replace('.', ',')} °C`)
  if (w.humidity != null) parts.push(`${w.humidity} %`)
  if (!w.indoor && w.code != null) {
    const label = weatherLabel(w.code)
    const emoji = weatherEmoji(w.code)
    if (label) parts.push(`${emoji ? `${emoji} ` : ''}${label}`)
  }
  if (w.indoor) parts.push('en intérieur')
  return parts.join(' · ')
}
