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
