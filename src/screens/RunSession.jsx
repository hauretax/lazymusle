import { useEffect, useRef, useState } from 'react'
import { primeAudio, tick, endOfRestSignal, vibrate } from '../lib/feedback'

const R = 130
const CIRC = 2 * Math.PI * R

function mmss(sec) {
  const m = Math.floor(sec / 60)
  const s = String(Math.max(0, sec % 60)).padStart(2, '0')
  return `${m}:${s}`
}

const LABEL = { walk: 'Marche', run: 'Cours' }
const EMOJI = { walk: '🚶', run: '🏃' }

// Lecteur d'intervalles. Contrairement aux autres séances, on ne regarde pas son
// téléphone en courant : chaque changement d'allure est annoncé au bip et à la
// vibration, et l'écran n'est qu'un rappel.
export default function RunSession({ workout, onFinish, onQuit }) {
  // L'échauffement est un intervalle comme les autres : 5 min de marche rapide,
  // avant chaque séance du plan.
  const steps = [
    { t: 'walk', sec: workout.warmup.sec, warmup: true },
    ...workout.intervals,
  ]

  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(steps[0].sec)
  const [running, setRunning] = useState(true)
  const doneRef = useRef(false)
  const lastTickRef = useRef(null)
  const endRef = useRef(Date.now() + steps[0].sec * 1000)

  useEffect(() => { primeAudio() }, [])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining <= 3 && remaining > 0 && lastTickRef.current !== remaining) {
        lastTickRef.current = remaining
        tick()
      }
      if (remaining <= 0 && !doneRef.current) {
        doneRef.current = true
        clearInterval(id)
        endOfRestSignal()
        vibrate(60)
        setIdx((i) => {
          const next = i + 1
          if (next < steps.length) {
            doneRef.current = false
            lastTickRef.current = null
            endRef.current = Date.now() + steps[next].sec * 1000
            setLeft(steps[next].sec)
          }
          return next
        })
      }
    }, 200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, running])

  const pause = () => {
    setRunning((wasRunning) => {
      if (wasRunning) return false
      // On reprend là où on s'était arrêté.
      endRef.current = Date.now() + left * 1000
      doneRef.current = false
      return true
    })
  }

  const skip = () => {
    const next = idx + 1
    doneRef.current = false
    lastTickRef.current = null
    if (next < steps.length) {
      endRef.current = Date.now() + steps[next].sec * 1000
      setLeft(steps[next].sec)
    }
    setIdx(next)
  }

  if (idx >= steps.length) {
    return (
      <div className="screen session">
        <div className="summary">
          <p className="summary__emoji">{workout.isFinal ? '🏆' : '🏃'}</p>
          <h2 className="summary__title">
            {workout.isFinal ? 'Les 5 km !' : 'Séance bouclée !'}
          </h2>
          {workout.note && <p className="summary__testline">{workout.note}</p>}
          <div className="summary__stats">
            <div className="stat"><span className="stat__num">{Math.round(workout.runSec / 60)}</span><span className="stat__lbl">min courues</span></div>
            <div className="stat"><span className="stat__num">{Math.round(workout.totalSec / 60)}</span><span className="stat__lbl">min au total</span></div>
            <div className="stat"><span className="stat__num">S{workout.weekNumber}</span><span className="stat__lbl">semaine</span></div>
          </div>
          <button
            className="btn btn--primary btn--big"
            onClick={() => onFinish({
              index: workout.index,
              weekNumber: workout.weekNumber,
              runSec: workout.runSec,
              totalSec: workout.totalSec,
            })}
          >
            Terminer
          </button>
        </div>
      </div>
    )
  }

  const cur = steps[idx]
  const pct = cur.sec > 0 ? left / cur.sec : 0
  const next = steps[idx + 1]

  return (
    <div className={'screen session run run--' + cur.t}>
      <header className="session__head">
        <button className="iconbtn" onClick={onQuit} aria-label="Quitter">✕</button>
        <div className="session__title">
          <strong>Semaine {workout.weekNumber} · Séance {workout.workoutNumber}</strong>
          <span>{cur.warmup ? 'Échauffement' : `${idx}/${steps.length - 1}`}</span>
        </div>
        <span />
      </header>

      <div className="session__body">
        <div className="rest">
          <p className="run__label">
            {EMOJI[cur.t]} {cur.warmup ? 'Échauffe-toi en marchant' : LABEL[cur.t]}
          </p>
          <div className="ring">
            <svg viewBox="0 0 300 300" className="ring__svg">
              <circle cx="150" cy="150" r={R} className="ring__track" />
              <circle
                cx="150" cy="150" r={R}
                className={'ring__progress ring__progress--' + cur.t}
                style={{ strokeDasharray: CIRC, strokeDashoffset: CIRC * (1 - pct) }}
              />
            </svg>
            <div className="ring__center">
              <span className="ring__time">{mmss(left)}</span>
              <span className="ring__unit">{running ? 'restant' : 'en pause'}</span>
            </div>
          </div>
          <p className="rest__hint">
            {next ? <>Ensuite : {EMOJI[next.t]} {LABEL[next.t]} {mmss(next.sec)}</> : 'Dernier effort 🔥'}
          </p>
          <div className="rest__actions">
            <button className="btn btn--ghost" onClick={pause}>{running ? '⏸ Pause' : '▶︎ Reprendre'}</button>
            <button className="btn btn--ghost" onClick={skip}>Passer</button>
          </div>
        </div>
      </div>

      <div className="session__plan">
        {steps.map((s, i) => (
          <span
            key={i}
            className={'chip ' + (i < idx ? 'chip--done' : i === idx ? 'chip--active' : '')}
            title={LABEL[s.t]}
          >
            {EMOJI[s.t]}
          </span>
        ))}
      </div>
    </div>
  )
}
