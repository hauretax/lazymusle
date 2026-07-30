import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { measures as MEASURES, getMeasure } from '../data/measures'
import {
  suggestTypes, measuresForType, activityError, normalizeType, MAX_NOTE_LENGTH, MAX_TYPE_LENGTH,
} from '../lib/activities'
import { dayKey } from '../lib/dates'

// Noter une activité à la main (TICKETS.md T10). Le même écran sert à créer et à
// corriger : c'est le même geste, et une faute de frappe ne doit pas rester à vie.
//
// Deux partis pris visibles ici :
// - le type se TAPE, l'app propose ce qu'on a déjà noté. Elle ne peut pas
//   connaître à l'avance tout ce que quelqu'un fait de son corps.
// - les mesures sont toutes optionnelles, et celles qu'on voit sont celles
//   qu'on remplit d'habitude pour ce type-là.

function splitDuration(min) {
  if (!min) return { h: '', m: '' }
  const total = Math.round(min)
  return { h: total >= 60 ? String(Math.floor(total / 60)) : '', m: String(total % 60) }
}

// Union en gardant l'ordre des données, jamais l'ordre de frappe.
function orderedUnion(...lists) {
  const wanted = new Set(lists.flat())
  return MEASURES.map((m) => m.id).filter((id) => wanted.has(id))
}

