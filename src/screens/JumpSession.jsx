import { useEffect, useState } from 'react'
import RestTimer from '../components/RestTimer'
import { REST_SEC } from '../data/jumpProgram'
import { primeAudio, vibrate } from '../lib/feedback'

// Séance Air Alert : les 5 exercices dans l'ordre du programme, série par série.
// Repos entre les séries d'un même exercice (2 min max, Air Alert III), rien
// entre deux exercices — c'est le programme qui le dit.
export default function JumpSession({ workout, onFinish, onAbandon, onQuit }) {
  // Une étape = une série d'un exercice.
  const steps = workout.exercises.flatMap((e) =>
    Array.from({ length: e.sets }, (_, i) => ({ ex: e, set: i })))
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState('work') // 'work' | 'rest' | 'quit' | 'done'
  const [reps, setReps] = useState(0) // reps faites, comptées au total (les deux jambes)

  useEffect(() => { primeAudio() }, [])

  const step = steps[i]
  const repsOf = (s) => s.ex.reps * (s.ex.perLeg ? 2 : 1)

  const setDone = () => {
    setReps((r) => r + repsOf(step))
    vibrate(40)
    const next = steps[i + 1]
    if (!next) return setPhase('done')
    setI(i + 1)
    // Même exercice : repos. Exercice suivant : on enchaîne.
    setPhase(next.ex.id === step.ex.id ? 'rest' : 'work')
  }

  const result = {
    week: workout.weekNumber,
    session: workout.sessionNumber,
    planned: workout.totalReps,
    reps,
    reduced: workout.reduced,
  }

  if (phase === 'quit') {
    return (
      <div className="screen session">
        <div className="summary">
          <p className="summary__emoji">🤔</p>
          <h2 className="summary__title">On s’arrête là ?</h2>
          <p className="summary__testline">
            {reps > 0
              ? <>Tu as fait <b>{reps}</b> reps sur les {workout.totalReps} prévues — elles comptent. La séance reviendra demain, à l’identique.</>
              : <>Rien de fait pour l’instant : quitter n’enregistrera rien.</>}
          </p>
          <button className="btn btn--primary btn--big" onClick={() => setPhase('work')}>Je continue 💪</button>
          <button
            className="link"
            onClick={() => (reps > 0 ? onAbandon({ ...result, stoppedAt: i }) : onQuit())}
          >Arrêter</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="screen session">
        <div className="summary">
          <p className="summary__emoji">🏀</p>
          <h2 className="summary__title">Séance bouclée !</h2>
          <div className="summary__stats">
            <div className="stat"><span className="stat__num">{reps}</span><span className="stat__lbl">reps</span></div>
            <div className="stat"><span className="stat__num">{workout.exercises.length}</span><span className="stat__lbl">exercices</span></div>
          </div>
          <button className="btn btn--primary btn--big" onClick={() => onFinish(result)}>Terminer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen session">
      <header className="session__head">
        <button className="iconbtn" onClick={() => setPhase('quit')} aria-label="Quitter">✕</button>
        <div className="session__title">
          <strong>Semaine {workout.weekNumber} · Séance {workout.sessionNumber}</strong>
          <span>{step.ex.name}</span>
        </div>
        <div className="session__count">{i + 1}/{steps.length}</div>
      </header>

      <div className="dots">
        {steps.map((_, k) => (
          <span key={k} className={'dot ' + (k < i ? 'dot--done' : k === i ? 'dot--active' : '')} />
        ))}
      </div>

      <div className="session__body">
        {phase === 'rest' ? (
          <RestTimer key={'r' + i} seconds={REST_SEC} onDone={() => setPhase('work')} />
        ) : (
          <div className="rest">
            <p className="rest__label">{step.ex.name} · série {step.set + 1}/{step.ex.sets}</p>
            <div className="jump__target">
              <span className="stepper__value">{step.ex.reps}</span>
              <span className="jump__unit">{step.ex.perLeg ? 'reps par jambe' : 'reps'}</span>
            </div>
            <p className="rest__hint">{step.ex.how}</p>
            <button className="btn btn--primary btn--big" onClick={setDone}>Série faite ✓</button>
          </div>
        )}
      </div>
    </div>
  )
}
