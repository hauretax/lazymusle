import { Fragment, useEffect, useState } from 'react'
import { useApp, getNextStep, getHandstandStep, pushupsOf, handstandOf } from '../store'
import { GOAL, TOTAL_DAYS, getDay, sessionMinTotal, computeRest, parseSet } from '../data/pushupProgram'
import * as hs from '../data/handstandProgram'
import { PUSHUPS_GOAL, HANDSTAND_GOAL, getGoal, hasProgram } from '../data/goals'
import { orderForDay, sharedMuscleLabels } from '../lib/schedule'
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

export default function Home({ onStart, onStartHandstand, onRetestHandstand, onOpenProgress, onEditGoals }) {
  const { state } = useApp()
  const step = getNextStep(state)
  const hsStep = getHandstandStep(state)
  const pushups = pushupsOf(state)
  const handstand = handstandOf(state)
  const bestMax = pushups.maxHistory.reduce((m, x) => Math.max(m, x.reps), 0)
  const onPushups = state.goals.includes(PUSHUPS_GOAL)
  const onHandstand = state.goals.includes(HANDSTAND_GOAL)
  const firstRun = pushups.levelIndex == null
  const doneCount = pushups.sessions.length
  // Objectifs choisis dont le module n'existe pas encore (voir TICKETS.md).
  const soonGoals = state.goals.filter((id) => !hasProgram(id)).map(getGoal).filter(Boolean)

  // Deux exos actifs : c'est le moteur qui décide de l'ordre (le skill se travaille
  // frais, avant la force) et signale les muscles qu'ils partagent.
  const activeToday = orderForDay(state.goals.filter(hasProgram))
  const bothToday = activeToday.length > 1
  const shared = bothToday ? sharedMuscleLabels(activeToday[0], activeToday[1]) : []
  const handstandFirst = bothToday && activeToday[0] === HANDSTAND_GOAL

  const [notifStatus, setNotifStatus] = useState(canNotify() ? Notification.permission : 'unsupported')
  const [remindMsg, setRemindMsg] = useState('')

  // Notification "jour J" quand l'app est ouverte (une fois par séance due).
  useEffect(() => {
    if (pushups.levelIndex == null || pushups.finished || !pushups.nextDate) return
    if (!canNotify() || Notification.permission !== 'granted') return
    if (daysUntil(pushups.nextDate) > 0) return
    const key = 'reps-notified-' + startOfDay(pushups.nextDate).toISOString().slice(0, 10)
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      notify("C'est ton jour de pompes 💪", 'Ta séance t’attend dans Reps.')
    }
  }, [pushups.levelIndex, pushups.finished, pushups.nextDate])

  const enableNotifs = async () => {
    const p = await requestNotif()
    setNotifStatus(p)
    if (p === 'granted') notify('Rappels activés ✅', 'On te préviendra le jour J.')
  }

  const addToCalendar = () => {
    const n = exportSchedule(pushups)
    setRemindMsg(n ? `Planning exporté (${n} séances) — ouvre le fichier pour l’ajouter.` : '')
  }

  const handstandBlocks = onHandstand && (
    <>
      {hsStep.type === 'test-initial' && (() => {
        const lvl = hs.levels[handstand.levelIndex ?? 0]
        const promu = handstand.levelIndex > 0
        return (
          <div className="card card--intro">
            <div className="intro__emoji">🤸</div>
            <h2>{promu ? lvl.name : 'Tenir en handstand'}</h2>
            <p>
              {promu ? (
                <>Tu passes à l’<b>{lvl.exercise.toLowerCase()}</b> : c’est un autre exercice, ta tenue
                au mur ne compte plus. Mesure ta nouvelle tenue max.</>
              ) : (
                <>Pas de calendrier ici : <b>aucune source sérieuse n’en donne</b>. Ta <b>tenue max</b> au
                mur pilote tout — l’app en déduit des tenues à <b>60-70 %</b>, jamais jusqu’à l’échec.</>
              )}
            </p>
            <button className="btn btn--primary btn--big" onClick={onStartHandstand}>
              Mesurer ma tenue max
            </button>
          </div>
        )
      })()}

      {hsStep.type === 'done' && (
        <div className="card card--intro">
          <div className="intro__emoji">🏆</div>
          <h2>Handstand tenu !</h2>
          <p>Tu tiens <b>{handstand.maxHold} s</b> en équilibre libre. Respect. 🔥</p>
        </div>
      )}

      {hsStep.type === 'session' && (() => {
        const s = hs.getSession(hsStep.levelIndex, hsStep.maxHold)
        const level = hs.levels[hsStep.levelIndex]
        const du = daysUntil(handstand.nextDate)
        const ready = du <= 0
        return (
          <div className="card card--next">
            <span className="badge badge--skill">Technique</span>
            <h2>{level.name}</h2>
            <p className="card__sub">{s.exercise} · tenue max {hsStep.maxHold} s</p>
            <div className="card__meta">
              {s.mode === 'hold' ? (
                <>
                  <span>{s.sets} tenues</span>
                  <span>{s.hold}s chacune</span>
                  <span>pause {s.restSec}s</span>
                </>
              ) : (
                <>
                  <span>{s.attempts} essais</span>
                  <span>{s.attemptSec}s max</span>
                </>
              )}
            </div>
            <p className="card__rest-note card__rest-note--soft">
              Objectif du niveau : <b>{level.goal} s</b>. {level.goalNote}
            </p>
            {handstand.nextDate && !ready && (
              <p className="card__sub">Fait aujourd’hui — reviens demain, c’est une compétence.</p>
            )}
            <button className="btn btn--primary btn--big" onClick={onStartHandstand}>
              {ready ? 'Commencer' : 'Refaire une séance'}
            </button>
            <button className="link" onClick={onRetestHandstand}>⏱️ Retester ma tenue max</button>
          </div>
        )
      })()}
    </>
  )

  const pushupBlocks = onPushups && (
    <>
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

      {!firstRun && step.type === 'done' && onPushups && (
        <div className="card card--intro">
          <div className="intro__emoji">🏆</div>
          <h2>Objectif atteint !</h2>
          <p>Meilleur max : <b>{bestMax} pompes</b>. Tu as bouclé les 3 niveaux. Respect. 🔥</p>
          <button className="btn btn--ghost" onClick={onOpenProgress}>Voir ma progression</button>
        </div>
      )}

      {!firstRun && step.type === 'session' && (() => {
        const day = getDay(step.levelIndex, step.dayIndex)
        const du = daysUntil(pushups.nextDate)
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

            {pushups.nextDate && !ready && (
              <p className="card__rest-note">
                Repos conseillé. Prochaine séance {du === 1 ? 'demain' : `dans ${du} jours`} ({fmtDay(pushups.nextDate)}). Tu peux quand même y aller 👊
              </p>
            )}

            <button className="btn btn--primary btn--big" onClick={onStart}>
              {ready ? 'Commencer la séance' : 'Commencer quand même'}
            </button>
          </div>
        )
      })()}

      {onPushups && !firstRun && (
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

      {onPushups && !firstRun && step.type !== 'done' && (
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
    </>
  )

  // L'ordre des blocs vient du moteur, pas d'un choix codé ici (voir TICKETS.md T2).
  const blocks = { [HANDSTAND_GOAL]: handstandBlocks, [PUSHUPS_GOAL]: pushupBlocks }

  return (
    <div className="screen home">
      <header className="home__head">
        <div>
          <p className="home__hello">{onPushups ? 'Objectif 100 pompes' : 'Tes objectifs'}</p>
          <h1 className="home__brand">Reps</h1>
        </div>
        {onPushups && !firstRun && <ProgressRing done={doneCount} total={TOTAL_DAYS} />}
      </header>

      {step.type === 'no-program' && !onHandstand && (
        <div className="card card--intro">
          <div className="intro__emoji">🚧</div>
          <h2>Ça arrive</h2>
          <p>
            Les objectifs que tu as choisis ne sont pas encore développés — pour l’instant, seuls les
            programmes <b>pompes</b> et <b>handstand</b> sont prêts.
          </p>
          <button className="btn btn--primary btn--big" onClick={onEditGoals}>Changer mes objectifs</button>
        </div>
      )}

      {bothToday && shared.length > 0 && (
        <div className="order">
          <b>{handstandFirst ? 'Handstand puis pompes' : 'Pompes puis handstand'}</b>
          <span>
            Les deux tapent sur {shared.join(' et ').toLowerCase()}. La technique se travaille
            frais — avant que la force ne fatigue.
          </span>
        </div>
      )}

      {activeToday.map((id) => <Fragment key={id}>{blocks[id]}</Fragment>)}

      {soonGoals.length > 0 && (
        <div className="soon">
          <div className="soon__head"><span>Tes autres objectifs</span></div>
          <ul className="soon__list">
            {soonGoals.map((g) => (
              <li key={g.id} className="soon__row">
                <span className="soon__emoji">{g.emoji}</span>
                <span className="soon__text">
                  <b>{g.label}</b>
                  <span>{g.tagline}</span>
                </span>
                <span className="soon__badge">bientôt</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {onPushups && !firstRun && (
        <button className="link" onClick={onOpenProgress}>Voir ma progression →</button>
      )}

      <button className="link" onClick={onEditGoals}>🎯 Mes objectifs</button>

      <InstallButton />
    </div>
  )
}
