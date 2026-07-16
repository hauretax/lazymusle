import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { GOAL, levels, pickLevelIndex, gapAfterSession } from './data/pushupProgram'
import { PUSHUPS_GOAL } from './data/goals'

const KEY = 'reps.pushups.v2'

function freshState() {
  return {
    version: 3,
    createdAt: new Date().toISOString(),
    goal: GOAL,
    goals: [], // objectifs choisis à l'onboarding (ids de goals.json) ; vide = onboarding à faire
    restSec: 60, // pause entre séries (réglable)
    levelIndex: null, // 0..2, null avant le test initial
    dayIndex: 0, // jour courant dans le niveau (= workouts.length -> jour de test)
    lastSessionDate: null,
    nextDate: null, // date conseillée de la prochaine séance (ISO)
    maxHistory: [], // [{ date, reps, kind: 'initial' | 'test' , level }]
    sessions: [], // [{ levelIndex, dayIndex, isTest, planned, results, total, passed, date }]
    finished: false,
  }
}

// v2 -> v3 : arrivée des objectifs. Quelqu'un déjà lancé sur les pompes les garde
// et ne repasse pas par l'onboarding.
function migrate(s) {
  if (s.goals?.length || s.levelIndex == null) return { ...s, version: 3 }
  return { ...s, goals: [PUSHUPS_GOAL], version: 3 }
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrate({ ...freshState(), ...JSON.parse(raw) })
  } catch {
    /* ignore */
  }
  return freshState()
}

export function getNextStep(state) {
  if (!state.goals?.length) return { type: 'onboarding' }
  // Les pompes sont le seul module développé : sans elles, rien à s'entraîner (voir TICKETS.md).
  if (!state.goals.includes(PUSHUPS_GOAL)) return { type: 'no-program' }
  if (state.levelIndex == null) return { type: 'test-initial' }
  if (state.finished) return { type: 'done' }
  const isTest = state.dayIndex >= levels[state.levelIndex].workouts.length
  return { type: 'session', levelIndex: state.levelIndex, dayIndex: state.dayIndex, isTest }
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

  const recordInitialTest = useCallback((reps) => {
    setState((s) => ({
      ...s,
      levelIndex: pickLevelIndex(reps),
      dayIndex: 0,
      maxHistory: [...s.maxHistory, { date: new Date().toISOString(), reps, kind: 'initial' }],
    }))
  }, [])

  const setRestSec = useCallback((sec) => setState((s) => ({ ...s, restSec: sec })), [])

  const setGoals = useCallback((ids) => setState((s) => ({ ...s, goals: ids })), [])

  const completeSession = useCallback((result) => {
    setState((s) => {
      const now = new Date().toISOString()
      const nCompleted = s.sessions.length + 1
      const nextDate = addDays(now, gapAfterSession(nCompleted))
      const level = levels[s.levelIndex]
      let { levelIndex, dayIndex, finished, maxHistory } = s
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
        ...s,
        sessions: [...s.sessions, { ...result, passed, date: now }],
        maxHistory,
        levelIndex,
        dayIndex,
        finished,
        lastSessionDate: now,
        nextDate,
      }
    })
  }, [])

  const resetAll = useCallback(() => setState(freshState()), [])

  const value = useMemo(
    () => ({ state, recordInitialTest, setRestSec, setGoals, completeSession, resetAll }),
    [state, recordInitialTest, setRestSec, setGoals, completeSession, resetAll],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>')
  return ctx
}
