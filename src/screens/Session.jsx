import { useEffect, useState } from 'react'
import RestTimer from '../components/RestTimer'
import { parseSet, computeRest, levels } from '../data/pushupProgram'
import { primeAudio, vibrate } from '../lib/feedback'

function MaxSet({ target, isTest, onValidate }) {
  const [reps, setReps] = useState(target)
  return (
    <div className="active">
      <p className="active__kicker">
        {isTest ? 'Test — donne tout 🎯' : 'Dernière série — donne tout 🔥'}
      </p>
      <p className="active__max-hint">
        {isTest ? <>Objectif : <b>{target}</b> pompes d’affilée</> : <>Au moins <b>{target}</b>, puis le maximum possible</>}
      </p>
      <div className="stepper">
        <button className="stepper__btn" onClick={() => setReps((r) => Math.max(0, r - 1))}>−</button>
        <div className="stepper__value">{reps}</div>
        <button className="stepper__btn" onClick={() => setReps((r) => r + 1)}>+</button>
      </div>
      <button className="btn btn--primary btn--big" onClick={() => onValidate(reps)}>
        {isTest ? 'Valider le test' : 'Valider la série'}
      </button>
    </div>
  )
}

function FixedSet({ target, onDone }) {
  return (
    <div className="active">
      <p className="active__kicker">Fais ta série</p>
      <div className="active__target">{target}</div>
      <p className="active__unit">pompes</p>
      <button className="btn btn--primary btn--big" onClick={() => onDone(target)}>
        Série terminée ✓
      </button>
    </div>
  )
}

export default function Session({ session, onFinish, onQuit }) {
  const { levelName, dayNumber, totalDays, values, isTest } = session
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState('active') // 'active' | 'rest' | 'done'
  const [results, setResults] = useState([])
  const [restSec, setRestSec] = useState(90)

  useEffect(() => { primeAudio() }, [])

  const isLast = idx === values.length - 1
  const current = parseSet(values[idx])

  const completeSet = (reps) => {
    setResults((prev) => [...prev, reps])
    vibrate(40)
    if (isLast) {
      setPhase('done')
    } else {
      // pause adaptée à l'effort de la série qu'on vient de faire
      setRestSec(computeRest(current.target))
      setPhase('rest')
    }
  }

  const afterRest = () => {
    setIdx((i) => i + 1)
    setPhase('active')
  }

  const total = results.reduce((a, b) => a + b, 0)

  if (phase === 'done') {
    const best = results.length ? Math.max(...results) : 0
    const passed = isTest ? total >= session.target : null
    const lastLevel = session.levelIndex >= levels.length - 1
    return (
      <div className="screen session">
        <div className="summary">
          <p className="summary__emoji">{isTest ? (passed ? (lastLevel ? '🏆' : '🏅') : '💥') : '💪'}</p>
          <h2 className="summary__title">
            {isTest ? (passed ? (lastLevel ? 'Objectif atteint !' : 'Test réussi !') : 'Presque !') : 'Séance bouclée !'}
          </h2>
          {isTest && (
            <p className="summary__testline">
              {passed
                ? (lastLevel ? '100 pompes d’affilée. Tu as bouclé le programme ! 🔥' : 'Tu passes au niveau suivant 🚀')
                : `${total}/${session.target} — repose-toi et retente le test.`}
            </p>
          )}
          <div className="summary__stats">
            <div className="stat"><span className="stat__num">{total}</span><span className="stat__lbl">pompes au total</span></div>
            <div className="stat"><span className="stat__num">{values.length}</span><span className="stat__lbl">{values.length > 1 ? 'séries' : 'série'}</span></div>
            <div className="stat"><span className="stat__num">{best}</span><span className="stat__lbl">meilleure série</span></div>
          </div>
          <div className="summary__chips">
            {results.map((r, i) => <span key={i} className="chip chip--done">{r}</span>)}
          </div>
          <button
            className="btn btn--primary btn--big"
            onClick={() => onFinish({
              levelIndex: session.levelIndex,
              dayIndex: session.dayIndex,
              isTest,
              target: session.target,
              planned: values,
              results,
              total,
            })}
          >
            Terminer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen session">
      <header className="session__head">
        <button className="iconbtn" onClick={onQuit} aria-label="Quitter">✕</button>
        <div className="session__title">
          <strong>{isTest ? `${levelName} · Test` : `${levelName} · Jour ${dayNumber}`}</strong>
          <span>{isTest ? `Objectif ${session.target} pompes` : `Jour ${dayNumber}/${totalDays}`}</span>
        </div>
        <div className="session__count">{idx + 1}/{values.length}</div>
      </header>

      <div className="dots">
        {values.map((v, i) => (
          <span key={i} className={'dot ' + (i < idx ? 'dot--done' : i === idx ? 'dot--active' : '')}>
            {parseSet(v).isMax ? '+' : ''}
          </span>
        ))}
      </div>

      <div className="session__body">
        {phase === 'rest' ? (
          <RestTimer key={idx} seconds={restSec} onDone={afterRest} />
        ) : current.isMax ? (
          <MaxSet target={current.target} isTest={isTest} onValidate={completeSet} />
        ) : (
          <FixedSet target={current.target} onDone={completeSet} />
        )}
      </div>

      {!isTest && (
        <div className="session__plan">
          {values.map((v, i) => (
            <span key={i} className={'chip ' + (i < idx ? 'chip--done' : i === idx ? 'chip--active' : '')}>
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
