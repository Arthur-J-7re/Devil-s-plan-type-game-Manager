import { useStore } from '@/lib/store';
import { downloadSnapshot } from '@/lib/persistence';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaderboard } from '@/components/Leaderboard';
import { Coin } from '@/components/Coin';
import { Crown, Download, RotateCcw } from 'lucide-react';

export function FinishedScreen() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const winner = tournament.players.find((p) => p.status === 'alive');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader className="text-center">
          <Crown className="mx-auto h-16 w-16 text-yellow-400" />
          <CardTitle className="text-3xl">Vainqueur</CardTitle>
          <CardDescription>
            Le tournoi <strong>{tournament.name}</strong> est terminé après{' '}
            {tournament.rounds.length} manches.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          {winner ? (
            <>
              <p className="text-4xl font-bold">{winner.pseudo}</p>
              <Coin count={winner.gold} size="xl" />
            </>
          ) : (
            <p className="text-muted-foreground">Aucun survivant.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Classement final</CardTitle>
        </CardHeader>
        <CardContent>
          <Leaderboard players={tournament.players} highlight={winner?.id} />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" onClick={() => downloadSnapshot(tournament)}>
          <Download className="h-4 w-4" /> Exporter snapshot
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            // Le snapshot est conservé dans la liste comme archive.
            send({ type: 'mj:tournament:reset' });
          }}
        >
          <RotateCcw className="h-4 w-4" /> Retour au menu
        </Button>
      </div>
    </div>
  );
}
