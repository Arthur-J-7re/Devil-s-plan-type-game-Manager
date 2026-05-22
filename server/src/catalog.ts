import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Bonus, Game, RankingMode, SideMission, VoteConfig } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CATALOG_PATH = join(__dirname, '..', 'data', 'games.json');

export async function loadDefaultCatalog(): Promise<Game[]> {
  const raw = await readFile(CATALOG_PATH, 'utf-8');
  return JSON.parse(raw) as Game[];
}

export async function appendGameToCatalog(input: unknown): Promise<Game> {
  const game = validateGame(input);
  const current = await loadDefaultCatalog();
  if (current.some((g) => g.id === game.id)) {
    throw new Error(`Un jeu avec l'id "${game.id}" existe déjà`);
  }
  const next = [...current, game];
  await writeFile(CATALOG_PATH, JSON.stringify(next, null, 2) + '\n', 'utf-8');
  return game;
}

export async function updateGameInCatalog(targetId: string, input: unknown): Promise<Game> {
  const game = validateGame(input);
  const current = await loadDefaultCatalog();
  const idx = current.findIndex((g) => g.id === targetId);
  if (idx === -1) throw new Error(`Jeu "${targetId}" introuvable`);
  if (game.id !== targetId && current.some((g) => g.id === game.id)) {
    throw new Error(`Un autre jeu utilise déjà l'id "${game.id}"`);
  }
  const next = [...current];
  next[idx] = game;
  await writeFile(CATALOG_PATH, JSON.stringify(next, null, 2) + '\n', 'utf-8');
  return game;
}

function validateGame(raw: unknown): Game {
  if (!raw || typeof raw !== 'object') throw new Error('Payload invalide');
  const o = raw as Record<string, unknown>;

  const name = requireString(o, 'name', 1, 80);
  const idCandidate = typeof o.id === 'string' && o.id.trim() ? o.id : slugify(name);
  const id = requireString({ id: idCandidate }, 'id', 1, 60).replace(/[^a-z0-9-]/g, '-');

  const type = o.type;
  if (type !== 'gold' && type !== 'elimination') {
    throw new Error('type doit être "gold" ou "elimination"');
  }

  const durationMin = requireInt(o, 'durationMin', 1, 600);
  const minPlayers = requireInt(o, 'minPlayers', 1, 50);
  const maxPlayers = requireInt(o, 'maxPlayers', minPlayers, 50);
  const description = typeof o.description === 'string' ? o.description.trim() : '';

  let rankingMode: RankingMode | undefined;
  if (typeof o.rankingMode === 'string') {
    if (o.rankingMode !== 'points' && o.rankingMode !== 'manual') {
      throw new Error('rankingMode doit être "points" ou "manual"');
    }
    rankingMode = o.rankingMode;
  }

  const game: Game = {
    id,
    name: name.trim(),
    type,
    durationMin,
    minPlayers,
    maxPlayers,
    description,
  };
  if (rankingMode) game.rankingMode = rankingMode;

  if (type === 'gold') {
    // En mode points la formule est requise. En mode manual (distribution
    // directe) elle est optionnelle (ignorée si présente).
    const effectiveMode = rankingMode ?? 'points';
    const hasFormula = o.goldFormula && typeof o.goldFormula === 'object';
    if (effectiveMode === 'points' && !hasFormula) {
      throw new Error('goldFormula requis pour un jeu à pièces en mode "points"');
    }
    if (hasFormula) {
      const ranks = (o.goldFormula as Record<string, unknown>).ranks;
      if (!Array.isArray(ranks) || ranks.length === 0) {
        throw new Error('goldFormula.ranks doit être un tableau non vide');
      }
      game.goldFormula = {
        ranks: ranks.map((n, i) => {
          const v = Number(n);
          if (!Number.isFinite(v) || !Number.isInteger(v)) {
            throw new Error(`goldFormula.ranks[${i}] doit être un entier`);
          }
          return v;
        }),
      };
    }
  }

  if (Array.isArray(o.sideMissions)) {
    game.sideMissions = o.sideMissions.map((m, i): SideMission => {
      if (!m || typeof m !== 'object') throw new Error(`sideMissions[${i}] invalide`);
      const mo = m as Record<string, unknown>;
      return {
        id: typeof mo.id === 'string' && mo.id ? mo.id : `${id}-m${i + 1}`,
        label: requireString(mo, 'label', 1, 120),
        reward: requireInt(mo, 'reward', -20, 20),
      };
    });
  }

  if (Array.isArray(o.bonuses)) {
    game.bonuses = o.bonuses.map((b, i): Bonus => {
      if (!b || typeof b !== 'object') throw new Error(`bonuses[${i}] invalide`);
      const bo = b as Record<string, unknown>;
      const bonus: Bonus = {
        id: typeof bo.id === 'string' && bo.id ? bo.id : `${id}-b${i + 1}`,
        label: requireString(bo, 'label', 1, 120),
        cost: requireInt(bo, 'cost', 0, 20),
      };
      if (typeof bo.description === 'string' && bo.description.trim()) {
        bonus.description = bo.description.trim();
      }
      return bonus;
    });
  }

  if (Array.isArray(o.votes)) {
    game.votes = o.votes.map((v, i): VoteConfig => {
      if (!v || typeof v !== 'object') throw new Error(`votes[${i}] invalide`);
      const vo = v as Record<string, unknown>;
      const opts = vo.options;
      let options: VoteConfig['options'];
      if (opts === 'players') {
        options = 'players';
      } else if (Array.isArray(opts)) {
        options = opts.map((opt, j) => {
          if (!opt || typeof opt !== 'object') throw new Error(`votes[${i}].options[${j}] invalide`);
          const oo = opt as Record<string, unknown>;
          return {
            id: typeof oo.id === 'string' && oo.id ? oo.id : `${id}-v${i + 1}-o${j + 1}`,
            label: requireString(oo, 'label', 1, 120),
          };
        });
      } else {
        throw new Error(`votes[${i}].options doit être "players" ou une liste`);
      }
      return {
        id: typeof vo.id === 'string' && vo.id ? vo.id : `${id}-v${i + 1}`,
        label: requireString(vo, 'label', 1, 120),
        options,
        mode: 'anonymous-majority',
      };
    });
  }

  return game;
}

function requireString(
  o: Record<string, unknown>,
  key: string,
  min: number,
  max: number
): string {
  const v = o[key];
  if (typeof v !== 'string') throw new Error(`${key} doit être une chaîne`);
  const trimmed = v.trim();
  if (trimmed.length < min) throw new Error(`${key} trop court (min ${min})`);
  if (trimmed.length > max) throw new Error(`${key} trop long (max ${max})`);
  return trimmed;
}

function requireInt(
  o: Record<string, unknown>,
  key: string,
  min: number,
  max: number
): number {
  const v = Number(o[key]);
  if (!Number.isFinite(v) || !Number.isInteger(v)) {
    throw new Error(`${key} doit être un entier`);
  }
  if (v < min || v > max) throw new Error(`${key} doit être entre ${min} et ${max}`);
  return v;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
