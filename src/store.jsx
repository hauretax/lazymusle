import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { levels, pickLevelIndex, gapAfterSession } from './data/pushupProgram'
import * as handstand from './data/handstandProgram'
import * as lsit from './data/lsitProgram'
import * as run from './data/runProgram'
import { PUSHUPS_GOAL, HANDSTAND_GOAL, LSIT_GOAL, RUN_GOAL } from './data/goals'
import { freshState, hydrate } from './lib/migrate'

const KEY = 'reps.pushups.v2'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return hydrate(JSON.parse(raw))
  } catch {
    /* ignore */
  }
  return freshState()
}

export function pushupsOf(state) {
  return state.programs.pushups
}

export function handstandOf(state) {
  return state.programs.handstand
}

// Où en est le handstand. Pas de calendrier : chaque niveau se dérive de son propre
// état — la tenue max au mur, la position sur les deux axes à l'équilibre.
export function getHandstandStep(state) {
  if (!state.goals?.includes(HANDSTAND_GOAL)) return { type: 'off' }
  const h = handstandOf(state)
  if (h.finished) return { type: 'done' }

  const levelIndex = h.levelIndex ?? 0
  const level = handstand.levels[levelIndex]

  if (level?.mode === 'axes') {
    // Après une promotion, les axes restent à situer : c'est un autre exercice.
    if (!h.axes) return { type: 'assess', levelIndex }
    return { type: 'session', levelIndex, progress: { axes: h.axes } }
  }

  if (h.maxHold == null) return { type: 'test-initial', levelIndex }
  return { type: 'session', levelIndex, progress: { maxHold: h.maxHold } }
}

export function runOf(state) {
  return state.programs.running
}

// Où en est la course. Le calendrier existe (Couch-to-5K), donc c'est séquentiel
// comme les pompes : une séance à la fois, dans l'ordre.
export function getRunStep(state) {
  if (!state.goals?.includes(RUN_GOAL)) return { type: 'off' }
  const r = runOf(state)
  if (r.finished) return { type: 'done' }
  return { type: 'session', index: r.index }
}

export function lsitOf(state) {
  return state.programs.core
}

// Où en est le L-sit. Même méthode que l'équilibre : deux axes, pas de chrono déclaré.
export function getLsitStep(state) {
  if (!state.goals?.includes(LSIT_GOAL)) return { type: 'off' }
  const l = lsitOf(state)
  if (l.finished) return { type: 'done' }
  if (!l.axes) return { type: 'assess' }
  return { type: 'session', progress: { axes: l.axes, bests: l.bests } }
}

export function getNextStep(state) {
  if (!state.goals?.length) return { type: 'onboarding' }
  // Les pompes sont le seul module développé : sans elles, rien à s'entraîner (voir TICKETS.md).
  if (!state.goals.includes(PUSHUPS_GOAL)) return { type: 'no-program' }

  const p = pushupsOf(state)
  if (p.levelIndex == null) return { type: 'test-initial' }
  if (p.finished) return { type: 'done' }
  const isTest = p.dayIndex >= levels[p.levelIndex].workouts.length
  return { type: 'session', levelIndex: p.levelIndex, dayIndex: p.dayIndex, isTest }
}

