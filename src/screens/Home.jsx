import { useEffect, useState } from 'react'
import { useApp, getNextStep } from '../store'
import { GOAL, TOTAL_DAYS, getDay, sessionMinTotal, computeRest, parseSet } from '../data/pushupProgram'
import { canNotify, requestNotif, notify, exportSchedule } from '../lib/reminders'
import InstallButton from '../components/InstallButton'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function daysUntil(iso) {
  if (!iso) return 0
  return Math.round((startOfDay(iso) - startOfDay(new Date())) / 86400000)
}
function fmtDay(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function ProgressRing({ done, total }) {
  const R = 34
  const C = 2 * Math.PI * R
  const pct = total ? done / total : 0
  return (
    <div className="mini-ring">
      <svg viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={R} className="mini-ring__track" />
        <circle cx="40" cy="40" r={R} className="mini-ring__prog"
          style={{ strokeDasharray: C, strokeDashoffset: C * (1 - pct) }} />
      </svg>
      <div className="mini-ring__label"><b>{done}</b><span>/{total}</span></div>
    </div>
  )
}

export default function Home({ onStart, onOpenProgress }) {
  const { state } = useApp()
  const step = getNextStep(state)
  const bestMax = state.maxHistory.reduce((m, x) => Math.max(m, x.reps), 0)
  const firstRun = state.levelIndex == null
  const doneCount = state.sessions.length

  const [notifStatus, setNotifStatus] = useState(canNotify() ? Notification.permission : 'unsupported')
  const [remindMsg, setRemindMsg] = useState('')

  // Notification "jour J" quand l'app est ouverte (une fois par séance due).
  useEffect(() => {
    if (state.levelIndex == null || state.finished || !state.nextDate) return
    if (!canNotify() || Notification.permission !== 'granted') return
    if (daysUntil(state.nextDate) > 0) return
    const key = 'reps-notified-' + startOfDay(state.nextDate).toISOString().slice(0, 10)
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      notify("C'est ton jour de pompes 💪", 'Ta séance t’attend dans Reps.')
    }
  }, [state.levelIndex, state.finished, state.nextDate])

  const enableNotifs = async () => {
    const p = await requestNotif()
    setNotifStatus(p)
    if (p === 'granted') notify('Rappels activés ✅', 'On te préviendra le jour J.')
  }

  const addToCalendar = () => {
    const n = exportSchedule(state)
    setRemindMsg(n ? `Planning exporté (${n} séances) — ouvre le fichier pour l’ajouter.` : '')
  }

  return (
    <div className="screen home">
      <header className="home__head">
        <div>
          <p className="home__hello">Objectif 100 pompes</p>
          <h1 className="home__brand">Reps</h1>
        </div>
        {!firstRun && <ProgressRing done={doneCount} total={TOTAL_DAYS} />}
      </header>

      {firstRun && (
        <div className="card card--intro">
          <div className="intro__emoji">💪</div>
          <h2>100 pompes d’affilée</h2>
          <p>
            Le système <b>Push Up Pro</b> : un <b>test</b> te place sur l’un des <b>3 niveaux</b>,
            puis l’app te sert <b>une séance à la fois</b>. Les pauses s’<b>adaptent à l’effort</b> et
            elle te dit <b>quel jour</b> t’entraîner. Fin du Niveau 3 = 100 pompes. 🎯
          </p>
          <button className="btn btn--primary btn--big" onClick={onStart}>Faire le test initial</button>
        </div>
      )}

      {!firstRun && step.type === 'done' && (
        <div className="card card--intro">
          <div className="intro__emoji">🏆</div>
          <h2>Objectif atteint !</h2>
          <p>Meilleur max : <b>{bestMax} pompes</b>. Tu as bouclé les 3 niveaux. Respect. 🔥</p>
          <button className="btn btn--ghost" onClick={onOpenProgress}>Voir ma progression</button>
        </div>
      )}

      {!firstRun && step.type === 'session' && (() => {
        const day = getDay(step.levelIndex, step.dayIndex)
        const du = daysUntil(state.nextDate)
        const ready = du <= 0
        return (
          <div className="card card--next">
            <span className={'badge ' + (day.isTest ? 'badge--test' : '')}>
              {day.isTest ? 'Jour de test' : 'Prochaine séance'}
            </span>
            <h2>{day.isTest ? `${day.levelName} · Test` : `${day.levelName} · Jour ${day.dayNumber}`}</h2>

            {day.isTest ? (
              <p className="card__sub">Objectif : <b>{day.target} pompes d’affilée</b> pour valider le niveau.</p>
            ) : (
              <>
                <p className="card__sub">Jour {day.dayNumber}/{day.totalDays} · pauses adaptées à l’effort</p>
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

            {state.nextDate && !ready && (
              <p className="card__rest-note">
                Repos conseillé. Prochaine séance {du === 1 ? 'demain' : `dans ${du} jours`} ({fmtDay(state.nextDate)}). Tu peux quand même y aller 👊
              </p>
            )}

            <button className="btn btn--primary btn--big" onClick={onStart}>
              {ready ? 'Commencer la séance' : 'Commencer quand même'}
            </button>
          </div>
        )
      })()}

      {!firstRun && (
        <div className="goalbar">
          <div className="goalbar__head">
            <span>Meilleur max</span>
            <span><b>{bestMax}</b> / {GOAL}</span>
          </div>
          <div className="goalbar__track">
            <div className="goalbar__fill" style={{ width: `${Math.min(100, (bestMax / GOAL) * 100)}%` }} />
          </div>
        </div>
      )}

      {!firstRun && step.type !== 'done' && (
        <div className="reminder">
          <div className="reminder__head">
            <span>🔔 Rappels jour J</span>
          </div>
          <p className="reminder__sub">Un rappel le jour de chaque séance, même app fermée.</p>
          <div className="reminder__actions">
            <button className="btn btn--ghost" onClick={addToCalendar}>📅 Ajouter au calendrier</button>
            {canNotify() && notifStatus !== 'granted' && (
              <button className="btn btn--ghost" onClick={enableNotifs}>🔔 Activer les notifs</button>
            )}
            {notifStatus === 'granted' && <span className="reminder__ok">Notifs activées ✅</span>}
          </div>
          {remindMsg && <p className="reminder__msg">{remindMsg}</p>}
          <p className="reminder__note">Le calendrier (.ics) te rappelle nativement le jour J sur iPhone/Android. Les notifs Web s’affichent quand l’app est ouverte.</p>
        </div>
      )}

      {!firstRun && (
        <button className="link" onClick={onOpenProgress}>Voir ma progression →</button>
      )}

      <InstallButton />
    </div>
  )
}
