import type { Game, Round, Player } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Coin } from '@/components/Coin';
import { splitFormula } from '@/lib/scoring';
import { Flame, Swords, Timer } from 'lucide-react';

type Variant = 'compact' | 'full' | 'projection';

const VARIANT_SIZES: Record<Variant, { title: string; body: string; pad: string }> = {
  compact: { title: 'text-2xl', body: 'text-base', pad: 'px-5 py-4' },
  full: { title: 'text-3xl', body: 'text-base', pad: 'px-6 py-5' },
  projection: { title: 'text-5xl', body: 'text-xl', pad: 'px-6 py-5' },
};

/**
 * Affiche-fiche réutilisable d'un jeu. Sert à :
 *  - la présentation côté MJ (PresentScreen)
 *  - l'écran projection (/show)
 *  - la preview en direct du form de création
 */
export function GamePoster({
  game,
  episodeNumber,
  round,
  players,
  variant = 'full',
}: {
  game: Game;
  episodeNumber?: number;
  round?: Round | null;
  players?: Player[];
  variant?: Variant;
}) {
  const s = VARIANT_SIZES[variant];
  const isElim = game.type === 'elimination';

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className={`bg-gradient-to-br from-primary/15 via-card to-card ${s.pad}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {typeof episodeNumber === 'number' && (
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                Épreuve n°{episodeNumber}
              </p>
            )}
            <h2 className={`mt-1 ${s.title} font-bold tracking-tight`}>{game.name}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={isElim ? 'destructive' : 'secondary'}>
                {isElim ? (
                  <>
                    <Swords className="h-3 w-3 mr-1" />
                    élimination
                  </>
                ) : (
                  'pièces'
                )}
              </Badge>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                {game.minPlayers}-{game.maxPlayers} joueurs
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Timer className="h-3.5 w-3.5" /> {game.durationMin}min
              </span>
            </div>
          </div>
          {isElim ? (
            <Swords className="h-12 w-12 text-destructive shrink-0" />
          ) : (
            <Flame className="h-12 w-12 text-primary shrink-0" />
          )}
        </div>
      </div>

      <div className={`${s.pad} space-y-5`}>
        {game.description ? (
          <p className={`leading-relaxed ${s.body}`}>{game.description}</p>
        ) : (
          <p className={`leading-relaxed text-muted-foreground italic ${s.body}`}>
            (Aucune description.)
          </p>
        )}

        {game.type === 'gold' && (game.rankingMode ?? 'points') === 'manual' ? (
          <Section title="Distribution des pièces">
            <p className="text-sm text-muted-foreground">
              Distribution libre : le MJ choisit les gains et pertes joueur par joueur à la
              fin de l'épreuve.
            </p>
          </Section>
        ) : (
          game.goldFormula &&
          game.goldFormula.ranks.length > 0 && (
            <FormulaSection ranks={game.goldFormula.ranks} />
          )
        )}

        {game.sideMissions && game.sideMissions.length > 0 && (
          <Section title="Missions annexes">
            <ul className="space-y-1.5">
              {game.sideMissions.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <span>{m.label || <em className="text-muted-foreground">(sans titre)</em>}</span>
                  <Coin count={m.reward} size="sm" />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {game.bonuses && game.bonuses.length > 0 && (
          <Section title="Bonus achetables">
            <ul className="space-y-1.5">
              {game.bonuses.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <span>
                    {b.label || <em className="text-muted-foreground">(sans titre)</em>}
                    {b.description && (
                      <span className="text-xs text-muted-foreground"> — {b.description}</span>
                    )}
                  </span>
                  <Coin count={-b.cost} size="sm" className="text-red-400" />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {game.votes && game.votes.length > 0 && (
          <Section title="Votes prévus">
            <ul className="space-y-1.5 text-sm">
              {game.votes.map((v) => (
                <li
                  key={v.id}
                  className="rounded-md border bg-background px-3 py-2 flex items-center justify-between gap-3"
                >
                  <span>{v.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {v.options === 'players'
                      ? 'options : joueurs'
                      : `${v.options.length} options`}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {round && round.type === 'elimination' && players && (
          <Section title="Sur le ring">
            <ul className="flex flex-wrap gap-2">
              {round.participants.map((id) => {
                const p = players.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <li
                    key={id}
                    className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-lg font-medium"
                  >
                    {p.pseudo}
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Le perdant est éliminé du tournoi.
            </p>
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-[0.35em] text-muted-foreground mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function FormulaSection({ ranks }: { ranks: number[] }) {
  const { positives, negatives } = splitFormula(ranks);
  const hasMiddle = positives.length + negatives.length < ranks.length || ranks.some((v) => v === 0);
  const positions = (n: number, from: 'top' | 'bottom') =>
    Array.from({ length: n }, (_, i) =>
      from === 'top' ? ordinal(i + 1) : i === 0 ? 'dernier' : `${ordinal(i + 1)} (en partant de la fin)`
    );

  return (
    <Section title="Gains par rang final">
      <div className="grid gap-3 sm:grid-cols-2">
        {positives.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Haut du classement</p>
            <ul className="space-y-1">
              {positives.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 text-sm"
                >
                  <span className="text-muted-foreground">{positions(positives.length, 'top')[i]}</span>
                  <Coin count={d} size="sm" />
                </li>
              ))}
            </ul>
          </div>
        )}
        {negatives.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Bas du classement</p>
            <ul className="space-y-1">
              {[...negatives].reverse().map((d, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 text-sm"
                >
                  <span className="text-muted-foreground">
                    {positions(negatives.length, 'bottom')[i]}
                  </span>
                  <Coin count={d} size="sm" className="text-red-400" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {hasMiddle && (
        <p className="mt-2 text-xs text-muted-foreground">
          Les joueurs du milieu du classement ne gagnent ni ne perdent de pièces.
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Ex aequo dans une zone : les gains/pertes sont partagés (arrondi inférieur). Ex aequo
        à cheval entre gains et pertes : 0 pour tous les concernés.
      </p>
    </Section>
  );
}

function ordinal(n: number): string {
  if (n === 1) return '1er';
  return `${n}e`;
}
