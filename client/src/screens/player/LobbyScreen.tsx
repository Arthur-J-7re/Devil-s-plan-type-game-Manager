import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Coin } from '@/components/Coin';
import { sortPlayers } from '@/components/Leaderboard';
import { savePlayerIdentity, clearPlayerIdentity } from './PlayerApp';
import { Flame, HandCoins, LogOut, Shield, Skull, Swords, Vote } from 'lucide-react';

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
      <DonateCard />
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

function DonateCard() {
  const tournament = useStore((s) => s.tournament)!;
  const playerId = useStore((s) => s.playerId)!;
  const send = useStore((s) => s.send);
  const me = tournament.players.find((p) => p.id === playerId);

  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(false), 2500);
    return () => clearTimeout(t);
  }, [sent]);

  // Les dons ne sont ouverts qu'entre les manches, pour les joueurs encore en vie
  if (tournament.phase !== 'dashboard') return null;
  if (!me || me.status !== 'alive') return null;

  const maxDonatable = me.gold - 1; // on garde toujours ≥ 1 pièce

  // Règle de groupes : si une convocation est en cours (avant un jeu d'élim),
  // on ne peut donner qu'aux membres de son propre groupe — convoqués entre
  // eux, joueurs hors duel entre eux.
  const convoked = tournament.nextRoundParticipants;
  const groupsActive = convoked.length > 0;
  const iAmConvoked = groupsActive && convoked.includes(me.id);

  const recipients = sortPlayers(
    tournament.players.filter((p) => {
      if (p.status !== 'alive' || p.id === me.id) return false;
      if (!groupsActive) return true;
      return iAmConvoked ? convoked.includes(p.id) : !convoked.includes(p.id);
    })
  );

  if (maxDonatable < 1) return null;

  const recipient = recipients.find((p) => p.id === toId) ?? null;
  const canSend = recipient !== null && amount >= 1 && amount <= maxDonatable;

  const doDonate = () => {
    if (!canSend || toId === null) return;
    send({ type: 'player:donate', payload: { toId, amount } });
    setSent(true);
    setToId(null);
    setAmount(1);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HandCoins className="h-5 w-5" /> Faire un don
        </CardTitle>
        <CardDescription>
          Tu dois garder au moins 1 pièce (max {maxDonatable}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {groupsActive && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${
              iAmConvoked
                ? 'border-destructive/40 bg-destructive/5'
                : 'border-emerald-500/40 bg-emerald-500/5'
            }`}
          >
            {iAmConvoked ? (
              <Swords className="h-4 w-4 shrink-0 text-destructive" />
            ) : (
              <Shield className="h-4 w-4 shrink-0 text-emerald-500" />
            )}
            <p>
              {iAmConvoked
                ? 'Tu es convoqué pour le duel. Tu ne peux donner qu\'aux autres convoqués.'
                : 'Tu es hors duel. Tu ne peux donner qu\'aux autres joueurs hors duel.'}
            </p>
          </div>
        )}

        {recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {groupsActive
              ? 'Personne dans ton groupe pour recevoir un don.'
              : 'Aucun autre joueur à qui donner.'}
          </p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {recipients.map((p) => (
              <button
                key={p.id}
                onClick={() => setToId((cur) => (cur === p.id ? null : p.id))}
                className={`flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-left text-sm ${
                  toId === p.id ? 'border-primary' : ''
                }`}
              >
                <span className="flex-1 truncate">{p.pseudo}</span>
                <Coin count={p.gold} size="sm" />
              </button>
            ))}
          </div>
        )}
        {recipients.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setAmount((a) => Math.max(1, a - 1))}
              >
                −
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={maxDonatable}
                value={amount}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10);
                  setAmount(Number.isNaN(n) ? 0 : Math.min(maxDonatable, Math.max(0, n)));
                }}
                className="text-center"
              />
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setAmount((a) => Math.min(maxDonatable, a + 1))}
              >
                +
              </Button>
            </div>
            <Button className="w-full" disabled={!canSend} onClick={doDonate}>
              <HandCoins className="h-4 w-4" />
              {recipient ? `Donner ${amount} à ${recipient.pseudo}` : 'Choisis un bénéficiaire'}
            </Button>
            {sent && (
              <p className="text-center text-xs font-medium text-emerald-500">Don envoyé !</p>
            )}
          </>
        )}
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
