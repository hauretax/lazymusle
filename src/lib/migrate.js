// Forme de l'état sauvegardé et montée de version. Sans React ni localStorage :
// c'est de la donnée utilisateur réelle (une progression), donc c'est testable
// et testé (`npm run check`).
import { PUSHUPS_GOAL } from '../data/goals.js'

export const STATE_VERSION = 4

// État commun à tout programme. Chaque exo garde le sien sous `programs`,
// pour que l'ajout d'un module ne touche pas aux autres (voir TICKETS.md T2).
export function freshProgram() {
  return {
    levelIndex: null, // null tant que le test initial n'est pas fait
    lastSessionDate: null,
    nextDate: null, // date conseillée de la prochaine séance (ISO)
    maxHistory: [], // [{ date, reps, kind: 'initial' | 'test', level }]
    sessions: [],
    finished: false,
  }
}

export function freshPushups() {
  return {
    ...freshProgram(),
    dayIndex: 0, // jour courant dans le niveau (= workouts.length -> jour de test)
  }
}

export function freshHandstand() {
  return {
    ...freshProgram(),
    maxHold: null, // niveau « Le mur » : tenue max en secondes, elle dérive la séance
    axes: null, // niveau « L'équilibre » : { entry, balance } — pas un temps, une position
  }
}

export function freshLsit() {
  return {
    ...freshProgram(),
    axes: null, // { support, shape } — pas un temps, une position
    bests: {}, // meilleure tenue relevée EN SÉANCE, par combinaison support/forme
  }
}

export function freshState() {
  return {
    version: STATE_VERSION,
    createdAt: new Date().toISOString(),
    goals: [], // objectifs choisis à l'onboarding ; vide = onboarding à faire
    programs: { pushups: freshPushups(), handstand: freshHandstand(), core: freshLsit() },
  }
}

// Champs que les versions <= 3 rangeaient à plat sur le state.
const V3_PUSHUP_FIELDS = [
  'levelIndex', 'dayIndex', 'lastSessionDate', 'nextDate', 'maxHistory', 'sessions', 'finished',
]

export function migrate(saved) {
  const s = { ...saved }

  // v2 -> v3 : arrivée des objectifs. Quelqu'un déjà lancé sur les pompes les garde
  // et ne repasse pas par l'onboarding.
  if (!s.goals?.length) s.goals = s.levelIndex != null ? [PUSHUPS_GOAL] : []

  // v3 -> v4 : l'état des pompes descend sous `programs`, pour faire de la place aux
  // autres exos. `goal` et `restSec` disparaissent : plus personne ne les lisait.
  if (!s.programs) {
    const pushups = freshPushups()
    for (const k of V3_PUSHUP_FIELDS) {
      if (s[k] !== undefined) pushups[k] = s[k]
    }
    s.programs = { pushups }
  }
  for (const k of [...V3_PUSHUP_FIELDS, 'goal', 'restSec']) delete s[k]

  return s
}

// Complète un état migré avec les champs qu'il ne connaît pas encore.
export function withDefaults(s) {
  const base = freshState()
  return {
    ...base,
    ...s,
    version: STATE_VERSION,
    programs: {
      ...base.programs,
      ...s.programs,
      pushups: { ...freshPushups(), ...s.programs?.pushups },
      handstand: { ...freshHandstand(), ...s.programs?.handstand },
      core: { ...freshLsit(), ...s.programs?.core },
    },
  }
}

export function hydrate(saved) {
  return withDefaults(migrate(saved))
}
