import { useEffect, useRef, useState } from 'react'
import { TEST, levels, reachedGoal, isLastLevel } from '../data/handstandProgram'
import { primeAudio, tick, endOfRestSignal, vibrate } from '../lib/feedback'

const GET_UP_SEC = 10

// Le test de tenue max ne peut pas se piloter comme le test de pompes : on ne touche
// pas son téléphone la tête en bas. D'où le compte à rebours pour monter, le chrono
// qui bipe pour se repérer à l'oreille, et l'ajustement à la fin.
//
// Le test mesure l'exercice DU NIVEAU : au mur au niveau 1, en équilibre libre au
// niveau 2. Les deux ne sont pas comparables.
export default function HandstandTest({ levelIndex = 0, onValidate, onCancel }) {
  const level = levels[levelIndex] ?? levels[0]
  const [phase, setPhase] = useState('brief') // 'brief' | 'getup' | 'running' | 'adjust'
  const [count, setCount] = useState(GET_UP_SEC)
  const [sec, setSec] = useState(0)
  const startRef = useRef(0)

  useEffect(() => { primeAudio() }, [])

  // Compte à rebours pour monter au mur.
  useEffect(() => {
    if (phase !== 'getup') return
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(id)
          endOfRestSignal()
          startRef.current = Date.now()
          setPhase('running')
          return 0
        }
        tick()
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase])

  // Chrono qui monte, avec un bip toutes les 10 s pour se repérer à l'oreille.
  useEffect(() => {
    if (phase !== 'running') return
    let lastBeep = 0
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000)
      setSec(s)
      if (s > 0 && s % 10 === 0 && s !== lastBeep) {
        lastBeep = s
        tick()
      }
    }, 200)
    return () => clearInterval(id)
  }, [phase])

  const stop = () => {
    vibrate(40)
    setPhase('adjust')
  }

  if (phase === 'brief') {
    return (
      <div className="screen test">
        <header className="topbar">
          <button className="iconbtn" onClick={onCancel} aria-label="Retour">←</button>
          <span className="topbar__title">Test handstand</span>
          <span />
        </header>
        <div className="test__body">
          <div className="test__icon">🤸</div>
          <h2 className="hs__h">{level.testLabel}</h2>
          <p className="test__prompt">{level.testHow}</p>
          <div className="hs__note">
            <b>Avant de monter</b> : prépare tes poignets, et sache redescendre — si tu pars trop
            loin, tourne les épaules et pose un pied à côté, comme une roue.
          </div>
          <p className="hs__hint">
            Pose ton téléphone au sol devant toi. Un compte à rebours de {GET_UP_SEC} s te laisse
            monter, puis ça bipe toutes les 10 s. Tu ajusteras en redescendant.
          </p>
          <button className="btn btn--primary btn--big" onClick={() => setPhase('getup')}>
            Commencer le test
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'getup') {
    return (
      <div className="screen test">
        <div className="test__body hs__center">
          <p className="active__kicker">Monte au mur</p>
          <div className="hs__count">{count}</div>
          <p className="hs__hint">{level.exercise}, bras tendus, côtes basses.</p>
        </div>
      </div>
    )
  }

  if (phase === 'running') {
    return (
      <div className="screen test">
        <div className="test__body hs__center">
          <p className="active__kicker">Tiens 🤸</p>
          <div className="hs__chrono">{sec}</div>
          <p className="active__unit">secondes</p>
          <p className="hs__hint">Redescends dès que le dos se cambre — c’est ça, ta tenue.</p>
          <button className="btn btn--primary btn--big" onClick={stop}>Je suis redescendu</button>
        </div>
      </div>
    )
  }

  const passed = reachedGoal(levelIndex, sec)
  const next = levels[levelIndex + 1]
  return (
    <div className="screen test">
      <div className="test__body">
        <div className="test__icon">⏱️</div>
        <p className="test__prompt">
          Le chrono a compté <b>{sec} s</b>. Ajuste si tu as mis du temps à l’arrêter.
        </p>
        <div className="stepper">
          <button className="stepper__btn" onClick={() => setSec((s) => Math.max(0, s - 1))}>−</button>
          <div className="stepper__value">{sec}</div>
          <button className="stepper__btn" onClick={() => setSec((s) => s + 1)}>+</button>
        </div>
        <p className="test__unit">secondes · {level.exercise.toLowerCase()}</p>
        <div className="test__level">
          {passed && next
            ? <>Tu passes au niveau <b>{next.name}</b> 🚀</>
            : passed && isLastLevel(levelIndex)
              ? <>Objectif handstand atteint 🏆</>
              : <>Niveau <b>{level.name}</b> · encore <b>{Math.max(0, level.goal - sec)} s</b> pour valider</>}
        </div>
        <button
          className="btn btn--primary btn--big"
          disabled={sec < TEST.minSec}
          onClick={() => onValidate(sec)}
        >
          {sec < TEST.minSec ? `Au moins ${TEST.minSec} s` : 'Valider'}
        </button>
        <button className="link" onClick={() => { setSec(0); setPhase('brief') }}>Refaire le test</button>
      </div>
    </div>
  )
}
