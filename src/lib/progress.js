// Ce qui est vraiment VALIDÉ, d'après l'historique — pas d'après le curseur.
//
// Le curseur (`levelIndex`/`dayIndex` pour les pompes, `index` pour la course) ne dit
// qu'une chose : quelle séance l'app propose ensuite. Il ne peut pas dire ce qui a été
// fait. Tant qu'on avançait d'un cran à la fois, la confusion était sans conséquence ;
// dès qu'on choisit sa séance (TICKETS.md T7), sauter au jour 11 laisserait croire que
// les 10 premiers sont pliés.
//
// Chaque séance terminée est enregistrée avec sa position — c'est elle qui fait foi.
// Rien à migrer : les historiques existants la portent déjà.
//
// Sans React ni localStorage : c'est de la donnée utilisateur, donc testé (`npm run check`).

export const DONE = 'done'
export const TRIED = 'tried' // test tenté mais raté — coché, ce serait un mensonge
export const ABANDONED = 'abandoned' // séance commencée puis lâchée en route (T8)

// Quand un jour porte plusieurs séances, la meilleure gagne — dans les deux sens :
// un test raté après un test réussi ne dévalide pas le jour, et le réussir après
// l'avoir raté le valide. Un rang, pas un ordre d'arrivée.
const RANK = { [DONE]: 3, [TRIED]: 2, [ABANDONED]: 1 }

export function pushupKey(levelIndex, dayIndex) {
  return `${levelIndex}:${dayIndex}`
}

// Ce que vaut UNE séance. Un jour normal terminé est validé. Un jour de test ne
// l'est que s'il est réussi : c'est le max qui débloque le niveau, pas le fait
// d'avoir essayé. Une séance abandonnée n'est pas faite — mais elle n'est pas
// rien : les pompes comptent quand même (voir TICKETS.md T8).
export function sessionStatus(s) {
  if (s?.abandoned) return ABANDONED
  if (s?.isTest && !s.passed) return TRIED
  return DONE
}

// Map `levelIndex:dayIndex` -> 'done' | 'tried' | 'abandoned'.
export function pushupStatuses(sessions = []) {
  const out = new Map()
  for (const s of sessions) {
    if (s?.levelIndex == null || s?.dayIndex == null) continue
    const key = pushupKey(s.levelIndex, s.dayIndex)
    const status = sessionStatus(s)
    const seen = out.get(key)
    if (!seen || RANK[status] > RANK[seen]) out.set(key, status)
  }
  return out
}

// Séances distinctes validées. Refaire un jour ne le compte pas deux fois — sinon
// le compteur de l'accueil dépasserait le total du programme.
export function countPushupDone(sessions = []) {
  let n = 0
  for (const st of pushupStatuses(sessions).values()) if (st === DONE) n++
  return n
}

// Course : pas de test, une séance terminée est une séance validée.
export function runDone(sessions = []) {
  const out = new Set()
  for (const s of sessions) {
    if (Number.isInteger(s?.index)) out.add(s.index)
  }
  return out
}

export function countRunDone(sessions = []) {
  return runDone(sessions).size
}
