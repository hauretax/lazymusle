// Vérifie la logique pure du projet : `npm run check`.
//
// Pas de framework — juste des assertions dans Node. Ça couvre ce qui n'est PAS
// visible à l'écran : le moteur de planning (dont les règles ne se déclenchent
// pas encore, cf. TICKETS.md T2) et les formules du programme pompes.
// Le reste (écrans, parcours) se vérifie dans le navigateur.
import {
  orderForDay, sharedMuscleLabels, dayPlan, dayWarnings, eveOfTestConflict, blockRank,
} from '../src/lib/schedule.js'
import {
  computeRest, pickLevelIndex, gapAfterSession, parseSet, sessionMinTotal,
  getDay, remainingDays, daysInLevel, isTestDay, levels, GOAL, TOTAL_DAYS,
} from '../src/data/pushupProgram.js'
import { hydrate, freshState, STATE_VERSION } from '../src/lib/migrate.js'
import {
  pushupKey, pushupStatuses, countPushupDone, runDone, countRunDone,
  sessionStatus, DONE, TRIED, ABANDONED,
} from '../src/lib/progress.js'
import { abandonMessage, shouldStretch, STRETCH_THRESHOLD } from '../src/lib/encouragement.js'
import { dayKey, journalByDay, monthGrid, shiftMonth, monthSummary } from '../src/lib/journal.js'
import { parseDayKey, daysBetween } from '../src/lib/dates.js'
import {
  normalizeType, typeKey, cleanMeasures, dayToISO, isFutureDay, activityError,
  addActivity, updateActivity, removeActivity, knownTypes, suggestTypes, measuresForType,
  formatDuration, formatMeasure, activitySummary,
} from '../src/lib/activities.js'
import { DEFAULT_MEASURES } from '../src/data/measures.js'
import {
  normalizeRange, entriesBetween, activeDays, longestStreak, activityTotals,
  programTotals, firstActiveDay, presetRange, recap,
} from '../src/lib/recap.js'
import {
  fitWithin, photoError, makePhoto, nextPhotoId, addPhoto, removePhoto, detachActivity,
  photosOfDay, photosOfActivity, photosBetween, photoCountByDay, totalBytes, formatBytes,
  MAX_EDGE,
} from '../src/lib/photos.js'
import * as hs from '../src/data/handstandProgram.js'
import * as ls from '../src/data/lsitProgram.js'
import * as run from '../src/data/runProgram.js'

let fails = 0

const section = (name) => console.log(`\n${name}`)
const eq = (name, got, want) => {
  const g = JSON.stringify(got)
  const w = JSON.stringify(want)
  if (g === w) return console.log(`  ok   ${name}`)
  fails++
  console.log(`  FAIL ${name}\n       attendu ${w}\n       obtenu  ${g}`)
}

// ---------- Moteur de planning ----------

section('Ordre des blocs : le skill se travaille frais, avant la force')
eq('handstand avant pompes', orderForDay(['pushups', 'handstand']), ['handstand', 'pushups'])
eq('déjà dans l’ordre', orderForDay(['handstand', 'pushups']), ['handstand', 'pushups'])
eq('endurance après la force', orderForDay(['running', 'pushups']), ['pushups', 'running'])
eq('trois blocs', orderForDay(['running', 'pushups', 'handstand']), ['handstand', 'pushups', 'running'])
eq('un seul exo', orderForDay(['pushups']), ['pushups'])
eq('liste vide', orderForDay([]), [])
eq('tri stable à bloc égal', orderForDay(['core', 'handstand']), ['core', 'handstand'])

section('Chevauchement musculaire (chartes Overcoming Gravity)')
eq('pompes / handstand', sharedMuscleLabels('pushups', 'handstand'), ['Deltoïdes antérieurs', 'Triceps'])
eq('symétrique', sharedMuscleLabels('handstand', 'pushups'), ['Deltoïdes antérieurs', 'Triceps'])
eq('pompes / course : disjoints', sharedMuscleLabels('pushups', 'running'), [])
eq('pompes / L-sit : disjoints', sharedMuscleLabels('pushups', 'core'), [])

section('Plan du jour')
eq('pompes seules + étirements', dayPlan(['pushups']),
  [{ goalId: 'pushups', block: 'strength' }, { goalId: null, block: 'mobility' }])
eq('handstand → pompes → étirements', dayPlan(['pushups', 'handstand']),
  [{ goalId: 'handstand', block: 'skill' },
   { goalId: 'pushups', block: 'strength' },
   { goalId: null, block: 'mobility' }])
eq('skill seul : rien à récupérer', dayPlan(['handstand']), [{ goalId: 'handstand', block: 'skill' }])
eq('jour vide', dayPlan([]), [])

section('Avertissements')
eq('pompes seules : aucun', dayWarnings(['pushups']), [])
eq('pompes + handstand', dayWarnings(['pushups', 'handstand']), [
  { type: 'muscles', goalIds: ['handstand', 'pushups'], muscles: ['Deltoïdes antérieurs', 'Triceps'] },
  { type: 'skill-first', goalIds: ['handstand', 'pushups'] },
])
eq('pompes + course : muscles disjoints', dayWarnings(['pushups', 'running']), [])

section('Veille de test : se préparer reposé')
eq('handstand la veille d’un test de pompes', eveOfTestConflict('pushups', ['handstand']), ['handstand'])
eq('course la veille : sans risque', eveOfTestConflict('pushups', ['running']), [])
eq('soi-même ignoré', eveOfTestConflict('pushups', ['pushups']), [])

section('Robustesse : un exo inconnu ne casse rien')
eq('bloc inconnu rangé en dernier', blockRank(undefined), 4)
eq('ordre préservé', orderForDay(['inconnu', 'handstand']), ['handstand', 'inconnu'])
eq('muscles d’un exo inconnu', sharedMuscleLabels('inconnu', 'pushups'), [])

// ---------- Programme pompes ----------

section('Pauses adaptatives : clamp(60 + reps × 3,2, 90, 300), arrondi à 5 s')
eq('série légère → plancher 90 s', computeRest(2), 90)
eq('plancher tenu jusqu’à 9 reps', computeRest(9), 90)
eq('10 reps → 90 s (92 arrondi à 90)', computeRest(10), 90)
eq('20 reps → 125 s', computeRest(20), 125)
eq('34 reps → 170 s', computeRest(34), 170)
eq('grosse série → plafond 300 s', computeRest(100), 300)
eq('plafond jamais dépassé', computeRest(1000), 300)
eq('0 rep → plancher', computeRest(0), 90)

section('Placement selon le test initial (seuils alignés sur les tests 20 / 50)')
eq('19 → Niveau 1', pickLevelIndex(19), 0)
eq('20 → Niveau 2', pickLevelIndex(20), 1)
eq('49 → Niveau 2', pickLevelIndex(49), 1)
eq('50 → Niveau 3', pickLevelIndex(50), 2)
eq('0 → Niveau 1', pickLevelIndex(0), 0)

section('Rythme conseillé : motif 2-2-3 qui boucle')
eq('séances 1 à 6', [1, 2, 3, 4, 5, 6].map(gapAfterSession), [2, 2, 3, 2, 2, 3])

section('Lecture des séries')
eq('valeur simple', parseSet(12), { target: 12, isMax: false })
eq('série max "12+"', parseSet('12+'), { target: 12, isMax: true })
eq('total d’une séance', sessionMinTotal([2, 3, 4, 3, 2]), 14)
eq('total avec une série max', sessionMinTotal([16, 12, '14+']), 42)

section('Structure du programme (données extraites de Push Up Pro)')
eq('objectif', GOAL, 100)
eq('3 niveaux', levels.length, 3)
eq('tests 20 / 50 / 100', levels.map((l) => l.test), [20, 50, 100])
eq('jours par niveau, test compris', [0, 1, 2].map(daysInLevel), [10, 19, 25])
eq('total des séances', TOTAL_DAYS, 54)
eq('1re séance du Niveau 1', getDay(0, 0).values, [2, 3, 4, 3, 2])
eq('dernier jour du Niveau 1 = test', isTestDay(0, 9), true)
eq('avant-dernier jour = séance normale', isTestDay(0, 8), false)
eq('le jour de test vise le max du niveau', getDay(0, 9).values, ['20+'])
eq('tout le programme depuis le départ', remainingDays(0, 0).length, 54)
eq('depuis le test du Niveau 1', remainingDays(0, 9).length, 45)
eq('niveau non commencé', remainingDays(null, 0).length, 0)

// ---------- Programme handstand ----------
// Pas de calendrier : tout se dérive de la tenue max (voir TICKETS.md T3).

section('Tenues de travail : 60-70 % de la tenue max (Prilepin isométrique)')
eq('tenue max 40 s → 25 s', hs.computeHold(40), 25)
eq('tenue max 20 s → 13 s', hs.computeHold(20), 13)
eq('tenue max 60 s → 40 s', hs.computeHold(60), 40)
eq('tenue max 12 s → 8 s (et pas 10 : l’arrondi à 5 s fausserait le %)', hs.computeHold(12), 8)
eq('pas de tenue max → pas de séance', hs.computeHold(0), 0)
{
  // La règle sourcée : la tenue de travail reste dans 60-70 % du max.
  // Tolérance à ±5 points, l'arrondi ne pouvant pas tomber juste partout.
  const horsPlage = []
  for (let m = 5; m <= 120; m++) {
    const r = hs.computeHold(m) / m
    if (r < 0.55 || r > 0.75) horsPlage.push(`${m}s→${Math.round(r * 100)}%`)
  }
  eq('de 5 à 120 s, toujours proche des 60-70 %', horsPlage, [])
}
{
  // Sécurité : ne jamais demander de tenir plus longtemps que son max.
  const infaisables = []
  for (let m = 1; m <= 120; m++) {
    if (hs.computeHold(m) > m) infaisables.push(`${m}s→${hs.computeHold(m)}s`)
  }
  eq('jamais plus long que la tenue max', infaisables, [])
}

