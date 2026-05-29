import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Game, Round } from '@/types';
import { Button } from '@/components/ui/button';
import { GamePoster } from '@/components/GamePoster';
import { Flame, Swords, ArrowLeft } from 'lucide-react';

export function PresentScreen() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const round = tournament.currentRound!;
  const game = tournament.catalog.find((g) => g.id === round.gameId);

  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2400);
    return () => clearTimeout(t);
  }, []);

  if (!game) return null;
  if (splash) return <Splash game={game} round={round} />;

  return (
    <div className="space-y-6">
      <GamePoster
        game={game}
        episodeNumber={tournament.gameCounter + 1}
        round={round}
        players={tournament.players}
        variant="full"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          size="lg"
          onClick={() => send({ type: 'mj:phase:set', payload: { phase: 'playing' } })}
        >
          C'est parti
        </Button>
        <Button variant="outline" onClick={() => send({ type: 'mj:round:cancel' })}>
          <ArrowLeft className="h-4 w-4" /> Annuler ce jeu
        </Button>
      </div>
    </div>
  );
}

function Splash({ game, round }: { game: Game; round: Round }) {
  const isElim = game.type === 'elimination';
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="text-center animate-in fade-in zoom-in duration-700">
        <div className="mb-6 flex justify-center">
          {isElim ? (
            <Swords className="h-24 w-24 text-destructive animate-ember" />
          ) : (
            <Flame className="h-24 w-24 text-primary animate-ember" />
          )}
        </div>
        <p className="text-sm uppercase tracking-[0.4em] text-muted-foreground">
          {isElim ? 'duel à mort' : 'épreuve du diable'}
        </p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight">{game.name}</h1>
        <p className="mt-4 text-muted-foreground">
          {round.type === 'elimination'
            ? `${round.participants.length} joueurs sur le ring`
            : 'Tous au combat'}
        </p>
      </div>
    </div>
  );
}
