import { useState } from 'react'
import { useApp, getNextStep } from './store'
import { getDay } from './data/pushupProgram'
import Home from './screens/Home'
import Onboarding from './screens/Onboarding'
import Test from './screens/Test'
import Session from './screens/Session'
import Progress from './screens/Progress'
import Stretch from './screens/Stretch'

export default function App() {
  const { state, recordInitialTest, setGoals, completeSession } = useApp()
  const [view, setView] = useState('home')
  const step = getNextStep(state)

  const start = () => {
    if (step.type === 'test-initial') setView('test')
    else if (step.type === 'session') setView('session')
  }

  // Aucun objectif choisi (1er lancement, ou après une réinitialisation) : on demande avant tout.
  // Retour à l'accueil ensuite : après une réinitialisation, `view` pointe encore sur l'écran quitté.
  if (step.type === 'onboarding') {
    return (
      <Onboarding
        onValidate={(ids) => {
          setGoals(ids)
          setView('home')
        }}
      />
    )
  }

  if (view === 'goals') {
    return (
      <Onboarding
        initial={state.goals}
        onCancel={() => setView('home')}
        onValidate={(ids) => {
          setGoals(ids)
          setView('home')
        }}
      />
    )
  }

  if (view === 'progress') {
    return <Progress onBack={() => setView('home')} />
  }

  if (view === 'stretch') {
    return <Stretch onDone={() => setView('home')} />
  }

  if (view === 'test' && step.type === 'test-initial') {
    return (
      <Test
        onCancel={() => setView('home')}
        onValidate={(reps) => {
          recordInitialTest(reps)
          setView('home')
        }}
      />
    )
  }

  if (view === 'session' && step.type === 'session') {
    const day = getDay(step.levelIndex, step.dayIndex)
    return (
      <Session
        session={day}
        onQuit={() => setView('home')}
        onFinish={(result) => {
          completeSession(result)
          setView('stretch')
        }}
      />
    )
  }

  return (
    <Home
      onStart={start}
      onOpenProgress={() => setView('progress')}
      onEditGoals={() => setView('goals')}
    />
  )
}
