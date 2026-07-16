import { useState } from 'react'
import { goals, hasProgram } from '../data/goals'

export default function Onboarding({ initial = [], onValidate, onCancel }) {
  const [picked, setPicked] = useState(initial)
  const toggle = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const nothingReady = picked.length > 0 && !picked.some(hasProgram)

  return (
    <div className="screen onboarding">
      <header className="topbar">
        {onCancel ? (
          <button className="iconbtn" onClick={onCancel} aria-label="Retour">←</button>
        ) : <span />}
        <span className="topbar__title">{onCancel ? 'Mes objectifs' : 'Bienvenue'}</span>
        <span />
      </header>

      <div className="onboarding__body">
        <h1 className="onboarding__q">Pourquoi es-tu là ?</h1>
        <p className="onboarding__sub">
          Choisis ce que tu veux travailler — plusieurs choix possibles. Tu pourras en changer quand tu veux.
        </p>

        <ul className="goals">
          {goals.map((g) => {
            const on = picked.includes(g.id)
            return (
              <li key={g.id}>
                <button
                  className={'goal' + (on ? ' goal--on' : '')}
                  onClick={() => toggle(g.id)}
                  aria-pressed={on}
                >
                  <span className="goal__emoji">{g.emoji}</span>
                  <span className="goal__text">
                    <span className="goal__label">
                      {g.label}
                      {!hasProgram(g.id) && <span className="goal__soon">bientôt</span>}
                    </span>
                    <span className="goal__tagline">{g.tagline}</span>
                  </span>
                  <span className="goal__check" aria-hidden="true">{on ? '✓' : ''}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {nothingReady && (
        <p className="onboarding__hint">
          Ces modules arrivent bientôt. Pour t’entraîner dès maintenant, ajoute les pompes.
        </p>
      )}

      <button
        className="btn btn--primary btn--big"
        disabled={picked.length === 0}
        onClick={() => onValidate(picked)}
      >
        {picked.length === 0 ? 'Choisis au moins un objectif' : 'C’est parti'}
      </button>
    </div>
  )
}
