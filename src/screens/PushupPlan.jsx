import { useState } from 'react'
import { useApp, pushupsOf } from '../store'
import {
  levels, daysInLevel, isTestDay, getDay, sessionMinTotal, computeRest, parseSet, TOTAL_DAYS,
} from '../data/pushupProgram'
import { pushupKey, pushupStatuses, countPushupDone, DONE, TRIED } from '../lib/progress'
import PlanGrid, { PlanLegend } from '../components/PlanGrid'

// Les 54 séances du programme pompes, et le droit d'en choisir une : refaire un jour,
// en sauter quand c'est trop simple, ou dire « en vrai, j'en suis là » (TICKETS.md T7).
export default function PushupPlan({ onBack, onPick }) {
  const { state } = useApp()
  const p = pushupsOf(state)
  const status = pushupStatuses(p.sessions)
  const [selected, setSelected] = useState(() => pushupKey(p.levelIndex ?? 0, p.dayIndex ?? 0))

  const groups = levels.map((lv, L) => ({
    id: lv.id,
    name: lv.name,
    meta: `test ${lv.test} · ${daysInLevel(L)} jours`,
    cells: Array.from({ length: daysInLevel(L) }, (_, D) => {
      const key = pushupKey(L, D)
      const st = status.get(key)
      const test = isTestDay(L, D)
      return {
        key,
        label: D + 1,
        isTest: test,
        done: st === DONE,
        tried: st === TRIED,
        current: !p.finished && p.levelIndex === L && p.dayIndex === D,
        aria: `${lv.name}, ${test ? 'test' : `jour ${D + 1}`}${st === DONE ? ', validée' : ''}`,
      }
    }),
  }))

  const [L, D] = selected.split(':').map(Number)
  const day = getDay(L, D)
  const st = status.get(selected)
  const jumps = p.levelIndex != null && L !== p.levelIndex

  return (
    <div className="screen plan">
      <header className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <span className="topbar__title">Le programme</span>
        <span />
      </header>

      <p className="plan__sub">
        <b>{countPushupDone(p.sessions)}</b> / {TOTAL_DAYS} séances validées · touche une case pour
        choisir celle que tu veux faire.
      </p>

      <PlanGrid groups={groups} selected={selected} onSelect={setSelected} />
      <PlanLegend tried />

      {day && (
        <div className="card card--next plan__pick">
          <span className={'badge ' + (day.isTest ? 'badge--test' : '')}>
            {day.isTest ? 'Jour de test' : 'Séance'}
          </span>
          <h2>{day.isTest ? `${day.levelName} · Test` : `${day.levelName} · Jour ${day.dayNumber}`}</h2>

          {day.isTest ? (
            <p className="card__sub">Objectif : <b>{day.target} pompes d’affilée</b> pour valider le niveau.</p>
          ) : (
            <>
              <div className="card__chips">
                {day.values.map((v, i) => <span key={i} className="chip">{v}</span>)}
              </div>
              <div className="card__meta">
                <span>{day.values.length} séries</span>
                <span>{sessionMinTotal(day.values)} pompes</span>
                <span>pause {computeRest(parseSet(day.values[0]).target)}s max</span>
              </div>
            </>
          )}

          {st === DONE && (
            <p className="card__rest-note card__rest-note--soft">
              Déjà validée. La refaire ne l’enlève pas de ton historique.
            </p>
          )}
          {st === TRIED && (
            <p className="card__rest-note">
              Test déjà tenté, pas réussi. Il se valide à <b>{day.target} pompes</b>.
            </p>
          )}
          {jumps && (
            <p className="card__rest-note">
              {L > p.levelIndex
                ? <>Tu sautes au <b>{day.levelName}</b> : le test du {levels[p.levelIndex].name} ne sera pas passé.</>
                : <>Tu reviens au <b>{day.levelName}</b>. Ce que tu as validé plus loin le reste.</>}
            </p>
          )}

          <button className="btn btn--primary btn--big" onClick={() => onPick(L, D)}>
            {st === DONE ? 'Refaire cette séance' : 'Faire cette séance'}
          </button>
        </div>
      )}
    </div>
  )
}
