# Tickets — Reps

Règle : **on ne passe pas au ticket suivant tant que le précédent n'est pas parfaitement nickel**
(vérifié en vrai dans l'app, pas seulement « ça build »).

Statuts : `à faire` · `en cours` · `fait`

---

## Phase 1 — fait

- [x] Programme pompes : 3 niveaux, données réelles extraites de Push Up Pro via `adb`
- [x] Pauses adaptatives : `clamp(60 + reps × 3,2, 90, 300)`
- [x] Rappels jour J : export planning `.ics` + notifications Web
- [x] Étirements post-séance : 7 étirements guidés et skippables
- [x] Prod Vercel (auto-deploy sur `main`) + bouton d'installation PWA

## Phase 2

### T1 — Onboarding « Pourquoi es-tu là ? » · fait

Au premier lancement, l'app demande **pourquoi tu es là** : choix multiple parmi les objectifs
(100 pompes, handstand, abdos/L-sit, courir 5 km). Le choix pilote les modules affichés sur l'accueil.

- [x] Écran d'onboarding tant qu'aucun objectif n'est choisi ; au moins un objectif pour continuer
- [x] Objectifs modifiables après coup depuis l'accueil (« 🎯 Mes objectifs »)
- [x] Les objectifs pas encore développés s'affichent en « bientôt » (seul le module pompes existe)
- [x] Liste des objectifs dans `src/data/goals.json`, comme le reste des données
- [x] Migration : un utilisateur déjà lancé (test initial fait) garde l'objectif pompes, sans revoir l'onboarding

Vérifié dans le navigateur : 1er lancement, migration d'un state v2 en plein Niveau 2 (progression
intacte), édition des objectifs, cas « aucun module prêt » (seuls des objectifs « bientôt » cochés),
retrait puis remise des pompes (progression conservée), réinitialisation → l'onboarding revient.

### T2 — Moteur muscle / repos · fait

Dès qu'il y a plusieurs exos à pratiquer, il faut gérer les repos sur les différents jours et
alterner les groupes musculaires pour ne pas épuiser. Prérequis de T3/T4/T5.

**Fait** :

- [x] Profils d'entraînement en data (`goals.json`) : bloc + muscles + source, par exo
- [x] Moteur pur `src/lib/schedule.js` : ordre des blocs, chevauchement musculaire, plan du jour,
      avertissements, conflit de veille de test
- [x] Vérifié : 24 assertions passent, y compris le cas pompes + handstand

**Fermé par T3**, une fois qu'il y a eu deux programmes à faire cohabiter :

- [x] Date de prochaine séance par exo (pompes : motif 2-2-3 · handstand : quotidien)
- [x] Accueil rendu dans l'ordre que renvoie le moteur, pas dans un ordre codé en dur
- [x] Chevauchement musculaire affiché (deltoïdes antérieurs + triceps), tiré des chartes OG
- [x] Vérifié en usage réel avec pompes + handstand actifs

**Décidé** (16/07/2026, sur la base de la recherche T3) :

- **Combos autorisés le même jour, skill avant force.** C'est l'ordre prescrit par Steven Low
  (échauffement → skill → force → étirements). Ça laisse le handstand tourner quasi tous les jours
  sans casser le 3×/semaine des pompes.
- Le moteur protège les **veilles de test**.
- Chevauchement musculaire réel, d'après les chartes OG : pompes = deltoïdes antérieurs, pectoraux,
  scapulaires, triceps · handstand = deltoïdes antérieurs, trapèzes, triceps, core →
  **communs : deltoïdes antérieurs + triceps**.
- Garde-fou tiré du forum GB : le handstand quotidien n'est valable que **si la charge de force reste
  modérée** — donc la charge pompes doit peser dans la décision.

### T3 — Module handstand · fait

Progression **pilotée par la tenue max, pas par un calendrier** (voir « Le piège » plus bas).

- [x] Données + sources dans `src/data/handstandProgram.json`, formule dans le `.js`
- [x] Test au chrono : compte à rebours pour monter, bips toutes les 10 s, ajustement à la fin
      (on ne touche pas son téléphone la tête en bas)
- [x] Séance : prep poignets + sortie, puis tenues dérivées du max ; la tenue réelle est
      enregistrée si on redescend avant la fin
- [x] Deux niveaux (mur → équilibre libre), avec les nuances affichées et non masquées
- [x] Niveau « L'équilibre » : **deux axes** (monter / rattraper) plutôt qu'un chrono — étapes
      formalisées d'après le [manuel FEDEC](https://www.fedec.eu/en/file/file/96/inline/EN%20FEDEC_manual-EPE_chap6.pdf)
      (écoles de cirque professionnelles européennes), qui sépare « BEGINNING HANDSTAND » et
      « LIFTING TO HANDSTAND ». Les deux axes sont **indépendants** : on peut monter en fente sans
      savoir rattraper, et l'inverse. Demander un temps ici donnait 0 s et ne pilotait rien.

**Piège trouvé en vérifiant, à ne pas réintroduire** : une tenue max n'a de sens que **rapportée à
son niveau**. 44 s au mur, c'est un débutant ; 30 s en équilibre libre, c'est ~un an de travail.
Comparer les deux déclarait le programme terminé après un test de débutant. Le max est donc attaché
à son niveau, et une promotion le remet à `null` : l'exercice change, la mesure aussi. Verrouillé
par des assertions.

