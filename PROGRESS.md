# Avancement du projet

Aperçu de ce qui est livré, par rapport au plan d'origine dans [SPECS.md](./SPECS.md).

## Lots du plan initial

| Lot | Statut | Notes |
|-----|--------|-------|
| 1 — Squelette (Node + Vite + WS) | ✅ | Workspace npm, serveur Express + ws, client Vite/React/TS, Tailwind + shadcn. |
| 2 — Setup tournoi (joueurs, catalogue, QR, lobby) | ✅ | Détection auto de l'IP LAN pour le QR. |
| 3 — Boucle de jeu (sélection, splash + fiche, classement) | ✅ | Alternance auto pièces/élimination, splash dramatique, fiche détaillée. |
| 4 — Votes anonymes par jeu | ✅ | Options dynamiques (joueurs vivants) ou statiques, agrégation côté serveur. |
| 5 — Mode élimination (duel + désigner perdant) | ✅ | Sélection des participants depuis le bas du classement, override possible. |
| 6 — Persistance (auto-save + restore + export JSON) | ✅ | Snapshot localStorage du MJ, restore au handshake, export téléchargeable. |
| 7 — Polish / ambiance « diable » | 🟡 partiel | Splash de présentation, splash d'élimination, animations ember, ring pulse, chrono de manche, historique enrichi. À faire : son d'ambiance, polish des transitions inter-écrans, splash de fin de tournoi. |

## Ajouts au-delà du plan initial

- **Écran projection `/show`** — vue lecture seule pour vidéoprojecteur, adaptée à chaque phase (setup, dashboard, présentation, manche en cours, fin). URL exposée depuis le panel QR.
- **Catalogue éditable depuis l'UI** — endpoints `POST /api/catalog/games` et `PUT /api/catalog/games/:id`, validation serveur, écriture dans `server/data/games.json`. Form avec preview live qui partage le composant `GamePoster` avec la fiche de présentation et l'écran projection.
- **Deux modes de distribution des pièces** :
  - **Par points (auto)** : MJ saisit les points par joueur pendant la partie, le serveur trie, regroupe les ex aequo, applique la formule top/bottom (positifs depuis le haut, négatifs depuis la fin, milieu à 0). Les égalités partagent la somme des slots concernés (arrondi inférieur) ; une égalité à cheval gains/pertes annule (0 pour tous).
  - **Distribution directe** : MJ saisit directement le delta de pièces par joueur, appliqué immédiatement. Pas de formule. Idéal pour les jeux d'équipe type Loup-Garou.
- **Panel missions dédié** — attribution prominente, en un clic par joueur, avec récap de qui a déjà touché quelle mission.
- **Thème violet** « ambiance diable » sans virer dans le rouge agressif (rouge réservé aux actions destructives et aux pertes).

## Architecture

- **Serveur** (`server/`) : Express + `ws`, état canonique en mémoire (`state.ts`). Module `scoring.ts` isole le calcul des slots et la gestion des ex aequo, jumelé à un fichier client identique.
- **Client** (`client/`) : 3 modes d'app routés depuis `App.tsx` selon l'URL — `/` (MJ), `/play` (joueur), `/show` (projection). Store Zustand minimal, WebSocket avec reconnexion auto.
- **Catalogue** : `server/data/games.json` lu/écrit par le serveur. Le tournoi en cours porte une copie active modifiable.
- **Persistance** : snapshot du tournoi sérialisé dans le localStorage du navigateur MJ à chaque mutation. Restore via handshake WS.

## Pistes restantes

- Prompt "reprendre vs nouveau" au démarrage MJ (aujourd'hui restore silencieux automatique).
- Splash dédié sur l'écran joueur quand il est lui-même éliminé.
- Sons d'ambiance et transitions plus marquées entre les écrans.
- Indicateurs de connexion par joueur visibles sur l'écran projection.
- Possibilité de marquer des ex aequo dans le mode points même si les points diffèrent (override MJ).
