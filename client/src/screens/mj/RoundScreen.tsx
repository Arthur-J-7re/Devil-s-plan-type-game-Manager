import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Coin } from '@/components/Coin';
import { Leaderboard } from '@/components/Leaderboard';
import { computeDeltasFromTiers, tiersFromPoints } from '@/lib/scoring';
import { Check, Flag, ListChecks, Minus, Plus, Timer, Vote } from 'lucide-react';

export function RoundScreen() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const round = tournament.currentRound!;
  const game = tournament.catalog.find((g) => g.id === round.gameId);

  if (!game) return null;

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardDescription>Manche en cours</CardDescription>
                <CardTitle className="text-2xl">{game.name}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <RoundTimer startedAt={round.startedAt} targetMin={game.durationMin} />
                <Badge variant={game.type === 'elimination' ? 'destructive' : 'secondary'}>
                  {game.type === 'elimination' ? 'élimination' : 'pièces'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (confirm('Annuler la manche et revert les changements de PO ?'))
                  send({ type: 'mj:round:cancel' });
              }}
            >
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm('Terminer la manche maintenant ?')) send({ type: 'mj:round:end' });
              }}
            >
              <Flag className="h-4 w-4" /> Terminer la manche
            </Button>
          </CardContent>
        </Card>

        {game.type === 'elimination' ? (
          <EliminationPanel />
        ) : (game.rankingMode ?? 'points') === 'points' ? (
          <PointsPanel />
        ) : (
          <DirectDistributionPanel />
        )}

        {(game.sideMissions?.length ?? 0) > 0 && <MissionsPanel />}

        {(game.votes?.length ?? 0) > 0 && <VotePanel />}

        <GoldAdjustPanel />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Classement</CardTitle>
          </CardHeader>
          <CardContent>
            <Leaderboard players={tournament.players} compact />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DirectDistributionPanel() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const round = tournament.currentRound!;

  const participants = round.participants
    .map((id) => tournament.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const setVal = (playerId: string, value: number) =>
    send({ type: 'mj:round:manual:set', payload: { playerId, value } });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Distribution des pièces</CardTitle>
        <CardDescription>
          Tape (ou +/-) le delta de pièces pour chaque participant. Appliqué immédiatement.
          Re-modifier remplace la valeur précédente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-1.5">
          {participants.map((p) => {
            const current = round.roundPoints[p.id] ?? 0;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2"
              >
                <span className="flex-1 min-w-[120px] font-medium">{p.pseudo}</span>
                <Coin count={p.gold} size="sm" />
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="-1"
                    onClick={() => setVal(p.id, current - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <PointsInput value={current} onCommit={(v) => setVal(p.id, v)} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="+1"
                    onClick={() => setVal(p.id, current + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground pt-2">
          Astuce : laisser à 0 pour les joueurs sans gain ni perte. La saisie est revertée
          intégralement si tu annules la manche.
        </p>
      </CardContent>
    </Card>
  );
}

function PointsPanel() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const round = tournament.currentRound!;
  const game = tournament.catalog.find((g) => g.id === round.gameId)!;

  // Construit les tiers (ex-aequo regroupés) et calcule les deltas prévus
  const { ordered, deltaByPlayer } = useMemo(() => {
    const tiers = tiersFromPoints(round.participants, round.roundPoints);
    const deltas = computeDeltasFromTiers(tiers, game.goldFormula?.ranks ?? []);
    const ordered: {
      id: string;
      player: ReturnType<typeof tournament.players.find>;
      points: number;
      rank: string;
    }[] = [];
    let pos = 0;
    for (const tier of tiers) {
      const rankLabel =
        tier.length > 1 ? `#${pos + 1}–#${pos + tier.length}` : `#${pos + 1}`;
      for (const id of tier) {
        ordered.push({
          id,
          player: tournament.players.find((p) => p.id === id),
          points: round.roundPoints[id] ?? 0,
          rank: rankLabel,
        });
      }
      pos += tier.length;
    }
    return { ordered, deltaByPlayer: deltas };
  }, [
    round.participants,
    round.roundPoints,
    game.goldFormula?.ranks,
    tournament.players,
  ]);

  const adjust = (playerId: string, delta: number) =>
    send({ type: 'mj:round:points:adjust', payload: { playerId, delta } });

  const setVal = (playerId: string, value: number) =>
    send({ type: 'mj:round:points:set', payload: { playerId, value } });

  const apply = () => send({ type: 'mj:round:apply-points-ranking' });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Points de la manche</CardTitle>
        <CardDescription>
          Saisis les points au fil de la partie. Le classement et les gains sont calculés
          automatiquement (ex aequo regroupés, gains/pertes partagés).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-1.5">
          {ordered.map(({ id, player, points, rank }) => {
            if (!player) return null;
            const delta = deltaByPlayer.get(id) ?? 0;
            return (
              <li
                key={id}
                className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2"
              >
                <span className="w-14 text-center text-xs font-bold text-muted-foreground">
                  {rank}
                </span>
                <span className="flex-1 min-w-[120px] font-medium">{player.pseudo}</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="-1 point"
                    onClick={() => adjust(id, -1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <PointsInput value={points} onCommit={(v) => setVal(id, v)} />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="+1 point"
                    onClick={() => adjust(id, 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Coin
                  count={delta}
                  size="sm"
                  className={
                    delta < 0
                      ? 'text-red-400'
                      : delta > 0
                        ? 'text-emerald-400'
                        : 'text-muted-foreground'
                  }
                />
              </li>
            );
          })}
        </ol>
        <div className="flex gap-2 items-center">
          <Button onClick={apply}>Appliquer le classement</Button>
          {round.ranking && (
            <span className="text-xs text-muted-foreground">
              classement déjà appliqué — re-appliquer remplace
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PointsInput({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  // Buffer local pour permettre la frappe sans aller-retour serveur ;
  // se resync quand la valeur canonique change (autre client / +/-).
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setLocal(String(value));
  }, [value, focused]);

  return (
    <Input
      type="number"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const n = Number(local);
        if (Number.isFinite(n) && n !== value) onCommit(n);
        else setLocal(String(value));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      className="w-16 h-8 px-2 text-sm font-mono tabular-nums"
    />
  );
}

function MissionsPanel() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const round = tournament.currentRound!;
  const game = tournament.catalog.find((g) => g.id === round.gameId)!;
  const missions = game.sideMissions ?? [];
  const alive = tournament.players.filter((p) => p.status === 'alive');

  // Récap : qui a déjà touché quelle mission ? On lit les goldChanges du round
  // qui ont une reason commençant par "mission:<label>"
  const completionsByMission = new Map<string, Set<string>>();
  for (const gc of round.goldChanges) {
    if (!gc.reason.startsWith('mission:')) continue;
    const label = gc.reason.slice('mission:'.length);
    const m = missions.find((mm) => mm.label === label);
    if (!m) continue;
    if (!completionsByMission.has(m.id)) completionsByMission.set(m.id, new Set());
    completionsByMission.get(m.id)!.add(gc.playerId);
  }

  const grant = (missionLabel: string, reward: number, playerId: string) => {
    send({
      type: 'mj:round:adjust',
      payload: { playerId, delta: reward, reason: `mission:${missionLabel}` },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ListChecks className="h-5 w-5" /> Missions annexes
        </CardTitle>
        <CardDescription>
          Clique un joueur pour lui attribuer la récompense. Tu peux ré-attribuer la même
          mission à plusieurs joueurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {missions.map((m) => {
          const done = completionsByMission.get(m.id) ?? new Set<string>();
          return (
            <div key={m.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{m.label}</p>
                <Coin count={m.reward} size="sm" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {alive.map((p) => {
                  const granted = done.has(p.id);
                  return (
                    <Button
                      key={p.id}
                      size="sm"
                      variant={granted ? 'default' : 'outline'}
                      onClick={() => grant(m.label, m.reward, p.id)}
                      title={granted ? 'Cliquer pour re-attribuer' : 'Attribuer'}
                    >
                      {granted && <Check className="h-3 w-3" />}
                      {p.pseudo}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function EliminationPanel() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const round = tournament.currentRound!;
  const participants = round.participants
    .map((id) => tournament.players.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Duel d'élimination</CardTitle>
        <CardDescription>
          Désigne le perdant : il est éliminé du tournoi. Tu peux changer d'avis tant que la manche
          n'est pas terminée.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {participants.map((p) => {
            const isLoser = round.eliminatedPlayerId === p.id;
            return (
              <li key={p.id}>
                <button
                  className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                    isLoser
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'bg-card hover:bg-accent'
                  }`}
                  onClick={() =>
                    send({
                      type: 'mj:elimination:set-loser',
                      payload: { playerId: p.id },
                    })
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{p.pseudo}</span>
                    <Coin count={p.gold} size="sm" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isLoser ? 'Éliminé' : 'Cliquer = il perd'}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function GoldAdjustPanel() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const round = tournament.currentRound!;
  const game = tournament.catalog.find((g) => g.id === round.gameId)!;
  const [openId, setOpenId] = useState<string | null>(null);
  const [custom, setCustom] = useState<{ delta: number; reason: string }>({ delta: 1, reason: '' });

  const alive = tournament.players.filter((p) => p.status === 'alive');

  const adjust = (playerId: string, delta: number, reason: string) => {
    send({ type: 'mj:round:adjust', payload: { playerId, delta, reason } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ajustements de pièces</CardTitle>
        <CardDescription>Bonus achetés, pénalités ad hoc, ajustements libres.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {alive.map((p) => {
          const isOpen = openId === p.id;
          return (
            <div key={p.id} className="rounded-md border bg-card">
              <button
                className="flex w-full items-center justify-between px-3 py-2"
                onClick={() => setOpenId(isOpen ? null : p.id)}
              >
                <span className="font-medium">{p.pseudo}</span>
                <Coin count={p.gold} size="sm" />
              </button>
              {isOpen && (
                <div className="border-t p-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, -1, -2].map((d) => (
                      <Button
                        key={d}
                        size="sm"
                        variant="outline"
                        onClick={() => adjust(p.id, d, 'adjust')}
                      >
                        {d > 0 ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        {Math.abs(d)}
                      </Button>
                    ))}
                  </div>
                  {game.bonuses && game.bonuses.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Bonus achetés</p>
                      <div className="flex flex-wrap gap-1.5">
                        {game.bonuses.map((b) => (
                          <Button
                            key={b.id}
                            size="sm"
                            variant="destructive"
                            onClick={() => adjust(p.id, -b.cost, `bonus:${b.label}`)}
                          >
                            −{b.cost} · {b.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={custom.delta}
                      onChange={(e) =>
                        setCustom((c) => ({ ...c, delta: Number(e.target.value) || 0 }))
                      }
                      className="w-20"
                    />
                    <Input
                      placeholder="Raison (libre)"
                      value={custom.reason}
                      onChange={(e) => setCustom((c) => ({ ...c, reason: e.target.value }))}
                    />
                    <Button
                      onClick={() => adjust(p.id, custom.delta, custom.reason || 'adjust')}
                      disabled={custom.delta === 0}
                    >
                      Appliquer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RoundTimer({ startedAt, targetMin }: { startedAt: string | null; targetMin: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Timer className="h-3.5 w-3.5" /> {targetMin}min cible
      </span>
    );
  }

  const elapsedMs = now - new Date(startedAt).getTime();
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const mm = Math.floor(elapsedSec / 60);
  const ss = elapsedSec % 60;
  const over = elapsedSec > targetMin * 60;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums ${
        over ? 'text-destructive font-semibold' : 'text-muted-foreground'
      }`}
      title={`Durée cible : ${targetMin}min`}
    >
      <Timer className="h-3.5 w-3.5" />
      {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      <span className="opacity-60">/ {targetMin}min</span>
    </span>
  );
}

function VotePanel() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const round = tournament.currentRound!;
  const game = tournament.catalog.find((g) => g.id === round.gameId)!;
  const vote = tournament.currentVote;

  if (!vote) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Vote className="h-5 w-5" /> Votes
          </CardTitle>
          <CardDescription>Lance un vote depuis l'app pour les joueurs connectés.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {game.votes?.map((v) => (
            <Button
              key={v.id}
              variant="outline"
              onClick={() => send({ type: 'mj:vote:open', payload: { configId: v.id } })}
            >
              {v.label}
            </Button>
          ))}
        </CardContent>
      </Card>
    );
  }

  const aliveCount = tournament.players.filter((p) => p.status === 'alive').length;
  const result = vote.result
    ? vote.options.find((o) => o.id === vote.result?.optionId)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Vote className="h-5 w-5" /> Vote en cours
        </CardTitle>
        <CardDescription>{vote.label}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span>Bulletins reçus :</span>
          <Badge variant="secondary">
            {vote.totalCast} / {aliveCount}
          </Badge>
          {vote.closed && <Badge variant="default">clôturé</Badge>}
        </div>
        {vote.closed && (
          <div className="rounded-md border bg-card p-3 text-sm">
            {result ? (
              <p>
                Résultat : <strong>{result.label}</strong>{' '}
                <span className="text-muted-foreground">({vote.result?.count} voix)</span>
              </p>
            ) : (
              <p className="text-muted-foreground">Aucun vote.</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {!vote.closed && (
            <Button onClick={() => send({ type: 'mj:vote:close' })}>Clôturer & révéler</Button>
          )}
          <Button variant="outline" onClick={() => send({ type: 'mj:vote:clear' })}>
            {vote.closed ? 'Fermer' : 'Annuler'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
