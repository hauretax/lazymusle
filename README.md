# Reps — 100 pompes

PWA React pour progresser jusqu'à **100 pompes d'affilée**, basée sur le système de
**Runtastic Push Up Pro** (données réelles extraites de l'app).

## Le système

- **Test initial** → te place sur l'un des **3 niveaux** selon ton max (`< 20` → N1, `20–49` → N2, `≥ 50` → N3).
- **Séances séquentielles** (5 séries de pompes) : l'app en sert **une à la fois**.
- **Dernier jour de chaque niveau = un test** à réussir pour débloquer le niveau suivant (20 → 50 → **100**).
- **Pauses adaptées à l'effort** : `pause (s) = clamp(60 + reps × 3,2, 90, 300)` → ~90 s sur les séries légères, jusqu'à 5 min sur les grosses séries.
- **Rythme conseillé** : ~3 séances/semaine (motif 2-2-3 jours entre séances). L'app affiche la date de la prochaine séance mais te laisse libre.
- **Rappels jour J** : export du planning complet en calendrier `.ics` (rappel natif iPhone/Android même app fermée) + notifications Web quand l'app est ouverte.
- **Étirements** : routine de récupération (7 étirements illustrés) proposée à la fin de chaque séance, guidée et skippable. Données dans [`src/data/stretches.json`](src/data/stretches.json).

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
npm run build    # build de prod (PWA installable)
npm run preview  # sert le build
```

Installable comme app (PWA) : "Ajouter à l'écran d'accueil" sur mobile.

## Pile technique

- React 19 + Vite
- `vite-plugin-pwa` (service worker, manifest, offline)
- État : Context + `localStorage`
- Aucune dépendance UI externe (CSS maison, thème sombre mobile-first)

## Feuille de route (phase 2)

Fait en phase 1 : programme pompes, pauses adaptatives, rappels calendrier + notifs, étirements post-séance.

À intégrer ensuite :

- [ ] Module handstand (progression)
- [ ] Module abdos / L-sit
- [ ] Running — intervalles guidés type Couch-to-5K
- [ ] (option) GPS pour la course, wrapper Capacitor si besoin de natif (Health Connect, GPS arrière-plan, notifs locales fiables app fermée)
