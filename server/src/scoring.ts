import type { GoldFormula, GoldFormulaBracket } from './types.js';

/**
 * Sélectionne la tranche qui s'applique pour `n` participants. La tranche
 * active est la dernière dont `minPlayers ≤ n`. Si `n` est inférieur à toutes,
 * la première tranche (par minPlayers) est utilisée comme fallback.
 *
 * Accepte aussi un objet legacy `{ ranks: [...] }` (ancienne forme).
 */
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

/**
 * Calcul des gains/pertes de pièces selon le classement.
 *
 * Règles :
 *  - La formule (`ranks`) liste les entrées dans l'ordre où elles sont définies.
 *    Les valeurs > 0 sont des récompenses appliquées **depuis le haut** du
 *    classement, les valeurs < 0 sont des pénalités appliquées **depuis le
 *    bas** du classement. Les positions du milieu valent 0.
 *  - Égalités à l'intérieur d'une zone homogène (positives+zéros ou
 *    négatives+zéros) : on somme les slots couverts par l'égalité, on divise
 *    par le nombre de joueurs égaux, on arrondit à l'**entier inférieur**
 *    (`Math.floor`) — jamais plus de pièces que prévu, on peut en donner
 *    moins.
 *  - Égalité qui chevauche un slot positif **et** un slot négatif : 0 pour
 *    tous les joueurs concernés (ambiguïté, le diable n'arbitre pas).
 */

/**
 * Donne la valeur du slot pour chaque rang (0-based) parmi `n` participants,
 * à partir de la formule définie sur le jeu.
 *
 * Exemple : formule [+2, +1, 0, -1, -2] avec n=8 →
 *   [+2, +1, 0, 0, 0, 0, -1, -2]
 */
export function computeSlots(n: number, ranks: number[]): number[] {
  const positives = ranks.filter((v) => v > 0);
  const negatives = ranks.filter((v) => v < 0);
  const slots = new Array(n).fill(0);

  // Top : positives dans l'ordre, à partir du rang 0
  for (let i = 0; i < positives.length && i < n; i++) {
    slots[i] = positives[i];
  }

  // Bottom : negatives appliquées à partir du n-ième par le bas.
  // Dans la formule [..., -1, -2], -1 est plus haut que -2 ; donc le 1er
  // négatif occupe le rang n-k (le moins mauvais des derniers).
  for (let j = 0; j < negatives.length; j++) {
    const idx = n - negatives.length + j;
    if (idx < 0) continue;
    // Si une récompense positive a déjà été assignée à ce rang
    // (formule trop longue par rapport à n), le top a priorité.
    if (idx < positives.length) continue;
    slots[idx] = negatives[j];
  }

  return slots;
}

/**
 * Applique les règles d'égalité sur des « tiers » (groupes de joueurs égaux,
 * dans l'ordre du classement). Retourne le delta de PO pour chaque joueur.
 *
 * `tiers` doit être ordonné : tiers[0] = meilleurs, etc. La longueur totale
 * doit correspondre à n.
 */
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
        // Égalité ambiguë (chevauche gains ET pertes) → annulée
        delta = 0;
      } else {
        const sum = tierSlots.reduce((a, b) => a + b, 0);
        // floor pour ne jamais donner plus que prévu :
        //   gains  : 1.5  → 1 (au lieu de 2)
        //   pertes : -2.5 → -3 (perte plus grande, donc moins de pièces)
        delta = Math.floor(sum / tier.length);
      }
    }

    for (const id of tier) {
      result.set(id, delta);
    }
  }

  return result;
}

/**
 * Construit des tiers à partir de scores : joueurs avec le même score sont
 * regroupés. Tri descendant.
 */
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
