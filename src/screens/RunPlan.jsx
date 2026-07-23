import { useState } from 'react'
import { useApp, runOf } from '../store'
import * as run from '../data/runProgram'
import { runDone, countRunDone } from '../lib/progress'
import PlanGrid, { PlanLegend } from '../components/PlanGrid'

// Les 27 séances du Couch-to-5K, et le droit d'en choisir une (TICKETS.md T7).
// Refaire une semaine est prescrit par Josh Clark ; sauter en avant, c'est le même
// geste dans l'autre sens — à toi de savoir où tu en es.
export default function RunPlan({ onBack, onPick }) {
  const { state } = useApp()
  const r = runOf(state)
  const done = runDone(r.sessions)
  const [selected, setSelected] = useState(() => String(r.index ?? 0))

  const groups = run.weeks.map((w, wi) => ({
    id: `w${w.week}`,
    name: `Semaine ${w.week}`,
    meta: `${w.workouts.length} séances`,
    cells: w.workouts.map((_, i) => {
      const index = run.indexOf(wi, i)
      return {
        key: String(index),
        label: i + 1,
        done: done.has(index),
        current: !r.finished && r.index === index,
        aria: `Semaine ${w.week}, séance ${i + 1}${done.has(index) ? ', validée' : ''}`,
      }
    }),
  }))

  const index = Number(selected)
  const w = run.getWorkout(index)

  return (
    <div className="screen plan">
      <header className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <span className="topbar__title">Le programme</span>
        <span />
      </header>

      <p className="plan__sub">
        <b>{countRunDone(r.sessions)}</b> / {run.TOTAL_WORKOUTS} séances validées · touche une case
        pour choisir celle que tu veux faire.
      </p>

      <PlanGrid groups={groups} selected={selected} onSelect={setSelected} />
      <PlanLegend />

      {w && (
        <div className="card card--next plan__pick">
          <span className="badge badge--run">Endurance</span>
          <h2>Semaine {w.weekNumber} · Séance {w.workoutNumber}</h2>
          <p className="card__sub">{w.summary}</p>
          <div className="card__meta">
            <span>{Math.round(w.runSec / 60)} min courues</span>
            <span>{Math.round(w.totalSec / 60)} min en tout</span>
            <span>échauffement compris</span>
          </div>
          {w.note && <p className="card__rest-note card__rest-note--soft">{w.note}</p>}
          {done.has(index) && (
            <p className="card__rest-note card__rest-note--soft">
              Déjà validée. La refaire ne l’enlève pas de ton historique.
            </p>
          )}

          <button className="btn btn--primary btn--big" onClick={() => onPick(index)}>
            {done.has(index) ? 'Refaire cette séance' : 'Faire cette séance'}
          </button>
        </div>
      )}
    </div>
  )
}
