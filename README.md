# JDS — Tournoi à l'épreuve du diable

App Node.js + React pour organiser un tournoi de jeu de société en mode "à l'épreuve du diable".

Voir [SPECS.md](./SPECS.md) pour le détail des specs.

## Stack
- **Backend** : Node.js + Express + WebSocket (`ws`) + TypeScript
- **Frontend** : Vite + React + TypeScript + Tailwind + shadcn/ui
- **Sync** : WebSocket temps réel
- **Persistance** : localStorage du navigateur MJ

## Démarrage

```bash
npm install
npm run dev
```

Cela lance :
- Le serveur Node sur `http://localhost:3001`
- Le client React sur `http://localhost:5173`

## Workspaces
- `server/` — API HTTP + WS, état canonique du tournoi
- `client/` — UI React (écran MJ + écrans joueurs)
