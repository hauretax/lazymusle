import { useEffect, useRef, useState } from 'react'
import { endOfRestSignal, tick } from '../lib/feedback'

const R = 130
const CIRC = 2 * Math.PI * R

export default function RestTimer({ seconds, onDone }) {
  const [total, setTotal] = useState(seconds)
  const [left, setLeft] = useState(seconds)
  const doneRef = useRef(false)
  const lastTickRef = useRef(null)

  useEffect(() => {
    const startedAt = Date.now()
    const target = startedAt + total * 1000
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
        onDone()
      }
    }, 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  const addTime = () => {
    setTotal((t) => t + 30)
    setLeft((l) => l + 30)
  }

  const pct = total > 0 ? left / total : 0
  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="rest">
      <p className="rest__label">Récupération</p>
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
          <span className="ring__time">{mm > 0 ? `${mm}:${ss}` : left}</span>
          <span className="ring__unit">{mm > 0 ? 'min' : 'sec'}</span>
        </div>
      </div>
      <p className="rest__hint">Plus long si besoin — écoute ton corps.</p>
      <div className="rest__actions">
        <button className="btn btn--ghost" onClick={addTime}>+30 s</button>
        <button className="btn btn--primary" onClick={() => { doneRef.current = true; onDone() }}>
          Passer
        </button>
      </div>
    </div>
  )
}
