// Domain types
export type GameType = 'gold' | 'elimination';
export type RankingMode = 'points' | 'manual';

export type GoldFormulaBracket = {
  /** Nombre minimal de participants pour que cette tranche s'applique (inclusif). */
  minPlayers: number;
  /** index = rang (0-based, 0 = 1er). Delta de PO à appliquer. */
  ranks: number[];
};

export type GoldFormula = {
  /**
   * Tranches de barème par effectif. La tranche active est la dernière dont
   * `minPlayers ≤ effectif` ; si l'effectif est plus petit que toutes les
   * tranches, la première est utilisée par défaut.
   *
   * Pour la rétro-compat, `ranks` au niveau racine est toujours accepté en
   * entrée (équivalent à une tranche unique avec minPlayers=0) — on le
   * normalise vers `brackets` au plus tôt.
   */
  brackets: GoldFormulaBracket[];
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
  // 'players' = options dynamiques = liste des joueurs vivants
  // sinon, options statiques fournies
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
  /** 'points' = chaque joueur a un total éditable, le classement est dérivé.
   *  'manual' = MJ ordonne à la main (drag & drop). Defaults to 'manual' si absent. */
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
  eliminationOrder: number | null; // ordre d'élimination (1 = premier éliminé)
};

export type GoldChange = {
  playerId: string;
  delta: number;
  reason: string;
  at: string;
};

/** Don de pièces d'un joueur vers un autre, entre deux manches (phase dashboard). */
export type Donation = {
  id: string;
  fromId: string;
  toId: string;
  amount: number;
  at: string;
  /** true si c'est un transfert forcé par le MJ (redistribution d'éliminé, etc.) */
  byMj?: boolean;
};

export type Round = {
  id: string;
  gameId: string;
  gameName: string;
  type: GameType;
  participants: string[];
  ranking: string[] | null;
  /** Points par joueur pour cette manche (mode 'points'). 0 par défaut. */
  roundPoints: Record<string, number>;
  goldChanges: GoldChange[];
  eliminatedPlayerId: string | null;
  startedAt: string | null;
  endedAt: string | null;
};

export type ActiveVote = {
  id: string;
  configId: string;
  label: string;
  options: { id: string; label: string }[];
  ballots: Record<string, string>; // playerId -> optionId (anonymisé côté joueur)
  closed: boolean;
  result: { optionId: string; count: number } | null;
};

export type Phase =
  | 'setup'      // pas encore commencé, ajout joueurs/catalog
  | 'dashboard'  // entre les rounds, classement visible
  | 'presenting' // jeu choisi, en présentation
  | 'playing'    // round en cours
  | 'finished';  // fini, 1 seul joueur vivant

export type Tournament = {
  id: string;
  name: string;
  startGold: number;
  phase: Phase;
  players: Player[];
  catalog: Game[];
  rounds: Round[];
  currentRound: Round | null;
  currentVote: ActiveVote | null;
  donations: Donation[];
  /**
   * Joueurs convoqués pour la prochaine manche (utilisé pour les jeux d'élimination).
   * Définit les deux groupes d'échange autorisés pendant la fenêtre de dons :
   * convoqués entre eux, non-convoqués vivants entre eux. Vide = pas de groupes,
   * dons libres entre tous les vivants.
   */
  nextRoundParticipants: string[];
  gameCounter: number;
  createdAt: string;
};

// WS messages
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
  | { type: 'mj:next-round:set-participants'; payload: { participants: string[] } }
  | { type: 'mj:donate'; payload: { fromId: string; toId: string; amount: number } }
  | { type: 'player:join'; payload: { pseudo: string; playerId?: string } }
  | { type: 'player:vote'; payload: { optionId: string } }
  | { type: 'player:donate'; payload: { toId: string; amount: number } }
  | { type: 'ping'; payload: { t: number } };

// Vue redactée pour les joueurs : on n'envoie pas les bulletins individuels
export type PublicVote = Omit<ActiveVote, 'ballots'> & {
  totalCast: number;
};

export type PublicTournament = Omit<Tournament, 'currentVote'> & {
  currentVote: PublicVote | null;
};

export type ServerMessage =
  | { type: 'state'; payload: { tournament: PublicTournament | null } }
  | { type: 'identity'; payload: { role: 'mj' | 'player' | 'guest'; playerId?: string } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'pong'; payload: { t: number } };
