import { randomUUID } from 'node:crypto';
import type {
  ActiveVote,
  Donation,
  Game,
  GoldChange,
  Phase,
  Player,
  PublicTournament,
  PublicVote,
  Round,
  Tournament,
  VoteConfig,
} from './types.js';
import {
  computeDeltasFromTiers,
  ranksForPlayerCount,
  tiersFromPoints,
} from './scoring.js';

let tournament: Tournament | null = null;

export function getTournament(): Tournament | null {
  return tournament;
}

export function getPublicTournament(): PublicTournament | null {
  if (!tournament) return null;
  return {
    ...tournament,
    currentVote: redactVote(tournament.currentVote),
  };
}

function redactVote(v: ActiveVote | null): PublicVote | null {
  if (!v) return null;
  const totalCast = Object.keys(v.ballots).length;
  const { ballots: _ignored, ...rest } = v;
  return { ...rest, totalCast };
}

function pid(): string {
  return randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createTournament(name: string, startGold: number): Tournament {
  tournament = {
    id: pid(),
    name,
    startGold,
    phase: 'setup',
    players: [],
    catalog: [],
    rounds: [],
    currentRound: null,
    currentVote: null,
    donations: [],
    nextRoundParticipants: [],
    gameCounter: 0,
    createdAt: nowIso(),
  };
  return tournament;
}

export function resetTournament() {
  tournament = null;
}

export function restoreTournament(t: Tournament) {
  // sécurise les champs ephémères + backward-compat avec snapshots anciens
  const fixRound = (r: Round | null): Round | null => {
    if (!r) return null;
    return { ...r, roundPoints: r.roundPoints ?? Object.fromEntries(r.participants.map((id) => [id, 0])) };
  };
  tournament = {
    ...t,
    players: t.players.map((p) => ({ ...p, connected: false })),
    currentRound: fixRound(t.currentRound),
    rounds: t.rounds.map((r) => fixRound(r) as Round),
    currentVote: t.currentVote ? { ...t.currentVote } : null,
    donations: t.donations ?? [],
    nextRoundParticipants: t.nextRoundParticipants ?? [],
  };
}

export function requireTournament(): Tournament {
  if (!tournament) throw new Error('No tournament');
  return tournament;
}

export function setCatalog(games: Game[]) {
  const t = requireTournament();
  t.catalog = games;
}

export function setPhase(phase: Phase) {
  const t = requireTournament();
  t.phase = phase;
  // Les groupes d'échange n'ont de sens que pendant le dashboard
  if (phase !== 'dashboard') t.nextRoundParticipants = [];
}

/**
 * Convoque (ou met à jour) la liste des joueurs prévus pour la prochaine manche.
 * Côté MJ : utilisé en phase dashboard avant un jeu d'élimination. Sert
 * également à structurer les groupes de dons (convoqués entre eux,
 * non-convoqués vivants entre eux).
 */
export function setNextRoundParticipants(ids: string[]) {
  const t = requireTournament();
  // dédoublonne et ne garde que les joueurs existants
  const known = new Set(t.players.map((p) => p.id));
  const seen = new Set<string>();
  t.nextRoundParticipants = ids.filter((id) => {
    if (!known.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function addPlayer(pseudo: string): Player {
  const t = requireTournament();
  const trimmed = pseudo.trim();
  if (!trimmed) throw new Error('Pseudo vide');
  if (t.players.some((p) => p.pseudo.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('Pseudo déjà utilisé');
  }
  const player: Player = {
    id: pid(),
    pseudo: trimmed,
    gold: t.startGold,
    status: 'alive',
    connected: false,
    eliminationOrder: null,
  };
  t.players.push(player);
  return player;
}

export function removePlayer(playerId: string) {
  const t = requireTournament();
  t.players = t.players.filter((p) => p.id !== playerId);
}

export function renamePlayer(playerId: string, pseudo: string) {
  const t = requireTournament();
  const trimmed = pseudo.trim();
  if (!trimmed) throw new Error('Pseudo vide');
  const p = t.players.find((x) => x.id === playerId);
  if (!p) throw new Error('Joueur introuvable');
  if (t.players.some((x) => x.id !== playerId && x.pseudo.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error('Pseudo déjà utilisé');
  }
  p.pseudo = trimmed;
}

export function findPlayerByPseudo(pseudo: string): Player | undefined {
  const t = getTournament();
  if (!t) return undefined;
  return t.players.find((p) => p.pseudo.toLowerCase() === pseudo.trim().toLowerCase());
}

export function setPlayerConnected(playerId: string, connected: boolean) {
  const t = getTournament();
  if (!t) return;
  const p = t.players.find((x) => x.id === playerId);
  if (p) p.connected = connected;
}

export function startRound(gameId: string, participants: string[]): Round {
  const t = requireTournament();
  const game = t.catalog.find((g) => g.id === gameId);
  if (!game) throw new Error('Jeu introuvable');
  if (t.currentRound) throw new Error('Une manche est déjà en cours');
  const round: Round = {
    id: pid(),
    gameId: game.id,
    gameName: game.name,
    type: game.type,
    participants,
    ranking: null,
    roundPoints: Object.fromEntries(participants.map((id) => [id, 0])),
    goldChanges: [],
    eliminatedPlayerId: null,
    startedAt: null,
    endedAt: null,
  };
  t.currentRound = round;
  t.phase = 'presenting';
  t.nextRoundParticipants = [];
  return round;
}

export function setRoundPoints(playerId: string, value: number) {
  const t = requireTournament();
  if (!t.currentRound) throw new Error('Pas de manche en cours');
  if (!t.currentRound.participants.includes(playerId)) {
    throw new Error('Joueur non-participant');
  }
  if (!Number.isFinite(value)) throw new Error('Valeur invalide');
  t.currentRound.roundPoints[playerId] = Math.round(value);
}

export function adjustRoundPoints(playerId: string, delta: number) {
  const t = requireTournament();
  if (!t.currentRound) throw new Error('Pas de manche en cours');
  if (!t.currentRound.participants.includes(playerId)) {
    throw new Error('Joueur non-participant');
  }
  if (!Number.isFinite(delta)) throw new Error('Delta invalide');
  const current = t.currentRound.roundPoints[playerId] ?? 0;
  t.currentRound.roundPoints[playerId] = Math.round(current + delta);
}

export function applyPointsRanking() {
  const t = requireTournament();
  if (!t.currentRound) throw new Error('Pas de manche en cours');
  const tiers = tiersFromPoints(t.currentRound.participants, t.currentRound.roundPoints);
  applyTieredRanking(tiers);
}

export function cancelRound() {
  const t = requireTournament();
  if (!t.currentRound) return;
  // revert les goldChanges
  for (const gc of t.currentRound.goldChanges) {
    const p = t.players.find((x) => x.id === gc.playerId);
    if (p) p.gold = clampGold(p.gold - gc.delta);
  }
  t.currentRound = null;
  t.currentVote = null;
  t.nextRoundParticipants = [];
  t.phase = 'dashboard';
}

export function markRoundStarted() {
  const t = requireTournament();
  if (!t.currentRound) return;
  if (!t.currentRound.startedAt) t.currentRound.startedAt = nowIso();
  t.phase = 'playing';
}

export function adjustGold(playerId: string, delta: number, reason: string) {
  const t = requireTournament();
  if (!t.currentRound) throw new Error('Pas de manche en cours');
  const p = t.players.find((x) => x.id === playerId);
  if (!p) throw new Error('Joueur introuvable');
  const before = p.gold;
  const after = clampGold(before + delta);
  const realDelta = after - before;
  p.gold = after;
  t.currentRound.goldChanges.push({
    playerId,
    delta: realDelta,
    reason,
    at: nowIso(),
  });
  applyEliminationIfBroke(p);
}

function applyEliminationIfBroke(p: Player) {
  if (!tournament) return;
  if (p.gold <= 0 && p.status === 'alive') {
    p.status = 'eliminated';
    const maxOrder = tournament.players.reduce(
      (m, x) => Math.max(m, x.eliminationOrder ?? 0),
      0
    );
    p.eliminationOrder = maxOrder + 1;
  }
}

function clampGold(g: number): number {
  return Math.max(0, Math.round(g));
}

/**
 * Mode manual : distribution directe. Le MJ tape un delta de pièces pour
 * un participant ; on revert toute distribution précédente pour ce joueur
 * et on applique la nouvelle. `roundPoints[playerId]` mémorise la valeur
 * « voulue » pour pré-remplir l'UI.
 */
export function setManualDistribution(playerId: string, value: number) {
  const t = requireTournament();
  if (!t.currentRound) throw new Error('Pas de manche en cours');
  if (!t.currentRound.participants.includes(playerId)) {
    throw new Error('Joueur non-participant');
  }
  if (!Number.isFinite(value)) throw new Error('Valeur invalide');
  const player = t.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Joueur introuvable');
  const r = t.currentRound;
  const intVal = Math.round(value);

  // Revert toute distribution 'ranking' précédente pour ce joueur
  for (const gc of r.goldChanges.filter(
    (c) => c.playerId === playerId && c.reason === 'ranking'
  )) {
    player.gold = clampGold(player.gold - gc.delta);
  }
  r.goldChanges = r.goldChanges.filter(
    (c) => !(c.playerId === playerId && c.reason === 'ranking')
  );

  r.roundPoints[playerId] = intVal;

  if (intVal === 0) return;

  const before = player.gold;
  const after = clampGold(before + intVal);
  const realDelta = after - before;
  player.gold = after;
  r.goldChanges.push({
    playerId,
    delta: realDelta,
    reason: 'ranking',
    at: nowIso(),
  });
  applyEliminationIfBroke(player);
}

function applyTieredRanking(tiers: string[][]) {
  const t = requireTournament();
  if (!t.currentRound) throw new Error('Pas de manche en cours');
  if (t.currentRound.type !== 'gold') throw new Error('Classement seulement pour les jeux à pièces');
  const game = t.catalog.find((g) => g.id === t.currentRound!.gameId);
  if (!game?.goldFormula) throw new Error('Aucune formule de gains pour ce jeu');

  // revert anciens changements liés au classement (reason = 'ranking')
  for (const gc of t.currentRound.goldChanges.filter((c) => c.reason === 'ranking')) {
    const p = t.players.find((x) => x.id === gc.playerId);
    if (p) p.gold = clampGold(p.gold - gc.delta);
  }
  t.currentRound.goldChanges = t.currentRound.goldChanges.filter(
    (c) => c.reason !== 'ranking'
  );

  const flatRanking = tiers.flat();
  const ranks = ranksForPlayerCount(game.goldFormula, t.currentRound.participants.length);
  const deltas = computeDeltasFromTiers(tiers, ranks);

  for (const [playerId, delta] of deltas) {
    if (delta === 0) continue;
    const p = t.players.find((x) => x.id === playerId);
    if (!p) continue;
    const before = p.gold;
    const after = clampGold(before + delta);
    const realDelta = after - before;
    p.gold = after;
    t.currentRound!.goldChanges.push({
      playerId,
      delta: realDelta,
      reason: 'ranking',
      at: nowIso(),
    });
    applyEliminationIfBroke(p);
  }

  t.currentRound.ranking = flatRanking;
}

export function setEliminationLoser(playerId: string) {
  const t = requireTournament();
  if (!t.currentRound) throw new Error('Pas de manche en cours');
  if (t.currentRound.type !== 'elimination') throw new Error('Le jeu n\'est pas un jeu d\'élimination');
  const p = t.players.find((x) => x.id === playerId);
  if (!p) throw new Error('Joueur introuvable');
  if (!t.currentRound.participants.includes(playerId)) {
    throw new Error('Le joueur ne participe pas à ce duel');
  }
  // revert ancienne élimination de ce round si elle existait
  if (t.currentRound.eliminatedPlayerId && t.currentRound.eliminatedPlayerId !== playerId) {
    const prev = t.players.find((x) => x.id === t.currentRound!.eliminatedPlayerId);
    if (prev && prev.status === 'eliminated' && prev.eliminationOrder !== null) {
      // ne revert que si c'est celle de ce round (heuristique: gold 0 OK)
      // ici on remet vivant si gold > 0
      if (prev.gold > 0) {
        prev.status = 'alive';
        prev.eliminationOrder = null;
      }
    }
  }
  t.currentRound.eliminatedPlayerId = playerId;
  if (p.status === 'alive') {
    p.status = 'eliminated';
    const maxOrder = t.players.reduce((m, x) => Math.max(m, x.eliminationOrder ?? 0), 0);
    p.eliminationOrder = maxOrder + 1;
  }
}

export function endRound() {
  const t = requireTournament();
  if (!t.currentRound) return;
  t.currentRound.endedAt = nowIso();
  t.rounds.push(t.currentRound);
  t.currentRound = null;
  t.currentVote = null;
  t.nextRoundParticipants = [];
  t.gameCounter += 1;
  const alive = t.players.filter((p) => p.status === 'alive');
  t.phase = alive.length <= 1 ? 'finished' : 'dashboard';
}

/** Indique, pour un joueur donné, à quel groupe d'échange il appartient. */
function donationGroup(t: Tournament, playerId: string): 'convoked' | 'safe' | null {
  if (t.nextRoundParticipants.length === 0) return null;
  return t.nextRoundParticipants.includes(playerId) ? 'convoked' : 'safe';
}

/**
 * Don de pièces entre deux joueurs vivants, uniquement entre les manches
 * (phase 'dashboard'). Le donateur doit conserver au moins 1 pièce : on ne
 * peut pas s'auto-éliminer par un don. Si une convocation est en cours
 * (avant un jeu d'élimination), donneur et bénéficiaire doivent appartenir
 * au même groupe (convoqués entre eux, non-convoqués vivants entre eux).
 */
export function donate(fromId: string, toId: string, amount: number): Donation {
  const t = requireTournament();
  if (t.phase !== 'dashboard') {
    throw new Error('Les dons ne sont possibles qu\'entre les manches');
  }
  if (fromId === toId) throw new Error('Don vers soi-même impossible');
  if (!Number.isFinite(amount)) throw new Error('Montant invalide');
  const value = Math.round(amount);
  if (value <= 0) throw new Error('Le montant doit être positif');

  const from = t.players.find((p) => p.id === fromId);
  const to = t.players.find((p) => p.id === toId);
  if (!from) throw new Error('Donateur introuvable');
  if (!to) throw new Error('Bénéficiaire introuvable');
  if (from.status !== 'alive') throw new Error('Donateur éliminé');
  if (to.status !== 'alive') throw new Error('Bénéficiaire éliminé');

  // Règle de groupes (active uniquement si une convocation est en cours)
  const fromGroup = donationGroup(t, fromId);
  const toGroup = donationGroup(t, toId);
  if (fromGroup !== null && fromGroup !== toGroup) {
    throw new Error(
      fromGroup === 'convoked'
        ? 'Tu es convoqué : tu ne peux donner qu\'aux autres convoqués'
        : 'Tu es hors duel : tu ne peux donner qu\'aux autres joueurs hors duel'
    );
  }

  const maxDonatable = from.gold - 1;
  if (maxDonatable < 1) throw new Error('Pas assez de pièces pour donner');
  if (value > maxDonatable) {
    throw new Error(`Tu dois garder au moins 1 pièce (max ${maxDonatable})`);
  }

  from.gold = clampGold(from.gold - value);
  to.gold = clampGold(to.gold + value);

  const donation: Donation = {
    id: pid(),
    fromId,
    toId,
    amount: value,
    at: nowIso(),
  };
  t.donations.push(donation);
  return donation;
}

/**
 * Transfert forcé par le MJ : permet notamment de redistribuer les pièces
 * d'un joueur éliminé. Aucune contrainte de groupe ni de solde minimum côté
 * source ; le bénéficiaire doit être en vie. Logué comme don avec byMj=true.
 */
export function mjTransfer(fromId: string, toId: string, amount: number): Donation {
  const t = requireTournament();
  if (t.phase !== 'dashboard') {
    throw new Error('Redistribution possible uniquement entre les manches');
  }
  if (fromId === toId) throw new Error('Transfert vers soi-même impossible');
  if (!Number.isFinite(amount)) throw new Error('Montant invalide');
  const value = Math.round(amount);
  if (value <= 0) throw new Error('Le montant doit être positif');

  const from = t.players.find((p) => p.id === fromId);
  const to = t.players.find((p) => p.id === toId);
  if (!from) throw new Error('Source introuvable');
  if (!to) throw new Error('Bénéficiaire introuvable');
  if (to.status !== 'alive') throw new Error('Bénéficiaire éliminé');
  if (from.gold < value) throw new Error(`Solde insuffisant (${from.gold} dispo)`);

  from.gold = clampGold(from.gold - value);
  to.gold = clampGold(to.gold + value);
  // Si la source était vivante et tombe à 0, on déclenche l'élimination
  if (from.status === 'alive') applyEliminationIfBroke(from);

  const donation: Donation = {
    id: pid(),
    fromId,
    toId,
    amount: value,
    at: nowIso(),
    byMj: true,
  };
  t.donations.push(donation);
  return donation;
}

// Votes
export function openVote(configId: string): ActiveVote {
  const t = requireTournament();
  if (!t.currentRound) throw new Error('Pas de manche en cours');
  const game = t.catalog.find((g) => g.id === t.currentRound!.gameId);
  if (!game) throw new Error('Jeu introuvable');
  const cfg: VoteConfig | undefined = game.votes?.find((v) => v.id === configId);
  if (!cfg) throw new Error('Vote introuvable');
  const options =
    cfg.options === 'players'
      ? t.players.filter((p) => p.status === 'alive').map((p) => ({ id: p.id, label: p.pseudo }))
      : cfg.options;
  t.currentVote = {
    id: pid(),
    configId: cfg.id,
    label: cfg.label,
    options,
    ballots: {},
    closed: false,
    result: null,
  };
  return t.currentVote;
}

export function castVote(playerId: string, optionId: string) {
  const t = requireTournament();
  if (!t.currentVote) throw new Error('Pas de vote en cours');
  if (t.currentVote.closed) throw new Error('Vote clôturé');
  if (!t.currentVote.options.some((o) => o.id === optionId)) {
    throw new Error('Option invalide');
  }
  const player = t.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Joueur inconnu');
  if (player.status !== 'alive') throw new Error('Joueur éliminé');
  t.currentVote.ballots[playerId] = optionId;
}

export function closeVote() {
  const t = requireTournament();
  if (!t.currentVote) return;
  const counts: Record<string, number> = {};
  for (const optId of Object.values(t.currentVote.ballots)) {
    counts[optId] = (counts[optId] ?? 0) + 1;
  }
  let bestId: string | null = null;
  let bestCount = -1;
  for (const opt of t.currentVote.options) {
    const c = counts[opt.id] ?? 0;
    if (c > bestCount) {
      bestCount = c;
      bestId = opt.id;
    }
  }
  t.currentVote.closed = true;
  t.currentVote.result = bestId ? { optionId: bestId, count: bestCount } : null;
}

export function clearVote() {
  const t = requireTournament();
  t.currentVote = null;
}
