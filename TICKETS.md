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

### T5 — Running · à faire

Intervalles guidés type Couch-to-5K.

### T6 — GPS / Capacitor · option, à faire

GPS pour la course. Wrapper Capacitor si on a besoin de natif : Health Connect, GPS en arrière-plan,
notifications locales fiables app fermée.
