import { useState } from 'react'

// Auto-évaluation sur plusieurs axes indépendants. Sert le handstand comme le L-sit.
//
// Le principe, dans les deux cas : demander « combien de temps tu tiens » ne dit pas
// quoi travailler, et un débutant ne sait pas s'auto-chronométrer proprement. On
// demande où il en est, et la séance en découle.
export default function Assess({ title, intro, axes, initial, onValidate, onCancel }) {
  const [picked, setPicked] = useState(initial ?? {})
  const complete = axes.every((a) => picked[a.id])

  return (
    <div className="screen onboarding">
      <header className="topbar">
        <button className="iconbtn" onClick={onCancel} aria-label="Retour">←</button>
        <span className="topbar__title">{title}</span>
        <span />
      </header>

      <div className="onboarding__body">
        <h1 className="onboarding__q">Où en es-tu ?</h1>
        <p className="onboarding__sub">{intro}</p>

        {axes.map((axis) => (
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
