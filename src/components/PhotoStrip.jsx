import { useRef, useState } from 'react'
import Photo, { usePhotoUrl } from './Photo'
import { formatBytes } from '../lib/photos'

// Une pellicule : les photos d'un jour ou d'une activité, plus le bouton pour en
// ajouter (TICKETS.md T12). Servie telle quelle au calendrier et au formulaire
// d'activité — c'est le même geste des deux côtés.

function Viewer({ photo, onClose, onRemove }) {
  const { url, status } = usePhotoUrl(photo?.id)
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label="Photo">
      <header className="topbar">
        <button className="iconbtn" onClick={onClose} aria-label="Fermer">←</button>
        <span className="topbar__title">
          {new Date(photo.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        <span />
      </header>

      <div className="viewer__frame">
        {status === 'ready' && url
          ? <img src={url} alt="Photo" />
          : <p className="cal__empty">{status === 'loading' ? 'Chargement…' : 'Image introuvable.'}</p>}
      </div>

      <p className="progress__sub">
        {photo.width > 0 && <>{photo.width} × {photo.height} · </>}{formatBytes(photo.bytes)}
      </p>

      {confirm ? (
        <div className="act__danger">
          <p>Supprimer cette photo ? C’est définitif.</p>
          <div className="act__danger-row">
            <button className="btn btn--ghost" onClick={() => setConfirm(false)}>Annuler</button>
            <button className="btn btn--danger" onClick={() => { onRemove(photo.id); onClose() }}>Supprimer</button>
          </div>
        </div>
      ) : (
        <button className="link link--danger" onClick={() => setConfirm(true)}>Supprimer cette photo</button>
      )}
    </div>
  )
}

export default function PhotoStrip({ photos = [], onAdd, onRemove, addLabel = 'Ajouter une photo' }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(null)

  const choisir = async (event) => {
    const files = [...(event.target.files ?? [])]
    // On vide tout de suite : sans ça, rechoisir le MÊME fichier ne déclenche
    // aucun `change` et l'ajout semble ignoré.
    event.target.value = ''
    if (!files.length || !onAdd) return
    setBusy(true)
    setError(null)
    for (const file of files) {
      const res = await onAdd(file)
      if (res && !res.ok) {
        setError(res.error)
        break // inutile d'insister si la place manque
      }
    }
    setBusy(false)
  }

  const vue = open ? photos.find((p) => p.id === open) : null

  return (
    <>
      <div className="strip">
        {photos.map((p) => (
          <Photo
            key={p.id}
            photo={p}
            alt={`Photo du ${new Date(p.date).toLocaleDateString('fr-FR')}`}
            onClick={() => setOpen(p.id)}
          />
        ))}
        {onAdd && (
          <button
            type="button"
            className="strip__add"
            onClick={() => input.current?.click()}
            disabled={busy}
            aria-label={addLabel}
          >
            {busy ? '…' : '📷'}
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={choisir}
      />

      {error && <p className="act__err">{error}</p>}

      {vue && <Viewer photo={vue} onClose={() => setOpen(null)} onRemove={onRemove} />}
    </>
  )
}
