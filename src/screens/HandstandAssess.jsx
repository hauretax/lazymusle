import { useState } from 'react'
import { AXES, levels } from '../data/handstandProgram'

// Au niveau « L'équilibre », demander « combien de temps tu tiens » ne sert à rien :
// la réponse est souvent 0 s et elle ne dit pas quoi travailler. On situe la personne
// sur deux axes indépendants — monter, et rattraper — et la séance en découle.
export default function HandstandAssess({ initial, onValidate, onCancel }) {
  const [picked, setPicked] = useState(initial ?? {})
  const level = levels.find((l) => l.mode === 'axes')
  const complete = AXES.every((a) => picked[a.id])

  return (
    <div className="screen onboarding">
      <header className="topbar">
        <button className="iconbtn" onClick={onCancel} aria-label="Retour">←</button>
        <span className="topbar__title">{level.name}</span>
        <span />
      </header>

      <div className="onboarding__body">
        <h1 className="onboarding__q">Où en es-tu ?</h1>
        <p className="onboarding__sub">
          Deux choses différentes, qui avancent chacune à leur rythme : arriver en haut, et y rester.
          On peut savoir monter sans savoir se rattraper — et l’inverse.
        </p>

        {AXES.map((axis) => (
          <div key={axis.id} className="axis">
            <div className="axis__head">
              <span className="axis__emoji">{axis.emoji}</span>
              <div>
                <b>{axis.question}</b>
                <span>{axis.hint}</span>
              </div>
            </div>
            <ul className="axis__steps">
              {axis.steps.map((step, i) => {
                const on = picked[axis.id] === step.id
                return (
                  <li key={step.id}>
                    <button
                      className={'stepopt' + (on ? ' stepopt--on' : '')}
                      onClick={() => setPicked((p) => ({ ...p, [axis.id]: step.id }))}
                      aria-pressed={on}
                    >
                      <span className="stepopt__n">{i + 1}</span>
                      <span className="stepopt__text">
                        <span className="stepopt__label">{step.label}</span>
                        {on && <span className="stepopt__how">{step.how}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <button
        className="btn btn--primary btn--big"
        disabled={!complete}
        onClick={() => onValidate(picked)}
      >
        {complete ? 'Valider' : 'Réponds aux deux'}
      </button>
    </div>
  )
}
