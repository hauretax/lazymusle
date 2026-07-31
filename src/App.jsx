import { useState } from 'react'
import { useApp, getAppStep, getPushupStep, getHandstandStep, getLsitStep, getRunStep, handstandOf, lsitOf } from './store'
import { getDay } from './data/pushupProgram'
import { getSession, AXES as HS_AXES } from './data/handstandProgram'
import * as lsitProgram from './data/lsitProgram'
import { getWorkout } from './data/runProgram'
import Home from './screens/Home'
import Onboarding from './screens/Onboarding'
import Test from './screens/Test'
import Session from './screens/Session'
import HandstandTest from './screens/HandstandTest'
import Assess from './screens/Assess'
import HandstandSession from './screens/HandstandSession'
import LsitSession from './screens/LsitSession'
import RunSession from './screens/RunSession'
import Progress from './screens/Progress'
import Journal from './screens/Journal'
import Activities from './screens/Activities'
import ActivityForm from './screens/ActivityForm'
import Recap from './screens/Recap'
import Backup from './screens/Backup'
import Settings from './screens/Settings'
import PushupPlan from './screens/PushupPlan'
import RunPlan from './screens/RunPlan'
import Stretch from './screens/Stretch'

export default function App() {
  const {
    state, recordInitialTest, setGoals, completeSession, abandonSession,
    recordHandstandTest, recordHandstandAxes, completeHandstandSession,
    recordLsitAxes, completeLsitSession,
    completeRunSession, repeatRunWeek,
    goToPushupDay, goToRunWorkout,
  } = useApp()
  const [view, setView] = useState('home')
  // Quelle activité on est en train de corriger (null = on en note une nouvelle).
  const [editingActivity, setEditingActivity] = useState(null)
  const appStep = getAppStep(state)
  const step = getPushupStep(state)
  const hsStep = getHandstandStep(state)
  const lsitStep = getLsitStep(state)
  const runStep = getRunStep(state)

  const start = () => {
    if (step.type === 'test-initial') setView('test')
    else if (step.type === 'session') setView('session')
  }

  const startHandstand = () => {
    if (hsStep.type === 'test-initial') setView('hs-test')
    else if (hsStep.type === 'assess') setView('hs-assess')
    else setView('hs-session')
  }

  // Aucun objectif choisi (1er lancement, ou après une réinitialisation) : on demande avant tout.
  // Retour à l'accueil ensuite : après une réinitialisation, `view` pointe encore sur l'écran quitté.
  if (appStep.type === 'onboarding') {
    // On peut arriver ici avec une sauvegarde en poche : nouveau téléphone,
    // navigateur vidé. La restauration doit donc être accessible AVANT d'avoir
    // choisi quoi que ce soit — sinon il faudrait inventer un objectif pour
    // pouvoir récupérer les siens.
    if (view === 'backup') return <Backup onBack={() => setView('home')} />
    return (
      <Onboarding
        onRestore={() => setView('backup')}
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

  if (view === 'journal') {
    return <Journal onBack={() => setView('home')} />
  }

  if (view === 'backup') {
    return <Backup onBack={() => setView('home')} />
  }

  if (view === 'settings') {
    return <Settings onBack={() => setView('home')} />
  }

  if (view === 'recap') {
    return <Recap onBack={() => setView('home')} />
  }

  if (view === 'activities') {
    return (
      <Activities
        onBack={() => setView('home')}
        onAdd={() => {
          setEditingActivity(null)
          setView('activity-form')
        }}
        onEdit={(id) => {
          setEditingActivity(id)
          setView('activity-form')
        }}
      />
    )
  }

  if (view === 'activity-form') {
    // On relit l'activité dans l'état plutôt que de la figer dans le `useState` :
    // c'est la liste qui fait foi, y compris après une correction.
    const editing = (state.activities ?? []).find((a) => a.id === editingActivity) ?? null
    return (
      <ActivityForm
        key={editingActivity ?? 'new'}
        activity={editing}
        onDone={() => {
          setEditingActivity(null)
          setView('activities')
        }}
        onCancel={() => {
          setEditingActivity(null)
          setView('activities')
        }}
      />
    )
  }

  // Choisir sa séance : le curseur se déplace, puis on enchaîne direct dessus.
  if (view === 'pushup-plan') {
    return (
      <PushupPlan
        onBack={() => setView('home')}
        onPick={(levelIndex, dayIndex) => {
          goToPushupDay(levelIndex, dayIndex)
          setView('session')
        }}
      />
    )
  }

  if (view === 'run-plan') {
    return (
      <RunPlan
        onBack={() => setView('home')}
        onPick={(index) => {
          goToRunWorkout(index)
          setView('run-session')
        }}
      />
    )
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

  if (view === 'hs-test') {
    return (
      <HandstandTest
        levelIndex={handstandOf(state).levelIndex ?? 0}
        onCancel={() => setView('home')}
        onValidate={(sec) => {
          recordHandstandTest(sec)
          setView('home')
        }}
      />
    )
  }

  if (view === 'hs-assess') {
    return (
      <Assess
        title="L’équilibre"
        intro="Deux choses différentes, qui avancent chacune à leur rythme : arriver en haut, et y rester. On peut savoir monter sans savoir se rattraper — et l’inverse."
        axes={HS_AXES}
        initial={handstandOf(state).axes}
        onCancel={() => setView('home')}
        onValidate={(axes) => {
          recordHandstandAxes(axes)
          setView('home')
        }}
      />
    )
  }

  if (view === 'lsit-assess') {
    return (
      <Assess
        title="L-sit"
        intro="Deux choses différentes, qui avancent chacune à leur rythme : décoller du sol, et tendre les jambes. On peut tenir un L complet sur parallettes sans décoller un groupé au sol."
        axes={lsitProgram.AXES}
        initial={lsitOf(state).axes}
        onCancel={() => setView('home')}
        onValidate={(axes) => {
          recordLsitAxes(axes)
          setView('home')
        }}
      />
    )
  }

  if (view === 'lsit-session' && lsitStep.type === 'session') {
    return (
      <LsitSession
        session={lsitProgram.getSession(lsitStep.progress)}
        onQuit={() => setView('home')}
        onFinish={(result) => {
          completeLsitSession(result)
          setView('home')
        }}
      />
    )
  }

  if (view === 'hs-session' && hsStep.type === 'session') {
    return (
      <HandstandSession
        session={getSession(hsStep.levelIndex, hsStep.progress)}
        onQuit={() => setView('home')}
        onFinish={(result) => {
          completeHandstandSession(result)
          setView('home')
        }}
      />
    )
  }

  if (view === 'run-session' && runStep.type === 'session') {
    return (
      <RunSession
        workout={getWorkout(runStep.index)}
        onQuit={() => setView('home')}
        onFinish={(result) => {
          completeRunSession(result)
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
        onAbandon={(result, next) => {
          abandonSession(result)
          setView(next === 'stretch' ? 'stretch' : 'home')
        }}
      />
    )
  }

  return (
    <Home
      onStart={start}
      onStartHandstand={startHandstand}
      onRetestHandstand={() => setView('hs-test')}
      onReassessHandstand={() => setView('hs-assess')}
      onStartLsit={() => setView(lsitStep.type === 'assess' ? 'lsit-assess' : 'lsit-session')}
      onReassessLsit={() => setView('lsit-assess')}
      onStartRun={() => setView('run-session')}
      onRepeatRunWeek={repeatRunWeek}
      onOpenPushupPlan={() => setView('pushup-plan')}
      onOpenRunPlan={() => setView('run-plan')}
      onOpenProgress={() => setView('progress')}
      onOpenJournal={() => setView('journal')}
      onOpenActivities={() => setView('activities')}
      onOpenRecap={() => setView('recap')}
      onOpenBackup={() => setView('backup')}
      onOpenSettings={() => setView('settings')}
      onAddActivity={() => {
        setEditingActivity(null)
        setView('activity-form')
      }}
      onEditGoals={() => setView('goals')}
    />
  )
}