function addDays(iso, days) {
  const d = iso ? new Date(iso) : new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* quota / mode privé : on ignore */
    }
  }, [state])

  // Remplace l'état d'un programme, sans toucher aux autres.
  const updateProgram = useCallback((id, fn) => {
    setState((s) => ({ ...s, programs: { ...s.programs, [id]: fn(s.programs[id]) } }))
  }, [])

  const recordInitialTest = useCallback((reps) => {
    updateProgram(PUSHUPS_GOAL, (p) => ({
      ...p,
      levelIndex: pickLevelIndex(reps),
      dayIndex: 0,
      maxHistory: [...p.maxHistory, { date: new Date().toISOString(), reps, kind: 'initial' }],
    }))
  }, [updateProgram])

  const setGoals = useCallback((ids) => setState((s) => ({ ...s, goals: ids })), [])

  const completeSession = useCallback((result) => {
    updateProgram(PUSHUPS_GOAL, (p) => {
      const now = new Date().toISOString()
      const nCompleted = p.sessions.length + 1
      const nextDate = addDays(now, gapAfterSession(nCompleted))
      const level = levels[p.levelIndex]
      let { levelIndex, dayIndex, finished, maxHistory } = p
      let passed = null

      if (result.isTest) {
        passed = result.total >= level.test
        maxHistory = [...maxHistory, { date: now, reps: result.total, kind: 'test', level: level.id }]
        if (passed) {
          if (levelIndex >= levels.length - 1) {
            finished = true // objectif 100 atteint 🎯
          } else {
            levelIndex = levelIndex + 1
            dayIndex = 0
          }
        }
        // échec au test : on reste sur le jour de test pour réessayer
      } else {
        dayIndex = dayIndex + 1
      }

      return {
        ...p,
        sessions: [...p.sessions, { ...result, passed, date: now }],
        maxHistory,
        levelIndex,
        dayIndex,
        finished,
        lastSessionDate: now,
        nextDate,
      }
    })
  }, [updateProgram])

  // Le test de tenue max sert à la fois de placement et de re-test : c'est lui qui
  // fait progresser le niveau, faute de calendrier (voir TICKETS.md T3).
  //
  // Le max appartient à SON niveau : au mur au niveau 1, en équilibre libre au
  // niveau 2. Les deux ne se comparent pas — 44 s au mur, c'est un débutant ; 30 s
  // en équilibre libre, c'est un an de travail. D'où la remise à zéro à la promotion :
  // l'exercice change, la mesure aussi.
  const recordHandstandTest = useCallback((sec) => {
    updateProgram(HANDSTAND_GOAL, (h) => {
      const at = h.levelIndex ?? 0
      const last = handstand.levels.length - 1
      const passed = handstand.reachedGoal(at, sec)
      const maxHistory = [...h.maxHistory, { date: new Date().toISOString(), sec, levelIndex: at }]

      if (passed && at < last) {
        return { ...h, levelIndex: at + 1, maxHold: null, maxHistory }
      }
      return { ...h, levelIndex: at, maxHold: sec, finished: passed && at === last, maxHistory }
    })
  }, [updateProgram])

  // Niveau « L'équilibre » : on ne mesure pas un temps, on situe la personne sur
  // « monter » et « rattraper ». Les deux axes avancent indépendamment.
  const recordHandstandAxes = useCallback((axes) => {
    updateProgram(HANDSTAND_GOAL, (h) => ({
      ...h,
      axes,
      finished: handstand.axesComplete(axes),
      axesHistory: [...(h.axesHistory ?? []), { date: new Date().toISOString(), ...axes }],
    }))
  }, [updateProgram])

  const completeHandstandSession = useCallback((result) => {
    updateProgram(HANDSTAND_GOAL, (h) => {
      const now = new Date().toISOString()
      return {
        ...h,
        sessions: [...h.sessions, { ...result, date: now }],
        lastSessionDate: now,
        nextDate: addDays(now, handstand.REST_DAYS),
      }
    })
  }, [updateProgram])

  const recordLsitAxes = useCallback((axes) => {
    updateProgram(LSIT_GOAL, (l) => ({
      ...l,
      axes,
      finished: lsit.axesComplete(axes),
      axesHistory: [...(l.axesHistory ?? []), { date: new Date().toISOString(), ...axes }],
    }))
  }, [updateProgram])

  // L'app apprend la tenue max depuis les séances au lieu de la demander : on garde
  // le meilleur relevé par combinaison support/forme, c'est lui qui dose la suite.
  const completeLsitSession = useCallback((result) => {
    updateProgram(LSIT_GOAL, (l) => {
      const now = new Date().toISOString()
      const key = lsit.bestKey(l.axes)
      const bests = { ...l.bests }
      if (key && result.best > 0) {
        bests[key] = Math.max(bests[key] ?? 0, result.best)
      }
      return {
        ...l,
        bests,
        sessions: [...l.sessions, { ...result, axes: l.axes, date: now }],
        lastSessionDate: now,
        nextDate: addDays(now, lsit.REST_DAYS),
      }
    })
  }, [updateProgram])

  const completeRunSession = useCallback((result) => {
    updateProgram(RUN_GOAL, (r) => {
      const now = new Date().toISOString()
      const nCompleted = r.sessions.length + 1
      const next = r.index + 1
      return {
        ...r,
        sessions: [...r.sessions, { ...result, date: now }],
        index: Math.min(next, run.TOTAL_WORKOUTS - 1),
        finished: next >= run.TOTAL_WORKOUTS,
        lastSessionDate: now,
        nextDate: addDays(now, run.gapAfterSession(nCompleted)),
      }
    })
  }, [updateProgram])

  // Refaire la semaine. Josh Clark le prescrit noir sur blanc : « Repeat weeks if
  // needed and move ahead only when you feel you're ready. » Ce n'est pas un échec,
  // et l'app ne doit pas le présenter comme tel.
  const repeatRunWeek = useCallback(() => {
    updateProgram(RUN_GOAL, (r) => {
      const at = run.locate(r.index)
      if (!at) return r
      return { ...r, index: run.firstIndexOfWeek(at.weekIndex), finished: false }
    })
  }, [updateProgram])

  const resetAll = useCallback(() => setState(freshState()), [])

  const value = useMemo(
    () => ({
      state, recordInitialTest, setGoals, completeSession,
      recordHandstandTest, recordHandstandAxes, completeHandstandSession,
      recordLsitAxes, completeLsitSession,
      completeRunSession, repeatRunWeek, resetAll,
    }),
    [state, recordInitialTest, setGoals, completeSession,
      recordHandstandTest, recordHandstandAxes, completeHandstandSession,
      recordLsitAxes, completeLsitSession,
      completeRunSession, repeatRunWeek, resetAll],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>')
  return ctx
}
