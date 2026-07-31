import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store'
import { measures as MEASURES, getMeasure } from '../data/measures'
import { photosOfActivity, photoError } from '../lib/photos'
import PhotoStrip from '../components/PhotoStrip'
import { formatTime, isValidTime, weatherLabel, weatherEmoji, MIN_TEMPERATURE, MAX_TEMPERATURE } from '../lib/weather'
import { suggestPlaces, formatCoords, MAX_PLACE_LENGTH } from '../lib/places'
import { locate, describeCoords, fetchWeather, canLocate } from '../lib/weatherApi'
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

// Les photos choisies AVANT que l'activité existe : elles n'ont encore ni
// identifiant ni place en base, on les garde en mémoire et on les range à
// l'enregistrement. L'aperçu vient d'une URL d'objet, révoquée au démontage —
// sinon chaque photo écartée laisserait ses octets derrière elle.
function PendingStrip({ files, onPick, onDrop, error }) {
  const input = useRef(null)
  const [urls, setUrls] = useState([])

  useEffect(() => {
    const made = files.map((f) => URL.createObjectURL(f))
    setUrls(made)
    return () => made.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  return (
    <>
      <div className="strip">
        {files.map((f, i) => (
          <button
            key={`${f.name}-${i}`}
            type="button"
            className="photo__btn"
            onClick={() => onDrop(i)}
            aria-label={`Retirer ${f.name}`}
          >
            <span className="photo photo--pending">
              {urls[i] && <img src={urls[i]} alt="" />}
              <em>✕</em>
            </span>
          </button>
        ))}
        <button
          type="button"
          className="strip__add"
          onClick={() => input.current?.click()}
          aria-label="Ajouter une photo"
        >
          📷
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          onPick([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
      {error && <p className="act__err">{error}</p>}
      {files.length > 0 && (
        <p className="progress__sub">
          {files.length > 1 ? `${files.length} photos seront ajoutées` : '1 photo sera ajoutée'} en enregistrant.
        </p>
      )}
    </>
  )
}

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
  const { state, addActivity, updateActivity, removeActivity, addPhoto, removePhoto } = useApp()
  const list = state.activities ?? []
  const editing = Boolean(activity)
  const todayKey = useMemo(() => dayKey(new Date()), [])
  const yesterdayKey = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return dayKey(d)
  }, [])

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
  const [pending, setPending] = useState([])
  const [photoErr, setPhotoErr] = useState(null)
  const [saving, setSaving] = useState(false)

  // --- Heure, lieu, conditions (TICKETS.md T14) ---
  // L'heure est proposée à MAINTENANT, pas laissée vide : dans l'immense
  // majorité des cas on note ce qu'on vient de faire.
  const [time, setTime] = useState(activity?.time ?? formatTime(new Date()))
  const [coords, setCoords] = useState(() => (
    activity?.place?.lat != null ? { lat: activity.place.lat, lon: activity.place.lon } : null
  ))
  const [placeName, setPlaceName] = useState(activity?.place?.name ?? '')
  const [temp, setTemp] = useState(activity?.weather?.temperature != null ? String(activity.weather.temperature) : '')
  const [humidity, setHumidity] = useState(activity?.weather?.humidity != null ? String(activity.weather.humidity) : '')
  const [weatherCode, setWeatherCode] = useState(activity?.weather?.code ?? null)
  const [indoor, setIndoor] = useState(Boolean(activity?.weather?.indoor))
  // Dès qu'on corrige un chiffre à la main, ce n'est plus un relevé automatique —
  // et il ne faut plus l'écraser en allant en rechercher un.
  const [weatherAuto, setWeatherAuto] = useState(activity?.weather?.source === 'auto')
  const [geoBusy, setGeoBusy] = useState(false)
  const [geoMsg, setGeoMsg] = useState(null)
  const [weatherBusy, setWeatherBusy] = useState(false)
  const [weatherMsg, setWeatherMsg] = useState(null)

  const autoWeather = state.settings?.autoWeather !== false
  const placeSuggestions = suggestPlaces(list, placeName)

  const attached = photosOfActivity(state.photos, activity?.id)

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
    return {
      type, day, note, measures: m,
      time: isValidTime(time) ? time : null,
      place: { name: placeName, lat: coords?.lat, lon: coords?.lon },
      weather: {
        temperature: temp,
        humidity,
        // Le code météo ne vaut que dehors, et que s'il vient du relevé.
        code: indoor || !weatherAuto ? null : weatherCode,
        indoor,
        source: weatherAuto ? 'auto' : 'manual',
      },
    }
  }

  const draft = buildDraft()
  const error = activityError(draft, new Date())
  // Tant qu'on n'a rien tapé, on ne crie pas « il manque le nom » : c'est un
  // formulaire vide, pas une erreur.
  const showError = error && normalizeType(type) !== ''

  // Va chercher la météo de ce point, ce jour-là, à cette heure-là. Un échec ne
  // bloque rien : le message le dit, et les champs restent saisissables.
  const majMeteo = async (point, quand) => {
    const at = point ?? coords
    if (!at || indoor) return
    setWeatherBusy(true)
    setWeatherMsg(null)
    const res = await fetchWeather(at.lat, at.lon, quand?.day ?? day, quand?.time ?? time)
    setWeatherBusy(false)
    if (!res.ok) {
      setWeatherMsg(res.error)
      return
    }
    setTemp(String(res.weather.temperature))
    setHumidity(res.weather.humidity != null ? String(res.weather.humidity) : '')
    setWeatherCode(res.weather.code)
    setWeatherAuto(true)
  }

  // « Ma position ». Elle ne part JAMAIS toute seule : il faut ce geste.
  const prendrePosition = async () => {
    setGeoBusy(true)
    setGeoMsg(null)
    const res = await locate()
    setGeoBusy(false)
    if (!res.ok) {
      setGeoMsg(res.error)
      return
    }
    const point = { lat: res.lat, lon: res.lon }
    setCoords(point)
    if (autoWeather) {
      // Le nom deviné ne fait qu'une proposition : il reste modifiable, et il
      // n'écrase pas un nom déjà écrit à la main.
      if (!placeName.trim()) {
        const nom = await describeCoords(point.lat, point.lon)
        if (nom) setPlaceName(nom)
      }
      majMeteo(point)
    }
  }

  const pickPlace = (p) => {
    setPlaceName(p.name)
    if (p.lat != null) {
      setCoords({ lat: p.lat, lon: p.lon })
      if (autoWeather && !indoor) majMeteo({ lat: p.lat, lon: p.lon })
    }
  }

  const toggleIndoor = () => {
    setIndoor((was) => {
      const next = !was
      // Dehors ne dit rien d'une salle : on jette le code météo et on rend la
      // main sur les chiffres.
      if (next) {
        setWeatherCode(null)
        setWeatherAuto(false)
        setWeatherMsg(null)
      }
      return next
    })
  }

  const pickPending = (files) => {
    const refus = files.map(photoError).find(Boolean)
    setPhotoErr(refus ?? null)
    setPending((prev) => [...prev, ...files.filter((f) => !photoError(f))])
  }

  const save = async () => {
    if (error || saving) return
    setSaving(true)
    if (editing) {
      updateActivity(activity.id, draft)
    } else {
      const id = addActivity(draft)
      // Les photos choisies avant l'enregistrement se rattachent maintenant :
      // l'activité a enfin un identifiant. Elles prennent SON jour, pas celui
      // du téléphone — une sortie d'hier notée aujourd'hui reste d'hier.
      for (const file of pending) {
        await addPhoto(file, { day: draft.day, activityId: id })
      }
    }
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

      {/* Les deux raccourcis s'allument tous les deux. « Hier » ne le faisait
          pas : il changeait bien la date, mais « Aujourd'hui » s'éteignait sans
          que rien ne le remplace — et le seul témoin restant était un chiffre
          dans le champ natif au-dessus. Ça se lisait comme un bouton mort. */}
      <div className="chips">
        <button
          type="button"
          className={`chip${day === todayKey ? ' chip--on' : ''}`}
          aria-pressed={day === todayKey}
          onClick={() => setDay(todayKey)}
        >
          Aujourd’hui
        </button>
        <button
          type="button"
          className={`chip${day === yesterdayKey ? ' chip--on' : ''}`}
          aria-pressed={day === yesterdayKey}
          onClick={() => setDay(yesterdayKey)}
        >
          Hier
        </button>
      </div>

      <label className="field">
        <span className="field__label">Vers quelle heure ?</span>
        <input
          className="field__input"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </label>

      <h3 className="act__h">Où ?</h3>
      <div className="place">
        <input
          className="field__input"
          type="text"
          value={placeName}
          maxLength={MAX_PLACE_LENGTH}
          placeholder="Bois de Vincennes, salle…"
          autoComplete="off"
          aria-label="Lieu"
          onChange={(e) => setPlaceName(e.target.value)}
        />
        {canLocate() && (
          <button
            type="button"
            className="btn btn--ghost place__gps"
            onClick={prendrePosition}
            disabled={geoBusy}
          >
            {geoBusy ? '…' : '📍 Ma position'}
          </button>
        )}
      </div>

      {placeSuggestions.length > 0 && (
        <div className="chips" role="list" aria-label="Lieux déjà notés">
          {placeSuggestions.map((p) => (
            <button key={p.key} type="button" className="chip" role="listitem" onClick={() => pickPlace(p)}>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {coords && <p className="progress__sub">📍 {formatCoords(coords)}</p>}
      {geoMsg && <p className="act__err">{geoMsg}</p>}

      <h3 className="act__h">Conditions</h3>
      <div className="meas">
        <div className="meas__row">
          <span className="meas__label">Température</span>
          <span className="meas__dur">
            <input
              className="field__input meas__input"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={MIN_TEMPERATURE}
              max={MAX_TEMPERATURE}
              value={temp}
              placeholder="—"
              aria-label="Température"
              onChange={(e) => {
                setTemp(e.target.value)
                setWeatherAuto(false) // corrigé à la main : ce n'est plus un relevé
              }}
            />
            <em className="meas__unit">°C</em>
          </span>
          <span />
        </div>
        <div className="meas__row">
          <span className="meas__label">Hygrométrie</span>
          <span className="meas__dur">
            <input
              className="field__input meas__input"
              type="number"
              inputMode="numeric"
              min="0"
              max="100"
              value={humidity}
              placeholder="—"
              aria-label="Hygrométrie"
              onChange={(e) => {
                setHumidity(e.target.value)
                setWeatherAuto(false)
              }}
            />
            <em className="meas__unit">%</em>
          </span>
          <span />
        </div>
      </div>

      <div className="chips">
        <button
          type="button"
          className={`chip${indoor ? ' chip--on' : ''}`}
          aria-pressed={indoor}
          onClick={toggleIndoor}
        >
          🏠 En intérieur
        </button>
        {/* Le bouton disparaît quand le réglage est coupé : sinon l'écran des
            réglages mentirait en annonçant « Reps est entièrement hors-ligne ».
            Le réglage veut dire « pas de réseau », pas « pas d'automatisme ». */}
        {autoWeather && !indoor && coords && (
          <button type="button" className="chip" onClick={() => majMeteo()} disabled={weatherBusy}>
            {weatherBusy ? '…' : '🌤️ Récupérer la météo'}
          </button>
        )}
      </div>

      {weatherAuto && weatherCode != null && !indoor && (
        <p className="progress__sub">
          {weatherEmoji(weatherCode)} {weatherLabel(weatherCode)} — relevé pour ce lieu à cette heure-là.
        </p>
      )}
      {indoor && (
        <p className="progress__sub">La météo dehors ne dit rien d’une séance en salle : à toi de saisir.</p>
      )}
      {!autoWeather && !indoor && (
        <p className="progress__sub">Météo automatique coupée dans les réglages — saisis à la main.</p>
      )}
      {weatherMsg && <p className="act__err">{weatherMsg}</p>}

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

      <h3 className="act__h">Photos</h3>
      {editing ? (
        <PhotoStrip
          photos={attached}
          onAdd={(file) => addPhoto(file, { day, activityId: activity.id })}
          onRemove={removePhoto}
          addLabel="Ajouter une photo à cette activité"
        />
      ) : (
        <PendingStrip
          files={pending}
          onPick={pickPending}
          onDrop={(i) => setPending((prev) => prev.filter((_, k) => k !== i))}
          error={photoErr}
        />
      )}

      {showError && <p className="act__err">{error}</p>}

      <button className="btn btn--primary btn--big" disabled={Boolean(error) || saving} onClick={save}>
        {saving ? 'Un instant…' : editing ? 'Enregistrer' : 'Noter'}
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
