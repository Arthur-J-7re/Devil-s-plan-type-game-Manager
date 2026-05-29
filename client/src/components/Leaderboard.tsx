import type { Player } from '@/types';
import { cn } from '@/lib/utils';
import { Coin } from './Coin';
import { Skull, Wifi, WifiOff } from 'lucide-react';

export function sortPlayers(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'alive' ? -1 : 1;
    if (a.status === 'alive') return b.gold - a.gold;
    // both eliminated: latest elimination first (a survécu plus longtemps)
    return (b.eliminationOrder ?? 0) - (a.eliminationOrder ?? 0);
  });
}

export function Leaderboard({
  players,
  highlight,
  compact,
}: {
  players: Player[];
  highlight?: string;
  compact?: boolean;
}) {
  const sorted = sortPlayers(players);
  return (
    <ol className="space-y-1.5">
      {sorted.map((p, i) => {
        const isHighlight = p.id === highlight;
        const eliminated = p.status === 'eliminated';
        return (
          <li
            key={p.id}
            className={cn(
              'flex items-center gap-3 rounded-md border bg-card px-3 py-2',
              eliminated && 'opacity-50',
              isHighlight && 'ring-2 ring-primary',
              compact && 'py-1.5'
            )}
          >
            <span className="w-6 text-center text-sm font-bold text-muted-foreground">
              {eliminated ? '—' : `#${i + 1}`}
            </span>
            <span className="flex-1 truncate font-medium">{p.pseudo}</span>
            {eliminated ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Skull className="h-3 w-3" /> éliminé
              </span>
            ) : (
              <>
                {p.connected ? (
                  <Wifi className="h-3 w-3 text-emerald-500" aria-label="connecté" />
                ) : (
                  <WifiOff className="h-3 w-3 text-muted-foreground" aria-label="hors ligne" />
                )}
                <Coin count={p.gold} size={compact ? 'sm' : 'md'} />
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
