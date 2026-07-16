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
  eq('2 tenues de 25 s, pause 90 s', [s.sets, s.hold, s.restSec], [2, 25, 90])
  eq('niveau inexistant', hs.getSession(9, { maxHold: 40 }), null)
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
