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

console.log(fails === 0
  ? `\n✅ tout passe\n`
  : `\n❌ ${fails} échec(s)\n`)
process.exit(fails === 0 ? 0 : 1)
