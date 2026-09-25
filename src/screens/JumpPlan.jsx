import { useState } from 'react'
import { useApp, jumpOf } from '../store'
import * as jump from '../data/jumpProgram'
import { indexStatuses, countIndexDone, DONE, ABANDONED } from '../lib/progress'
import PlanGrid, { PlanLegend } from '../components/PlanGrid'

// Les 36 séances d'Air Alert II, et le droit d'en choisir une — comme les pompes
// et la course (TICKETS.md T7). L'état d'une case vient de l'historique.
export default function JumpPlan({ onBack, onPick }) {
  const { state } = useApp()
  const j = jumpOf(state)
  const statuses = indexStatuses(j.sessions)
  const [selected, setSelected] = useState(() => String(j.index ?? 0))

  const groups = jump.WEEKS.map((_, wi) => ({
    id: `w${wi + 1}`,
    name: `Semaine ${wi + 1}`,
    meta: `${jump.PER_WEEK} séances`,
    cells: Array.from({ length: jump.PER_WEEK }, (_, k) => {
      const index = wi * jump.PER_WEEK + k
      const st = statuses.get(index)
      return {
        key: String(index),
        label: k + 1,
        done: st === DONE,
        abandoned: st === ABANDONED,
        current: !j.finished && j.index === index,
        aria: `Semaine ${wi + 1}, séance ${k + 1}${st === DONE ? ', validée' : ''}`,
      }
    }),
  }))

  const index = Number(selected)
  const w = jump.getWorkout(index, { reduced: j.reduced })
  const isDone = statuses.get(index) === DONE

  return (
    <div className="screen plan">
      <header className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <span className="topbar__title">Le programme</span>
        <span />
      </header>

      <p className="plan__sub">
        <b>{countIndexDone(j.sessions)}</b> / {jump.TOTAL_WORKOUTS} séances validées · touche une case
        pour choisir celle que tu veux faire.
      </p>

      <PlanGrid groups={groups} selected={selected} onSelect={setSelected} />
      <PlanLegend abandoned={[...statuses.values()].includes(ABANDONED)} />

      {w && (
        <div className="card card--next plan__pick">
          <span className="badge">Détente</span>
          <h2>Semaine {w.weekNumber} · Séance {w.sessionNumber}</h2>
          <div className="card__chips">
            {w.exercises.map((e) => <span key={e.id} className="chip">{e.name} {e.sets}×{e.reps}</span>)}
          </div>
          <div className="card__meta"><span>{w.totalReps} reps en tout</span></div>
          {isDone && (
            <p className="card__rest-note card__rest-note--soft">
              Déjà validée. La refaire ne l’enlève pas de ton historique.
            </p>
          )}
          <button className="btn btn--primary btn--big" onClick={() => onPick(index)}>
            {isDone ? 'Refaire cette séance' : 'Faire cette séance'}
          </button>
        </div>
      )}
    </div>
  )
}
