import { useEffect, useRef, useState } from 'react'
import { endOfRestSignal, tick } from '../lib/feedback'

const R = 130
const CIRC = 2 * Math.PI * R

// Décompte une tenue. Contrairement à la pause, on peut tomber avant la fin :
// le bouton enregistre alors la tenue réelle, pas celle qui était prévue.
export default function HoldTimer({ seconds, label, hint, onDone }) {
  const [left, setLeft] = useState(seconds)
  const doneRef = useRef(false)
  const lastTickRef = useRef(null)

  useEffect(() => {
    const target = Date.now() + seconds * 1000
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((target - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining <= 3 && remaining > 0 && lastTickRef.current !== remaining) {
        lastTickRef.current = remaining
        tick()
      }
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true
        clearInterval(id)
        endOfRestSignal()
        onDone(seconds)
      }
    }, 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds])

  const fellEarly = () => {
    if (doneRef.current) return
    doneRef.current = true
    onDone(Math.max(0, seconds - left))
  }

  const pct = seconds > 0 ? left / seconds : 0

  return (
    <div className="rest">
      <p className="rest__label">{label}</p>
      <div className="ring">
        <svg viewBox="0 0 300 300" className="ring__svg">
          <circle cx="150" cy="150" r={R} className="ring__track" />
          <circle
            cx="150"
            cy="150"
            r={R}
            className="ring__progress"
            style={{ strokeDasharray: CIRC, strokeDashoffset: CIRC * (1 - pct) }}
          />
        </svg>
        <div className="ring__center">
          <span className="ring__time">{left}</span>
          <span className="ring__unit">sec</span>
        </div>
      </div>
      {hint && <p className="rest__hint">{hint}</p>}
      <div className="rest__actions">
        <button className="btn btn--ghost" onClick={fellEarly}>Je suis redescendu</button>
      </div>
    </div>
  )
}
