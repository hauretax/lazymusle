import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { levels, pickLevelIndex, gapAfterSession } from './data/pushupProgram'
import { PUSHUPS_GOAL } from './data/goals'
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

  const resetAll = useCallback(() => setState(freshState()), [])

  const value = useMemo(
    () => ({ state, recordInitialTest, setGoals, completeSession, resetAll }),
    [state, recordInitialTest, setGoals, completeSession, resetAll],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>')
  return ctx
}
