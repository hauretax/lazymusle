import { useEffect, useState } from 'react'
import RestTimer from '../components/RestTimer'
import HoldTimer from '../components/HoldTimer'
import { PREP, BAIL } from '../data/handstandProgram'
import { primeAudio, vibrate } from '../lib/feedback'

// Séance handstand : préparation des poignets, puis des tenues (ou des essais
// d'équilibre) dérivées de la tenue max. Jamais jusqu'à l'échec — c'est du skill,
// pas de la force (voir TICKETS.md T3).
export default function HandstandSession({ session, onFinish, onQuit }) {
  const [phase, setPhase] = useState('prep') // 'prep' | 'hold' | 'rest' | 'done'
  const [idx, setIdx] = useState(0)
  const [held, setHeld] = useState([])

  useEffect(() => { primeAudio() }, [])

  const isPractice = session.mode === 'practice'
  const total = isPractice ? session.attempts : session.sets
  const holdSec = isPractice ? session.attemptSec : session.hold
  const restSec = session.restSec
  const isLast = idx === total - 1

  const completeHold = (sec) => {
    setHeld((prev) => [...prev, sec])
    vibrate(40)
    setPhase(isLast ? 'done' : 'rest')
  }

  const afterRest = () => {
    setIdx((i) => i + 1)
    setPhase('hold')
  }

  if (phase === 'prep') {
    return (
      <div className="screen session">
        <header className="session__head">
          <button className="iconbtn" onClick={onQuit} aria-label="Quitter">✕</button>
          <div className="session__title">
            <strong>{session.levelName}</strong>
            <span>Préparation</span>
          </div>
          <span />
        </header>
        <div className="session__body hs__prep">
          <h2 className="hs__h">Prépare tes poignets</h2>
          <p className="hs__hint">Ce sont eux qui encaissent tout. Non négociable.</p>
          <ul className="prep">
            {PREP.map((p) => (
              <li key={p.name} className="prep__row">
                <span className="prep__sec">{p.sec}s</span>
                <span className="prep__text"><b>{p.name}</b><span>{p.how}</span></span>
              </li>
            ))}
          </ul>
          <div className="hs__note">
            <b>{BAIL.title}</b> — {BAIL.how}
          </div>
          <button className="btn btn--primary btn--big" onClick={() => setPhase('hold')}>
            Poignets prêts, on y va
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const best = held.length ? Math.max(...held) : 0
    const volume = held.reduce((a, b) => a + b, 0)
    return (
      <div className="screen session">
        <div className="summary">
          <p className="summary__emoji">🤸</p>
          <h2 className="summary__title">Séance bouclée !</h2>
          <div className="summary__stats">
            <div className="stat"><span className="stat__num">{held.length}</span><span className="stat__lbl">{isPractice ? 'essais' : 'tenues'}</span></div>
            <div className="stat"><span className="stat__num">{volume}</span><span className="stat__lbl">secondes au total</span></div>
            <div className="stat"><span className="stat__num">{best}</span><span className="stat__lbl">meilleure tenue</span></div>
          </div>
          <div className="summary__chips">
            {held.map((s, i) => <span key={i} className="chip chip--done">{s}s</span>)}
          </div>
          <button
            className="btn btn--primary btn--big"
            onClick={() => onFinish({
              levelIndex: session.levelIndex,
              mode: session.mode,
              planned: { hold: holdSec, sets: total },
              held,
              volume,
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
          <strong>{session.levelName}</strong>
          <span>{session.exercise}</span>
        </div>
        <div className="session__count">{idx + 1}/{total}</div>
      </header>

      <div className="dots">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={'dot ' + (i < idx ? 'dot--done' : i === idx ? 'dot--active' : '')} />
        ))}
      </div>

      <div className="session__body">
        {phase === 'rest' ? (
          <RestTimer key={'r' + idx} seconds={restSec} onDone={afterRest} />
        ) : (
          <HoldTimer
            key={'h' + idx}
            seconds={holdSec}
            label={isPractice ? 'Cherche l’équilibre' : 'Tiens la position'}
            hint={session.how}
            onDone={completeHold}
          />
        )}
      </div>
    </div>
  )
}
