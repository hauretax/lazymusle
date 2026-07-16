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

### T2 — Moteur muscle / repos · à faire

Dès qu'il y a plusieurs exos à pratiquer, il faut gérer les repos sur les différents jours et
alterner les groupes musculaires pour ne pas épuiser. Prérequis de T3/T4/T5.

- Blocs d'effort : reps / tenue / souplesse
- Rotation des groupes musculaires, gestion des combos (ex. pompes + handstand le même jour)
- Remplace le rythme fixe 2-2-3 actuel, propre aux pompes

### T3 — Module handstand · à faire

Chercher une vraie progression (sources sérieuses, comme les données Push Up Pro), puis l'intégrer.
Probablement des tenues chronométrées plutôt que des reps → dépend de T2.

### T4 — Module abdos / L-sit · à faire

Même approche que T3 : trouver la progression, puis l'intégrer.

### T5 — Running · à faire

Intervalles guidés type Couch-to-5K.

### T6 — GPS / Capacitor · option, à faire

GPS pour la course. Wrapper Capacitor si on a besoin de natif : Health Connect, GPS en arrière-plan,
notifications locales fiables app fermée.
