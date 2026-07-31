import { useMemo } from 'react'
import { useApp } from '../store'
import { activitySummary, sortActivities, knownTypes, ACTIVITY_EMOJI } from '../lib/activities'
import { dayKey } from '../lib/dates'
import { formatWeather } from '../lib/weather'

const conditions = (a) => formatWeather(a?.weather) || null

// Ce que j'ai noté à la main (TICKETS.md T10) : la liste, du plus récent au plus
// ancien, groupée par jour. Taper une ligne la corrige.

// Référence stable : `?? []` en plein rendu recréerait un tableau à chaque fois,
// et les `useMemo` d'en dessous ne serviraient plus à rien.
const AUCUNE = []

function fmtDay(key, todayKey, yesterdayKey) {
  if (key === todayKey) return 'Aujourd’hui'
  if (key === yesterdayKey) return 'Hier'
  const [y, m, d] = key.split('-').map(Number)
  const txt = new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  return d === 1 ? txt.replace(' 1 ', ' 1er ') : txt
}

export default function Activities({ onBack, onAdd, onEdit }) {
  const { state } = useApp()
  const list = state.activities ?? AUCUNE
  const { todayKey, yesterdayKey } = useMemo(() => {
    const now = new Date()
    const hier = new Date(now)
    hier.setDate(hier.getDate() - 1)
    return { todayKey: dayKey(now), yesterdayKey: dayKey(hier) }
  }, [])

  // Groupées par jour, en gardant l'ordre « plus récent d'abord ».
  const days = useMemo(() => {
    const out = []
    for (const a of sortActivities(list)) {
      const key = dayKey(a?.date)
      if (!key) continue
      if (out[out.length - 1]?.key !== key) out.push({ key, items: [] })
      out[out.length - 1].items.push(a)
    }
    return out
  }, [list])

  const types = knownTypes(list)

  return (
    <div className="screen">
      <header className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <span className="topbar__title">Mes activités</span>
        <span />
      </header>

      <button className="btn btn--primary btn--big" onClick={onAdd}>➕ Noter une activité</button>

      {list.length === 0 ? (
        <div className="card card--intro">
          <div className="intro__emoji">{ACTIVITY_EMOJI}</div>
          <h2>Rien de noté</h2>
          <p>
            Ici tu notes ce que tu fais en dehors des programmes : une marche, une course, une sortie
            vélo. Avec sa date — donc tu peux remplir dimanche ce que tu as fait mercredi.
          </p>
        </div>
      ) : (
        <>
          <p className="progress__sub">
            {list.length} {list.length > 1 ? 'activités notées' : 'activité notée'}
            {types.length > 0 && <> · {types.length} {types.length > 1 ? 'types' : 'type'}</>}
          </p>

          {days.map((d) => (
            <section key={d.key} className="actday">
              <h3 className="progress__h">{fmtDay(d.key, todayKey, yesterdayKey)}</h3>
              <ul className="list">
                {d.items.map((a) => {
                  const resume = activitySummary(a)
                  return (
                    <li key={a.id}>
                      <button type="button" className="actrow" onClick={() => onEdit(a.id)}>
                        <span className="actrow__main">
                          <b>{a.type}</b>
                          {resume && <span className="actrow__meas">{resume}</span>}
                          {(a.time || a.place?.name || conditions(a)) && (
                            <span className="actrow__note">
                              {[a.time, a.place?.name && `📍 ${a.place.name}`, conditions(a)]
                                .filter(Boolean).join(' · ')}
                            </span>
                          )}
                          {a.note && <span className="actrow__note">{a.note}</span>}
                        </span>
                        <span className="actrow__go" aria-hidden="true">›</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
