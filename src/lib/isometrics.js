// Dosage des tenues isométriques, partagé par tous les modules de tenue
// (handstand, L-sit, et la suite).
//
// Source unique : table de Prilepin adaptée aux isométriques, Steven Low —
// tenues à 60-70 % de la tenue max, volume total 36-65 s, JAMAIS jusqu'à l'échec
// (« ça dégrade rapidement la qualité des séries suivantes »).
// https://stevenlow.org/prilepin-tables-for-bodyweight-strength-isometric-and-eccentric-exercises/
//
// Les paramètres (pct, cible de volume, plafonds) vivent dans le JSON de chaque
// programme : la formule est commune, le dosage reste réglable par exo.

// Durée d'une tenue de travail : un pourcentage de la tenue max.
//
// L'arrondi s'adapte : à `roundTo` près une fois que c'est assez long, à la seconde
// en dessous — sinon le pas fausse le pourcentage sur les tenues courtes (12 s de max
// donneraient 10 s de travail, soit 83 %, pas 65 %).
// Et jamais plus que la tenue max : prescrire l'infaisable n'aide personne.
export function computeHold(maxHoldSec, p) {
  if (!(maxHoldSec > 0)) return 0
  const raw = maxHoldSec * p.pct
  const step = raw >= p.roundToAbove ? p.roundTo : 1
  const rounded = Math.round(raw / step) * step
  return Math.min(maxHoldSec, Math.max(1, rounded))
}

// Nombre de tenues : celui qui approche le mieux le volume cible, plafonné pour que
// la séance reste courte (le skill se travaille frais, pas en s'épuisant).
//
// Le volume ne tombe pas toujours dans la fourchette de la source : à tenue donnée,
// seuls des multiples entiers sont atteignables. Un vrai débutant reste sous la
// fourchette une fois le plafond de séries atteint — c'est assumé : il lui faut
// d'abord du conditionnement, pas du volume.
export function computeSets(maxHoldSec, p) {
  const hold = computeHold(maxHoldSec, p)
  if (hold <= 0) return 0
  return Math.min(p.maxSets, Math.max(1, Math.round(p.volumeTarget / hold)))
}

export function sessionVolume(maxHoldSec, p) {
  return computeHold(maxHoldSec, p) * computeSets(maxHoldSec, p)
}

// Pause entre tenues, adaptée à la DURÉE de la tenue.
//
// CHOIX DE L'APP, pas une source : Prilepin ne donne pas de pause. Même forme que
// les pauses adaptatives des pompes — clamp(base + effort × facteur, min, max) —
// parce qu'une pause fixe est absurde aux deux bouts : 90 s après une tenue de 5 s,
// la séance n'est plus que du repos ; et c'est trop peu après 60 s de tenue.
export function computeRest(holdSec, p) {
  if (!(holdSec > 0)) return 0
  const raw = p.base + holdSec * p.perSec
  const rounded = Math.round(raw / p.roundTo) * p.roundTo
  return Math.min(p.max, Math.max(p.min, rounded))
}

// Durée totale d'une séance de tenues : les tenues, plus les pauses entre elles.
export function sessionSeconds(maxHoldSec, holdParams, restParams) {
  const sets = computeSets(maxHoldSec, holdParams)
  if (sets < 1) return 0
  const hold = computeHold(maxHoldSec, holdParams)
  return sets * hold + (sets - 1) * computeRest(hold, restParams)
}