**Reste ouvert** : la pause de 90 s entre tenues et le découpage des essais d'équilibre
(20 s / 30 s) sont des **choix de l'app**, pas des données sourcées — Prilepin ne donne pas de pause.
C'est marqué dans le JSON. À ajuster à l'usage.

**Sources retenues** (recherche du 16/07/2026) :

- [Overcoming Gravity 2e éd., Steven Low](https://stevenlow.org/overcoming-gravity/) — la référence la
  plus rigoureuse, chartes construites sur le Code de Pointage de la FIG.
  [PDF des chartes](https://stevenlow.org/wp-content/uploads/2017/02/OG2ChartsPrint.pdf) (charte
  Handstand = p.30 du livre, exercices p.318).
- [Prilepin pour isométriques](https://stevenlow.org/prilepin-tables-for-bodyweight-strength-isometric-and-eccentric-exercises/)
  — **la formule** : tenues à **60-70 % de la tenue max**, volume total **36-65 s par exercice**,
  **jamais jusqu'à l'échec** (« ça dégrade la qualité des séries suivantes »).
- [Les fondamentaux, Steven Low](https://stevenlow.org/the-fundamentals-of-bodyweight-strength-training/)
  — ordre de séance : échauffement → **skill** → force → étirements. 5-10 min de handstand mural pour
  un débutant, sans arriver à la fatigue. Réévaluation tous les 6-8 semaines.
- [GMB](https://gmb.io/handstand/) — 10 étapes, préparation des poignets obligatoire, apprendre à
  **sortir de la position** (roue/cartwheel) fait partie de la progression.
- Forum [GymnasticBodies — fréquence](https://www.gymnasticbodies.com/forum/topic/12597-handstand-training-frequency/)
  et [mur → équilibre libre](https://www.gymnasticbodies.com/forum/topic/12391-how-long-of-a-wall-handstand-before-serious-freestanding/).

**Progression OG (charte Handstand, colonne 1)** : Wall HS (niveaux FIG 1-3) → Free HS (4-5) →
One-Arm HS (10, hors périmètre). Les handstand push-ups sont une **colonne à part**, pas la suite.

**Le piège — à ne pas oublier** : le programme jour-par-jour façon Push Up Pro **n'existe pas** pour le
handstand, et c'est volontaire. GMB refuse explicitement de numéroter ses étapes (« des pièces de
Tetris, pas des étapes ») parce que ça va de 6-8 semaines à plusieurs années selon les gens. Les
sources sérieuses donnent des **niveaux + une formule**, jamais un calendrier. Fabriquer un
« Jour 7 : 4 × 25 s », ce serait de l'invention — contrairement aux pompes où les données sont réelles.

**Absence de consensus, à assumer dans l'app** : la fréquence va de 3×/sem (Alessandro Mainente, Team
Leader du forum) à 7×/sem selon les intervenants. Le conseil « quotidien » de Douglas Wadle est
conditionné : « **si tu ne fais pas beaucoup de travail de force** ». Le seuil des 45-60 s de tenue au
mur avant l'équilibre libre (Parth Rajguru) est **contesté** sur le même forum par Mainente et
McManamon, pour qui l'alignement prime sur le chrono → à présenter comme un repère, pas comme un
verrou.

⚠️ Attention aux blogs d'apps : la règle « 3×/sem pendant 3-6 mois pour préparer les articulations
puis 5×/sem », très reprise, vient d'un [blog sans qualifications](https://umovesg.com/blogs/handstands-training/how-often-should-you-practice-handstands)
dont l'auteur admet l'avoir « rassemblée auprès de différents pratiquants ». Ce n'est pas une source.

**Test initial** : la tenue max (poitrine au mur), en secondes — l'équivalent du max de pompes.
**Sécurité** : préparation des poignets et apprentissage de la sortie sont des étapes, pas des options.

### T4 — Module abdos / L-sit · fait

Même méthode que l'équilibre du handstand : **deux axes, pas de chrono déclaré**.

- [x] Axe **Se soulever** (support) : assis → parallettes → sol → anneaux. Le premier verrou est la
      **dépression scapulaire** — au sol les mains sont plus basses, il faut se hisser bien plus haut.
- [x] Axe **Tendre les jambes** (forme) : groupé → groupé avancé → une jambe → L complet → straddle →
      V-sit, d'après la charte OG (colonne 9), construite sur le Code de Pointage FIG.
- [x] Axes **indépendants** : on peut tenir un L complet sur parallettes sans décoller un groupé au sol.
- [x] **L'app mesure la tenue max en séance** au lieu de la demander : première fois sur une
      combinaison support/forme → séance de calibration ; ensuite la formule de Prilepin dose. Un relevé
      par combinaison — un L complet sur parallettes et un groupé au sol n'ont rien à voir.
- [x] Formule isométrique extraite dans `lib/isometrics.js`, partagée avec le handstand.
- [x] Écran d'auto-évaluation `Assess.jsx` généralisé, partagé lui aussi.

**Insight à garder** : ce qui bloque un L-sit, ce n'est souvent pas la force mais la **souplesse des
ischios** — plus ils sont raides, plus les fléchisseurs de hanche doivent tirer fort pour tenir les
jambes à 90°. C'est dans les consignes de l'axe « tendre les jambes », et la prep a un bloc compression.

**Tension résolue** (16/07/2026) : la pause fixe de 90 s donnait, pour un débutant, 8 tenues de 5 s
étalées sur 12 min de repos — alors que le skill se travaille en 5-10 min (Steven Low). Les pauses sont
maintenant **adaptées à la durée de la tenue**, comme celles des pompes le sont à l'effort :
`clamp(15 + tenue × 2,5, 30, 180)`. Une tenue de 5 s → 30 s de pause ; 40 s → 115 s. La séance du
débutant passe de 12,7 min à 4,2 min. Vérifié par propriété : aucune séance ne dépasse 10 min entre 5 et
60 s de tenue max, et la pause ne décroît jamais quand la tenue augmente.

C'est un **choix de l'app** — Prilepin ne donne pas de pause — et c'est marqué dans les deux JSON.
Les essais d'équilibre du handstand gardent une pause courte et fixe : c'est de la pratique de skill
(beaucoup d'essais courts), pas de la force.

### T5 — Running · fait

Le **Couch-to-5K de Josh Clark** (1996, Cool Running), repris intégralement : 9 semaines × 3 séances,
échauffement de 5 min de marche avant chaque séance, de 60 s de course à 30 min d'affilée.

**Différence de fond avec T3/T4** : ici le calendrier jour-par-jour **existe vraiment** et il est
public. C'est donc le modèle des pompes qui s'applique — séances séquentielles — pas celui des axes.
Trois choses viennent de l'auteur lui-même :

- **Le temps ou la distance, indifféremment** : « to measure your runs by time or by distance —
  either one works just as well ». Notre version chronométrée est donc fidèle, pas un pis-aller, et
  elle marche sans GPS. Ça rend T6 vraiment optionnel.
- **Refaire une semaine est prescrit**, pas un échec : « Repeat weeks if needed and move ahead only
  when you feel you're ready. » → bouton « Reprendre la semaine au début ».
- **3 séances espacées dans la semaine** → même motif 2-2-3 que les pompes.

- [x] Plan intégral en data, transcription verrouillée par assertions (dont une propriété :
      le temps de course ne recule jamais d'une semaine à l'autre)
- [x] Lecteur d'intervalles : bip + vibration à chaque changement d'allure, vert = courir,
      orange = marcher, pause/reprise, frise de la séance. Pensé pour ne pas regarder l'écran.
- [x] Vérifié en vrai : les 4 modules cohabitent, le moteur ordonne
      « Handstand puis L-sit puis Pompes puis Course »

⚠️ **C25K® est une marque déposée** de Josh Clark. L'app attribue le plan dans les données ; elle ne
s'approprie pas le nom. À garder en tête si le projet sort du cadre perso.

**Non fait** : les étirements post-séance sont ceux des pompes (pecs, triceps, épaules, poignets) —
ils ne conviennent pas à la course. Un jeu d'étirements jambes reste à ajouter.

### T6 — GPS / Capacitor · option, à faire

GPS pour la course. Wrapper Capacitor si on a besoin de natif : Health Connect, GPS en arrière-plan,
notifications locales fiables app fermée.

### T7 — Choisir sa séance · en cours (reste le passage à l'œil)

Les modules à calendrier (pompes, course) ne servent que **la séance suivante**, et rien d'autre.
Impossible de refaire un jour, d'en sauter quand c'est trop simple, ou de dire « en vrai, j'en suis
là ». C'est le manque le plus gros de l'app aujourd'hui.

- [x] Écran **« Le programme »** par module à calendrier : toutes les séances, on tape une case →
      aperçu de la séance → « Faire cette séance ». Pompes (54) et course (27). Grille partagée
      (`components/PlanGrid.jsx`), réutilisée en lecture seule par « Ma progression ».
- [x] **« Validé » vient de l'historique, pas du curseur.** C'est le vrai fond du ticket :
      `Progress.isDone` déduisait « fait » de la position du curseur, donc sauter au jour 11
      validerait rétroactivement les 10 premiers. Chaque séance faite est déjà enregistrée avec sa
      position (`levelIndex`/`dayIndex` pour les pompes, `index` pour la course) — c'est **ça** qui
      peint la grille (`lib/progress.js`). Les jours sautés restent gris, et le restent.
- [x] Un **test raté n'est pas un test validé** : état distinct (tenté), sinon la grille ment.
      Le réussir ensuite le valide ; le rater après l'avoir réussi ne le dévalide pas.
- [x] Le compteur de l'accueil compte les **séances distinctes validées**, pas les entrées
      d'historique — refaire un jour ne le compte pas deux fois.
- [x] Rétroactif sans migration : l'historique existant porte déjà les positions, donc une
      progression séquentielle s'affiche à l'identique.

**Vérifié** : 24 assertions de plus dans `npm run check` (jours sautés non validés, doublons,
test raté puis réussi, niveaux qui ne se mélangent pas, historique corrompu). Et un rendu SSR des
4 écrans sur un état « 3 premiers jours sautés » : une seule case verte sur 54, compteur à 1,
case proposée marquée, test raté à part.

**Pas encore fait** : le passage à l'œil dans le navigateur (le pilotage Chrome n'était pas
disponible dans la session). À faire avant de clore : taper une case → l'aperçu suit → « Faire cette
séance » → la séance qui se lance est la bonne → au retour, le curseur est bien après elle.

**Pas concernés : handstand et L-sit.** Il n'y a pas de jour à choisir — la séance se dérive des axes
(T3/T4), pas d'un calendrier. Le geste équivalent y existe déjà : « J'ai progressé, resituer ».

**Choix assumé** : choisir une séance **déplace le curseur** ; la suivante s'enchaîne à partir de là.
On peut donc sauter un niveau entier (pompes) — l'app le dit au moment de choisir au lieu de
l'interdire, comme elle laisse déjà s'entraîner un jour de repos (« Commencer quand même »).

### T8 — Abandonner une séance · fait

Avant, la croix ✕ d'une séance de pompes **jetait tout** : les séries déjà faites disparaissaient,
rien n'était enregistré. C'était le pire des deux mondes — on culpabilise *et* on perd son travail.

- [x] ✕ demande confirmation au lieu de quitter sec ; « Je continue 💪 » revient dans la séance
- [x] Les pompes faites **comptent** : séries validées + celles de la série en cours (steppeur)
- [x] La séance est **repoussée à demain**, le curseur ne bouge pas — on la retrouve telle quelle
- [x] Un **message qui remonte le moral**, choisi selon la part de séance faite (`data/encouragement.json`)
- [x] À partir de **la moitié des pompes prévues**, l'app propose les **étirements** : le corps a bossé
- [x] Un abandon n'est **pas** une séance validée : statut à part dans la grille (ni vert, ni gris)
- [x] Rien à migrer : une séance sans le champ `abandoned` reste une séance faite

**Vérifié** : 21 assertions de plus dans `npm run check` (statuts, abandon puis séance refaite,
test lâché ≠ test raté, message jamais vide et jamais aléatoire, seuil des étirements). Et le
parcours complet dans le navigateur, sur un état « Niveau 1, jour 4 » : ✕ pendant la pause (pas de
steppeur, la série est finie), « Je continue » qui revient bien dans la séance, ✕ en pleine série
avec 3 pompes déclarées → 14/25 = 56 % → étirements proposés → historique `N1 · J4 abandon
14 pompes`, case bleue dans la grille, compteur toujours à 3/54, prochaine séance « demain ».
Et ✕ sans rien avoir fait : on sort sans rien écrire.

**Choix assumé** : abandonner ne pénalise rien. Pas de série cassée, pas de score qui tombe — les
pompes faites sont comptées dans le total, et la séance revient demain à l'identique.

**Périmètre** : les pompes seulement. Course, handstand et L-sit gardent leur ✕ actuel ; le geste y
a moins de sens (pas de compteur de reps à sauver) et ça se fera avec leur propre ticket.

### T9 — Calendrier / journal in-app · fait

Un calendrier dans l'app qui dit **ce qui a été fait chaque jour**, tous modules confondus, avec les
séances validées, les tests, et les abandons.

- [x] Écran **« Mon calendrier »** depuis l'accueil : un mois à la fois, semaines qui commencent le
      lundi, navigation ‹ › bornée au mois courant (rien à voir dans le futur)
- [x] Une case = un jour, **un point = un exo** : la couleur dit *quoi* (pompes / handstand / L-sit /
      course), le remplissage dit *comment* — plein = fait, **creux = abandon ou test raté**
- [x] Taper un jour ouvre son détail : exo, heure, ce qui a été fait (`20 pompes`, `48 s tenus`,
      `9 min courues`), avec l'étiquette `abandon` / `test raté` quand il y a lieu
- [x] Résumé du mois affiché : jours d'entraînement et nombre de séances
- [x] **Aucune donnée nouvelle** : `lib/journal.js` ne fait que *lire* les historiques que chaque
      programme enregistre déjà. Donc rétroactif, et rien à migrer — comme la grille des niveaux.
- [x] Le jour d'une séance est calculé en **heure locale** : une séance de 23 h tombe le bon jour.

**Vérifié** : 30 assertions de plus dans `npm run check` (regroupement par jour tous modules
confondus, statuts qui suivent, test de niveau pas compté deux fois, historique abîmé, grille de
février bissextile, passage décembre → janvier, résumé du mois). Et dans le navigateur sur un état
à 4 modules et 13 séances : les points des bons jours, le détail qui suit la sélection, juin vide,
la flèche « suivant » grisée sur le mois courant, et le détail qui suit quand on change de mois.

**Choix assumé** : changer de mois **déplace la sélection** (au 1er du mois, ou à aujourd'hui si
c'est le mois courant). Garder « 20 juillet » ouvert sous la grille de juin ne veut rien dire.

---

## Phase 3 — le journal de bord

Jusqu'ici l'app ne sait que ce qu'**elle** a fait faire. T10 à T13 la font tenir un carnet : ce que
j'ai fait de moi-même, où j'en suis sur une période, et à quoi ça ressemblait.

### T10 — Activités libres · fait

Noter à la main une marche, une course, n'importe quoi — avec sa date, pour **remplir l'agenda après
coup**. C'est le socle : sans ça, T11 n'a presque rien à récapituler.

- [x] **Le type se tape au clavier**, et l'app propose ce qui a déjà été enregistré (« mar » →
      « Marche »). Pas de liste fermée : l'app ne peut pas deviner tout ce qu'on fait.
- [x] **Mesures optionnelles** (`src/data/measures.json`) : durée, distance, dénivelé, répétitions,
      séries, poids, calories. On remplit ce qui a du sens. « + Ajouter une mesure » pour les autres.
- [x] L'app **retient les mesures déjà utilisées pour ce type** : retaper « Marche » repropose
      km + durée, pas des séries.
- [x] **La date est modifiable** (par défaut aujourd'hui) : c'est tout l'intérêt — remplir dimanche
      ce qu'on a fait mercredi. Pas de date dans le futur.
- [x] Note libre.
- [x] Modifier et supprimer une activité (une faute de frappe ne doit pas rester à vie).
- [x] Les activités apparaissent **dans le calendrier** (T9) comme le reste : `lib/journal.js` les lit.
- [x] 111 assertions de plus dans `npm run check` (374 au total).

**Vérifié dans le navigateur**, sur un état v4 (pompes N1 J4 + course) migré en v5 : migration
`activities: []` sans toucher à la progression · « Marche » 45 min / 5,2 km notée aujourd'hui ·
« Vélo » 25,75 km / 310 m **antidatée au 27 juillet**, qui se range sous « lundi 27 juillet » et
cohabite avec la séance C25K du même jour dans le calendrier (07 h puis 12 h) · suggestions
« Marche » / « Vélo » · mémoire des mesures dans les deux sens · date future → bouton désactivé et
message · modification qui reclasse et redate · suppression avec confirmation · état vide. Zéro
erreur console.

**Bug trouvé en regardant, pas en testant** : en modification, la distance revenait **vide**. Elle
était réinjectée dans le champ formatée à la française (`22,4`), et `<input type="number">` refuse
la virgule — donc champ vide, et enregistrer aurait effacé la mesure. La virgule est de
l'**affichage** (`formatMeasure`), jamais de la saisie. La frappe, elle, accepte les deux.

**Choix assumé — une marche libre ne fait pas avancer le Couch-to-5K.** Le module course sert un
plan (T5) ; ceci est un carnet. Mélanger les deux ferait mentir la grille des 27 séances.
Une séance C25K reste enregistrée par son module ; elle apparaît dans le récap comme le reste.

**Choix assumé — une activité antidatée est datée de midi.** On ne sait pas à quelle heure c'était,
et midi ne bascule pas de jour au changement d'heure ni sous un fuseau négatif — minuit, si.

**Choix assumé — les activités comptent dans le résumé du mois** du calendrier (« 6 jours
d'entraînement · 7 séances »). C'est « ce qui a été fait », pas « ce que l'app a fait faire ».

**Décidé en passant** : `dayKey` a déménagé de `lib/journal` vers **`lib/dates`**. Le journal lit
les activités, les activités ont besoin des jours : le laisser dans journal faisait un cycle
d'imports. `lib/journal` le réexporte, donc rien d'autre n'a bougé. `lib/dates` porte aussi
`daysBetween`, écrit d'avance pour T11.

### T11 — Récap entre deux dates · fait

« J'ai fait tout ça, voilà où j'en suis. » Un écran avec deux dates, et le bilan de la période.

- [x] Choix de la période : deux dates, plus des raccourcis (7 jours, 30 jours, ce mois, tout).
- [x] **Totaux par type d'activité** : nombre de fois, km cumulés, temps cumulé.
- [x] Ce que les **modules** ont produit sur la période (séances de pompes, tenues, séances de course).
- [x] Jours actifs sur la période, et la plus longue série de jours consécutifs.
- [x] Lecture seule (`lib/recap.js`) — aucune donnée nouvelle, comme T9.
- [x] 69 assertions de plus dans `npm run check` (443 au total).

**Vérifié dans le navigateur** sur un état à 4 modules et 5 activités : « 30 jours » → 10 jours
actifs sur 30, 11 choses faites, 7 jours d'affilée · Marche `3 fois · 2 h 35 · 15 km` (45+40+70 min,
5,2+3,8+6 km) · Muscu `40 répétitions · 4 séries` **sans le poids** · Pompes `3 séances · 48 pompes`
(14+16+18) · Course `8 min courues` · « 7 jours » resserre à 6/7 et fait tomber le vélo du 23 ·
« Tout » remonte au test initial du 1er juillet · une période vide affiche son écran · bouger une
date à la main décoche le raccourci. Zéro erreur console.

**Deux sources, exprès.** Les jours actifs et les séries se lisent dans `journalEntries` (déjà
testé). Les **totaux se lisent dans l'état brut**, jamais dans les entrées du journal : celles-ci
portent du texte tout prêt (« 45 min · 5,2 km »), et additionner du texte c'est le reparser, donc se
tromper un jour.

**Choix assumé — un poids ne se cumule pas.** 4 séances à 20 kg ne font pas 80 kg, ça ne veut rien
dire. Seules les mesures marquées `sums` dans `measures.json` s'additionnent : durée, distance,
dénivelé, répétitions, séries, calories.

**Choix assumé — la série se compte en jours, pas en millisecondes.** On avance d'un jour avec
`setDate`. Un jour de changement d'heure fait 23 ou 25 h : comparer à 86 400 000 ms casserait la
série deux fois par an, sans raison. Verrouillé par des assertions sur mars et octobre 2026.

**Choix assumé — deux dates à l'envers restent une période.** Les champs gardent ce qui a été tapé
(on ne corrige pas quelqu'un en pleine saisie), et la ligne « Du … au … » dit ce qui est vraiment
calculé.

**Choix assumé — un module qui n'a rien fait n'apparaît pas.** Un bilan qui aligne des zéros ne dit
rien de plus qu'une absence.

### T12 — Photos · fait

Une photo par jour, ou quand on en a envie.

- [x] **Photo du jour** (indépendante de toute séance) *et* photo **rattachable à une activité**.
- [x] **Stockage IndexedDB, pas localStorage** : le quota du localStorage est de ~5 Mo, une seule
      photo de téléphone le remplit et casserait toute la progression.
- [x] **Redimensionnées à l'ajout** (~1600 px, JPEG) : sinon la sauvegarde de T13 pèse 200 Mo pour
      30 photos. C'est un choix de l'app, à assumer — on garde un souvenir, pas un original.
- [x] Visibles dans le calendrier (T9) et dans le récap (T11).
- [x] Supprimer une photo.
- [x] 64 assertions de plus dans `npm run check` (507 au total).

**Deux stockages, et c'est tout le ticket.** La **fiche** (id, jour, dimensions, poids) vit dans
l'état à côté du reste : ~100 octets, donc mille photos tiennent dans le localStorage. C'est elle
qui permet au calendrier et au récap de rester **synchrones et purs**. L'**image** vit dans
IndexedDB (`lib/photoStore`). Tout le reste découle de là.

**L'ordre des écritures est délibéré, dans les deux sens** :

- **Ajout** : l'image part dans IndexedDB *d'abord*. Si ça échoue, aucune fiche n'a été posée —
  l'inverse laisserait une case grise dans le calendrier, visible et jamais réparable.
- **Suppression** : la fiche part *d'abord*. S'il reste une image, elle est **invisible** et
  balayée au démarrage suivant (`deleteOrphans`). Une fiche sans image, elle, se voit.

**Vérifié dans le navigateur**, avec une vraie photo de téléphone (4032 × 3024, **2,26 Mo**) :
redimensionnée en **1600 × 1200 / 394 ko** (÷ 5,7), et l'état complet du localStorage ne pèse que
**1944 octets** — la démonstration que l'image n'y est pas. Plus : une petite image (600 × 400)
**n'est pas agrandie** · un PDF renommé est refusé (« Ce fichier n'est pas une image ») · la
visionneuse plein écran avec `1600 × 1200 · 385 ko` · suppression qui enlève **la fiche ET l'image**
· une image orpheline injectée à la main est balayée au rechargement · une fiche dont l'image a
disparu affiche 🚫 au lieu de casser l'écran · le 📷 sur la case du calendrier · les photos de la
période dans le récap, **sans bouton d'ajout** (un récap se lit). Zéro erreur console.

**Choix assumé — supprimer une activité ne supprime PAS ses photos**, elles redeviennent des photos
du jour (`detachActivity`). Perdre un souvenir en corrigeant une faute de frappe serait le pire des
échanges. Vérifié en vrai : activité effacée, photo toujours là, détachée, au même jour.

**Choix assumé — on peut choisir des photos avant que l'activité existe.** Elles attendent en
mémoire, avec un aperçu, et se rattachent à l'enregistrement — sinon il faudrait noter, ressortir,
rouvrir. Elles prennent **le jour de l'activité**, pas celui du téléphone : une sortie d'hier notée
aujourd'hui garde ses photos à hier. Vérifié.

**Piège évité — les URL d'objet se révoquent.** Chaque affichage crée une `URL.createObjectURL` ;
sans révocation au démontage, vingt allers-retours sur le calendrier fuient des dizaines de Mo.
Invisible en dev, fatal sur un téléphone. C'est fait dans `usePhotoUrl` et dans l'aperçu des photos
en attente.

**Piège évité — l'orientation EXIF.** `createImageBitmap(file, { imageOrientation: 'from-image' })`,
sinon une photo prise en portrait sur iPhone ressort couchée. Avec deux replis pour les navigateurs
qui refusent l'option.

**Piège évité — rechoisir le même fichier.** On vide `input.value` après chaque choix : sans ça, le
même fichier deux fois de suite ne déclenche aucun `change` et l'ajout semble ignoré.

**Non testé par `npm run check`, et c'est assumé** : `lib/photoStore` a besoin d'un navigateur
(canvas, IndexedDB). Toute la logique qui peut l'être est dans `lib/photos` ; le reste s'est
vérifié à l'écran, avec les fichiers réels ci-dessus.

### T13 — Sauvegarde complète : export et réimport · fait

- [x] **Exporter** tout l'état en un `.json` téléchargeable : programmes, séances, activités, photos.
- [x] **Réimporter** ce fichier — sur un autre téléphone, ou après avoir vidé le navigateur.
- [x] L'import **passe par `lib/migrate.js`** : un fichier exporté d'une version antérieure doit
      se relire, exactement comme le localStorage.
- [x] Refuser proprement un fichier qui n'est pas une sauvegarde, et **confirmer avant d'écraser**
      une progression en cours.
- [x] Écrit en dernier, pour n'être écrit qu'une fois — contre la forme définitive des données.
- [x] 53 assertions de plus dans `npm run check` (560 au total).

**Manque trouvé en testant, pas en écrivant** : après avoir vidé le navigateur, on retombe sur
l'onboarding — et **la sauvegarde y était inaccessible**. Il aurait fallu inventer un objectif au
hasard pour pouvoir récupérer les siens, exactement dans le cas pour lequel ce ticket existe. D'où
« 💾 J'ai déjà une sauvegarde » sur l'écran d'onboarding.

**Vérifié dans le navigateur**, aller-retour complet et réel : export d'un état à 4 modules, 5
activités et 1 photo → fichier de **515 ko** dans les téléchargements, signé `reps.backup`, avec
l'image en base64 (décodée : 394 221 octets, en-tête `ffd8ff`, un vrai JPEG). Puis **localStorage
vidé ET IndexedDB supprimée** → l'app repart à l'onboarding → « J'ai déjà une sauvegarde » →
fichier relu → confirmation qui annonce les **deux côtés** (« 11 choses faites · 5 activités ·
1 photo » contre « rien du tout ») → « Remplacer » → **tout est revenu à l'identique**, y compris
l'image qui s'affiche. Et un `.jpg` proposé comme sauvegarde est refusé (« Ce fichier n'est pas
lisible — il n'est pas au format JSON »). Zéro erreur console.

**L'ordre des écritures, encore** : les images de la sauvegarde sont posées **avant** de remplacer
l'état, et les anciennes ne sont **pas** effacées d'abord — elles deviennent orphelines et sont
balayées au démarrage suivant. Les effacer d'entrée rendrait un import interrompu bien pire que le
désordre qu'il évite.

**Choix assumé — pas de fiche sans image après un import.** Si une image n'a pas pu être remise
(place manquante, données abîmées), sa fiche est écartée et l'app le dit (« 2 photos n'ont pas pu
être remises »). Une vignette barrée à vie serait pire qu'une photo de moins.

**Choix assumé — le fichier est signé.** `format: "reps.backup"` : sans ça, impossible de
distinguer notre `.json` de n'importe quel autre, et on écraserait une progression sur un fichier
au hasard. Une sauvegarde d'un `formatVersion` **plus récent** est refusée avec le bon conseil
(« mets l'app à jour d'abord ») plutôt que lue de travers.

**Ce qui verrouille vraiment l'aller-retour** : une assertion compare le **récap** et le
**calendrier** avant export et après relecture. Comparer les champs un par un laisserait passer un
oubli ; comparer ce que l'app en dit, non.

### T14 — Lieu, heure et conditions · fait

Noter *où* et *dans quelles conditions*, en plus de *quoi*. Demandé le 31/07/2026.

**Le principe qui gouverne tout le ticket : l'app PROPOSE, elle n'impose rien.** Le GPS propose une
position, qui propose une adresse — modifiable. L'heure propose maintenant — modifiable. La météo
propose une température et une hygrométrie — modifiables. Rien n'est en lecture seule, parce que
l'app se trompera : sur le lieu d'une activité antidatée, et sur la température de quelqu'un qui
s'entraîne à l'intérieur.

- [x] **Heure approximative** sur chaque activité, proposée à *maintenant*, modifiable. C'est elle
      qui date vraiment l'activité (au lieu de la convention « midi » des jours passés).
- [x] **Lieu** : bouton « ma position » → coordonnées → adresse devinée, le tout modifiable. Sans
      GPS (refusé, indisponible), on tape. L'app **propose les lieux déjà notés**, comme elle
      propose déjà les types d'activité.
- [x] **Conditions** : **température et hygrométrie**, récupérées pour ce lieu à cette heure-là.
      Modifiables à la main, et saisissables sans lieu du tout.
- [x] **« En intérieur »** : la météo dehors ne dit rien d'une séance en salle. On coche, on saisit
      sa propre température, et l'app ne va rien chercher.
- [x] **Réglage pour couper la récupération automatique** (écran « Réglages »).
- [x] Affiché là où les activités se lisent : la liste, le détail du jour dans le calendrier.
- [x] Dans la sauvegarde (T13), comme le reste — rien à faire de plus, mais à vérifier.
- [x] Assertions : choix de l'heure dans la réponse, URL construite, lieux proposés, état abîmé.

**Services extérieurs, et ce que ça coûte.** Jusqu'ici l'app était **100 % hors-ligne, sans compte
ni serveur**. Ce ticket casse ça : pour connaître la météo d'un lieu, il faut envoyer ce lieu à
quelqu'un. C'est le prix de la fonctionnalité, il est assumé — mais il est réel, et c'est pour ça
que le réglage existe.

- **Météo : [Open-Meteo](https://open-meteo.com)** — gratuit, **sans clé d'API**, CORS ouvert.
  Deux points d'entrée : `api.open-meteo.com` (couvre les ~92 derniers jours, heure par heure) et
  `archive-api.open-meteo.com` (au-delà). Vérifié le 31/07/2026 sur les deux.
- **Adresse : [BigDataCloud](https://www.bigdatacloud.com)** `reverse-geocode-client` — gratuit,
  sans clé, CORS ouvert, réponses en français. Vérifié.

⚠️ **Nominatim / OpenStreetMap est inutilisable ici** : l'API répond 200 mais **sans en-tête
`Access-Control-Allow-Origin`**, donc le navigateur bloque la réponse. Vérifié le 31/07/2026 — ne
pas y revenir en croyant que ça marchera.

**Tout échec est silencieux et rattrapable.** Pas de réseau, GPS refusé, API en panne (l'archive
Open-Meteo a répondu 502 une fois pendant les essais) : on n'affiche pas d'erreur bloquante, on
laisse les champs à remplir à la main. Une activité doit pouvoir se noter dans un tunnel.

**Fait**, avec 125 assertions de plus (`npm run check` : 685 au total).

**Vérifié dans le navigateur**, position simulée à Paris : « 📍 Ma position » → coordonnées
`48.857, 2.352` → nom deviné **« Saint-Merri, Paris »** → météo relevée **26,4 °C · 49 % · ☁️
Couvert**, le tout en un geste. Enregistré tel quel : `time: "14:22"`, `place` avec ses coordonnées,
`weather` marqué `source: "auto"`. Puis :

- **« En intérieur »** → le bouton météo disparaît, aucun appel ne part, saisie à la main
  (`21 °C · 45 % · en intérieur`, `source: "manual"`, sans code météo).
- **Réglage coupé** → un espion posé sur `fetch` confirme **zéro appel** vers Open-Meteo comme vers
  BigDataCloud. Les coordonnées s'obtiennent quand même (c'est local), et le champ reste saisissable.
- **Position refusée** → « Position refusée. Tu peux écrire le lieu à la main. » Rien n'est bloqué.
- Les lieux déjà notés sont proposés, comme les types d'activité.

Zéro erreur console.

**Bug attrapé par une assertion, pas par l'œil** : `weatherUrl` construisait son URL avec
`Number(lat)`. Or `Number(null)` vaut **0** — une activité sans coordonnées serait allée chercher la
météo du **point (0,0)**, en plein golfe de Guinée, et l'aurait affichée comme un vrai relevé. Le
fichier réutilise maintenant `cleanCoords`, qui refuse ce qui n'est pas un nombre.

**Incohérence trouvée en vérifiant** : réglage coupé, l'écran des Réglages annonçait « Reps est
entièrement hors-ligne »… et le bouton « 🌤️ Récupérer la météo » restait affiché, prêt à appeler.
Tranché : **le réglage veut dire « pas de réseau »**, pas « pas d'automatisme ». Le bouton disparaît
avec lui, et la phrase devient vraie.

**Choix assumé — la position ne part jamais toute seule.** Il faut taper « 📍 Ma position ». C'est
écrit noir sur blanc dans les Réglages.

**Choix assumé — on n'arrondit pas l'heure au plus proche.** 14h59 se lit à 14h, pas à 15h : à 15h,
le relevé n'a pas encore eu lieu. Verrouillé par une assertion.

**Choix assumé — le nom deviné n'écrase jamais un nom déjà écrit.** Il ne remplit que le champ vide.

**Choix assumé — corriger un chiffre à la main débranche l'automatique** (`source: "manual"`), et
une nouvelle recherche ne réécrasera pas la correction tant qu'on ne la redemande pas.

**Choix assumé — pas de clé vide.** Une activité sans lieu ne porte pas de `place: null` : ça
alourdirait chaque entrée de la sauvegarde pour rien. Et corriger doit pouvoir **effacer** un lieu,
pas seulement le remplacer — vérifié par assertion.

**Rétrocompatibilité** : sans heure déclarée, une activité retombe sur la convention « midi » de
T10. Un état d'avant T14 se lit donc exactement comme avant, et `settings` arrive avec la météo
auto active. Vérifié en vrai : migration v6 → v7 sur un état à 5 activités, progression intacte.

**Non couvert par `npm run check`, et c'est assumé** : `lib/weatherApi` (réseau, géolocalisation).
Tout ce qui pouvait être extrait l'est — URL, choix de l'heure, validation, lieux — et le reste
s'est vérifié à l'écran.

### T15 — Changer d'objectif sans se faire jeter · fait

Signalé le 31/07/2026 (« on ne peut pas changer d'objectif »), puis retiré — le bouton
« 🎯 Mes objectifs » existe bien. **Mais il y avait un vrai bug derrière**, trouvé en vérifiant.

`getNextStep` répondait `no-program` **dès que les pompes n'étaient pas cochées**. Écrit en T1,
quand les pompes étaient effectivement le seul module ; il y en a quatre depuis. Résultat, pour qui
lâchait les pompes pour la course : une carte **« 🚧 Ça arrive — tes objectifs ne sont pas encore
développés »** s'affichait **au-dessus de sa séance de course parfaitement fonctionnelle**. L'app
disait à quelqu'un qu'il s'était trompé pendant qu'elle lui servait son programme. De quoi croire
qu'on n'a pas le droit de changer.

- [x] `getNextStep` séparée en deux : **`getPushupStep`** (où en sont les pompes, `off` quand
      l'objectif n'est pas choisi — comme les trois autres modules) et **`getAppStep`** (ce que
      l'app doit faire, tous modules confondus).
- [x] La bonne question n'est plus « les pompes sont-elles cochées » mais « y a-t-il **au moins un**
      objectif choisi dont le module existe ».
- [x] La carte « Ça arrive » liste les modules prêts **d'après les données** au lieu des deux noms
      codés en dur (« pompes et handstand », faux depuis T4 et T5).
- [x] Le rustine `!onHandstand` qui masquait à moitié le symptôme disparaît.

**Vérifié dans le navigateur** : course seule → la séance, sans fausse alerte · L-sit seul → idem ·
pompes + course → les deux, dans l'ordre du moteur · un objectif sans module → la carte s'affiche
et annonce « Ce qui est prêt : Pompes, Handstand, L-sit, Course ». Zéro erreur console.

**Leçon à garder** : une fonction nommée « l'étape suivante » qui ne parlait en fait que d'**un**
module a survécu à l'arrivée de trois autres. Les trois nouveaux ont bien été écrits avec leur
propre `getXStep` renvoyant `off` — c'est l'ancien qui n'a pas suivi.
