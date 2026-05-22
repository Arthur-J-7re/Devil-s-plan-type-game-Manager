// Mirror of server/src/types.ts (keep in sync)
export type GameType = 'gold' | 'elimination';
export type RankingMode = 'points' | 'manual';

export type GoldFormula = {
  ranks: number[];
};

export type SideMission = {
  id: string;
  label: string;
  reward: number;
};

export type Bonus = {
  id: string;
  label: string;
  cost: number;
  description?: string;
};

export type VoteConfig = {
  id: string;
  label: string;
  options: 'players' | { id: string; label: string }[];
  mode: 'anonymous-majority';
};

export type Game = {
  id: string;
  name: string;
  type: GameType;
  durationMin: number;
  minPlayers: number;
  maxPlayers: number;
  description: string;
  rankingMode?: RankingMode;
  goldFormula?: GoldFormula;
  sideMissions?: SideMission[];
  bonuses?: Bonus[];
  votes?: VoteConfig[];
};

export type Player = {
  id: string;
  pseudo: string;
  gold: number;
  status: 'alive' | 'eliminated';
  connected: boolean;
  eliminationOrder: number | null;
};

export type GoldChange = {
  playerId: string;
  delta: number;
  reason: string;
  at: string;
};

export type Round = {
  id: string;
  gameId: string;
  gameName: string;
  type: GameType;
  participants: string[];
  ranking: string[] | null;
  roundPoints: Record<string, number>;
  goldChanges: GoldChange[];
  eliminatedPlayerId: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

export type PublicVote = {
  id: string;
  configId: string;
  label: string;
  options: { id: string; label: string }[];
  closed: boolean;
  result: { optionId: string; count: number } | null;
  totalCast: number;
};

export type Phase =
  | 'setup'
  | 'dashboard'
  | 'presenting'
  | 'playing'
  | 'finished';

export type Tournament = {
  id: string;
  name: string;
  startGold: number;
  phase: Phase;
  players: Player[];
  catalog: Game[];
  rounds: Round[];
  currentRound: Round | null;
  currentVote: PublicVote | null;
  gameCounter: number;
  createdAt: string;
};

export type Role = 'mj' | 'player' | 'guest';

export type ClientMessage =
  | { type: 'mj:identify' }
  | { type: 'mj:tournament:create'; payload: { name: string; startGold: number } }
  | { type: 'mj:tournament:reset' }
  | { type: 'mj:tournament:restore'; payload: { tournament: Tournament } }
  | { type: 'mj:catalog:set'; payload: { games: Game[] } }
  | { type: 'mj:player:add'; payload: { pseudo: string } }
  | { type: 'mj:player:remove'; payload: { playerId: string } }
  | { type: 'mj:player:rename'; payload: { playerId: string; pseudo: string } }
  | { type: 'mj:phase:set'; payload: { phase: Phase } }
  | { type: 'mj:round:start'; payload: { gameId: string; participants: string[] } }
  | { type: 'mj:round:cancel' }
  | { type: 'mj:round:adjust'; payload: { playerId: string; delta: number; reason: string } }
  | { type: 'mj:round:points:set'; payload: { playerId: string; value: number } }
  | { type: 'mj:round:points:adjust'; payload: { playerId: string; delta: number } }
  | { type: 'mj:round:apply-points-ranking' }
  | { type: 'mj:round:manual:set'; payload: { playerId: string; value: number } }
  | { type: 'mj:round:end' }
  | { type: 'mj:elimination:set-loser'; payload: { playerId: string } }
  | { type: 'mj:vote:open'; payload: { configId: string } }
  | { type: 'mj:vote:close' }
  | { type: 'mj:vote:clear' }
  | { type: 'player:join'; payload: { pseudo: string; playerId?: string } }
  | { type: 'player:vote'; payload: { optionId: string } }
  | { type: 'ping'; payload: { t: number } };

export type ServerMessage =
  | { type: 'state'; payload: { tournament: Tournament | null } }
  | { type: 'identity'; payload: { role: Role; playerId?: string } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'pong'; payload: { t: number } };
