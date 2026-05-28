// Jumeau de server/src/scoring.ts — garder en synchro. Doc complète côté serveur.

import type { GoldFormula, GoldFormulaBracket } from '@/types';

export function selectBracket(
  formula: GoldFormula | { ranks?: number[] } | null | undefined,
  n: number,
): GoldFormulaBracket | null {
  if (!formula) return null;
  const f = formula as { brackets?: GoldFormulaBracket[]; ranks?: number[] };
  if (Array.isArray(f.brackets) && f.brackets.length > 0) {
    const sorted = [...f.brackets].sort((a, b) => a.minPlayers - b.minPlayers);
    let pick = sorted[0];
    for (const b of sorted) {
      if (b.minPlayers <= n) pick = b;
      else break;
    }
    return pick;
  }
  if (Array.isArray(f.ranks)) {
    return { minPlayers: 0, ranks: f.ranks };
  }
  return null;
}

export function ranksForPlayerCount(
  formula: GoldFormula | { ranks?: number[] } | null | undefined,
  n: number,
): number[] {
  return selectBracket(formula, n)?.ranks ?? [];
}

/** Renvoie toutes les tranches normalisées (legacy `ranks` → tranche unique). */
export function allBrackets(
  formula: GoldFormula | { ranks?: number[] } | null | undefined,
): GoldFormulaBracket[] {
  if (!formula) return [];
  const f = formula as { brackets?: GoldFormulaBracket[]; ranks?: number[] };
  if (Array.isArray(f.brackets) && f.brackets.length > 0) {
    return [...f.brackets].sort((a, b) => a.minPlayers - b.minPlayers);
  }
  if (Array.isArray(f.ranks)) return [{ minPlayers: 0, ranks: f.ranks }];
  return [];
}

export function computeSlots(n: number, ranks: number[]): number[] {
  const positives = ranks.filter((v) => v > 0);
  const negatives = ranks.filter((v) => v < 0);
  const slots = new Array(n).fill(0);
  for (let i = 0; i < positives.length && i < n; i++) {
    slots[i] = positives[i];
  }
  for (let j = 0; j < negatives.length; j++) {
    const idx = n - negatives.length + j;
    if (idx < 0) continue;
    if (idx < positives.length) continue;
    slots[idx] = negatives[j];
  }
  return slots;
}

export function computeDeltasFromTiers(
  tiers: string[][],
  ranks: number[]
): Map<string, number> {
  const n = tiers.reduce((acc, t) => acc + t.length, 0);
  const slots = computeSlots(n, ranks);
  const result = new Map<string, number>();
  let pos = 0;
  for (const tier of tiers) {
    const tierSlots = slots.slice(pos, pos + tier.length);
    pos += tier.length;
    let delta: number;
    if (tier.length === 1) {
      delta = tierSlots[0] ?? 0;
    } else {
      const hasPositive = tierSlots.some((v) => v > 0);
      const hasNegative = tierSlots.some((v) => v < 0);
      if (hasPositive && hasNegative) {
        delta = 0;
      } else {
        const sum = tierSlots.reduce((a, b) => a + b, 0);
        delta = Math.floor(sum / tier.length);
      }
    }
    for (const id of tier) result.set(id, delta);
  }
  return result;
}

export function tiersFromPoints(
  participants: string[],
  points: Record<string, number>
): string[][] {
  const sorted = [...participants].sort(
    (a, b) => (points[b] ?? 0) - (points[a] ?? 0)
  );
  const tiers: string[][] = [];
  let lastPoints: number | null = null;
  for (const id of sorted) {
    const p = points[id] ?? 0;
    if (tiers.length > 0 && lastPoints === p) {
      tiers[tiers.length - 1].push(id);
    } else {
      tiers.push([id]);
      lastPoints = p;
    }
  }
  return tiers;
}

/** Helpers d'affichage de la formule en deux groupes (top/bottom). */
export function splitFormula(ranks: number[]): { positives: number[]; negatives: number[] } {
  return {
    positives: ranks.filter((v) => v > 0),
    negatives: ranks.filter((v) => v < 0),
  };
}
