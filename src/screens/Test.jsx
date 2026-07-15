import { useState } from 'react'
import { levels, pickLevelIndex } from '../data/pushupProgram'

export default function Test({ onValidate, onCancel }) {
  const [reps, setReps] = useState(10)
  const level = levels[pickLevelIndex(reps)]

  return (
    <div className="screen test">
      <header className="topbar">
        {onCancel ? (
          <button className="iconbtn" onClick={onCancel} aria-label="Retour">←</button>
        ) : <span />}
        <span className="topbar__title">Test initial</span>
        <span />
      </header>

      <div className="test__body">
        <div className="test__icon">🎯</div>
        <p className="test__prompt">
          Fais un maximum de pompes en bonne forme, sans tricher. Compte-les : ça détermine ton niveau de départ.
        </p>

        <div className="stepper">
          <button className="stepper__btn" onClick={() => setReps((r) => Math.max(0, r - 1))}>−</button>
          <div className="stepper__value">{reps}</div>
          <button className="stepper__btn" onClick={() => setReps((r) => r + 1)}>+</button>
        </div>
        <p className="test__unit">pompes d’affilée</p>

        <div className="test__level">
          Tu commenceras au <b>{level.name}</b>
        </div>

        <button className="btn btn--primary btn--big" onClick={() => onValidate(reps)}>
          Valider
        </button>
      </div>
    </div>
  )
}