section('Volume : viser 36-65 s au total, sans aller à l’échec')
{
  // Sur la plage du niveau « Le mur » (tenue max < 45 s), une fois le débutant
  // absolu écarté : lui, le plafond de séries le maintient sous la fourchette,
  // et c'est voulu — il lui faut du conditionnement, pas du volume.
  const horsPlage = []
  for (let m = 8; m < 45; m++) {
    const v = hs.sessionVolume(m)
    if (v < hs.HOLD.volumeMin || v > hs.HOLD.volumeMax) horsPlage.push(`${m}s→${v}s`)
  }
  eq('volume dans la fourchette sur tout le niveau « Le mur »', horsPlage, [])
}
eq('tenue max 40 s → 2 tenues de 25 s', [hs.computeSets(40), hs.computeHold(40)], [2, 25])
eq('tenue max 20 s → 4 tenues de 13 s', [hs.computeSets(20), hs.computeHold(20)], [4, 13])
eq('débutant : séance courte, plafonnée', hs.computeSets(5) <= hs.HOLD.maxSets, true)
eq('au moins une tenue dès qu’il y a un max', hs.computeSets(1) >= 1, true)
eq('pas de max → pas de séries', hs.computeSets(0), 0)

section('Validation : chaque tenue se compare à SON niveau, jamais à un autre')
eq('44 s au mur ne valident pas le mur (45 s)', hs.reachedGoal(0, 44), false)
eq('45 s au mur valident le mur', hs.reachedGoal(0, 45), true)
// Le piège d'origine : un seul champ « tenue max » comparé à l'objectif d'un autre
// niveau déclarait le programme fini pour un débutant. Réglé deux fois plutôt qu'une :
// le temps ne valide que les niveaux chronométrés, et l'équilibre a ses propres axes.
eq('aucun temps, même énorme, ne valide l’équilibre', hs.reachedGoal(1, 9999), false)
eq('pas de tenue mesurée ne valide rien', hs.reachedGoal(0, null), false)
eq('dernier niveau identifié', [hs.isLastLevel(0), hs.isLastLevel(1)], [false, true])

section('Séance dérivée de l’état du niveau')
{
  const s = hs.getSession(0, { maxHold: 40 })
  eq('niveau mur : mode tenue', s.mode, 'hold')
  eq('2 tenues de 25 s, pause adaptée à 80 s', [s.sets, s.hold, s.restSec], [2, 25, 80])
  eq('niveau inexistant', hs.getSession(9, { maxHold: 40 }), null)

  // Une petite tenue ne doit plus déclencher une pause de grosse série.
  const debutant = hs.getSession(0, { maxHold: 8 })
  eq('tenue de 5 s → pause de 30 s, pas 90', [debutant.hold, debutant.restSec], [5, 30])
}

section('Niveau « L’équilibre » : deux axes, pas un chrono')
eq('les deux axes existent', hs.AXES.map((a) => a.id), ['entry', 'balance'])
eq('monter : 6 étapes, du mur au press', hs.getAxis('entry').steps.length, 6)
eq('rattraper : 5 étapes, de rien à la correction continue', hs.getAxis('balance').steps.length, 5)
eq('axe inconnu', hs.getAxis('nawak'), null)
eq('étape suivante sur un axe', hs.nextStep('balance', 'toe-pulls').id, 'heel-pulls')
eq('pas d’étape après la dernière', hs.nextStep('balance', 'sustained'), null)
eq('étape inconnue → pas de suivante', hs.nextStep('balance', 'nawak'), null)
eq('dernière étape de l’axe', hs.isAxisComplete('entry', 'press'), true)
eq('étape intermédiaire', hs.isAxisComplete('entry', 'lunge-free'), false)

{
  // Le point clé : les deux axes sont INDÉPENDANTS. Savoir monter en fente sans
  // savoir rattraper est un cas réel, et l'inverse aussi.
  eq('monter au bout mais pas rattraper → pas fini',
    hs.axesComplete({ entry: 'press', balance: 'toe-pulls' }), false)
  eq('rattraper au bout mais pas monter → pas fini',
    hs.axesComplete({ entry: 'wall-walk', balance: 'sustained' }), false)
  eq('les deux au bout → fini', hs.axesComplete({ entry: 'press', balance: 'sustained' }), true)
  eq('axes non situés → pas fini', hs.axesComplete(null), false)
  eq('un seul axe renseigné → pas fini', hs.axesComplete({ entry: 'press' }), false)
}

{
  const s = hs.getSession(1, { axes: { entry: 'lunge-wall', balance: 'toe-pulls' } })
  eq('mode axes', s.mode, 'axes')
  eq('une consigne par axe', s.drills.map((d) => d.axisId), ['entry', 'balance'])
  eq('la consigne est l’étape courante, pas la suivante',
    s.drills.map((d) => d.step.id), ['lunge-wall', 'toe-pulls'])
  eq('essais courts et nombreux', s.attempts > 5, true)
  eq('axes non situés → pas de séance', hs.getSession(1, {}), null)
}

section('Le chrono ne s’applique qu’aux niveaux chronométrés')
eq('l’équilibre ne se valide pas au temps', hs.reachedGoal(1, 9999), false)
eq('le mur, si', hs.reachedGoal(0, 45), true)


// ---------- Programme L-sit ----------
// Même méthode que l'équilibre : deux axes, et l'app MESURE la tenue max en séance
// au lieu de la demander.

section('L-sit : deux axes, comme l’équilibre')
eq('les deux axes', ls.AXES.map((a) => a.id), ['support', 'shape'])
eq('se soulever : du sol aux anneaux', ls.getAxis('support').steps.length, 5)
eq('tendre les jambes : du groupé au V-sit', ls.getAxis('shape').steps.length, 6)
eq('progression de forme conforme à la charte OG',
  ls.getAxis('shape').steps.map((s) => s.id),
  ['tuck', 'adv-tuck', 'one-leg', 'full-l', 'straddle', 'v-sit'])
eq('étape suivante', ls.nextStep('shape', 'tuck').id, 'adv-tuck')
eq('rien après le V-sit', ls.nextStep('shape', 'v-sit'), null)

{
  // Indépendants, comme pour le handstand : un L complet sur parallettes n'implique
  // pas de décoller un groupé au sol.
  eq('forme au bout mais pas le support → pas fini',
    ls.axesComplete({ support: 'bars-support', shape: 'v-sit' }), false)
  eq('support au bout mais pas la forme → pas fini',
    ls.axesComplete({ support: 'rings', shape: 'tuck' }), false)
  eq('les deux au bout → fini', ls.axesComplete({ support: 'rings', shape: 'v-sit' }), true)
  eq('axes non situés → pas fini', ls.axesComplete(null), false)
}

section('L-sit : la tenue max est mesurée, pas déclarée')
{
  const axes = { support: 'floor-lift', shape: 'tuck' }
  eq('un relevé par combinaison support/forme', ls.bestKey(axes), 'floor-lift/tuck')
  eq('changer de forme change la combinaison',
    ls.bestKey({ support: 'floor-lift', shape: 'full-l' }), 'floor-lift/full-l')
  eq('pas d’axes → pas de clé', ls.bestKey(null), null)

  // Première fois sur cette combinaison : rien à prescrire, on mesure.
  const cal = ls.getSession({ axes, bests: {} })
  eq('sans relevé → séance de calibration', cal.mode, 'calibration')
  eq('une consigne par axe', cal.drills.map((d) => d.axisId), ['support', 'shape'])

  // Une fois qu'on a mesuré, la formule de Prilepin reprend la main.
  const s = ls.getSession({ axes, bests: { 'floor-lift/tuck': 20 } })
  eq('avec relevé → tenues dosées', s.mode, 'hold')
  eq('4 tenues de 13 s (65 % de 20 s)', [s.sets, s.hold], [4, 13])
  eq('le relevé est repris tel quel', s.best, 20)

  // Le relevé d'une AUTRE combinaison ne doit pas servir ici.
  const autre = ls.getSession({ axes, bests: { 'bars-support/full-l': 40 } })
  eq('un relevé d’une autre combinaison ne compte pas', autre.mode, 'calibration')

  eq('axes non situés → pas de séance', ls.getSession({}), null)
  eq('étape inconnue → pas de séance',
    ls.getSession({ axes: { support: 'nawak', shape: 'tuck' }, bests: {} }), null)
}

section('L-sit : la formule isométrique est bien la même que le handstand')
eq('même tenue de travail à max égal', ls.computeHold(40), hs.computeHold(40))
eq('même nombre de séries', ls.computeSets(40), hs.computeSets(40))
eq('même pause à tenue égale', ls.computeRest(25), hs.computeRest(25))

