# Specs — App Tournoi "À l'épreuve du diable"

## Contexte
Outil pour organiser un tournoi de jeu de société en mode "à l'épreuve du diable", avec :
- Gestion des pièces d'or (PV / classement / monnaie)
- Présentation des jeux
- Système de vote
- Phase d'élimination

## Format de tournoi
- 6 à 10 joueurs, tous dans la même partie
- Chaque joueur démarre avec 1 PO (paramétrable)
- Alternance entre **jeux à pièces** et **jeux à élimination**
- **Jeux à pièces** :
  - Classement final → application d'une formule de gains/pertes de PO
  - Missions annexes possibles (récompenses ponctuelles en PO)
  - Bonus achetables en cours de partie (coût en PO)
- **Jeux à élimination** : les 1 à 3 derniers du classement courant s'affrontent, le perdant est éliminé
- À 0 PO → joueur éliminé du tournoi
- Le MJ choisit le jeu suivant ; l'app peut en proposer un en fonction de l'alternance

## Stack technique
- **Backend** : Node.js + Express + WebSocket (`ws`)
- **Frontend** : React (Vite) + TypeScript + shadcn/ui + Tailwind
- **État** : Zustand côté client, état canonique en mémoire serveur
- **Persistance** : localStorage du navigateur MJ, auto-save sur chaque mutation + auto-restore au chargement
- **Sync** : WebSocket temps réel serveur ↔ écran MJ ↔ écrans joueurs
- **Réseau** : serveur sur le laptop MJ, joueurs rejoignent via QR pointant vers `http://<IP-locale>:<port>`

## Rôles & écrans

### Écran MJ (laptop)
1. **Setup** : nom du tournoi, ajout joueurs (pseudo, PO de départ), sélection du catalogue de jeux
2. **Dashboard** : classement temps réel, joueurs vivants/éliminés, historique, QR de connexion
3. **Sélection du jeu** : proposition automatique selon l'alternance, possibilité de choisir manuellement
4. **Présentation 2 étapes** :
   - Splash animé (révélation, nom, type, ambiance "diable")
   - Fiche détaillée (règles, durée, joueurs, formule de gains, missions, bonus)
5. **Pendant la partie** :
   - Lancer un vote (selon ceux configurés pour le jeu)
   - Ajuster les PO d'un joueur (missions, achats)
   - Saisir le classement final → application auto de la formule
6. **Mode élimination** : sélection des X joueurs concernés avant la partie

### Écran joueur (téléphone)
- Connexion via QR → saisie pseudo
- Affichage : pseudo, PO actuels, position au classement, statut (vivant/éliminé)
- Écran de vote quand un vote est ouvert
- Notification gain/perte de PO

## Modèle de données

```ts
type Tournament = {
  id: string;
  name: string;
  players: Player[];
  catalog: Game[];
  rounds: Round[];
  currentRound: Round | null;
  gameCounter: number;
  createdAt: string;
};

type Player = {
  id: string;
  pseudo: string;
  gold: number;
  status: 'alive' | 'eliminated';
  connected: boolean;
};

type Game = {
  id: string;
  name: string;
  type: 'gold' | 'elimination';
  image?: string;
  durationMin: number;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  goldFormula: GoldFormula;       // ex: [+2, +1, 0, -1, -2] selon rang
  sideMissions?: SideMission[];
  bonuses?: Bonus[];
  votes?: VoteConfig[];
};

type VoteConfig = {
  id: string;
  label: string;
  options: 'players' | string[];
  mode: 'anonymous-majority';
};

type Round = {
  id: string;
  gameId: string;
  type: 'gold' | 'elimination';
  participants: string[];
  ranking?: string[];
  votes: VoteResult[];
  goldChanges: { playerId: string; delta: number; reason: string }[];
  eliminatedPlayerId?: string;
  startedAt: string;
  endedAt?: string;
};
```

## Règles métier
- **Alternance** : `gameCounter` pair → propose un jeu `gold`, impair → propose un `elimination` (le MJ peut override)
- **Élimination par PO** : `goldChange` qui met à ≤ 0 → `status = 'eliminated'`, PO clampé à 0
- **Phase élimination** : participants = N derniers du classement (1-3, choisi par le MJ). Le perdant est désigné par le MJ.
- **Achat de bonus** : pendant un round, le MJ peut déduire le coût d'un bonus
- **Classement** : trié par PO desc, puis survie, puis ordre d'élimination inverse pour les éliminés
- **Vote anonyme** : serveur agrège, ne renvoie que les comptes par option

## Catalogue
- Fichier `games.json` versionné, éditable avant le tournoi
- Setup propose de charger le catalogue par défaut, possibilité d'activer/désactiver des jeux pour ce tournoi

## Persistance & resilience
- Snapshot complet du `Tournament` en localStorage à chaque mutation (clé `tournament:current`)
- Au chargement de la page MJ → propose "reprendre" ou "nouveau"
- Le serveur Node tient l'état canonique en mémoire ; restauration depuis le snapshot MJ au handshake WS si présent
- Export JSON manuel possible en bonus

## Lots d'implémentation
1. **Lot 1 — Squelette** : serveur Node + Vite React + shadcn, page MJ basique, connexion WS
2. **Lot 2 — Setup tournoi** : ajout joueurs, import catalogue, QR + écran joueur "lobby"
3. **Lot 3 — Boucle de jeu** : sélection jeu, splash + fiche, saisie classement, application formule
4. **Lot 4 — Votes** : système de vote anonyme avec config par jeu
5. **Lot 5 — Élimination** : mode dédié, choix participants, gestion élimination
6. **Lot 6 — Persistance** : localStorage auto-save + restore + export JSON
7. **Lot 7 — Polish** : animations splash, transitions shadcn, ambiance "diable"
