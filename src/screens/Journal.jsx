import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { journalByDay, monthGrid, monthSummary, shiftMonth, dayKey } from '../lib/journal'
import { getGoal, hasProgram } from '../data/goals'
import { DONE } from '../lib/progress'
import { ACTIVITY_ID } from '../lib/activities'
import { photosOfDay, photoCountByDay } from '../lib/photos'
import PhotoStrip from '../components/PhotoStrip'

// Le calendrier : ce qui a été fait chaque jour, tous modules confondus
// (TICKETS.md T9). Une case = un jour, un point = un exo. Point plein = fait,
// point creux = abandonné ou raté — la couleur dit QUOI, le remplissage dit
// COMMENT.
const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const STATUS_LABEL = { tried: 'test raté', abandoned: 'abandon' }

function fmtMonth(year, month) {
  return new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function fmtDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  const txt = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  return d === 1 ? txt.replace(' 1 ', ' 1er ') : txt // « jeudi 1er juillet », pas « jeudi 1 juillet »
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function Journal({ onBack }) {
  const { state, addPhoto, removePhoto } = useApp()
  const byDay = useMemo(() => journalByDay(state), [state])
  const photosByDay = useMemo(() => photoCountByDay(state.photos), [state.photos])
  const today = useMemo(() => new Date(), [])
  const todayKey = dayKey(today)
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }))
  const [selected, setSelected] = useState(todayKey)

  const cells = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor])
  const summary = monthSummary(byDay, cells)
  const dayList = byDay.get(selected) ?? []
  const dayPhotos = useMemo(() => photosOfDay(state.photos, selected), [state.photos, selected])
  // Rien à voir dans le futur : le mois suivant s'arrête à celui du jour.
  const canForward = cursor.year < today.getFullYear()
    || (cursor.year === today.getFullYear() && cursor.month < today.getMonth())
  const legendGoals = (state.goals ?? []).filter(hasProgram).map(getGoal).filter(Boolean)
  const hasActivities = (state.activities ?? []).length > 0

  // Changer de mois emmène le détail avec soi : garder « 20 juillet » ouvert sous
  // la grille de juin ne veut rien dire.
  const goMonth = (delta) => {
    const next = shiftMonth(cursor, delta)
    const isCurrent = next.year === today.getFullYear() && next.month === today.getMonth()
    setCursor(next)
    setSelected(isCurrent ? todayKey : dayKey(new Date(next.year, next.month, 1)))
  }

  return (
    <div className="screen journal">
      <header className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <span className="topbar__title">Mon calendrier</span>
        <span />
      </header>

      <div className="cal">
        <div className="cal__nav">
          <button className="iconbtn" onClick={() => goMonth(-1)} aria-label="Mois précédent">‹</button>
          <b className="cal__month">{fmtMonth(cursor.year, cursor.month)}</b>
          <button
            className="iconbtn"
            onClick={() => goMonth(1)}
            disabled={!canForward}
            aria-label="Mois suivant"
          >
            ›
          </button>
        </div>

        <div className="cal__wd">
          {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
        </div>

        <div className="cal__grid">
          {cells.map((c) => {
            const list = byDay.get(c.key) ?? []
            const cls = [
              'cal__day',
              !c.inMonth && 'cal__day--out',
              c.key === todayKey && 'cal__day--today',
              c.key === selected && 'cal__day--sel',
            ].filter(Boolean).join(' ')
            return (
              <button
                key={c.key}
                type="button"
                className={cls}
                aria-pressed={c.key === selected}
                aria-label={`${fmtDay(c.key)} — ${list.length ? list.map((e) => e.title).join(', ') : 'rien'}${photosByDay.has(c.key) ? `, ${photosByDay.get(c.key)} photo(s)` : ''}`}
                onClick={() => setSelected(c.key)}
              >
                <span className="cal__num">{c.number}</span>
                {photosByDay.has(c.key) && <i className="cal__pic" aria-hidden="true">📷</i>}
                <span className="cal__dots">
                  {list.slice(0, 4).map((e, i) => (
                    <i
                      key={i}
                      className={`cal__dot cal__dot--${e.goalId}${e.status === DONE ? '' : ' cal__dot--partial'}`}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <ul className="legend">
        {legendGoals.map((g) => (
          <li key={g.id} className="legend__item"><i className={`cal__dot cal__dot--${g.id}`} /> {g.short}</li>
        ))}
        {hasActivities && (
          <li className="legend__item"><i className={`cal__dot cal__dot--${ACTIVITY_ID}`} /> Activités</li>
        )}
        <li className="legend__item"><i className="cal__dot cal__dot--partial" /> abandon / test raté</li>
      </ul>

      <p className="progress__sub">
        {summary.days > 0
          ? <>{summary.days} {summary.days > 1 ? 'jours' : 'jour'} d’entraînement ce mois-ci · {summary.entries} {summary.entries > 1 ? 'séances' : 'séance'}</>
          : <>Rien ce mois-ci.</>}
      </p>

      <h3 className="progress__h">{fmtDay(selected)}</h3>

      {/* La pellicule du jour sélectionné : on photographie le jour qu'on
          regarde, pas forcément aujourd'hui. */}
      <PhotoStrip
        photos={dayPhotos}
        onAdd={(file) => addPhoto(file, { day: selected })}
        onRemove={removePhoto}
        addLabel={`Ajouter une photo au ${fmtDay(selected)}`}
      />

      {dayList.length === 0 ? (
        <p className="cal__empty">
          {selected === todayKey ? 'Rien aujourd’hui — pour l’instant 😉' : 'Rien ce jour-là.'}
        </p>
      ) : (
        <ul className="list">
          {dayList.map((e, i) => (
            <li key={i} className="list__row">
              <span>
                <span className="list__emoji">{e.emoji ?? getGoal(e.goalId)?.emoji}</span> {e.title}
                {STATUS_LABEL[e.status] && <em className="list__tag">{STATUS_LABEL[e.status]}</em>}
              </span>
              <span className="list__date">{fmtTime(e.date)}</span>
              <b>{e.detail}</b>
              {(e.place || e.weather) && (
                <em className="list__note">
                  {e.place && <>📍 {e.place}</>}
                  {e.place && e.weather && ' · '}
                  {e.weather}
                </em>
              )}
              {e.note && <em className="list__note">{e.note}</em>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