section('Pauses adaptées à la durée de la tenue')
eq('tenue de 5 s → plancher 30 s (et pas 90)', ls.computeRest(5), 30)
eq('tenue de 13 s → 50 s', ls.computeRest(13), 50)
eq('tenue de 25 s → 80 s', ls.computeRest(25), 80)
eq('tenue de 40 s → 115 s', ls.computeRest(40), 115)
eq('tenue très longue → plafond 180 s', ls.computeRest(300), 180)
eq('pas de tenue → pas de pause', ls.computeRest(0), 0)
{
  // La pause doit CROÎTRE avec la tenue : c'est tout l'intérêt.
  const anomalies = []
  for (let h = 1; h < 80; h++) {
    if (ls.computeRest(h + 1) < ls.computeRest(h)) anomalies.push(`${h}→${h + 1}`)
  }
  eq('jamais décroissante', anomalies, [])
}
{
  // Le défaut qui a motivé le changement : 8 tenues de 5 s × 90 s de pause = 12 min,
  // presque que du repos, alors que le skill se travaille en 5-10 min (Steven Low).
  const debutant = ls.sessionSeconds(8)
  eq('débutant (max 8 s) : séance sous 10 min', debutant <= 600, true)
  eq('débutant : ce n’est plus 12 min de repos', debutant < 700, true)

  // Et la séance reste courte à tous les niveaux : on ne bascule pas dans l'autre excès.
  const trop = []
  for (let m = 5; m <= 60; m++) {
    if (ls.sessionSeconds(m) > 600) trop.push(`${m}s→${Math.round(ls.sessionSeconds(m) / 60)}min`)
  }
  eq('aucune séance ne dépasse 10 min, de 5 à 60 s de max', trop, [])
}

// ---------- Programme course ----------
// Le plan Couch-to-5K de Josh Clark, repris tel quel. Ici le calendrier existe
// vraiment : ces assertions vérifient ma TRANSCRIPTION du plan original.

section('Structure du plan (Couch-to-5K, Josh Clark)')
eq('9 semaines', run.weeks.length, 9)
eq('3 séances par semaine', run.weeks.map((w) => w.workouts.length), [3, 3, 3, 3, 3, 3, 3, 3, 3])
eq('27 séances au total', run.TOTAL_WORKOUTS, 27)
eq('échauffement : 5 min de marche', [run.WARMUP.sec, run.WARMUP.t ?? run.WARMUP.type], [300, 'walk'])
eq('rythme 2-2-3, comme les pompes', [1, 2, 3, 4].map(run.gapAfterSession), [2, 2, 3, 2])

section('Transcription du plan, semaine par semaine')
{
  // S1 : « alterne 60 s de course et 90 s de marche, pour un total de 20 minutes »
  const w1 = run.getWorkout(0)
  eq('S1 : 20 min pile', run.workoutSeconds(run.weeks[0].workouts[0]), 1200)
  eq('S1 : 8 cycles course/marche', w1.intervals.length, 16)
  eq('S1 : commence par 60 s de course', [w1.intervals[0].t, w1.intervals[0].sec], ['run', 60])
  eq('S1 : puis 90 s de marche', [w1.intervals[1].t, w1.intervals[1].sec], ['walk', 90])
  eq('S1 : 8 min de course au total', w1.runSec, 480)

  // S2 : 90 s / 2 min sur 20 min — le cycle ne tombe pas rond, le dernier est tronqué.
  const w2 = run.getWorkout(3)
  eq('S2 : 20 min pile malgré un cycle qui ne tombe pas rond',
    w2.intervals.reduce((n, x) => n + x.sec, 0), 1200)
  eq('S2 : aucun intervalle ne dépasse sa consigne',
    w2.intervals.every((x) => x.sec <= (x.t === 'run' ? 90 : 120)), true)

  // S3 : « deux répétitions de : 90 s course, 90 s marche, 3 min course, 3 min marche »
  const w3 = run.getWorkout(6)
  eq('S3 : 8 intervalles (2 × 4)', w3.intervals.length, 8)
  eq('S3 : la séquence répétée', w3.intervals.map((x) => `${x.t}${x.sec}`),
    ['run90', 'walk90', 'run180', 'walk180', 'run90', 'walk90', 'run180', 'walk180'])

  // S4 : séquence explicite, 3-5-3-5 min de course
  const w4 = run.getWorkout(9)
  eq('S4 : la séquence exacte', w4.intervals.map((x) => `${x.t}${x.sec}`),
    ['run180', 'walk90', 'run300', 'walk150', 'run180', 'walk90', 'run300'])
  eq('S4 : 16 min de course', w4.runSec, 960)

  // S5J3 : le premier vrai cap — 20 min sans marcher
  const w5j3 = run.getWorkout(14)
  eq('S5J3 : 20 min de course d’un coup', w5j3.intervals, [{ t: 'run', sec: 1200 }])
  eq('S5J3 : aucune marche', w5j3.intervals.some((x) => x.t === 'walk'), false)
  eq('S5J3 : l’app prévient que rater n’est pas grave', typeof w5j3.note, 'string')

  // Le palier de S6 à S9 : 22 → 25 → 28 → 30 min
  eq('S6J3 : 22 min', run.getWorkout(17).runSec, 1320)
  eq('S7 : 25 min', run.getWorkout(18).runSec, 1500)
  eq('S8 : 28 min', run.getWorkout(21).runSec, 1680)
  eq('S9 : 30 min', run.getWorkout(24).runSec, 1800)
}

section('La course ne recule jamais')
{
  // Propriété : le temps de course ne doit jamais diminuer d'une semaine à l'autre.
  // Un chiffre mal recopié se verrait ici.
  const parSemaine = run.weeks.map((w) => Math.max(...w.workouts.map(run.runSeconds)))
  const reculs = []
  for (let i = 1; i < parSemaine.length; i++) {
    if (parSemaine[i] < parSemaine[i - 1]) reculs.push(`S${i}→S${i + 1}`)
  }
  eq('le plus gros effort de la semaine ne recule jamais', reculs, [])
  // Le saut de la semaine 5 (16 → 20 min sans marcher) est réel : c'est le cap
  // que Josh Clark annonce comme le plus dur du plan.
  eq('progression du plus gros effort, en min',
    parSemaine.map((s) => s / 60), [8, 9, 9, 16, 20, 22, 25, 28, 30])
}

section('Repérage d’une séance dans le plan')
eq('la première', run.locate(0), { weekIndex: 0, workoutIndex: 0 })
eq('la 4e = semaine 2 jour 1', run.locate(3), { weekIndex: 1, workoutIndex: 0 })
eq('la dernière = semaine 9 jour 3', run.locate(26), { weekIndex: 8, workoutIndex: 2 })
eq('au-delà du plan', run.locate(27), null)
eq('aller-retour index ↔ position', run.indexOf(4, 2), 14)
eq('la dernière est marquée comme telle', run.getWorkout(26).isFinal, true)
eq('l’avant-dernière ne l’est pas', run.getWorkout(25).isFinal, false)
eq('début de semaine, pour refaire une semaine', run.firstIndexOfWeek(4), 12)

// ---------- Migration de l'état sauvegardé ----------
// C'est la progression réelle de quelqu'un : une migration ratée l'efface en silence.

// Un v2 crédible : en plein Niveau 2, 4 séances faites, avant l'arrivée des objectifs.
const V2 = {
  version: 2,
  createdAt: '2026-07-01T10:00:00.000Z',
  goal: 100,
  restSec: 60,
  levelIndex: 1,
  dayIndex: 4,
  lastSessionDate: '2026-07-14T10:00:00.000Z',
  nextDate: '2026-07-16T10:00:00.000Z',
  maxHistory: [{ date: '2026-07-01T10:00:00.000Z', reps: 24, kind: 'initial' }],
  sessions: [
    { levelIndex: 1, dayIndex: 0, isTest: false, total: 62, date: '2026-07-06T10:00:00.000Z' },
    { levelIndex: 1, dayIndex: 1, isTest: false, total: 65, date: '2026-07-08T10:00:00.000Z' },
    { levelIndex: 1, dayIndex: 2, isTest: false, total: 68, date: '2026-07-11T10:00:00.000Z' },
    { levelIndex: 1, dayIndex: 3, isTest: false, total: 70, date: '2026-07-14T10:00:00.000Z' },
  ],
  finished: false,
}

section('Migration v2 (état à plat, sans objectifs)')
{
  const m = hydrate(V2)
  eq('version à jour', m.version, STATE_VERSION)
  eq('objectif pompes déduit : pas de retour à l’onboarding', m.goals, ['pushups'])
  eq('niveau conservé', m.programs.pushups.levelIndex, 1)
  eq('jour conservé', m.programs.pushups.dayIndex, 4)
  eq('séances conservées', m.programs.pushups.sessions.length, 4)
  eq('historique de max conservé', m.programs.pushups.maxHistory, V2.maxHistory)
  eq('prochaine date conservée', m.programs.pushups.nextDate, V2.nextDate)
  eq('dernière séance conservée', m.programs.pushups.lastSessionDate, V2.lastSessionDate)
  eq('date de création conservée', m.createdAt, V2.createdAt)
  eq('plus rien à plat', [m.levelIndex, m.dayIndex, m.sessions, m.finished], [undefined, undefined, undefined, undefined])
  eq('champs morts retirés', [m.goal, m.restSec], [undefined, undefined])
}

section('Migration v3 (objectifs déjà là, état des pompes encore à plat)')
{
  const v3 = { ...V2, version: 3, goals: ['pushups', 'handstand'] }
  const m = hydrate(v3)
  eq('objectifs préservés tels quels', m.goals, ['pushups', 'handstand'])
  eq('niveau conservé', m.programs.pushups.levelIndex, 1)
  eq('séances conservées', m.programs.pushups.sessions.length, 4)
}

section('Migration : quelqu’un qui n’a jamais fait le test initial')
{
  const m = hydrate({ version: 2, createdAt: '2026-07-01T10:00:00.000Z', levelIndex: null, sessions: [], maxHistory: [] })
  eq('pas d’objectif déduit → onboarding', m.goals, [])
  eq('programme vierge', m.programs.pushups.levelIndex, null)
}

section('Migration : un v4 ne bouge pas (idempotence)')
{
  const once = hydrate(V2)
  const twice = hydrate(once)
  eq('rejouer la migration ne change rien', twice, once)
}

