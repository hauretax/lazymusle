// Les mesures qu'une activité libre peut porter. Les DONNÉES vivent dans
// measures.json — ce fichier ne fait que les lire et les exposer, comme goals.js.
import data from './measures.json' with { type: 'json' }

export const measures = data.measures
export const DEFAULT_MEASURES = data.defaults

export function getMeasure(id) {
  return measures.find((m) => m.id === id) || null
}

export const MEASURE_IDS = measures.map((m) => m.id)
