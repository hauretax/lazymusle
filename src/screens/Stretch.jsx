import { useEffect, useMemo, useRef, useState } from 'react'
import StretchFigure from '../components/StretchFigure'
import data from '../data/stretches.json'
import { primeAudio, endOfRestSignal, tick } from '../lib/feedback'

const R = 130
const CIRC = 2 * Math.PI * R
const DEFAULT_SIDES = ['Gauche', 'Droite']

function buildSteps() {
  const steps = []
  for (const s of data.stretches) {
    const n = s.sides || 1
    for (let k = 0; k < n; k++) {
      const label = n > 1 ? (s.sideLabels ? s.sideLabels[k] : DEFAULT_SIDES[k]) : null
      steps.push({ id: s.id, name: s.name, target: s.target, howto: s.howto, seconds: s.seconds, label })
    }
  }
  return steps
}

export default function Stretch({ onDone }) {
  const steps = useMemo(buildSteps, [])
  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(steps[0].seconds)
  const [finished, setFinished] = useState(false)
  const doneRef = useRef(false)
  const lastTick = useRef(null)

  useEffect(() => { primeAudio() }, [])

  const step = steps[idx]

  const goNext = () => {
    if (idx + 1 >= steps.length) setFinished(true)
    else setIdx((i) => i + 1)
  }

  useEffect(() => {
    if (finished) return
    doneRef.current = false
    lastTick.current = null
    setLeft(steps[idx].seconds)
    const startedAt = Date.now()
    const target = startedAt + steps[idx].seconds * 1000
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((target - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining <= 3 && remaining > 0 && lastTick.current !== remaining) {
        lastTick.current = remaining
        tick()
      }
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true
        clearInterval(id)
        endOfRestSignal()
        goNext()
      }
    }, 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, finished])

  if (finished) {
    return (
      <div className="screen session">
        <div className="summary">
          <p className="summary__emoji">🧘</p>
          <h2 className="summary__title">Bien étiré !</h2>
          <p className="summary__testline">Récupération faite. À la prochaine séance 👊</p>
          <button className="btn btn--primary btn--big" onClick={onDone}>Terminer</button>
        </div>
      </div>
    )
  }

  const pct = step.seconds > 0 ? left / step.seconds : 0

  return (
    <div className="screen stretch">
      <header className="session__head">
        <button className="iconbtn" onClick={onDone} aria-label="Passer les étirements">✕</button>
        <div className="session__title">
          <strong>Étirements</strong>
          <span>Récupération · {idx + 1}/{steps.length}</span>
        </div>
        <div className="session__count">{idx + 1}/{steps.length}</div>
      </header>

      <div className="dots">
        {steps.map((_, i) => (
          <span key={i} className={'dot ' + (i < idx ? 'dot--done' : i === idx ? 'dot--active' : '')} />
        ))}
      </div>

      <div className="stretch__fig">
        <StretchFigure id={step.id} />
      </div>

      <div className="stretch__info">
        <h2 className="stretch__name">
          {step.name}
          {step.label && <span className="stretch__side">{step.label}</span>}
        </h2>
        <p className="stretch__target">{step.target}</p>
        <p className="stretch__how">{step.howto}</p>
      </div>

      <div className="stretch__timer">
        <div className="ring ring--sm">
          <svg viewBox="0 0 300 300" className="ring__svg">
            <circle cx="150" cy="150" r={R} className="ring__track" />
            <circle cx="150" cy="150" r={R} className="ring__progress"
              style={{ strokeDasharray: CIRC, strokeDashoffset: CIRC * (1 - pct) }} />
          </svg>
          <div className="ring__center">
            <span className="ring__time">{left}</span>
            <span className="ring__unit">sec</span>
          </div>
        </div>
      </div>

      <button className="btn btn--ghost btn--big" onClick={goNext}>Suivant →</button>
    </div>
  )
}
