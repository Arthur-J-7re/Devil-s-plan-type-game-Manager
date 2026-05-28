import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from './types.js';
import {
  addPlayer,
  adjustGold,
  adjustRoundPoints,
  applyPointsRanking,
  cancelRound,
  castVote,
  clearVote,
  closeVote,
  createTournament,
  donate,
  endRound,
  mjTransfer,
  findPlayerByPseudo,
  getPublicTournament,
  getTournament,
  markRoundStarted,
  openVote,
  removePlayer,
  renamePlayer,
  resetTournament,
  restoreTournament,
  setCatalog,
  setEliminationLoser,
  setManualDistribution,
  setNextRoundParticipants,
  setPhase,
  setPlayerConnected,
  setRoundPoints,
  startRound,
} from './state.js';
import {
  appendGameToCatalog,
  deleteGameFromCatalog,
  loadDefaultCatalog,
  updateGameInCatalog,
} from './catalog.js';

const PORT = Number(process.env.PORT ?? 3001);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/network', (_req, res) => {
  const ifs = networkInterfaces();
  const ips: string[] = [];
  for (const list of Object.values(ifs)) {
    for (const i of list ?? []) {
      if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
    }
  }
  res.json({ ips });
});

app.get('/api/catalog/default', async (_req, res) => {
  try {
    const games = await loadDefaultCatalog();
    res.json(games);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/catalog/games', async (req, res) => {
  try {
    const game = await appendGameToCatalog(req.body);
    res.status(201).json(game);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.put('/api/catalog/games/:id', async (req, res) => {
  try {
    const game = await updateGameInCatalog(req.params.id, req.body);
    res.json(game);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(msg.includes('introuvable') ? 404 : 400).json({ error: msg });
  }
});

app.delete('/api/catalog/games/:id', async (req, res) => {
  try {
    const result = await deleteGameFromCatalog(req.params.id);
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(msg.includes('introuvable') ? 404 : 400).json({ error: msg });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

type Conn = {
  ws: WebSocket;
  role: 'mj' | 'player' | 'guest';
  playerId?: string;
};
const conns = new Set<Conn>();

function send(c: Conn, msg: ServerMessage) {
  if (c.ws.readyState === WebSocket.OPEN) c.ws.send(JSON.stringify(msg));
}

function broadcastState() {
  const tournament = getPublicTournament();
  const msg: ServerMessage = { type: 'state', payload: { tournament } };
  for (const c of conns) send(c, msg);
}

function sendError(c: Conn, message: string) {
  send(c, { type: 'error', payload: { message } });
}

wss.on('connection', (ws) => {
  const c: Conn = { ws, role: 'guest' };
  conns.add(c);
  send(c, { type: 'identity', payload: { role: 'guest' } });
  send(c, { type: 'state', payload: { tournament: getPublicTournament() } });

  ws.on('message', (raw) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    try {
      handle(c, msg);
    } catch (err) {
      sendError(c, err instanceof Error ? err.message : String(err));
    }
  });

  ws.on('close', () => {
    if (c.role === 'player' && c.playerId) {
      setPlayerConnected(c.playerId, false);
      conns.delete(c);
      broadcastState();
      return;
    }
    conns.delete(c);
  });
});

function handle(c: Conn, msg: ClientMessage) {
  switch (msg.type) {
    case 'ping':
      send(c, { type: 'pong', payload: { t: msg.payload.t } });
      return;

    case 'mj:identify':
      c.role = 'mj';
      send(c, { type: 'identity', payload: { role: 'mj' } });
      return;

    case 'mj:tournament:create':
      requireMj(c);
      createTournament(msg.payload.name, msg.payload.startGold);
      break;

    case 'mj:tournament:reset':
      requireMj(c);
      resetTournament();
      break;

    case 'mj:tournament:restore':
      requireMj(c);
      restoreTournament(msg.payload.tournament);
      break;

    case 'mj:catalog:set':
      requireMj(c);
      setCatalog(msg.payload.games);
      break;

    case 'mj:player:add':
      requireMj(c);
      addPlayer(msg.payload.pseudo);
      break;

    case 'mj:player:remove':
      requireMj(c);
      removePlayer(msg.payload.playerId);
      break;

    case 'mj:player:rename':
      requireMj(c);
      renamePlayer(msg.payload.playerId, msg.payload.pseudo);
      break;

    case 'mj:phase:set':
      requireMj(c);
      setPhase(msg.payload.phase);
      break;

    case 'mj:round:start':
      requireMj(c);
      startRound(msg.payload.gameId, msg.payload.participants);
      break;

    case 'mj:round:cancel':
      requireMj(c);
      cancelRound();
      break;

    case 'mj:round:adjust':
      requireMj(c);
      adjustGold(msg.payload.playerId, msg.payload.delta, msg.payload.reason);
      break;

    case 'mj:round:points:set':
      requireMj(c);
      markRoundStarted();
      setRoundPoints(msg.payload.playerId, msg.payload.value);
      break;

    case 'mj:round:points:adjust':
      requireMj(c);
      markRoundStarted();
      adjustRoundPoints(msg.payload.playerId, msg.payload.delta);
      break;

    case 'mj:round:apply-points-ranking':
      requireMj(c);
      markRoundStarted();
      applyPointsRanking();
      break;

    case 'mj:round:manual:set':
      requireMj(c);
      markRoundStarted();
      setManualDistribution(msg.payload.playerId, msg.payload.value);
      break;

    case 'mj:round:end':
      requireMj(c);
      endRound();
      break;

    case 'mj:elimination:set-loser':
      requireMj(c);
      markRoundStarted();
      setEliminationLoser(msg.payload.playerId);
      break;

    case 'mj:vote:open':
      requireMj(c);
      markRoundStarted();
      openVote(msg.payload.configId);
      break;

    case 'mj:vote:close':
      requireMj(c);
      closeVote();
      break;

    case 'mj:vote:clear':
      requireMj(c);
      clearVote();
      break;

    case 'mj:next-round:set-participants':
      requireMj(c);
      setNextRoundParticipants(msg.payload.participants);
      break;

    case 'mj:donate':
      requireMj(c);
      mjTransfer(msg.payload.fromId, msg.payload.toId, msg.payload.amount);
      break;

    case 'player:join': {
      const t = getTournament();
      if (!t) throw new Error('Pas de tournoi en cours');
      let player = msg.payload.playerId
        ? t.players.find((p) => p.id === msg.payload.playerId)
        : undefined;
      if (!player) {
        player = findPlayerByPseudo(msg.payload.pseudo);
      }
      if (!player) {
        throw new Error('Pseudo introuvable, demande au MJ de t\'ajouter');
      }
      c.role = 'player';
      c.playerId = player.id;
      setPlayerConnected(player.id, true);
      send(c, { type: 'identity', payload: { role: 'player', playerId: player.id } });
      break;
    }

    case 'player:vote':
      if (!c.playerId) throw new Error('Joueur non identifié');
      castVote(c.playerId, msg.payload.optionId);
      break;

    case 'player:donate':
      if (!c.playerId) throw new Error('Joueur non identifié');
      donate(c.playerId, msg.payload.toId, msg.payload.amount);
      break;

    default: {
      const _exhaustive: never = msg;
      void _exhaustive;
    }
  }

  broadcastState();
}

function requireMj(c: Conn) {
  if (c.role !== 'mj') throw new Error('Action réservée au MJ');
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] listening on http://0.0.0.0:${PORT}`);
  console.log(`[server] WebSocket on ws://0.0.0.0:${PORT}/ws`);
});
