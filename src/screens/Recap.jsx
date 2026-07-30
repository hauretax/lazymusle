import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { recap, presetRange } from '../lib/recap'
import { formatDuration, formatMeasure, ACTIVITY_EMOJI } from '../lib/activities'
import { measures as MEASURES } from '../data/measures'
import { getGoal, PUSHUPS_GOAL, HANDSTAND_GOAL, LSIT_GOAL, RUN_GOAL } from '../data/goals'
import { dayKey } from '../lib/dates'
import { photosBetween } from '../lib/photos'
import PhotoStrip from '../components/PhotoStrip'

// Le bilan d'une période (TICKETS.md T11) : deux dates, et ce qu'il y a eu
// entre les deux. Lecture seule — tout vient de `lib/recap`.

const PRESETS = [
  { id: '7', label: '7 jours' },
  { id: '30', label: '30 jours' },
  { id: 'month', label: 'Ce mois' },
  { id: 'all', label: 'Tout' },
]

const MEASURE_ORDER = MEASURES.map((m) => m.id)

function fmtDay(key) {
  const [y, m, d] = key.split('-').map(Number)
  const txt = new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  return d === 1 ? txt.replace(' 1 ', ' 1er ') : txt
}

// Les programmes comptent en secondes, la saisie libre en minutes. On ne montre
// pas « 0 min » pour 40 secondes de tenue.
function fmtSeconds(sec) {
  if (!sec) return null
  return sec < 60 ? `${Math.round(sec)} s` : formatDuration(Math.round(sec / 60))
}

function plural(n, un, plusieurs) {
  return `${n} ${n > 1 ? plusieurs : un}`
}

// Ce qu'on dit d'un module sur la période. Chacun mesure autre chose : des
// pompes, des secondes tenues, du temps couru.
function programDetail(p) {
  switch (p.goalId) {
    case PUSHUPS_GOAL:
      return p.reps > 0 ? plural(p.reps, 'pompe', 'pompes') : null
    case HANDSTAND_GOAL:
    case LSIT_GOAL:
      return p.seconds > 0 ? `${fmtSeconds(p.seconds)} tenus` : null
    case RUN_GOAL:
      return p.seconds > 0 ? `${fmtSeconds(p.seconds)} courues` : null
    default:
      return null
  }
}

function programAside(p) {
  const bits = []
  if (p.abandoned > 0) bits.push(plural(p.abandoned, 'abandon', 'abandons'))
  if (p.tried > 0) bits.push(p.tried > 1 ? `${p.tried} tests ratés` : '1 test raté')
  return bits.join(' · ')
}

export default function Recap({ onBack }) {
  const { state, removePhoto } = useApp()
  const today = useMemo(() => dayKey(new Date()), [])
  const [range, setRange] = useState(() => presetRange('30', state))
  const [preset, setPreset] = useState('30')

  const bilan = useMemo(() => recap(state, range.from, range.to), [state, range])
  // Les photos de la période. Pas de bouton d'ajout ici : un récap se lit, il
  // ne se remplit pas — on ajoute depuis le calendrier ou depuis l'activité.
  const pellicule = useMemo(
    () => photosBetween(state.photos, range.from, range.to),
    [state.photos, range],
  )

  const applyPreset = (id) => {
    setPreset(id)
    setRange(presetRange(id, state))
  }

  // Bouger une date à la main sort forcément d'un raccourci : on décoche.
  const setBound = (which, value) => {
    if (!value) return
    setPreset(null)
    setRange((r) => ({ ...r, [which]: value }))
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <span className="topbar__title">Où j’en suis</span>
        <span />
      </header>

      <div className="chips">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`chip${preset === p.id ? ' chip--on' : ''}`}
            aria-pressed={preset === p.id}
            onClick={() => applyPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="range">
        <label className="field">
          <span className="field__label">Du</span>
          <input
            className="field__input"
            type="date"
            value={range.from}
            max={today}
            onChange={(e) => setBound('from', e.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Au</span>
          <input
            className="field__input"
            type="date"
            value={range.to}
            max={today}
            onChange={(e) => setBound('to', e.target.value)}
          />
        </label>
      </div>

      {!bilan ? (
        <p className="cal__empty">Choisis deux dates.</p>
      ) : (
        <>
          <p className="progress__sub">
            Du {fmtDay(bilan.from)} au {fmtDay(bilan.to)}
          </p>

          {pellicule.length > 0 && (
            <>
              <h3 className="progress__h">📷 {pellicule.length > 1 ? `${pellicule.length} photos` : '1 photo'}</h3>
              <PhotoStrip photos={pellicule} onRemove={removePhoto} />
            </>
          )}

          {bilan.entries === 0 && pellicule.length === 0 ? (
            <div className="card card--intro">
              <div className="intro__emoji">🗓️</div>
              <h2>Rien sur cette période</h2>
              <p>Élargis les dates, ou va noter ce que tu as fait.</p>
            </div>
          ) : (
            <>
              <div className="tally">
                <div className="tally__cell">
                  <b>{bilan.activeDays}</b>
                  <span>{bilan.activeDays > 1 ? 'jours actifs' : 'jour actif'} sur {bilan.spanDays}</span>
                </div>
                <div className="tally__cell">
                  <b>{bilan.entries}</b>
                  <span>{bilan.entries > 1 ? 'choses faites' : 'chose faite'}</span>
                </div>
                <div className="tally__cell">
                  <b>{bilan.streak}</b>
                  <span>{bilan.streak > 1 ? 'jours d’affilée' : 'jour d’affilée'}</span>
                </div>
              </div>

              {bilan.activities.length > 0 && (
                <>
                  <h3 className="progress__h">{ACTIVITY_EMOJI} Ce que tu as noté</h3>
                  <ul className="list">
                    {bilan.activities.map((a) => {
                      const totaux = MEASURE_ORDER
                        .filter((id) => a.measures[id] != null)
                        .map((id) => formatMeasure(id, a.measures[id]))
                        .filter(Boolean)
                      return (
                        <li key={a.key} className="list__row">
                          <span>{a.type}</span>
                          <span className="list__date">{plural(a.count, 'fois', 'fois')}</span>
                          <b>{totaux.join(' · ')}</b>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}

              {bilan.programs.length > 0 && (
                <>
                  <h3 className="progress__h">🎯 Tes programmes</h3>
                  <ul className="list">
                    {bilan.programs.map((p) => {
                      const goal = getGoal(p.goalId)
                      const aside = programAside(p)
                      return (
                        <li key={p.goalId} className="list__row">
                          <span>
                            <span className="list__emoji">{goal?.emoji}</span> {goal?.short ?? p.goalId}
                            {aside && <em className="list__tag">{aside}</em>}
                          </span>
                          <span className="list__date">{plural(p.done, 'séance', 'séances')}</span>
                          <b>{programDetail(p)}</b>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
