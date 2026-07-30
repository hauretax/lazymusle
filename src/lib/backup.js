// La sauvegarde complète : tout emporter, et pouvoir tout remettre
// (TICKETS.md T13). Un `.json` qu'on télécharge et qu'on relit — sur un autre
// téléphone, ou après avoir vidé son navigateur.
//
// Écrit en DERNIER, exprès : contre la forme définitive des données, pour
// n'être écrit qu'une fois.
//
// Ce fichier ne contient que la partie sans navigateur — donc testée
// (`npm run check`). Le téléchargement, la lecture de fichier et l'encodage des
// images sont dans `lib/backupFile`.
import { hydrate, STATE_VERSION } from './migrate.js'
import { journalEntries } from './journal.js'
import { totalBytes } from './photos.js'

// La signature d'un fichier de sauvegarde. Sans elle, on ne saurait pas
// distinguer notre `.json` de n'importe quel autre — et on écraserait une
// progression sur un fichier au hasard.
export const BACKUP_FORMAT = 'reps.backup'
export const BACKUP_FORMAT_VERSION = 1

// L'enveloppe, sans les images (elles s'ajoutent dans `lib/backupFile`, parce
// que les encoder demande un navigateur).
export function backupEnvelope(state, exportedAt = new Date()) {
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    stateVersion: STATE_VERSION,
    exportedAt: new Date(exportedAt).toISOString(),
    state: state ?? {},
    photos: [], // [{ id, type, data }] — remplies par lib/backupFile
  }
}

export function backupFilename(date = new Date()) {
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `reps-sauvegarde-${d.getFullYear()}-${m}-${j}.json`
}

// Ce qu'on lit dans une sauvegarde AVANT de l'appliquer : de quoi écrire une
// phrase honnête dans la demande de confirmation. On ne remplace pas une
// progression sur la foi d'un nom de fichier.
export function describeBackup(parsed) {
  const state = parsed?.state ?? {}
  const entries = journalEntries(state)
  const jours = [...new Set(entries.map((e) => e?.day).filter(Boolean))].sort()
  return {
    exportedAt: parsed?.exportedAt ?? null,
    stateVersion: parsed?.stateVersion ?? null,
    sessions: entries.length,
    activities: (state.activities ?? []).length,
    photos: (parsed?.photos ?? []).length,
    photoBytes: totalBytes(state.photos),
    from: jours[0] ?? null,
    to: jours[jours.length - 1] ?? null,
  }
}

// Le même résumé, pour l'état COURANT : c'est lui qu'on s'apprête à écraser.
export function describeState(state) {
  return describeBackup({ state, photos: state?.photos ?? [], exportedAt: null })
}

// Lit un contenu de fichier. Renvoie toujours un objet : `{ ok, ... }`, jamais
// une exception — un fichier au hasard n'est pas un bug, c'est un cas prévu.
export function readBackup(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Ce fichier n’est pas lisible — il n’est pas au format JSON.' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Ce fichier n’est pas une sauvegarde Reps.' }
  }
  if (parsed.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'Ce fichier n’est pas une sauvegarde Reps.' }
  }
  if (Number(parsed.formatVersion) > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      error: 'Cette sauvegarde vient d’une version plus récente de l’app. Mets l’app à jour d’abord.',
    }
  }
  if (!parsed.state || typeof parsed.state !== 'object' || Array.isArray(parsed.state)) {
    return { ok: false, error: 'Cette sauvegarde est abîmée : il n’y a pas de progression dedans.' }
  }
  // Le même chemin que le localStorage : une sauvegarde d'une version
  // antérieure se relit comme un état d'une version antérieure. C'est tout
  // l'intérêt de faire passer l'import par `migrate`.
  let state
  try {
    state = hydrate(parsed.state)
  } catch {
    return { ok: false, error: 'Cette sauvegarde est abîmée : la progression est illisible.' }
  }
  const photos = Array.isArray(parsed.photos) ? parsed.photos.filter((p) => p?.id && p?.data) : []
  return { ok: true, state, photos, summary: describeBackup({ ...parsed, state }) }
}

// Après restauration des images : on ne garde que les fiches dont l'image est
// vraiment là. Une fiche sans image donnerait une vignette barrée à vie ; mieux
// vaut une photo de moins qu'un trou permanent.
export function keepRestorablePhotos(state, availableIds = []) {
  const dispo = new Set(availableIds)
  const photos = (state?.photos ?? []).filter((p) => dispo.has(p?.id))
  return { ...state, photos }
}
