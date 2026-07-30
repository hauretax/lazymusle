// Les images elles-mêmes : IndexedDB + redimensionnement (TICKETS.md T12).
//
// Pourquoi pas le localStorage : il plafonne à ~5 Mo et ne stocke que du texte.
// Une photo de téléphone en base64 le remplit à elle seule, et le dépassement
// fait échouer TOUTE l'écriture de l'état — on perdrait la progression, pas
// seulement la photo. IndexedDB stocke des Blob et se compte en centaines de Mo.
//
// Ce fichier a besoin d'un navigateur (indexedDB, canvas), donc il n'est PAS
// couvert par `npm run check` : la logique testable est dans `lib/photos`.
import { MAX_EDGE, QUALITY, OUTPUT_TYPE, fitWithin } from './photos.js'

const DB_NAME = 'reps.photos'
const DB_VERSION = 1
const STORE = 'blobs'

let dbPromise = null

export function canStorePhotos() {
  return typeof indexedDB !== 'undefined'
}

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (!canStorePhotos()) return reject(new Error('IndexedDB indisponible'))
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    // Une autre onglet bloque la montée de version : on ne veut pas rester pendu.
    req.onblocked = () => reject(new Error('base bloquée par un autre onglet'))
  }).catch((e) => {
    dbPromise = null // laisser une chance à la prochaine tentative
    throw e
  })
  return dbPromise
}

function tx(mode, run) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const store = t.objectStore(STORE)
    let result
    try {
      result = run(store)
    } catch (e) {
      reject(e)
      return
    }
    t.oncomplete = () => resolve(result?.result ?? result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error ?? new Error('transaction annulée'))
  }))
}

export function putPhoto(id, blob) {
  return tx('readwrite', (s) => s.put(blob, id))
}

export function getPhoto(id) {
  return tx('readonly', (s) => s.get(id))
}

export function deletePhoto(id) {
  return tx('readwrite', (s) => s.delete(id))
}

export function allPhotoIds() {
  return tx('readonly', (s) => s.getAllKeys())
}

export function clearPhotos() {
  return tx('readwrite', (s) => s.clear())
}

// Les images dont plus aucune fiche ne parle : ça arrive si une suppression est
// interrompue entre les deux stockages. On les balaie plutôt que de les garder
// à occuper de la place pour rien.
export async function deleteOrphans(knownIds = []) {
  if (!canStorePhotos()) return 0
  try {
    const ids = await allPhotoIds()
    const known = new Set(knownIds)
    const orphelins = ids.filter((id) => !known.has(id))
    for (const id of orphelins) await deletePhoto(id)
    return orphelins.length
  } catch {
    return 0
  }
}

// Décode l'image, la réduit, la réencode en JPEG. `createImageBitmap` gère
// l'orientation EXIF (`imageOrientation: 'from-image'`) — sans ça, une photo
// prise en portrait sur iPhone ressort couchée.
async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* certains navigateurs refusent l'option : on retombe sur <img> */
    }
    try {
      return await createImageBitmap(file)
    } catch {
      /* dernier recours ci-dessous */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('image illisible'))
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('encodage impossible'))),
      OUTPUT_TYPE,
      QUALITY,
    )
  })
}

// Fichier choisi -> { blob, width, height, bytes } prêt à ranger.
export async function shrink(file, maxEdge = MAX_EDGE) {
  const source = await decode(file)
  const size = fitWithin(source.width, source.height, maxEdge)
  if (!size) throw new Error('image sans dimensions')
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(source, 0, 0, size.width, size.height)
  if (typeof source.close === 'function') source.close()
  const blob = await toBlob(canvas)
  return { blob, width: size.width, height: size.height, bytes: blob.size }
}
