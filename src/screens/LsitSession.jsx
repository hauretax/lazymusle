import { useEffect, useState } from 'react'
import RestTimer from '../components/RestTimer'
import HoldTimer from '../components/HoldTimer'
import { PREP } from '../data/lsitProgram'
import { primeAudio, vibrate } from '../lib/feedback'

// Séance L-sit : prep, puis des tenues de la forme courante sur le support courant.
// La toute première fois sur une combinaison, on ne prescrit rien : on mesure une
// tenue max, et c'est elle qui dose les séances suivantes (voir lsitProgram.js).
export default function LsitSession({ session, onFinish, onQuit }) {
  const [phase, setPhase] = useState('prep') // 'prep' | 'hold' | 'rest' | 'done'
  const [idx, setIdx] = useState(0)
  const [held, setHeld] = useState([])

  useEffect(() => { primeAudio() }, [])

  const isCalibration = session.mode === 'calibration'
  const total = isCalibration ? 1 : session.sets
  const holdSec = isCalibration ? session.maxSec : session.hold
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
            <strong>L-sit</strong>
            <span>Préparation</span>
          </div>
          <span />
        </header>
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
            {session.drills.map((d) => (
              <li key={d.axisId} className="prep__row">
                <span className="prep__sec">{d.emoji}</span>
                <span className="prep__text">
                  <b>{d.axisLabel} · {d.step.label}</b>
                  <span>{d.step.how}</span>
                </span>
              </li>
            ))}
          </ul>

          {isCalibration && (
            <div className="hs__note">
              <b>{session.label}</b> — {session.how}
            </div>
          )}

          <button className="btn btn--primary btn--big" onClick={() => setPhase('hold')}>
            {isCalibration ? 'Mesurer ma tenue' : 'On y va'}
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
          <p className="summary__emoji">🧘</p>
          <h2 className="summary__title">
            {isCalibration ? 'C’est calé !' : 'Séance bouclée !'}
          </h2>
          {isCalibration && (
            <p className="summary__testline">
              {best} s tenus. L’app dose les prochaines séances là-dessus — à 60-70 %, jamais à l’échec.
            </p>
          )}
          <div className="summary__stats">
            <div className="stat"><span className="stat__num">{held.length}</span><span className="stat__lbl">{held.length > 1 ? 'tenues' : 'tenue'}</span></div>
            <div className="stat"><span className="stat__num">{volume}</span><span className="stat__lbl">secondes au total</span></div>
            <div className="stat"><span className="stat__num">{best}</span><span className="stat__lbl">meilleure tenue</span></div>
          </div>
          <div className="summary__chips">
            {held.map((s, i) => <span key={i} className="chip chip--done">{s}s</span>)}
          </div>
          <button
            className="btn btn--primary btn--big"
            onClick={() => onFinish({ mode: session.mode, held, volume, best })}
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
          <strong>L-sit</strong>
          <span>{session.drills.map((d) => d.step.label).join(' · ')}</span>
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
          <RestTimer key={'r' + idx} seconds={session.restSec} onDone={afterRest} />
        ) : (
          <HoldTimer
            key={'h' + idx}
            seconds={holdSec}
            label={isCalibration ? 'Tiens le plus longtemps possible' : 'Tiens la position'}
            hint={isCalibration ? 'Arrête-toi dès que la forme se casse.' : session.drills[1]?.step.how}
            onDone={completeHold}
          />
        )}
      </div>
    </div>
  )
}