section('Migration : état corrompu ou partiel')
{
  const m = hydrate({})
  eq('objet vide → état neuf jouable', [m.goals, m.programs.pushups.levelIndex], [[], null])
  const p = hydrate({ version: 4, goals: ['pushups'], programs: { pushups: { levelIndex: 2 } } })
  eq('programme incomplet complété', p.programs.pushups.dayIndex, 0)
  eq('champ existant préservé', p.programs.pushups.levelIndex, 2)
  eq('tableaux manquants recréés', p.programs.pushups.sessions, [])
}

section('État neuf')
{
  const f = freshState()
  eq('aucun objectif', f.goals, [])
  eq('pompes prêtes mais non commencées', [f.programs.pushups.levelIndex, f.programs.pushups.dayIndex], [null, 0])
}

// ---------- Ce qui est validé (T7) ----------

section('Validé = fait, pas « le curseur est passé par là »')
{
  // Le cas qui a motivé le ticket : on saute les 10 premiers jours et on fait le 11e.
  const sauté = [{ levelIndex: 0, dayIndex: 10, isTest: false, total: 30 }]
  eq('les jours sautés ne sont pas validés', countPushupDone(sauté), 1)
  eq('le jour 1 reste gris', pushupStatuses(sauté).get(pushupKey(0, 0)), undefined)
  eq('le jour fait est validé', pushupStatuses(sauté).get(pushupKey(0, 10)), DONE)

  const séquentiel = [0, 1, 2].map((d) => ({ levelIndex: 0, dayIndex: d, isTest: false }))
  eq('une progression séquentielle s’affiche à l’identique', countPushupDone(séquentiel), 3)
}

section('Refaire un jour ne le compte pas deux fois')
{
  const refait = [
    { levelIndex: 0, dayIndex: 3, isTest: false, total: 20 },
    { levelIndex: 0, dayIndex: 3, isTest: false, total: 24 },
    { levelIndex: 0, dayIndex: 4, isTest: false, total: 26 },
  ]
  eq('2 séances distinctes pour 3 entrées', countPushupDone(refait), 2)
  eq('le compteur ne dépasse jamais le programme', countPushupDone(
    remainingDays(0, 0).concat(remainingDays(0, 0)).map((d) => ({ ...d, isTest: false })),
  ) <= TOTAL_DAYS, true)
}

section('Un test raté n’est pas un test validé')
{
  const raté = [{ levelIndex: 0, dayIndex: 10, isTest: true, passed: false, total: 14 }]
  eq('tenté, pas validé', pushupStatuses(raté).get(pushupKey(0, 10)), TRIED)
  eq('il ne compte pas dans le total', countPushupDone(raté), 0)

  const puisRéussi = [...raté, { levelIndex: 0, dayIndex: 10, isTest: true, passed: true, total: 21 }]
  eq('le réussir ensuite le valide', pushupStatuses(puisRéussi).get(pushupKey(0, 10)), DONE)

  const puisRaté = [...puisRéussi, { levelIndex: 0, dayIndex: 10, isTest: true, passed: false, total: 12 }]
  eq('le rater après ne le dévalide pas', pushupStatuses(puisRaté).get(pushupKey(0, 10)), DONE)
}

section('Les niveaux ne se mélangent pas')
{
  const deux = [
    { levelIndex: 0, dayIndex: 2, isTest: false },
    { levelIndex: 1, dayIndex: 2, isTest: false },
  ]
  eq('même jour, niveaux différents = deux séances', countPushupDone(deux), 2)
}

section('Course : une séance terminée est une séance validée')
{
  const r = [{ index: 0 }, { index: 5 }, { index: 5 }]
  eq('doublon ignoré', countRunDone(r), 2)
  eq('la 6e est validée', runDone(r).has(5), true)
  eq('la 2e ne l’est pas', runDone(r).has(1), false)
  eq('semaine 2 séance 1 = index 3', run.indexOf(1, 0), 3)
  eq('index et position se répondent', run.locate(run.indexOf(4, 2)), { weekIndex: 4, workoutIndex: 2 })
}

section('Historique douteux : on ne plante pas')
{
  eq('sans historique', countPushupDone(undefined), 0)
  eq('entrées incomplètes ignorées', countPushupDone([{}, { levelIndex: 0 }, null]), 0)
  eq('course : index non entier ignoré', countRunDone([{ index: null }, { index: '2' }]), 0)
}

// ---------- Abandonner une séance (T8) ----------

section('Une séance abandonnée n’est pas une séance faite')
{
  const lâchée = [{ levelIndex: 0, dayIndex: 2, isTest: false, total: 9, abandoned: true }]
  eq('statut à part', pushupStatuses(lâchée).get(pushupKey(0, 2)), ABANDONED)
  eq('elle ne valide pas le jour', countPushupDone(lâchée), 0)

  const puisFaite = [...lâchée, { levelIndex: 0, dayIndex: 2, isTest: false, total: 24 }]
  eq('la refaire en entier la valide', pushupStatuses(puisFaite).get(pushupKey(0, 2)), DONE)
  eq('et elle compte pour une', countPushupDone(puisFaite), 1)

  const lâchéeAprès = [...puisFaite, { levelIndex: 0, dayIndex: 2, isTest: false, total: 4, abandoned: true }]
  eq('l’abandonner ensuite ne la dévalide pas', pushupStatuses(lâchéeAprès).get(pushupKey(0, 2)), DONE)

  const testLâché = [{ levelIndex: 0, dayIndex: 10, isTest: true, passed: null, total: 8, abandoned: true }]
  eq('un test lâché n’est pas un test raté', pushupStatuses(testLâché).get(pushupKey(0, 10)), ABANDONED)
  const testAussiRaté = [...testLâché, { levelIndex: 0, dayIndex: 10, isTest: true, passed: false, total: 15 }]
  eq('mais un test vraiment tenté prime sur l’abandon', pushupStatuses(testAussiRaté).get(pushupKey(0, 10)), TRIED)
}

section('Statut d’une séance')
{
  eq('séance normale terminée', sessionStatus({ isTest: false }), DONE)
  eq('test réussi', sessionStatus({ isTest: true, passed: true }), DONE)
  eq('test raté', sessionStatus({ isTest: true, passed: false }), TRIED)
  eq('abandon', sessionStatus({ isTest: false, abandoned: true }), ABANDONED)
  eq('historique d’avant T8 : rien ne change', sessionStatus({ isTest: false, abandoned: undefined }), DONE)
}

section('Message d’abandon : jamais vide, jamais aléatoire')
{
  const ratios = [0, 0.01, 0.19, 0.2, 0.34, 0.49, 0.5, 0.75, 1, 1.4]
  eq('un message pour chaque part de séance', ratios.every((r) => abandonMessage(r, 3).length > 0), true)
  eq('deux fois le même appel, le même message', abandonMessage(0.6, 7), abandonMessage(0.6, 7))
  eq('ratio absurde : on ne plante pas', [abandonMessage(NaN, 0), abandonMessage(-1, 0)].every((m) => m.length > 0), true)
  eq('seed absurde : on ne plante pas', abandonMessage(0.3, NaN).length > 0, true)
  eq('le palier haut ne dit pas la même chose que le bas', abandonMessage(0.9, 0) !== abandonMessage(0.05, 0), true)
}

section('Étirements proposés à partir de la moitié de la séance')
{
  eq('seuil documenté dans la data', STRETCH_THRESHOLD, 0.5)
  eq('pile la moitié : oui', shouldStretch(0.5), true)
  eq('juste en dessous : non', shouldStretch(0.49), false)
  eq('séance vide : non', shouldStretch(0), false)
  eq('ratio absurde : non', shouldStretch(NaN), false)
}

// ---------- Calendrier / journal (T9) ----------

// Dates construites en heure LOCALE : une séance du soir doit tomber sur le jour
// qu'affiche le téléphone, pas sur celui d'UTC.
const local = (y, m, d, h = 18) => new Date(y, m - 1, d, h, 0, 0).toISOString()

section('Le jour d’une séance, en heure locale')
{
  eq('un soir de juillet', dayKey(local(2026, 7, 29, 23)), '2026-07-29')
  eq('le petit matin', dayKey(local(2026, 7, 30, 1)), '2026-07-30')
  eq('un objet Date passe aussi', dayKey(new Date(2026, 0, 5)), '2026-01-05')
  eq('date illisible : pas de clé', dayKey('pas une date'), null)
  eq('date absente : pas de clé', dayKey(undefined), null)
}

const JOURNAL_STATE = {
  goals: ['pushups', 'handstand', 'core', 'running'],
  programs: {
    pushups: {
      sessions: [
        { levelIndex: 0, dayIndex: 0, isTest: false, total: 20, date: local(2026, 7, 20, 9) },
        { levelIndex: 0, dayIndex: 1, isTest: false, total: 11, abandoned: true, date: local(2026, 7, 22, 9) },
        { levelIndex: 0, dayIndex: 10, isTest: true, passed: false, total: 14, date: local(2026, 7, 24, 9) },
      ],
      maxHistory: [
        { date: local(2026, 7, 1, 8), reps: 12, kind: 'initial' },
        { date: local(2026, 7, 24, 9), reps: 14, kind: 'test', level: 1 },
      ],
    },
    handstand: {
      sessions: [{ levelIndex: 0, mode: 'hold', volume: 48, date: local(2026, 7, 20, 18) }],
      maxHistory: [{ date: local(2026, 7, 2, 8), sec: 22, levelIndex: 0 }],
    },
    core: { sessions: [{ mode: 'hold', volume: 40, best: 12, date: local(2026, 7, 20, 19) }] },
    running: { sessions: [{ index: 3, weekNumber: 2, runSec: 540, date: local(2026, 6, 30, 7) }] },
  },
}

