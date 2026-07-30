import { useRef, useState } from 'react'
import { useApp } from '../store'
import { downloadBackup, readBackupFile, restorePhotos } from '../lib/backupFile'
import { describeState } from '../lib/backup'
import { formatBytes } from '../lib/photos'

// Emporter sa progression et la remettre ailleurs (TICKETS.md T13).
//
// Le geste est irréversible : restaurer REMPLACE tout. L'écran montre donc les
// deux côtés — ce qu'il y a dans le fichier, et ce qu'on s'apprête à écraser —
// avant de demander confirmation.

function fmtDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Resume({ r }) {
  const bits = []
  if (r.sessions > 0) bits.push(`${r.sessions} ${r.sessions > 1 ? 'choses faites' : 'chose faite'}`)
  if (r.activities > 0) bits.push(`${r.activities} ${r.activities > 1 ? 'activités' : 'activité'}`)
  if (r.photos > 0) bits.push(`${r.photos} photo${r.photos > 1 ? 's' : ''}`)
  if (!bits.length) return <>rien du tout</>
  return <>{bits.join(' · ')}</>
}

export default function Backup({ onBack }) {
  const { state, replaceAll } = useApp()
  const input = useRef(null)
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const [candidat, setCandidat] = useState(null)

  const courant = describeState(state)

  const exporter = async () => {
    setBusy('export')
    setError(null)
    setMessage(null)
    try {
      const res = await downloadBackup(state)
      setMessage(`Sauvegarde téléchargée : ${res.name} (${formatBytes(res.bytes)}).`)
    } catch {
      setError('La sauvegarde n’a pas pu être créée.')
    }
    setBusy(null)
  }

  const choisir = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // sinon rechoisir le même fichier ne déclenche rien
    if (!file) return
    setBusy('lecture')
    setError(null)
    setMessage(null)
    setCandidat(null)
    const res = await readBackupFile(file)
    setBusy(null)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setCandidat(res)
  }

  const restaurer = async () => {
    if (!candidat) return
    setBusy('import')
    setError(null)
    try {
      const etat = await restorePhotos(candidat.state, candidat.photos)
      replaceAll(etat)
      const perdues = candidat.photos.length - (etat.photos ?? []).length
      setMessage(
        perdues > 0
          ? `Progression restaurée. ${perdues} photo${perdues > 1 ? 's n’ont' : ' n’a'} pas pu être remise${perdues > 1 ? 's' : ''}.`
          : 'Progression restaurée.',
      )
      setCandidat(null)
    } catch {
      setError('La restauration a échoué. Rien n’a été remplacé.')
    }
    setBusy(null)
  }

  return (
    <div className="screen">
      <header className="topbar">
        <button className="iconbtn" onClick={onBack} aria-label="Retour">←</button>
        <span className="topbar__title">Sauvegarde</span>
        <span />
      </header>

      <div className="card card--intro">
        <div className="intro__emoji">💾</div>
        <h2>Tout emporter</h2>
        <p>
          Un fichier qui contient <b>tout</b> : tes programmes, tes séances, tes activités et tes
          photos. Garde-le quelque part — c’est ta seule copie, l’app n’a pas de serveur.
        </p>
        <p className="progress__sub">
          Ici en ce moment : <Resume r={courant} />
          {courant.photoBytes > 0 && <> · environ {formatBytes(courant.photoBytes)} de photos</>}
        </p>
        <button className="btn btn--primary btn--big" onClick={exporter} disabled={busy !== null}>
          {busy === 'export' ? 'Un instant…' : '⬇️ Exporter ma sauvegarde'}
        </button>
      </div>

      <h3 className="progress__h">Remettre une sauvegarde</h3>
      <p className="progress__sub">
        Sur un autre téléphone, ou après avoir vidé ton navigateur.
      </p>
      <button className="btn btn--ghost" onClick={() => input.current?.click()} disabled={busy !== null}>
        {busy === 'lecture' ? 'Lecture…' : '📂 Choisir un fichier'}
      </button>
      <input ref={input} type="file" accept="application/json,.json" hidden onChange={choisir} />

      {candidat && (
        <div className="act__danger">
          <p>
            <b>Sauvegarde{fmtDate(candidat.summary.exportedAt) ? ` du ${fmtDate(candidat.summary.exportedAt)}` : ''}</b>
            {' — '}<Resume r={candidat.summary} />.
          </p>
          <p>
            Elle va <b>remplacer</b> ce qu’il y a ici (<Resume r={courant} />). C’est définitif.
          </p>
          <div className="act__danger-row">
            <button className="btn btn--ghost" onClick={() => setCandidat(null)} disabled={busy !== null}>
              Annuler
            </button>
            <button className="btn btn--danger" onClick={restaurer} disabled={busy !== null}>
              {busy === 'import' ? 'Un instant…' : 'Remplacer'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="act__err">{error}</p>}
      {message && <p className="backup__ok">{message}</p>}
    </div>
  )
}
