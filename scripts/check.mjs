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

console.log(fails === 0
  ? `\n✅ tout passe\n`
  : `\n❌ ${fails} échec(s)\n`)
process.exit(fails === 0 ? 0 : 1)