section('Journal : chaque jour dit ce qui a été fait')
{
  const j = journalByDay(JOURNAL_STATE)
  eq('trois exos le même jour', j.get('2026-07-20').length, 3)
  eq('rangés dans l’ordre où ils ont été faits',
    j.get('2026-07-20').map((e) => e.goalId), ['pushups', 'handstand', 'core'])
  eq('l’abandon garde son statut', j.get('2026-07-22')[0].status, ABANDONED)
  eq('le test raté aussi', j.get('2026-07-24')[0].status, TRIED)
  eq('un test de niveau n’est pas compté deux fois', j.get('2026-07-24').length, 1)
  eq('le test initial est au journal', j.get('2026-07-01').map((e) => e.title), ['Test initial'])
  eq('le test de tenue max aussi', j.get('2026-07-02')[0].detail, '22 s')
  eq('la course est nommée par sa place au plan', j.get('2026-06-30')[0].title, 'Semaine 2 · Séance 1')
  eq('un jour sans rien n’existe pas', j.has('2026-07-21'), false)
  eq('détail d’une séance de pompes', j.get('2026-07-20')[0].detail, '20 pompes')
}

section('Journal : état vide ou abîmé')
{
  eq('état vide', journalByDay({}).size, 0)
  eq('état absent', journalByDay(undefined).size, 0)
  eq('séance sans date : ignorée', journalByDay({
    programs: { pushups: { sessions: [{ levelIndex: 0, dayIndex: 0 }] } },
  }).size, 0)
  eq('programme inconnu au bataillon : on ne plante pas', journalByDay({
    programs: { pushups: { sessions: [{ levelIndex: 99, dayIndex: 3, date: local(2026, 7, 20) }] } },
  }).get('2026-07-20')[0].title, 'Pompes · Jour 4')
}

section('Grille d’un mois : semaines qui commencent le lundi')
{
  const juillet = monthGrid(2026, 6)
  eq('des semaines entières', juillet.length % 7, 0)
  eq('les 31 jours de juillet', juillet.filter((c) => c.inMonth).length, 31)
  eq('la 1re case est un lundi', new Date(juillet[0].key + 'T12:00:00').getDay(), 1)
  eq('la grille commence avant le 1er', juillet[0].key <= '2026-07-01', true)
  eq('les voisins bouchent les trous', juillet.some((c) => !c.inMonth), true)
  eq('février bissextile', monthGrid(2028, 1).filter((c) => c.inMonth).length, 29)
  eq('février normal', monthGrid(2026, 1).filter((c) => c.inMonth).length, 28)
  eq('pas de doublon de jour', new Set(juillet.map((c) => c.key)).size, juillet.length)
}

