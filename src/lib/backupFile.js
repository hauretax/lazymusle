// La partie navigateur de la sauvegarde (TICKETS.md T13) : encoder les images,
// fabriquer le fichier, le télécharger, le relire.
//
// Besoin d'un navigateur (Blob, FileReader, IndexedDB), donc PAS couvert par
// `npm run check` — la logique testable est dans `lib/backup`.
import { backupEnvelope, backupFilename, readBackup, keepRestorablePhotos } from './backup.js'
import { getPhoto, putPhoto, allPhotoIds, canStorePhotos } from './photoStore.js'

// Blob -> base64 (sans le préfixe `data:`). On passe par FileReader plutôt que
// par `btoa` sur une chaîne binaire : au-delà de quelques centaines de ko,
// `String.fromCharCode(...octets)` fait sauter la pile d'appels.
function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      const virgule = url.indexOf(',')
      resolve(virgule >= 0 ? url.slice(virgule + 1) : '')
    }
    reader.onerror = () => reject(reader.error ?? new Error('lecture impossible'))
    reader.readAsDataURL(blob)
  })
}

function fromBase64(data, type = 'image/jpeg') {
  const binaire = atob(String(data))
  const octets = new Uint8Array(binaire.length)
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i)
  return new Blob([octets], { type })
}

// Tout l'état + toutes les images, en un objet prêt à sérialiser.
export async function buildBackup(state, exportedAt = new Date()) {
  const envelope = backupEnvelope(state, exportedAt)
  const fiches = state?.photos ?? []
  if (canStorePhotos()) {
    for (const fiche of fiches) {
      try {
        const blob = await getPhoto(fiche.id)
        if (!blob) continue // image disparue : la fiche partira quand même, sans données
        envelope.photos.push({
          id: fiche.id,
          type: blob.type || 'image/jpeg',
          data: await toBase64(blob),
        })
      } catch {
        /* une image illisible ne doit pas faire échouer toute la sauvegarde */
      }
    }
  }
  return envelope
}

// Fabrique le fichier et le propose au téléchargement. Le lien est révoqué
// après coup : un object URL retient tout le contenu en mémoire, et une
// sauvegarde avec photos pèse des mégaoctets.
export async function downloadBackup(state, now = new Date()) {
  const backup = await buildBackup(state, now)
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = backupFilename(now)
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Laisser au navigateur le temps de démarrer le téléchargement avant de couper.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return { name: a.download, bytes: blob.size, photos: backup.photos.length }
}

export function readBackupFile(file) {
  return new Promise((resolve) => {
    if (!file) return resolve({ ok: false, error: 'Aucun fichier choisi.' })
    const reader = new FileReader()
    reader.onload = () => resolve(readBackup(String(reader.result)))
    reader.onerror = () => resolve({ ok: false, error: 'Ce fichier n’a pas pu être lu.' })
    reader.readAsText(file)
  })
}

// Remet les images en place, puis renvoie l'état à appliquer — sans les fiches
// dont l'image n'a pas pu être restaurée.
//
// Les images d'AVANT ne sont pas effacées ici : elles deviennent orphelines et
// seront balayées au démarrage suivant (`deleteOrphans`). Les effacer d'abord
// rendrait un import raté à mi-chemin bien pire que le désordre qu'il évite.
export async function restorePhotos(state, photos = []) {
  if (!canStorePhotos()) return keepRestorablePhotos(state, [])
  const posees = []
  for (const p of photos) {
    try {
      await putPhoto(p.id, fromBase64(p.data, p.type))
      posees.push(p.id)
    } catch {
      /* place manquante ou données abîmées : cette photo-là ne reviendra pas */
    }
  }
  // Une fiche peut déjà avoir son image ici (réimport de la même sauvegarde) :
  // elle est restaurable même si le fichier ne la portait pas.
  let dejaLa = []
  try {
    dejaLa = await allPhotoIds()
  } catch {
    /* tant pis : on se contente de ce qu'on vient d'écrire */
  }
  return keepRestorablePhotos(state, [...posees, ...dejaLa])
}
