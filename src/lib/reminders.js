// Rappels "jour J" pour les séances de pompes.
//
// Contrainte PWA : impossible de déclencher de façon fiable une notification quand
// l'app est fermée (surtout iOS) sans serveur push. Solution robuste et hors-ligne :
// exporter le planning en .ics -> le calendrier du téléphone rappelle chaque jour de séance.
// En complément, notification Web quand l'app est ouverte le jour J.
import { levels, gapAfterSession, remainingDays } from '../data/pushupProgram'

const REMINDER_HOUR = 18 // heure par défaut de la séance dans le calendrier

export function canNotify() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotif() {
  if (!canNotify()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function notify(title, body) {
  try {
    if (canNotify() && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon.svg', badge: '/icon.svg' })
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function dayTitle(r) {
  const name = levels[r.levelIndex].name
  return r.isTest ? `Pompes — ${name} · Test (${levels[r.levelIndex].test})` : `Pompes — ${name} · Jour ${r.dayIndex + 1}`
}

// Projette toutes les séances restantes sur des dates, en suivant le rythme 2-2-3.
export function projectSchedule(state) {
  const rem = remainingDays(state.levelIndex, state.dayIndex)
  if (!rem.length) return []
  const first = state.nextDate ? new Date(state.nextDate) : new Date()
  const d = startOfDay(first)
  d.setHours(REMINDER_HOUR, 0, 0, 0)
  const nCompleted = state.sessions.length
  const events = []
  for (let i = 0; i < rem.length; i++) {
    events.push({ start: new Date(d), title: dayTitle(rem[i]) })
    d.setDate(d.getDate() + gapAfterSession(nCompleted + i + 1))
  }
  return events
}

function fmtLocal(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
}

export function buildICS(events) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Reps//Pompes//FR', 'CALSCALE:GREGORIAN']
  events.forEach((e, i) => {
    const end = new Date(e.start.getTime() + 45 * 60000)
    lines.push(
      'BEGIN:VEVENT',
      `UID:reps-${i}-${fmtLocal(e.start)}@reps.app`,
      `DTSTAMP:${fmtLocal(new Date())}`,
      `DTSTART:${fmtLocal(e.start)}`,
      `DTEND:${fmtLocal(end)}`,
      `SUMMARY:${e.title}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${e.title}`,
      'TRIGGER:-PT30M',
      'END:VALARM',
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadICS(text, filename = 'pompes-planning.ics') {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function exportSchedule(state) {
  const events = projectSchedule(state)
  if (!events.length) return 0
  downloadICS(buildICS(events))
  return events.length
}
