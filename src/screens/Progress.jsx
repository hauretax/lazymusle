import { useApp, pushupsOf } from '../store'
import { levels, daysInLevel, TOTAL_DAYS } from '../data/pushupProgram'

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function Progress({ onBack }) {
  const { state, resetAll } = useApp()
  const pushups = pushupsOf(state)
  const bestMax = pushups.maxHistory.reduce((m, x) => Math.max(m, x.reps), 0)
  const totalPompes = pushups.sessions.reduce((a, s) => a + (s.total || 0), 0)

  // Un jour (L, D) est "fait" si le curseur est passé au-delà.
  const isDone = (L, D) =>
    pushups.finished || pushups.levelIndex > L || (pushups.levelIndex === L && pushups.dayIndex > D)
  const isCurrent = (L, D) =>
    !pushups.finished && pushups.levelIndex === L && pushups.dayIndex === D

  const confirmReset = () => {
    if (confirm('Réinitialiser toute ta progression ? Cette action est définitive.')) resetAll()
  }

  return (
    <div className="screen progress">
      <header className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <span className="topbar__title">Ma progression</span>
        <span />
      </header>

      <div className="progress__stats">
        <div className="stat stat--card"><span className="stat__num">{pushups.sessions.length}</span><span className="stat__lbl">séances</span></div>
        <div className="stat stat--card"><span className="stat__num">{bestMax}</span><span className="stat__lbl">meilleur max</span></div>
        <div className="stat stat--card"><span className="stat__num">{totalPompes}</span><span className="stat__lbl">pompes totales</span></div>
      </div>

      <h3 className="progress__h">Les 3 niveaux</h3>
      {levels.map((lv, L) => {
        const n = daysInLevel(L)
        return (
          <div key={lv.id} className="lvl">
            <div className="lvl__head">
              <span className="lvl__name">{lv.name}</span>
              <span className="lvl__meta">test {lv.test} · {n} jours</span>
            </div>
            <div className="lvl__cells">
              {Array.from({ length: n }, (_, D) => {
                const test = D === n - 1
                const done = isDone(L, D)
                const cur = isCurrent(L, D)
                return (
                  <span key={D} className={'cell' + (done ? ' cell--done' : '') + (cur ? ' cell--cur' : '') + (test ? ' cell--test' : '')}>
                    {done ? '✓' : test ? '★' : D + 1}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
      <p className="progress__sub">{pushups.sessions.length} / {TOTAL_DAYS} séances · rythme conseillé 3×/semaine</p>

      {pushups.maxHistory.length > 0 && (
        <>
          <h3 className="progress__h">Tests de max</h3>
          <ul className="list">
            {[...pushups.maxHistory].reverse().map((m, i) => (
              <li key={i} className="list__row">
                <span>{m.kind === 'initial' ? 'Test initial' : `Test Niveau ${m.level}`}</span>
                <span className="list__date">{fmtDate(m.date)}</span>
                <b>{m.reps} pompes</b>
              </li>
            ))}
          </ul>
        </>
      )}

      {pushups.sessions.length > 0 && (
        <>
          <h3 className="progress__h">Historique des séances</h3>
          <ul className="list">
            {[...pushups.sessions].reverse().slice(0, 30).map((s, i) => (
              <li key={i} className="list__row">
                <span>N{levels[s.levelIndex]?.id} · {s.isTest ? 'Test' : `J${s.dayIndex + 1}`}</span>
                <span className="list__date">{fmtDate(s.date)}</span>
                <b>{s.total} pompes</b>
              </li>
            ))}
          </ul>
        </>
      )}

      <button className="link link--danger" onClick={confirmReset}>Réinitialiser ma progression</button>
    </div>
  )
}