export default function ActivityForm({ activity, onDone, onCancel }) {
  const { state, addActivity, updateActivity, removeActivity } = useApp()
  const list = state.activities ?? []
  const editing = Boolean(activity)
  const todayKey = useMemo(() => dayKey(new Date()), [])

  const [type, setType] = useState(activity?.type ?? '')
  const [day, setDay] = useState(activity ? dayKey(activity.date) : todayKey)
  const [note, setNote] = useState(activity?.note ?? '')
  const [dur, setDur] = useState(() => splitDuration(activity?.measures?.duration))
  const [values, setValues] = useState(() => {
    const out = {}
    for (const [id, v] of Object.entries(activity?.measures ?? {})) {
      // Point et pas virgule : `<input type="number">` refuse « 22,4 » et
      // afficherait un champ VIDE en modification. La virgule française est une
      // affaire d'affichage (`formatMeasure`), pas de saisie — la frappe reste
      // libre, `cleanMeasures` accepte les deux.
      if (id !== 'duration') out[id] = String(v)
    }
    return out
  })
  const [active, setActive] = useState(() => (
    activity
      ? orderedUnion(Object.keys(activity.measures ?? {}))
      : orderedUnion(measuresForType(list, ''))
  ))
  const [confirmDelete, setConfirmDelete] = useState(false)

  const suggestions = suggestTypes(list, type)
  const spare = MEASURES.filter((m) => !active.includes(m.id))

  // Ce qu'on remplit d'habitude pour ce type. On AJOUTE, on n'enlève jamais :
  // une mesure déjà saisie ne doit pas disparaître sous les doigts.
  const learnMeasures = (nextType) => {
    if (editing) return
    setActive((prev) => orderedUnion(measuresForType(list, nextType), prev.filter((id) => (
      id === 'duration' ? dur.h || dur.m : values[id]
    ))))
  }

  const pickSuggestion = (s) => {
    setType(s)
    learnMeasures(s)
  }

  const buildDraft = () => {
    const min = (Number(dur.h || 0) * 60) + Number(dur.m || 0)
    const m = {}
    for (const id of active) {
      if (id === 'duration') {
        if (min > 0) m.duration = min
      } else if (values[id]) {
        m[id] = values[id]
      }
    }
    return { type, day, note, measures: m }
  }

  const draft = buildDraft()
  const error = activityError(draft, new Date())
  // Tant qu'on n'a rien tapé, on ne crie pas « il manque le nom » : c'est un
  // formulaire vide, pas une erreur.
  const showError = error && normalizeType(type) !== ''

  const save = () => {
    if (error) return
    if (editing) updateActivity(activity.id, draft)
    else addActivity(draft)
    onDone()
  }

  return (
    <div className="screen act">
      <header className="topbar">
        <button className="iconbtn" onClick={onCancel} aria-label="Retour">←</button>
        <span className="topbar__title">{editing ? 'Modifier' : 'Noter une activité'}</span>
        <span />
      </header>

      <label className="field">
        <span className="field__label">Qu’est-ce que tu as fait ?</span>
        <input
          className="field__input"
          type="text"
          value={type}
          maxLength={MAX_TYPE_LENGTH}
          placeholder="Marche, course, vélo…"
          autoComplete="off"
          onChange={(e) => setType(e.target.value)}
          onBlur={() => learnMeasures(type)}
        />
      </label>

      {suggestions.length > 0 && (
        <div className="chips" role="list" aria-label="Activités déjà notées">
          {suggestions.map((s) => (
            <button key={s} type="button" className="chip" role="listitem" onClick={() => pickSuggestion(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <label className="field">
        <span className="field__label">Quand ?</span>
        <input
          className="field__input"
          type="date"
          value={day}
          max={todayKey}
          onChange={(e) => setDay(e.target.value)}
        />
      </label>

      <div className="chips">
        <button type="button" className={`chip${day === todayKey ? ' chip--on' : ''}`} onClick={() => setDay(todayKey)}>
          Aujourd’hui
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => {
            const d = new Date()
            d.setDate(d.getDate() - 1)
            setDay(dayKey(d))
          }}
        >
          Hier
        </button>
      </div>

      <h3 className="act__h">Ce que tu veux noter</h3>
      <div className="meas">
        {active.map((id) => {
          const spec = getMeasure(id)
          if (!spec) return null
          return (
            <div key={id} className="meas__row">
              <span className="meas__label">{spec.label}</span>
              {spec.kind === 'duration' ? (
                <span className="meas__dur">
                  <input
                    className="field__input meas__input"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="24"
                    value={dur.h}
                    placeholder="0"
                    aria-label="Heures"
                    onChange={(e) => setDur((d) => ({ ...d, h: e.target.value }))}
                  />
                  <em className="meas__unit">h</em>
                  <input
                    className="field__input meas__input"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="59"
                    value={dur.m}
                    placeholder="0"
                    aria-label="Minutes"
                    onChange={(e) => setDur((d) => ({ ...d, m: e.target.value }))}
                  />
                  <em className="meas__unit">min</em>
                </span>
              ) : (
                <span className="meas__dur">
                  <input
                    className="field__input meas__input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step={spec.step}
                    max={spec.max}
                    value={values[id] ?? ''}
                    placeholder="0"
                    aria-label={spec.label}
                    onChange={(e) => setValues((v) => ({ ...v, [id]: e.target.value }))}
                  />
                  <em className="meas__unit">{spec.unit}</em>
                </span>
              )}
              <button
                type="button"
                className="meas__drop"
                aria-label={`Retirer ${spec.label}`}
                onClick={() => setActive((prev) => prev.filter((x) => x !== id))}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>

      {spare.length > 0 && (
        <label className="field">
          <span className="field__label">+ Ajouter une mesure</span>
          <select
            className="field__input"
            value=""
            onChange={(e) => {
              if (!e.target.value) return
              setActive((prev) => orderedUnion(prev, [e.target.value]))
            }}
          >
            <option value="">Choisir…</option>
            {spare.map((m) => (
              <option key={m.id} value={m.id}>{m.label}{m.unit ? ` (${m.unit})` : ''}</option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span className="field__label">Un mot ? (facultatif)</span>
        <textarea
          className="field__input field__area"
          rows={3}
          maxLength={MAX_NOTE_LENGTH}
          value={note}
          placeholder="Sous la pluie, mais content."
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {showError && <p className="act__err">{error}</p>}

      <button className="btn btn--primary btn--big" disabled={Boolean(error)} onClick={save}>
        {editing ? 'Enregistrer' : 'Noter'}
      </button>

      {editing && (confirmDelete ? (
        <div className="act__danger">
          <p>Supprimer cette activité ? C’est définitif.</p>
          <div className="act__danger-row">
            <button className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>Annuler</button>
            <button
              className="btn btn--danger"
              onClick={() => {
                removeActivity(activity.id)
                onDone()
              }}
            >
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <button className="link link--danger" onClick={() => setConfirmDelete(true)}>Supprimer cette activité</button>
      ))}
    </div>
  )
}
