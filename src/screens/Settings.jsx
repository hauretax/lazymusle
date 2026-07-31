import { useApp } from '../store'

// Les réglages (TICKETS.md T14).
//
// Un seul pour l'instant, et il est important : c'est lui qui décide si l'app a
// le droit de sortir sur le réseau. Reps a fonctionné entièrement hors-ligne
// jusqu'à ce que la météo arrive ; l'utilisateur doit pouvoir revenir à ça.

export default function Settings({ onBack }) {
  const { state, setSetting } = useApp()
  const autoWeather = state.settings?.autoWeather !== false

  return (
    <div className="screen">
      <header className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <span className="topbar__title">Réglages</span>
        <span />
      </header>

      <div className="setting">
        <button
          type="button"
          className="setting__row"
          role="switch"
          aria-checked={autoWeather}
          onClick={() => setSetting('autoWeather', !autoWeather)}
        >
          <span className="setting__text">
            <b>Météo automatique</b>
            <span>
              Quand tu notes une activité avec un lieu et une heure, l’app va chercher la
              température et l’hygrométrie qu’il faisait.
            </span>
          </span>
          <span className={`toggle${autoWeather ? ' toggle--on' : ''}`} aria-hidden="true">
            <i />
          </span>
        </button>
      </div>

      <p className="progress__sub">
        {autoWeather ? (
          <>
            C’est le <b>seul</b> moment où Reps sort sur internet : tes coordonnées partent chez
            <a href="https://open-meteo.com" target="_blank" rel="noreferrer"> Open-Meteo</a> pour la
            météo, et chez
            <a href="https://www.bigdatacloud.com" target="_blank" rel="noreferrer"> BigDataCloud</a>
            {' '}pour traduire ta position en nom de lieu. Aucun compte, aucune clé, rien d’autre ne
            sort jamais de ton téléphone.
          </>
        ) : (
          <>
            Reps est <b>entièrement hors-ligne</b>. Tu peux toujours saisir la température et
            l’hygrométrie à la main sur chaque activité.
          </>
        )}
      </p>

      <p className="progress__sub">
        La position, elle, ne part <b>jamais</b> toute seule : il faut taper « 📍 Ma position ».
      </p>
    </div>
  )
}
