import { useEffect, useState } from 'react'
import RestTimer from '../components/RestTimer'
import HoldTimer from '../components/HoldTimer'
import PressFigure from '../components/PressFigure'
import { PREP, meetsCriterion, CRITERION_QUESTION } from '../data/pressProgram'
import { primeAudio, vibrate } from '../lib/feedback'

// Pause quand on change d'exercice (press → compression). CHOIX DE L'APP.
const BETWEEN_DRILLS_SEC = 60

// Séance press : prep, puis le press (frais, c'est du skill), puis la compression.
// Chaque série se note : c'est ce qui dit quand passer à l'étape suivante.
export default function PressSession({ session, onFinish, onQuit }) {
  const drills = session.drills
  const [phase, setPhase] = useState('prep') // 'prep' | 'work' | 'rest' | 'confirm' | 'done'
  const [d, setD] = useState(0) // exercice courant
  const [set, setSet] = useState(0) // série courante
  const [done, setDone] = useState(() => drills.map(() => [])) // reps ou secondes, par série
  const [reps, setReps] = useState(drills[0].reps ?? 0)
  const [confirmed, setConfirmed] = useState({}) // stepId -> bool, pour descentes et tenues
  const [restSec, setRestSec] = useState(0)

  useEffect(() => { primeAudio() }, [])

  const drill = drills[d]
  const lastSet = set === drill.sets - 1
  const lastDrill = d === drills.length - 1

  const record = (value) => {
    setDone((prev) => prev.map((arr, i) => (i === d ? [...arr, value] : arr)))
    vibrate(40)
    if (lastSet && lastDrill) {
      setPhase(drills.some((x) => x.kind !== 'reps') ? 'confirm' : 'done')
      return
    }
    setRestSec(lastSet ? BETWEEN_DRILLS_SEC : drill.restSec)
    setPhase('rest')
  }

  const afterRest = () => {
    if (lastSet) {
      setD(d + 1)
      setSet(0)
      setReps(drills[d + 1].reps ?? 0)
    } else {
      setSet(set + 1)
      setReps(drill.reps ?? 0)
    }
    setPhase('work')
  }

  const results = drills.map((x, i) => ({
    axisId: x.axisId,
    stepId: x.step.id,
    kind: x.kind,
    sets: done[i],
    confirmed: !!confirmed[x.step.id],
  }))
  const pressResult = results.find((r) => r.axisId === 'press')
  const pressReps = pressResult && pressResult.kind !== 'hold' ? pressResult.sets.reduce((a, b) => a + b, 0) : 0
  const ready = drills.filter((x, i) => meetsCriterion(x, results[i])).map((x) => x.step.id)

  const head = (subtitle, count) => (
    <header className="session__head">
      <button className="iconbtn" onClick={onQuit} aria-label="Quitter">✕</button>
      <div className="session__title">
        <strong>Press</strong>
        <span>{subtitle}</span>
      </div>
      {count ?? <span />}
    </header>
  )

  if (phase === 'prep') {
    return (
      <div className="screen session">
        {head('Préparation')}
        <div className="session__body hs__prep">
          <h2 className="hs__h">Prépare-toi</h2>
          <ul className="prep">
            {PREP.map((p) => (
              <li key={p.name} className="prep__row">
                <span className="prep__sec">{p.sec}s</span>
                <span className="prep__text"><b>{p.name}</b><span>{p.how}</span></span>
              </li>
            ))}
          </ul>
          <h2 className="hs__h">Ce que tu travailles aujourd’hui</h2>
          <ul className="prep">
            {drills.map((x) => (
              <li key={x.axisId} className="prep__row">
                <span className="prep__sec">{x.emoji}</span>
                <span className="prep__text">
                  <b>{x.axisLabel} · {x.step.label}</b>
                  <span>{x.sets} × {x.kind === 'hold' ? `${x.holdSec} s` : `${x.reps} reps`} — {x.note}</span>
                </span>
              </li>
            ))}
          </ul>
          <button className="btn btn--primary btn--big" onClick={() => setPhase('work')}>On y va</button>
        </div>
      </div>
    )
  }

  if (phase === 'confirm') {
    const asked = drills.filter((x) => x.kind !== 'reps')
    return (
      <div className="screen session">
        <div className="summary">
          <p className="summary__emoji">🤔</p>
          <h2 className="summary__title">Honnêtement…</h2>
          {asked.map((x) => (
            <div key={x.step.id} className="quit__partial">
              <p className="quit__label">{CRITERION_QUESTION[x.kind]}</p>
              <div className="summary__chips">
                <button
                  className={'btn ' + (confirmed[x.step.id] ? 'btn--primary' : 'btn--ghost')}
                  onClick={() => setConfirmed((c) => ({ ...c, [x.step.id]: true }))}
                >Oui</button>
                <button
                  className={'btn ' + (confirmed[x.step.id] === false ? 'btn--primary' : 'btn--ghost')}
                  onClick={() => setConfirmed((c) => ({ ...c, [x.step.id]: false }))}
                >Pas encore</button>
              </div>
            </div>
          ))}
          <button
            className="btn btn--primary btn--big"
            disabled={asked.some((x) => confirmed[x.step.id] == null)}
            onClick={() => setPhase('done')}
          >Continuer</button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="screen session">
        <div className="summary">
          <p className="summary__emoji">🙃</p>
          <h2 className="summary__title">Séance bouclée !</h2>
          {drills.map((x, i) => (
            <div key={x.axisId}>
              <p className="summary__testline"><b>{x.step.label}</b></p>
              <div className="summary__chips">
                {done[i].map((v, k) => (
                  <span key={k} className="chip chip--done">{x.kind === 'hold' ? `${v}s` : v}</span>
                ))}
              </div>
            </div>
          ))}
          {ready.length > 0 && (
            <p className="summary__testline">
              ✅ Critère atteint — l’accueil te proposera l’étape suivante.
            </p>
          )}
          <button
            className="btn btn--primary btn--big"
            onClick={() => onFinish({ drills: results, pressReps, ready })}
          >Terminer</button>
        </div>
      </div>
    )
  }

  const count = <div className="session__count">{set + 1}/{drill.sets}</div>

  return (
    <div className="screen session">
      {head(`${drill.emoji} ${drill.step.label}`, count)}
      <div className="dots">
        {Array.from({ length: drill.sets }, (_, i) => (
          <span key={i} className={'dot ' + (i < set ? 'dot--done' : i === set ? 'dot--active' : '')} />
        ))}
      </div>
      <div className="session__body">
        {phase === 'rest' ? (
          <RestTimer key={`r${d}-${set}`} seconds={restSec} onDone={afterRest} />
        ) : drill.kind === 'hold' ? (
          <>
            <PressFigure id={drill.step.id} />
            <HoldTimer
              key={`h${d}-${set}`}
              seconds={drill.holdSec}
              label="Compresse"
              hint={drill.step.how}
              onDone={record}
            />
          </>
        ) : (
          <div className="rest">
            <p className="rest__label">
              {drill.kind === 'eccentric' ? 'Descentes lentes' : 'Reps propres'} · objectif {drill.reps}
            </p>
            <PressFigure id={drill.step.id} />
            <p className="rest__hint">{drill.step.how}</p>
            <div className="stepper">
              <button className="stepper__btn" onClick={() => setReps((r) => Math.max(0, r - 1))}>−</button>
              <div className="stepper__value">{reps}</div>
              <button className="stepper__btn" onClick={() => setReps((r) => r + 1)}>+</button>
            </div>
            <p className="rest__hint">{drill.note}</p>
            <button className="btn btn--primary btn--big" onClick={() => record(reps)}>Série faite</button>
          </div>
        )}
      </div>
    </div>
  )
}
