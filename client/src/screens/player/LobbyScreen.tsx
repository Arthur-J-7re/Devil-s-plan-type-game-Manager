import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coin } from '@/components/Coin';
import { sortPlayers } from '@/components/Leaderboard';
import { savePlayerIdentity, clearPlayerIdentity } from './PlayerApp';
import { Flame, LogOut, Skull, Swords, Vote } from 'lucide-react';

export function LobbyScreen() {
  const tournament = useStore((s) => s.tournament);
  const playerId = useStore((s) => s.playerId);
  const me = tournament?.players.find((p) => p.id === playerId);

  // Sauve l'identité une fois rejoint
  useEffect(() => {
    if (playerId && me) savePlayerIdentity(playerId, me.pseudo);
  }, [playerId, me]);

  // Animation à chaque changement de gold
  const [pulseColor, setPulseColor] = useState<'gain' | 'loss' | null>(null);
  const lastGold = useRef<number | null>(null);
  useEffect(() => {
    if (!me) return;
    if (lastGold.current !== null && me.gold !== lastGold.current) {
      setPulseColor(me.gold > lastGold.current ? 'gain' : 'loss');
      const t = setTimeout(() => setPulseColor(null), 1200);
      lastGold.current = me.gold;
      return () => clearTimeout(t);
    }
    lastGold.current = me.gold;
  }, [me?.gold, me]);

  if (!tournament || !me) return null;

  const rank = sortPlayers(tournament.players).findIndex((p) => p.id === me.id) + 1;
  const alive = tournament.players.filter((p) => p.status === 'alive').length;
  const eliminated = me.status === 'eliminated';

  return (
    <div className="space-y-4">
      <Card
        className={`overflow-hidden transition-colors ${
          pulseColor === 'gain'
            ? 'ring-2 ring-emerald-500/60'
            : pulseColor === 'loss'
              ? 'ring-2 ring-destructive/60'
              : ''
        }`}
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardDescription>Tu es</CardDescription>
              <CardTitle className="text-2xl">{me.pseudo}</CardTitle>
            </div>
            {eliminated ? (
              <Badge variant="destructive">
                <Skull className="h-3 w-3 mr-1" /> éliminé
              </Badge>
            ) : (
              <Badge variant="secondary">
                rang #{rank} / {alive}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-center py-4">
            <Coin count={me.gold} size="xl" />
          </div>
          {pulseColor && (
            <p
              className={`text-center text-sm font-medium ${
                pulseColor === 'gain' ? 'text-emerald-500' : 'text-destructive'
              }`}
            >
              {pulseColor === 'gain' ? 'Tu as gagné des pièces !' : 'Tu as perdu des pièces…'}
            </p>
          )}
        </CardContent>
      </Card>

      <CurrentEvent />
      <VoteCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Classement</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-1">
            {sortPlayers(tournament.players).map((p, i) => {
              const isMe = p.id === me.id;
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm ${
                    isMe ? 'bg-primary/10' : ''
                  } ${p.status === 'eliminated' ? 'opacity-50' : ''}`}
                >
                  <span className="w-6 text-center text-xs font-bold text-muted-foreground">
                    {p.status === 'eliminated' ? '—' : `#${i + 1}`}
                  </span>
                  <span className="flex-1 truncate">{p.pseudo}</span>
                  {p.status === 'eliminated' ? (
                    <Skull className="h-3 w-3" />
                  ) : (
                    <Coin count={p.gold} size="sm" />
                  )}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        onClick={() => {
          clearPlayerIdentity();
          location.reload();
        }}
      >
        <LogOut className="h-4 w-4" /> Changer de pseudo
      </Button>
    </div>
  );
}

function CurrentEvent() {
  const tournament = useStore((s) => s.tournament)!;
  const round = tournament.currentRound;
  if (!round) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">En attente</CardTitle>
          <CardDescription>Le MJ va lancer la prochaine épreuve.</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  const game = tournament.catalog.find((g) => g.id === round.gameId);
  const isElim = round.type === 'elimination';
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardDescription>
              {tournament.phase === 'presenting' ? 'Présentation' : 'En cours'}
            </CardDescription>
            <CardTitle className="text-lg">{game?.name ?? round.gameName}</CardTitle>
          </div>
          {isElim ? (
            <Swords className="h-6 w-6 text-destructive" />
          ) : (
            <Flame className="h-6 w-6 text-primary" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{game?.description}</p>
      </CardContent>
    </Card>
  );
}

function VoteCard() {
  const tournament = useStore((s) => s.tournament)!;
  const playerId = useStore((s) => s.playerId)!;
  const send = useStore((s) => s.send);
  const vote = tournament.currentVote;
  const me = tournament.players.find((p) => p.id === playerId);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    setChosen(null);
  }, [vote?.id]);

  if (!vote) return null;
  if (me?.status === 'eliminated') return null;

  const result =
    vote.closed && vote.result
      ? vote.options.find((o) => o.id === vote.result?.optionId)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Vote className="h-5 w-5" /> {vote.label}
        </CardTitle>
        {vote.closed ? (
          <CardDescription>Vote terminé</CardDescription>
        ) : (
          <CardDescription>Choisis une option (vote anonyme)</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {vote.options.map((o) => {
          const isChosen = chosen === o.id;
          const isResult = result?.id === o.id;
          return (
            <Button
              key={o.id}
              variant={isChosen ? 'default' : isResult ? 'secondary' : 'outline'}
              className="w-full justify-start"
              disabled={vote.closed}
              onClick={() => {
                setChosen(o.id);
                send({ type: 'player:vote', payload: { optionId: o.id } });
              }}
            >
              {o.label}
              {isResult && (
                <Badge variant="default" className="ml-auto">
                  vainqueur · {vote.result?.count}
                </Badge>
              )}
            </Button>
          );
        })}
        {chosen && !vote.closed && (
          <p className="text-xs text-muted-foreground">
            Vote enregistré. Tu peux changer tant que ce n'est pas clôturé.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
