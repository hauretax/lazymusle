import { useEffect, useState } from 'react'
import { getPhoto } from '../lib/photoStore'

// Afficher une photo rangée dans IndexedDB (TICKETS.md T12).
//
// L'image arrive de façon asynchrone : on la lit, on en fait une URL d'objet, et
// on la **révoque au démontage**. Sans ça, chaque passage sur le calendrier
// fuirait quelques mégaoctets — invisible en dev, fatal sur un téléphone après
// vingt allers-retours.
export function usePhotoUrl(id) {
  const [state, setState] = useState({ url: null, status: 'loading' })

  useEffect(() => {
    if (!id) {
      setState({ url: null, status: 'missing' })
      return undefined
    }
    let url = null
    let vivant = true
    setState({ url: null, status: 'loading' })
    getPhoto(id)
      .then((blob) => {
        if (!vivant) return
        if (!blob) {
          setState({ url: null, status: 'missing' })
          return
        }
        url = URL.createObjectURL(blob)
        setState({ url, status: 'ready' })
      })
      .catch(() => {
        if (vivant) setState({ url: null, status: 'missing' })
      })
    return () => {
      vivant = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])

  return state
}

export default function Photo({ photo, alt = 'Photo', onClick }) {
  const { url, status } = usePhotoUrl(photo?.id)

  // Le ratio est connu par la fiche : on réserve la place avant que l'image
  // arrive, sinon la grille sautille au chargement.
  const ratio = photo?.width && photo?.height ? `${photo.width} / ${photo.height}` : '1 / 1'

  if (status === 'missing') {
    return (
      <span className="photo photo--gone" style={{ aspectRatio: ratio }} title="Image introuvable">
        🚫
      </span>
    )
  }

  const contenu = (
    <span className="photo" style={{ aspectRatio: ratio }}>
      {url && <img src={url} alt={alt} loading="lazy" />}
    </span>
  )

  if (!onClick) return contenu
  return (
    <button type="button" className="photo__btn" onClick={onClick} aria-label={alt}>
      {contenu}
    </button>
  )
}
