import { useState } from 'react'
import { verticalCm, isHeavy, HEAVY_KG } from '../data/jumpProgram'

// Test de détente : deux marques au mur, l'app fait la différence. Pas besoin
// de matériel — un mur, un doigt mouillé ou de la craie, un mètre.
export default function JumpTest({ first, weightKg, previous, onValidate, onCancel }) {
  const [stand, setStand] = useState('')
  const [jumpReach, setJumpReach] = useState('')
  const [weight, setWeight] = useState(weightKg ? String(weightKg) : '')
  const cm = verticalCm(stand, jumpReach)
  const kg = Number(weight) > 0 ? Number(weight) : null

  return (
    <div className="screen onboarding">
      <header className="topbar">
        <button className="iconbtn" onClick={onCancel} aria-label="Retour">←</button>
        <span className="topbar__title">Test de détente</span>
        <span />
      </header>

      <div className="onboarding__body">
        <h1 className="onboarding__q">{first ? 'Combien tu sautes ?' : 'On remesure'}</h1>
        <p className="onboarding__sub">
          De profil contre un mur, pieds à plat : marque le plus haut que tu touches bras tendu.
          Puis saute sans élan (un pas d’appel au plus) et marque le plus haut que tu touches.
          Mesure les deux hauteurs depuis le sol.
        </p>

        <label className="field">
          <span className="field__label">Bras tendu, pieds à plat (cm)</span>
          <input className="field__input" inputMode="numeric" value={stand} onChange={(e) => setStand(e.target.value)} placeholder="ex. 225" />
        </label>
        <label className="field">
          <span className="field__label">Au sommet du saut (cm)</span>
          <input className="field__input" inputMode="numeric" value={jumpReach} onChange={(e) => setJumpReach(e.target.value)} placeholder="ex. 275" />
        </label>

        <p className="onboarding__sub">
          {cm != null ? <>Détente : <b>{cm} cm</b>{previous != null && <> (avant : {previous} cm)</>}</> : 'La détente s’affiche dès que les deux hauteurs sont là.'}
        </p>

        <label className="field">
          <span className="field__label">Ton poids (kg, facultatif)</span>
          <input className="field__input" inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ex. 75" />
        </label>
        {isHeavy(kg) && (
          <p className="hs__note">
            Au-delà de {HEAVY_KG} kg, le NSCA conseille la prudence avec les sauts répétés : genoux et
            chevilles encaissent plus. L’app te proposera un volume réduit (tu pourras le retirer).
          </p>
        )}
      </div>

      <button
        className="btn btn--primary btn--big"
        disabled={cm == null}
        onClick={() => onValidate({ cm, standReach: Number(stand), jumpReach: Number(jumpReach), weightKg: kg })}
      >
        {cm == null ? 'Entre les deux hauteurs' : 'Enregistrer'}
      </button>
    </div>
  )
}
