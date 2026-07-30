# Reps — 100 pompes

PWA React pour progresser jusqu'à **100 pompes d'affilée**, basée sur le système de
**Runtastic Push Up Pro** (données réelles extraites de l'app).

## Le système

- **Test initial** → te place sur l'un des **3 niveaux** selon ton max (`< 20` → N1, `20–49` → N2, `≥ 50` → N3).
- **Séances séquentielles** (5 séries de pompes) : l'app en sert **une à la fois**.
- **Tu choisis ta séance** : l'app propose la suivante, mais « 📅 Choisir ma séance » ouvre tout le programme — refaire un jour, en sauter quand c'est trop simple, revenir en arrière. Seules les séances **vraiment faites** sont validées : sauter au jour 11 ne coche pas les 10 premiers, et un test raté reste un test raté.
- **Dernier jour de chaque niveau = un test** à réussir pour débloquer le niveau suivant (20 → 50 → **100**).
- **Pauses adaptées à l'effort** : `pause (s) = clamp(60 + reps × 3,2, 90, 300)` → ~90 s sur les séries légères, jusqu'à 5 min sur les grosses séries.
- **Rythme conseillé** : ~3 séances/semaine (motif 2-2-3 jours entre séances). L'app affiche la date de la prochaine séance mais te laisse libre.
- **Rappels jour J** : export du planning complet en calendrier `.ics` (rappel natif iPhone/Android même app fermée) + notifications Web quand l'app est ouverte.
- **Abandonner sans rien perdre** : la croix demande confirmation, compte les pompes faites (la série en cours comprise), repousse la séance à **demain** et te dit un mot gentil. À partir de la moitié des pompes prévues, elle propose les étirements — les muscles ont bossé. Un abandon n'est pas une séance validée, mais ce n'est pas rien.
- **Étirements** : routine de récupération (7 étirements illustrés) proposée à la fin de chaque séance, guidée et skippable. Données dans [`src/data/stretches.json`](src/data/stretches.json).
- **Calendrier** : « 📆 Mon calendrier » montre le mois, un point par exo et par jour — la couleur dit lequel, le point creux dit abandon ou test raté. Taper un jour donne le détail. C'est une simple lecture des historiques ([`src/lib/journal.js`](src/lib/journal.js)), donc rétroactif.
- **Activités libres** : « ➕ Noter une activité » enregistre à la main ce qu'on fait en dehors des programmes — une marche, une sortie vélo, n'importe quoi. Le nom se **tape au clavier** (l'app propose ensuite ce qu'on a déjà noté), les mesures sont **optionnelles** (durée, distance, dénivelé, répétitions, séries, poids, calories, dans [`src/data/measures.json`](src/data/measures.json)), et l'app retient celles qu'on remplit d'habitude pour ce nom-là. La **date se choisit** : on peut remplir dimanche ce qu'on a fait mercredi. Ça atterrit dans le calendrier comme le reste. Logique dans [`src/lib/activities.js`](src/lib/activities.js).
- **Où j'en suis** : « 📊 Où j'en suis » fait le bilan entre **deux dates** (ou en un tap : 7 jours, 30 jours, ce mois, tout) — jours actifs, plus longue série de jours d'affilée, totaux par type d'activité (km et temps cumulés), et ce que chaque programme a produit. Lecture seule ([`src/lib/recap.js`](src/lib/recap.js)).
- **Photos** : une ou plusieurs par jour depuis le calendrier, et/ou rattachées à une activité. Elles sont **redimensionnées à l'ajout** (1600 px max, JPEG) — une photo de téléphone de 2,3 Mo tombe à ~390 ko. Les **images** vivent dans **IndexedDB** ([`src/lib/photoStore.js`](src/lib/photoStore.js)), seules leurs **fiches** (id, jour, dimensions) sont dans le `localStorage` ([`src/lib/photos.js`](src/lib/photos.js)) : le quota du `localStorage` est de ~5 Mo, une seule photo le remplirait et ferait perdre toute la progression. Supprimer une activité **ne supprime pas** ses photos — elles redeviennent des photos du jour.
- **Sauvegarde** : « 💾 Sauvegarde » exporte **tout** (programmes, séances, activités, photos comprises) en un `.json` téléchargeable, et sait le relire — sur un autre téléphone, ou après avoir vidé son navigateur. L'import passe par [`src/lib/migrate.js`](src/lib/migrate.js), donc une sauvegarde d'une version antérieure se relit. Le lien est aussi sur l'écran d'accueil du tout premier lancement (« J'ai déjà une sauvegarde ») : c'est là qu'on en a besoin. **C'est la seule copie** — l'app n'a pas de serveur.

| Niveau | Jours | 1re séance | Test final |
|--------|-------|------------|-----------|
| 1      | 10    | `2-3-4-3-2`      | 20  |
| 2      | 19    | `16-12-14-10-10` | 50  |
| 3      | 25    | `34-24-22-20-18` | 100 |

## Données

Tout le programme (niveaux, séries, réglages de pause) est dans
[`src/data/pushupProgram.json`](src/data/pushupProgram.json) — **séparé du code**, modifiable sans toucher à la logique.
Les données ont été extraites de Push Up Pro Pro via `adb` (uiautomator) en juillet 2026.

La progression de l'utilisateur (séances faites, max, dates) est stockée en JSON dans le
`localStorage` du navigateur — l'app fonctionne **100 % hors-ligne**, sans compte ni serveur.

## Lancer

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # vérifie la logique pure (planning, formules pompes)
npm run build    # build de prod (PWA installable)
npm run preview  # sert le build
```

`npm run check` est un simple script Node, sans framework de test. Il ne couvre que ce qui n'est
**pas** visible à l'écran : le moteur de planning ([`src/lib/schedule.js`](src/lib/schedule.js), dont
les règles ne se déclenchent pas encore — voir [`TICKETS.md`](TICKETS.md)), les formules du
programme pompes, ce qui compte comme séance validée
([`src/lib/progress.js`](src/lib/progress.js)), les activités notées à la main
([`src/lib/activities.js`](src/lib/activities.js)), le récap d’une période ([`src/lib/recap.js`](src/lib/recap.js)),
les fiches des photos ([`src/lib/photos.js`](src/lib/photos.js)) et la relecture d’une sauvegarde
([`src/lib/backup.js`](src/lib/backup.js)). Le reste (écrans, parcours) se vérifie dans le navigateur —
y compris ce qui a besoin d’un navigateur pour exister : le canvas et IndexedDB
([`photoStore.js`](src/lib/photoStore.js), [`backupFile.js`](src/lib/backupFile.js)).

Installable comme app (PWA) : "Ajouter à l'écran d'accueil" sur mobile.

## Pile technique

- React 19 + Vite
- `vite-plugin-pwa` (service worker, manifest, offline)
- État : Context + `localStorage`
- Aucune dépendance UI externe (CSS maison, thème sombre mobile-first)

## Objectifs

Au premier lancement, l'app demande **« Pourquoi es-tu là ? »** : tu choisis ce que tu veux travailler
(pompes, handstand, abdos/L-sit, course). Ce choix pilote les modules affichés sur l'accueil et se
modifie à tout moment. Les objectifs dont le module n'existe pas encore s'affichent en « bientôt ».
Liste dans [`src/data/goals.json`](src/data/goals.json).

## Les modules

| Module | Source des données | Modèle |
|--------|--------------------|--------|
| **Pompes** | Push Up Pro, extrait via `adb` | Calendrier : 54 séances, 3 niveaux |
| **Handstand** | Overcoming Gravity (FIG), FEDEC, forum GymnasticBodies | Tenue max au mur, puis **2 axes** (monter / rattraper) |
| **Abdos / L-sit** | Overcoming Gravity (FIG) | **2 axes** (se soulever / tendre les jambes) |
| **Course** | Couch-to-5K, Josh Clark | Calendrier : 9 semaines × 3 séances |

Deux modèles, et le choix n'est pas arbitraire : **quand un calendrier jour-par-jour existe vraiment**
(pompes, course), on le suit. **Quand il n'existe pas** — et pour le handstand comme le L-sit, aucune
source sérieuse n'en donne, c'est délibéré — on situe la personne sur des **axes** et le programme se
dérive de là. Fabriquer un faux calendrier serait de l'invention.

Un **moteur de planning** ([`src/lib/schedule.js`](src/lib/schedule.js)) ordonne les modules actifs sur
une journée : la technique se travaille frais, avant la force. Il signale aussi les muscles que deux
exos partagent, d'après les chartes.

## Feuille de route

Tout est suivi dans [`TICKETS.md`](TICKETS.md), avec les sources et les pièges à ne pas réapprendre.