section('Changer de mois sans se tromper d’année')
{
  eq('décembre → janvier suivant', shiftMonth({ year: 2026, month: 11 }, 1), { year: 2027, month: 0 })
  eq('janvier → décembre précédent', shiftMonth({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 })
  eq('mois courant', shiftMonth({ year: 2026, month: 6 }, 1), { year: 2026, month: 7 })
}

section('Résumé du mois affiché')
{
  const j = journalByDay(JOURNAL_STATE)
  eq('juillet : 5 jours, 7 séances', monthSummary(j, monthGrid(2026, 6)), { days: 5, entries: 7 })
  eq('juin : la séance de course du 30', monthSummary(j, monthGrid(2026, 5)), { days: 1, entries: 1 })
  eq('un mois vide ne compte rien', monthSummary(j, monthGrid(2026, 8)), { days: 0, entries: 0 })
  // La grille de juillet affiche le 30 juin (lundi de la 1re semaine) : il est
  // visible, avec ses points, mais il compte pour juin — pas pour juillet.
  const bordure = monthGrid(2026, 6).filter((c) => !c.inMonth && j.has(c.key))
  eq('le jour voisin est bien affiché', bordure.map((c) => c.key), ['2026-06-30'])
  eq('mais il n’est pas compté dans le mois', monthSummary(j, bordure).days, 0)
}

// ---------- Activités libres (T10) ----------

const NOW = local(2026, 7, 30, 15) // « aujourd'hui » de référence : 30 juillet 2026, 15 h

section('Le nom d’une activité : espaces normalisés, casse et accents gardés')
{
  eq('espaces en trop', normalizeType('  Marche   nordique '), 'Marche nordique')
  eq('la casse est celle qu’on a tapée', normalizeType('MARCHE'), 'MARCHE')
  eq('rien tapé', normalizeType('   '), '')
  eq('pas de nom du tout', normalizeType(undefined), '')
  eq('borné en longueur', normalizeType('a'.repeat(80)).length, 40)
}

section('Deux façons d’écrire la même activité sont la même activité')
{
  eq('la casse ne compte pas', typeKey('Marche'), typeKey('MARCHE'))
  eq('les accents non plus', typeKey('Vélo'), typeKey('velo'))
  eq('marche ≠ course', typeKey('Marche') === typeKey('Course'), false)
}

section('Mesures : une case vide n’est pas un zéro')
{
  eq('0 disparaît', cleanMeasures({ distance: 0, duration: 45 }), { duration: 45 })
  eq('négatif refusé', cleanMeasures({ distance: -3 }), {})
  eq('texte refusé', cleanMeasures({ distance: 'beaucoup' }), {})
  eq('virgule française acceptée', cleanMeasures({ distance: '5,2' }), { distance: 5.2 })
  eq('mesure inconnue ignorée', cleanMeasures({ bidon: 12, distance: 3 }), { distance: 3 })
  eq('durée arrondie à la minute', cleanMeasures({ duration: 45.6 }), { duration: 46 })
  eq('distance arrondie au centième', cleanMeasures({ distance: 5.2349 }), { distance: 5.23 })
  eq('plafonnée à son max', cleanMeasures({ distance: 999999 }), { distance: 1000 })
  eq('rien du tout', cleanMeasures(null), {})
}

section('La date : on remplit l’agenda après coup, jamais à l’avance')
{
  eq('aujourd’hui garde l’heure qu’il est', dayKey(dayToISO('2026-07-30', NOW)), '2026-07-30')
  eq('l’heure réelle est conservée', dayToISO('2026-07-30', NOW), new Date(NOW).toISOString())
  eq('un jour passé tombe le bon jour', dayKey(dayToISO('2026-07-22', NOW)), '2026-07-22')
  eq('daté de midi, pas de minuit', new Date(dayToISO('2026-07-22', NOW)).getHours(), 12)
  eq('date inexistante', dayToISO('2026-02-31', NOW), null)
  eq('date illisible', dayToISO('hier', NOW), null)
  eq('demain est dans le futur', isFutureDay('2026-07-31', NOW), true)
  eq('aujourd’hui ne l’est pas', isFutureDay('2026-07-30', NOW), false)
  eq('avant-hier non plus', isFutureDay('2026-07-28', NOW), false)
}

section('Ce qui empêche d’enregistrer, dit en français')
{
  const ok = { type: 'Marche', day: '2026-07-30' }
  eq('une activité valable passe', activityError(ok, NOW), null)
  eq('sans nom, non', Boolean(activityError({ ...ok, type: ' ' }, NOW)), true)
  eq('dans le futur, non', Boolean(activityError({ ...ok, day: '2026-08-01' }, NOW)), true)
  eq('date inexistante, non', Boolean(activityError({ ...ok, day: '2026-02-31' }, NOW)), true)
}

section('Noter, corriger, supprimer')
{
  const l0 = []
  const l1 = addActivity(l0, { type: ' Marche ', day: '2026-07-28', measures: { distance: '5,2', duration: 45 }, note: '  Sous la pluie ' }, NOW)
  eq('la liste de départ n’est pas modifiée', l0.length, 0)
  eq('une activité de plus', l1.length, 1)
  eq('nom normalisé', l1[0].type, 'Marche')
  eq('note taillée', l1[0].note, 'Sous la pluie')
  eq('mesures nettoyées', l1[0].measures, { duration: 45, distance: 5.2 })
  eq('datée du bon jour', dayKey(l1[0].date), '2026-07-28')

  const refus = addActivity(l1, { type: '', day: '2026-07-28' }, NOW)
  eq('une activité invalide n’entre pas', refus.length, 1)

  const l2 = addActivity(l1, { type: 'Course', day: '2026-07-30', measures: { distance: 3 } }, NOW)
  eq('deux entrées', l2.length, 2)
  eq('la plus récente d’abord', l2.map((a) => a.type), ['Course', 'Marche'])
  eq('des identifiants distincts', new Set(l2.map((a) => a.id)).size, 2)

  const id = l2[1].id
  const l3 = updateActivity(l2, id, { type: 'Marche rapide', day: '2026-07-28', measures: { distance: 6 }, note: '' }, NOW)
  eq('le nom est corrigé', l3.find((a) => a.id === id).type, 'Marche rapide')
  eq('la mesure aussi', l3.find((a) => a.id === id).measures, { distance: 6 })
  eq('l’identifiant ne bouge pas', l3.length, 2)
  eq('le jour inchangé garde l’instant d’origine',
    l3.find((a) => a.id === id).date, l2.find((a) => a.id === id).date)

  const l4 = updateActivity(l3, id, { type: 'Marche', day: '2026-07-25' }, NOW)
  eq('changer de jour redate l’entrée', dayKey(l4.find((a) => a.id === id).date), '2026-07-25')
  eq('et la reclasse', l4.map((a) => a.type), ['Course', 'Marche'])

  eq('corriger une entrée qui n’existe pas ne casse rien', updateActivity(l4, 'fantôme', { type: 'X', day: '2026-07-30' }, NOW).length, 2)
  eq('une correction invalide est refusée', updateActivity(l4, id, { type: '', day: '2026-07-30' }, NOW).find((a) => a.id === id).type, 'Marche')

  eq('supprimer enlève une entrée', removeActivity(l4, id).length, 1)
  eq('supprimer un fantôme n’enlève rien', removeActivity(l4, 'fantôme').length, 2)
}

// Un carnet déjà bien rempli : c'est lui qui nourrit suggestions et mémoire des mesures.
const CARNET = [
  { id: 'a1', type: 'Marche', date: local(2026, 7, 10, 12), measures: { distance: 4, duration: 50 } },
  { id: 'a2', type: 'Marche', date: local(2026, 7, 15, 12), measures: { distance: 5, duration: 60 } },
  { id: 'a3', type: 'marche rapide', date: local(2026, 7, 18, 12), measures: { duration: 30 } },
  { id: 'a4', type: 'Vélo', date: local(2026, 7, 20, 12), measures: { distance: 22, elevation: 300 } },
  { id: 'a5', type: 'Muscu', date: local(2026, 7, 25, 12), measures: { sets: 4, reps: 40, weight: 20 } },
  { id: 'a6', type: 'Marche', date: local(2026, 7, 28, 12), measures: { distance: 6, duration: 70 } },
]

section('L’app apprend les activités de la personne')
{
  const t = knownTypes(CARNET)
  eq('la plus notée en tête', t[0].type, 'Marche')
  eq('comptée trois fois', t[0].count, 3)
  eq('quatre types distincts', t.length, 4)
  eq('« marche rapide » n’est pas « Marche »', t.map((x) => x.type).includes('marche rapide'), true)
}

section('Les suggestions : ce qu’on a déjà noté et qui pourrait correspondre')
{
  eq('« mar » propose les deux marches', suggestTypes(CARNET, 'mar'), ['Marche', 'marche rapide'])
  eq('« vel » retrouve « Vélo » malgré l’accent', suggestTypes(CARNET, 'vel'), ['Vélo'])
  eq('« RAPIDE » cherche aussi au milieu', suggestTypes(CARNET, 'RAPIDE'), ['marche rapide'])
  eq('déjà tapé en entier : rien à proposer de plus', suggestTypes(CARNET, 'Vélo'), [])
  eq('champ vide : les plus fréquentes', suggestTypes(CARNET, '').slice(0, 2), ['Marche', 'Muscu'])
  eq('rien ne correspond', suggestTypes(CARNET, 'natation'), [])
  eq('carnet vide', suggestTypes([], 'mar'), [])
  eq('nombre borné', suggestTypes(CARNET, '', 2).length, 2)
}

section('Retaper « Marche » repropose des km, pas des séries')
{
  eq('marche : distance + durée', measuresForType(CARNET, 'Marche'), ['duration', 'distance'])
  eq('vélo : distance + dénivelé', measuresForType(CARNET, 'Vélo'), ['distance', 'elevation'])
  eq('muscu : séries, reps, poids', measuresForType(CARNET, 'Muscu'), ['reps', 'sets', 'weight'])
  eq('la casse ne change rien', measuresForType(CARNET, 'MARCHE'), ['duration', 'distance'])
  eq('type inconnu : les mesures par défaut', measuresForType(CARNET, 'Natation'), DEFAULT_MEASURES)
  eq('type vide : idem', measuresForType(CARNET, ''), DEFAULT_MEASURES)
  eq('carnet vide : idem', measuresForType([], 'Marche'), DEFAULT_MEASURES)
  // On ne se souvient que des dernières fois : une mesure remplie une seule fois,
  // il y a longtemps, ne doit pas revenir à vie.
  const vieux = [
    { id: 'v0', type: 'Marche', date: local(2026, 1, 1, 12), measures: { calories: 200 } },
    ...Array.from({ length: 5 }, (_, i) => (
      { id: `v${i + 1}`, type: 'Marche', date: local(2026, 7, 10 + i, 12), measures: { distance: 3 } }
    )),
  ]
  eq('la vieille mesure est oubliée', measuresForType(vieux, 'Marche'), ['distance'])
}

section('Comment ça s’écrit à l’écran')
{
  eq('moins d’une heure', formatDuration(45), '45 min')
  eq('pile une heure', formatDuration(60), '1 h')
  eq('une heure et demie', formatDuration(90), '1 h 30')
  eq('les minutes sur deux chiffres', formatDuration(65), '1 h 05')
  eq('zéro', formatDuration(0), '0 min')
  eq('la virgule est française', formatMeasure('distance', 5.2), '5,2 km')
  eq('pas de décimale inutile', formatMeasure('distance', 5), '5 km')
  eq('le dénivelé est entier', formatMeasure('elevation', 300), '300 m')
  eq('une mesure sans unité se nomme', formatMeasure('reps', 40), '40 répétitions')
  eq('mesure inconnue', formatMeasure('bidon', 3), null)
  eq('résumé dans l’ordre des données',
    activitySummary({ measures: { distance: 5.2, duration: 45 } }), '45 min · 5,2 km')
  eq('sans mesure, rien', activitySummary({ measures: {} }), '')
  eq('activité abîmée', activitySummary(null), '')
}

section('Les jours d’une période (récap T11)')
{
  eq('trois jours', daysBetween('2026-07-28', '2026-07-30'), ['2026-07-28', '2026-07-29', '2026-07-30'])
  eq('un seul jour', daysBetween('2026-07-30', '2026-07-30'), ['2026-07-30'])
  eq('à cheval sur deux mois', daysBetween('2026-06-29', '2026-07-02').length, 4)
  eq('février bissextile', daysBetween('2028-02-27', '2028-03-01'), ['2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01'])
  eq('à l’envers : rien', daysBetween('2026-07-30', '2026-07-28'), [])
  eq('dates illisibles : rien', daysBetween('hier', 'demain'), [])
}

section('Une date qui n’existe pas n’est pas décalée en silence')
{
  eq('le 31 février est refusé', parseDayKey('2026-02-31'), null)
  eq('le 29 février d’une année non bissextile aussi', parseDayKey('2026-02-29'), null)
  eq('mais il existe en 2028', dayKey(parseDayKey('2028-02-29')), '2028-02-29')
  eq('format libre refusé', parseDayKey('2026-7-3'), null)
}

section('Les activités apparaissent dans le calendrier, comme le reste')
{
  const avec = { ...JOURNAL_STATE, activities: [
    { id: 'x1', type: 'Marche', date: local(2026, 7, 20, 12), measures: { distance: 5.2, duration: 45 }, note: 'Au bord de l’eau' },
    { id: 'x2', type: 'Vélo', date: local(2026, 7, 26, 12), measures: { distance: 22 } },
  ] }
  const j = journalByDay(avec)
  eq('quatre entrées le 20 juillet', j.get('2026-07-20').length, 4)
  eq('un jour qui n’avait rien en a maintenant', j.get('2026-07-26').map((e) => e.title), ['Vélo'])
  const marche = j.get('2026-07-20').find((e) => e.goalId === 'activity')
  eq('le résumé est là', marche.detail, '45 min · 5,2 km')
  eq('la note aussi', marche.note, 'Au bord de l’eau')
  eq('validée, comme une séance faite', marche.status, DONE)
  eq('le mois les compte', monthSummary(j, monthGrid(2026, 6)), { days: 6, entries: 9 })
  eq('sans activités, rien ne change',
    monthSummary(journalByDay(JOURNAL_STATE), monthGrid(2026, 6)), { days: 5, entries: 7 })
}

section('Journal : des activités abîmées ne cassent pas le calendrier')
{
  const cassé = { ...JOURNAL_STATE, activities: [
    { id: 'k1', type: 'Marche', date: 'pas une date' },
    { id: 'k2', date: local(2026, 7, 21, 12) }, // sans nom
    null,
    { id: 'k4', type: 'Vélo', date: local(2026, 7, 21, 12), measures: 'n’importe quoi' },
  ] }
  const j = journalByDay(cassé)
  eq('la date illisible est écartée', [...j.values()].flat().some((e) => e.date === 'pas une date'), false)
  eq('sans nom, une activité reste lisible', j.get('2026-07-21').map((e) => e.title), ['Activité', 'Vélo'])
  eq('des mesures illisibles ne plantent pas', j.get('2026-07-21')[1].detail, null)
  eq('activities absent : comme avant', journalByDay({ ...JOURNAL_STATE, activities: undefined }).size, 6)
  eq('activities pas un tableau : idem', journalByDay({ ...JOURNAL_STATE, activities: 'oups' }).size, 6)
}

section('Migration v4 -> v5 : les activités arrivent sans rien casser')
{
  const m = hydrate({ version: 4, goals: ['pushups'], programs: { pushups: { levelIndex: 1, dayIndex: 3 } } })
  eq('version à jour', m.version, STATE_VERSION)
  eq('carnet vide au départ', m.activities, [])
  eq('la progression est intacte', m.programs.pushups.dayIndex, 3)
  const gardées = hydrate({ version: 5, activities: [{ id: 'a1', type: 'Marche', date: '2026-07-28T12:00:00.000Z' }] })
  eq('un carnet existant est gardé', gardées.activities.length, 1)
  eq('un carnet abîmé repart à vide', hydrate({ version: 5, activities: 'oups' }).activities, [])
  eq('état neuf : carnet vide', freshState().activities, [])
}

// ---------- Récap d'une période (T11) ----------

// Un état complet : 4 modules qui ont tourné, et un carnet d'activités.
const RECAP_STATE = {
  ...JOURNAL_STATE,
  activities: [
    { id: 'r1', type: 'Marche', date: local(2026, 7, 20, 12), measures: { distance: 5.2, duration: 45 } },
    { id: 'r2', type: 'marche', date: local(2026, 7, 21, 12), measures: { distance: 3.8, duration: 40 } },
    { id: 'r3', type: 'Vélo', date: local(2026, 7, 23, 12), measures: { distance: 22.4, elevation: 310 } },
    { id: 'r4', type: 'Muscu', date: local(2026, 7, 25, 12), measures: { reps: 40, sets: 4, weight: 20 } },
    { id: 'r5', type: 'Marche', date: local(2026, 8, 3, 12), measures: { distance: 2, duration: 25 } },
  ],
}

section('Une période à l’envers reste une période')
{
  eq('dans l’ordre', normalizeRange('2026-07-01', '2026-07-31'), { from: '2026-07-01', to: '2026-07-31' })
  eq('à l’envers : remise d’aplomb', normalizeRange('2026-07-31', '2026-07-01'), { from: '2026-07-01', to: '2026-07-31' })
  eq('un seul jour', normalizeRange('2026-07-10', '2026-07-10'), { from: '2026-07-10', to: '2026-07-10' })
  eq('date illisible', normalizeRange('hier', '2026-07-10'), null)
  eq('date inexistante', normalizeRange('2026-02-31', '2026-07-10'), null)
}

section('Ce qu’il y a eu entre deux dates : les bornes sont incluses')
{
  const dedans = entriesBetween(RECAP_STATE, '2026-07-20', '2026-07-21').map((e) => e.day)
  eq('du 20 au 21', dedans, ['2026-07-20', '2026-07-20', '2026-07-20', '2026-07-20', '2026-07-21'])
  eq('le premier jour compte', entriesBetween(RECAP_STATE, '2026-07-24', '2026-07-24').length, 1)
  eq('le dernier aussi', entriesBetween(RECAP_STATE, '2026-06-30', '2026-06-30').length, 1)
  eq('une période vide', entriesBetween(RECAP_STATE, '2026-05-01', '2026-05-31'), [])
  eq('rangé dans l’ordre du temps',
    entriesBetween(RECAP_STATE, '2026-07-20', '2026-07-20').map((e) => e.goalId),
    ['pushups', 'activity', 'handstand', 'core'])
  eq('bornes illisibles', entriesBetween(RECAP_STATE, 'hier', 'demain'), [])
}

section('Les jours actifs, et la plus longue série')
{
  eq('sans doublon et triés',
    activeDays(entriesBetween(RECAP_STATE, '2026-07-20', '2026-07-21')),
    ['2026-07-20', '2026-07-21'])
  eq('aucun jour', longestStreak([]), 0)
  eq('un seul jour', longestStreak(['2026-07-20']), 1)
  eq('deux jours de suite', longestStreak(['2026-07-20', '2026-07-21']), 2)
  eq('un trou casse la série', longestStreak(['2026-07-20', '2026-07-21', '2026-07-24']), 2)
  eq('c’est la PLUS longue qui compte',
    longestStreak(['2026-07-01', '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-20']), 3)
  eq('à cheval sur deux mois', longestStreak(['2026-06-30', '2026-07-01', '2026-07-02']), 3)
  eq('le désordre ne trompe pas', longestStreak(['2026-07-22', '2026-07-20', '2026-07-21']), 3)
  eq('des doublons ne gonflent pas la série', longestStreak(['2026-07-20', '2026-07-20', '2026-07-21']), 2)
  // Le passage à l'heure d'hiver 2026 (dimanche 25 octobre) : ce jour-là fait
  // 25 h. Compter en millisecondes casserait la série ici.
  eq('un changement d’heure ne casse rien', longestStreak(['2026-10-24', '2026-10-25', '2026-10-26']), 3)
  eq('le passage à l’heure d’été non plus', longestStreak(['2026-03-28', '2026-03-29', '2026-03-30']), 3)
  eq('29 février d’une année bissextile', longestStreak(['2028-02-28', '2028-02-29', '2028-03-01']), 3)
}

section('Totaux par activité : les km et le temps se cumulent, pas les kilos')
{
  const t = activityTotals(RECAP_STATE.activities, '2026-07-01', '2026-07-31')
  eq('trois types en juillet', t.map((x) => x.type), ['marche', 'Muscu', 'Vélo'])
  // « marche » et pas « Marche » : c'est la dernière façon dont on l'a écrit DANS
  // la période, comme dans les suggestions. Le carnet suit la personne.
  eq('« marche » et « Marche » sont le même type', t[0].count, 2)
  eq('les km s’additionnent', t[0].measures.distance, 9)
  eq('le temps aussi', t[0].measures.duration, 85)
  eq('le vélo garde son dénivelé', t[2].measures, { distance: 22.4, elevation: 310 })
  eq('reps et séries se cumulent', [t[1].measures.reps, t[1].measures.sets], [40, 4])
  eq('le poids ne se cumule PAS', t[1].measures.weight, undefined)
  eq('la marche d’août est hors période', t.map((x) => x.count).reduce((a, b) => a + b, 0), 4)

  const bornes = activityTotals(RECAP_STATE.activities, '2026-07-21', '2026-07-23')
  eq('la période resserre', bornes.map((x) => x.type), ['Vélo', 'marche'])
  eq('et les totaux avec', bornes.find((x) => x.key === 'marche').measures.distance, 3.8)

  eq('carnet vide', activityTotals([], '2026-07-01', '2026-07-31'), [])
  eq('carnet abîmé', activityTotals('oups', '2026-07-01', '2026-07-31'), [])
  eq('période illisible', activityTotals(RECAP_STATE.activities, 'hier', 'demain'), [])
  eq('une activité sans date est écartée',
    activityTotals([{ id: 'z', type: 'Marche' }], '2026-07-01', '2026-07-31'), [])
  eq('des mesures illisibles ne plantent pas',
    activityTotals([{ id: 'z', type: 'X', date: local(2026, 7, 10, 12), measures: 'oups' }], '2026-07-01', '2026-07-31')[0].measures, {})
}

section('Ce que les programmes ont produit')
{
  const p = programTotals(RECAP_STATE, '2026-07-01', '2026-07-31')
  const par = Object.fromEntries(p.map((x) => [x.goalId, x]))
  eq('la course de juin n’est pas dans juillet', p.map((x) => x.goalId), ['pushups', 'handstand', 'core'])
  eq('une séance validée, un abandon, un test raté',
    [par.pushups.done, par.pushups.abandoned, par.pushups.tried], [1, 1, 1])
  eq('les pompes se cumulent, abandon compris', par.pushups.reps, 45)
  eq('les secondes tenues', par.handstand.seconds, 48)
  eq('un module qui n’a rien fait n’apparaît pas', par.running, undefined)
  eq('mais il apparaît sur juin',
    programTotals(RECAP_STATE, '2026-06-01', '2026-06-30').map((x) => x.goalId), ['running'])
  eq('9 min courues en juin', programTotals(RECAP_STATE, '2026-06-01', '2026-06-30')[0].seconds, 540)
  eq('période vide : aucun module', programTotals(RECAP_STATE, '2026-05-01', '2026-05-31'), [])
  eq('état vide', programTotals({}, '2026-07-01', '2026-07-31'), [])
  eq('période illisible', programTotals(RECAP_STATE, 'hier', 'demain'), [])
}

section('Le bilan complet d’une période')
{
  const b = recap(RECAP_STATE, '2026-07-20', '2026-07-26')
  eq('sept jours dans la période', b.spanDays, 7)
  eq('six jours actifs', b.activeDays, 6)
  eq('six jours d’affilée', b.streak, 6)
  eq('tout ce qui a été fait', b.entries, 9)
  eq('trois types d’activité', b.activities.length, 3)
  eq('trois modules', b.programs.length, 3)
  eq('les bornes sont reprises', [b.from, b.to], ['2026-07-20', '2026-07-26'])

  const vide = recap(RECAP_STATE, '2026-05-01', '2026-05-31')
  eq('période sans rien : pas d’erreur', [vide.entries, vide.activeDays, vide.streak], [0, 0, 0])
  eq('mais la période existe', vide.spanDays, 31)
  eq('deux dates illisibles', recap(RECAP_STATE, 'hier', 'demain'), null)
  eq('un jour tout seul', recap(RECAP_STATE, '2026-07-20', '2026-07-20').entries, 4)
  eq('à l’envers : même bilan',
    recap(RECAP_STATE, '2026-07-26', '2026-07-20').entries, recap(RECAP_STATE, '2026-07-20', '2026-07-26').entries)
}

section('Les raccourcis de période')
{
  eq('7 jours : aujourd’hui compris', presetRange('7', RECAP_STATE, new Date(NOW)), { from: '2026-07-24', to: '2026-07-30' })
  eq('30 jours', presetRange('30', RECAP_STATE, new Date(NOW)), { from: '2026-07-01', to: '2026-07-30' })
  eq('ce mois part du 1er', presetRange('month', RECAP_STATE, new Date(NOW)), { from: '2026-07-01', to: '2026-07-30' })
  eq('« tout » remonte au premier jour enregistré',
    presetRange('all', RECAP_STATE, new Date(NOW)), { from: '2026-06-30', to: '2026-07-30' })
  eq('« tout » sur un état vierge : aujourd’hui',
    presetRange('all', freshState(), new Date(NOW)), { from: '2026-07-30', to: '2026-07-30' })
  eq('raccourci inconnu : 7 jours', presetRange('bidon', RECAP_STATE, new Date(NOW)), { from: '2026-07-24', to: '2026-07-30' })
  eq('premier jour enregistré', firstActiveDay(RECAP_STATE), '2026-06-30')
  eq('rien d’enregistré', firstActiveDay(freshState()), null)
  // Un mois de 31 jours puis un de 30 : « 30 jours » ne doit pas déborder.
  eq('à cheval sur deux mois', presetRange('30', RECAP_STATE, new Date(local(2026, 3, 5, 12))), { from: '2026-02-04', to: '2026-03-05' })
}

// ---------- Photos (T12) ----------
// Seule la partie sans navigateur est ici : les fiches. Le canvas et IndexedDB
// (`lib/photoStore`) se vérifient dans le navigateur.

section('Redimensionner : on réduit, on ne grossit jamais')
{
  eq('paysage réduit', fitWithin(4032, 3024, 1600), { width: 1600, height: 1200 })
  eq('portrait réduit', fitWithin(3024, 4032, 1600), { width: 1200, height: 1600 })
  eq('carré', fitWithin(2000, 2000, 1600), { width: 1600, height: 1600 })
  eq('déjà petite : intacte', fitWithin(800, 600, 1600), { width: 800, height: 600 })
  eq('pile à la limite : intacte', fitWithin(1600, 1200, 1600), { width: 1600, height: 1200 })
  eq('très allongée garde au moins 1 px', fitWithin(10000, 3, 1600).height, 1)
  eq('sans dimensions', fitWithin(0, 100, 1600), null)
  eq('dimensions absurdes', fitWithin(-4, -4, 1600), null)
  {
    // Le grand côté ne dépasse jamais la limite, et le rapport est conservé.
    const mauvais = []
    for (let w = 1; w <= 5000; w += 37) {
      for (const h of [w, Math.round(w / 3), w * 2]) {
        const r = fitWithin(w, h, MAX_EDGE)
        if (!r) continue
        if (Math.max(r.width, r.height) > MAX_EDGE) mauvais.push(`${w}x${h}`)
        const avant = w / h
        const apres = r.width / r.height
        if (Math.abs(avant - apres) / avant > 0.02) mauvais.push(`ratio ${w}x${h}`)
      }
    }
    eq('jamais au-dessus de la limite, rapport gardé', mauvais, [])
  }
}

section('Ce qu’on refuse d’ajouter')
{
  eq('une vraie image passe', photoError({ type: 'image/jpeg', size: 2_000_000 }), null)
  eq('un PNG aussi', photoError({ type: 'image/png', size: 500 }), null)
  eq('un PDF, non', Boolean(photoError({ type: 'application/pdf', size: 500 })), true)
  eq('une vidéo, non', Boolean(photoError({ type: 'video/mp4', size: 500 })), true)
  eq('trop lourd, non', Boolean(photoError({ type: 'image/jpeg', size: 80 * 1024 * 1024 })), true)
  eq('rien du tout, non', Boolean(photoError(null)), true)
  eq('sans type, non', Boolean(photoError({ size: 10 })), true)
}

section('La fiche d’une photo')
{
  const p = makePhoto({ day: '2026-07-22', width: 1600, height: 1200, bytes: 240_000 }, 'p1', new Date(NOW))
  eq('rangée au bon jour', p.day, '2026-07-22')
  eq('un jour passé est daté de midi', new Date(p.date).getHours(), 12)
  eq('les dimensions sont gardées', [p.width, p.height], [1600, 1200])
  eq('pas rattachée par défaut', p.activityId, null)

  const aujourdhui = makePhoto({ day: '2026-07-30' }, 'p2', new Date(NOW))
  eq('aujourd’hui garde l’heure qu’il est', aujourdhui.date, new Date(NOW).toISOString())

  eq('un jour illisible retombe sur aujourd’hui',
    makePhoto({ day: 'hier' }, 'p3', new Date(NOW)).day, '2026-07-30')
  eq('sans jour non plus on ne perd pas la photo',
    makePhoto({}, 'p4', new Date(NOW)).day, '2026-07-30')
  eq('sans identifiant : pas de fiche', makePhoto({ day: '2026-07-22' }, null, new Date(NOW)), null)
  eq('des tailles illisibles valent zéro',
    makePhoto({ day: '2026-07-22', width: 'grand', bytes: null }, 'p5', new Date(NOW)).width, 0)
}

section('Des identifiants qui ne se marchent pas dessus')
{
  eq('liste vide', nextPhotoId([], new Date(NOW)), `p${new Date(NOW).getTime()}`)
  const pris = [{ id: `p${new Date(NOW).getTime()}` }]
  eq('même milliseconde : on suffixe', nextPhotoId(pris, new Date(NOW)), `p${new Date(NOW).getTime()}-1`)
  eq('deux fois de suite',
    nextPhotoId([...pris, { id: `p${new Date(NOW).getTime()}-1` }], new Date(NOW)),
    `p${new Date(NOW).getTime()}-2`)
  {
    // Dix ajouts dans la même milliseconde restent dix photos distinctes.
    let l = []
    for (let i = 0; i < 10; i++) l = addPhoto(l, { day: '2026-07-22' }, new Date(NOW)).list
    eq('dix identifiants distincts', new Set(l.map((p) => p.id)).size, 10)
  }
}

// Une pellicule de test.
const PELLICULE = [
  { id: 'f1', day: '2026-07-20', date: local(2026, 7, 20, 12), activityId: 'a1', width: 1600, height: 1200, bytes: 200_000 },
  { id: 'f2', day: '2026-07-20', date: local(2026, 7, 20, 18), activityId: null, width: 1200, height: 1600, bytes: 180_000 },
  { id: 'f3', day: '2026-07-23', date: local(2026, 7, 23, 12), activityId: 'a2', width: 1600, height: 900, bytes: 150_000 },
  { id: 'f4', day: '2026-07-29', date: local(2026, 7, 29, 12), activityId: null, width: 800, height: 600, bytes: 90_000 },
]

section('Retrouver les photos d’un jour, d’une activité, d’une période')
{
  eq('deux le 20, la plus récente d’abord',
    photosOfDay(PELLICULE, '2026-07-20').map((p) => p.id), ['f2', 'f1'])
  eq('aucune ce jour-là', photosOfDay(PELLICULE, '2026-07-21'), [])
  eq('celles d’une activité', photosOfActivity(PELLICULE, 'a1').map((p) => p.id), ['f1'])
  eq('activité sans photo', photosOfActivity(PELLICULE, 'a9'), [])
  eq('sans activité : rien, pas tout', photosOfActivity(PELLICULE, null), [])
  eq('une période', photosBetween(PELLICULE, '2026-07-20', '2026-07-23').map((p) => p.id), ['f3', 'f2', 'f1'])
  eq('bornes incluses', photosBetween(PELLICULE, '2026-07-23', '2026-07-23').map((p) => p.id), ['f3'])
  eq('période à l’envers : même résultat',
    photosBetween(PELLICULE, '2026-07-23', '2026-07-20').length, 3)
  eq('période illisible', photosBetween(PELLICULE, 'hier', 'demain'), [])
  eq('pellicule abîmée', photosOfDay('oups', '2026-07-20'), [])
  eq('compte par jour', [...photoCountByDay(PELLICULE).entries()],
    [['2026-07-20', 2], ['2026-07-23', 1], ['2026-07-29', 1]])
  eq('des fiches sans jour ne comptent pas', photoCountByDay([{ id: 'x' }]).size, 0)
}

section('Supprimer une activité ne supprime pas ses photos')
{
  const apres = detachActivity(PELLICULE, 'a1')
  eq('la photo est toujours là', apres.length, 4)
  eq('mais détachée', apres.find((p) => p.id === 'f1').activityId, null)
  eq('elle reste au même jour', apres.find((p) => p.id === 'f1').day, '2026-07-20')
  eq('elle devient une photo du jour', photosOfDay(apres, '2026-07-20').length, 2)
  eq('les autres ne bougent pas', apres.find((p) => p.id === 'f3').activityId, 'a2')
  eq('sans identifiant : rien ne bouge', detachActivity(PELLICULE, null), PELLICULE)
}

section('Supprimer une photo')
{
  eq('une de moins', removePhoto(PELLICULE, 'f1').length, 3)
  eq('c’est la bonne', removePhoto(PELLICULE, 'f1').some((p) => p.id === 'f1'), false)
  eq('supprimer un fantôme n’enlève rien', removePhoto(PELLICULE, 'fantôme').length, 4)
}

section('Le poids, dit en français')
{
  eq('total de la pellicule', totalBytes(PELLICULE), 620_000)
  eq('pellicule vide', totalBytes([]), 0)
  eq('des poids illisibles ne comptent pas', totalBytes([{ bytes: 'lourd' }, { bytes: 100 }]), 100)
  eq('octets', formatBytes(512), '512 o')
  eq('kilo-octets', formatBytes(200_000), '195 ko')
  eq('méga-octets avec une décimale', formatBytes(2_600_000), '2,5 Mo')
  eq('au-delà de 10 Mo, plus de décimale', formatBytes(52_000_000), '50 Mo')
  eq('zéro', formatBytes(0), '0 o')
}

section('Migration v5 -> v6 : les photos arrivent sans rien casser')
{
  const m = hydrate({ version: 5, goals: ['pushups'], activities: [{ id: 'a1', type: 'Marche', date: '2026-07-28T12:00:00.000Z' }] })
  eq('version à jour', m.version, STATE_VERSION)
  eq('pellicule vide au départ', m.photos, [])
  eq('les activités sont intactes', m.activities.length, 1)
  eq('une pellicule existante est gardée', hydrate({ version: 6, photos: PELLICULE }).photos.length, 4)
  eq('une pellicule abîmée repart à vide', hydrate({ version: 6, photos: 'oups' }).photos, [])
  eq('état neuf', freshState().photos, [])
}

console.log(fails === 0
  ? `\n✅ tout passe\n`
  : `\n❌ ${fails} échec(s)\n`)
process.exit(fails === 0 ? 0 : 1)
