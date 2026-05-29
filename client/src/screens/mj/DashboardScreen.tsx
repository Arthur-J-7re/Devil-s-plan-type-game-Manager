import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import type { Game, Round } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaderboard, sortPlayers } from '@/components/Leaderboard';
import { QRPanel } from './QRPanel';
import { Coin } from '@/components/Coin';
import { ArrowRight, ChevronDown, ChevronRight, HandCoins, Shield, Skull, Sparkles, Swords, History, Trophy } from 'lucide-react';
import { ranksForPlayerCount } from '@/lib/scoring';

export function DashboardScreen() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);

  const nextType = tournament.gameCounter % 2 === 0 ? 'gold' : 'elimination';
  const suggestion = useMemo<Game | null>(() => {
    const candidates = tournament.catalog.filter((g) => g.type === nextType);
    if (candidates.length === 0) return null;
    const usedIds = new Set(tournament.rounds.map((r) => r.gameId));
    const fresh = candidates.filter((g) => !usedIds.has(g.id));
    const pool = fresh.length ? fresh : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [tournament.catalog, tournament.gameCounter, tournament.rounds, nextType]);

  const alivePlayers = tournament.players.filter((p) => p.status === 'alive');

  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  // La convocation (joueurs cochés pour le prochain duel) vit côté serveur
  // pour que les joueurs voient les groupes de dons se former en direct.
  const participants = tournament.nextRoundParticipants;
  const setParticipantsRemote = (next: string[]) =>
    send({ type: 'mj:next-round:set-participants', payload: { participants: next } });

  const chosenGame = tournament.catalog.find((g) => g.id === selectedGameId) ?? suggestion;

  const startWithChosen = () => {
    if (!chosenGame) return;
    let parts: string[];
    if (chosenGame.type === 'elimination') {
      parts = participants;
      if (parts.length < chosenGame.minPlayers) return;
    } else {
      parts = alivePlayers.map((p) => p.id);
    }
    send({
      type: 'mj:round:start',
      payload: { gameId: chosenGame.id, participants: parts },
    });
    // Le serveur efface nextRoundParticipants au démarrage du round
    setSelectedGameId(null);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Prochaine épreuve
                  <Badge variant={nextType === 'elimination' ? 'destructive' : 'secondary'}>
                    {nextType === 'elimination' ? 'élimination' : 'pièces'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Alternance auto (manche n°{tournament.gameCounter + 1}). Tu peux changer.
                </CardDescription>
              </div>
              <Sparkles className="h-6 w-6 text-primary shrink-0" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {chosenGame ? (
              <div className="rounded-md border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{chosenGame.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {chosenGame.minPlayers}-{chosenGame.maxPlayers} j · {chosenGame.durationMin}
                      min
                    </p>
                  </div>
                  <Badge variant={chosenGame.type === 'elimination' ? 'destructive' : 'secondary'}>
                    {chosenGame.type === 'elimination' ? (
                      <>
                        <Swords className="h-3 w-3 mr-1" />
                        élimination
                      </>
                    ) : (
                      'pièces'
                    )}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{chosenGame.description}</p>
                {chosenGame.goldFormula && (() => {
                  const previewCount =
                    chosenGame.type === 'elimination'
                      ? participants.length || alivePlayers.length
                      : alivePlayers.length;
                  const ranks = ranksForPlayerCount(chosenGame.goldFormula, previewCount);
                  if (ranks.length === 0) return null;
                  return (
                    <p className="mt-2 text-xs">
                      Gains par rang ({previewCount} joueurs) :{' '}
                      {ranks
                        .map((d) => (d > 0 ? `+${d}` : `${d}`))
                        .join(' / ')}
                    </p>
                  );
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun jeu de type "{nextType}" dans le catalogue. Ajoute-en dans le setup.
              </p>
            )}

            {chosenGame?.type === 'elimination' && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Sélectionne les joueurs pour le duel (du bas du classement) :
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Conseil : prends les 1 à 3 derniers du classement.
                </p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {sortPlayers(alivePlayers)
                    .slice()
                    .reverse()
                    .map((p) => {
                      const checked = participants.includes(p.id);
                      return (
                        <li key={p.id}>
                          <label
                            className={`flex items-center gap-2 rounded-md border bg-card px-3 py-2 cursor-pointer ${
                              checked ? 'border-primary/60' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...participants, p.id]
                                  : participants.filter((id) => id !== p.id);
                                setParticipantsRemote(next);
                              }}
                            />
                            <span className="flex-1">{p.pseudo}</span>
                            <Coin count={p.gold} size="sm" />
                          </label>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={startWithChosen} disabled={!chosenGame || (chosenGame.type === 'elimination' && participants.length < (chosenGame.minPlayers ?? 2))}>
                Lancer "{chosenGame?.name ?? '…'}"
              </Button>
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground py-2 px-3">
                  Choisir un autre jeu…
                </summary>
                <ul className="mt-2 grid gap-1 max-h-60 overflow-auto">
                  {tournament.catalog.map((g) => (
                    <li key={g.id}>
                      <button
                        className={`w-full text-left rounded-md border px-3 py-2 hover:bg-accent ${
                          selectedGameId === g.id ? 'border-primary' : ''
                        }`}
                        onClick={() => {
                          setSelectedGameId(g.id);
                          // Reset de la convocation quand on change de jeu (utile
                          // si on bascule d'un élim à un jeu à pièces).
                          setParticipantsRemote([]);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{g.name}</span>
                          <Badge
                            variant={g.type === 'elimination' ? 'destructive' : 'secondary'}
                          >
                            {g.type === 'elimination' ? 'élim.' : 'pièces'}
                          </Badge>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" /> Historique
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tournament.rounds.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune manche jouée.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {tournament.rounds.map((r, i) => (
                  <HistoryRow key={r.id} round={r} index={i} />
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
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
        <DonationsPanel />
        <QRPanel />
      </div>
    </div>
  );
}

function DonationsPanel() {
  const tournament = useStore((s) => s.tournament)!;
  const playerName = (id: string) =>
    tournament.players.find((p) => p.id === id)?.pseudo ?? '???';
  const recent = [...tournament.donations].reverse();

  const convoked = tournament.nextRoundParticipants;
  const groupsActive = convoked.length > 0;
  const safeCount = groupsActive
    ? tournament.players.filter((p) => p.status === 'alive' && !convoked.includes(p.id)).length
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HandCoins className="h-5 w-5" /> Dons entre joueurs
        </CardTitle>
        <CardDescription>
          Échanges de pièces entre les manches. Le classement ci-dessus reflète les soldes à jour.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {groupsActive && (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs space-y-1">
            <p className="font-medium">Groupes d'échange actifs (avant duel)</p>
            <p className="inline-flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-destructive" />
              Convoqués · {convoked.length} joueur{convoked.length > 1 ? 's' : ''}
            </p>
            <p className="inline-flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              Hors duel · {safeCount} joueur{safeCount > 1 ? 's' : ''}
            </p>
            <p className="text-muted-foreground">Les dons sont restreints à l'intérieur de chaque groupe.</p>
          </div>
        )}

        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun don pour l'instant.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {recent.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5"
              >
                <span className="truncate">{playerName(d.fromId)}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{playerName(d.toId)}</span>
                {d.byMj && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">MJ</Badge>
                )}
                <Coin count={d.amount} size="sm" className="text-emerald-400" />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {new Date(d.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}

        <ForceTransferForm />
      </CardContent>
    </Card>
  );
}

/**
 * Formulaire MJ pour redistribuer les pièces (notamment celles d'un joueur
 * éliminé qui ne peut plus initier de don lui-même). Aucune contrainte de
 * groupe ni de solde minimum côté source ; le bénéficiaire doit être en vie.
 */
function ForceTransferForm() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);

  const sources = sortPlayers(tournament.players); // toutes, vivantes et éliminées
  const targets = sortPlayers(tournament.players.filter((p) => p.status === 'alive'));

  const [fromId, setFromId] = useState<string>('');
  const [toId, setToId] = useState<string>('');
  const [amount, setAmount] = useState<number>(1);

  const fromPlayer = tournament.players.find((p) => p.id === fromId);
  const maxAmount = fromPlayer?.gold ?? 0;
  const canSend = fromId !== '' && toId !== '' && fromId !== toId && amount >= 1 && amount <= maxAmount;

  const submit = () => {
    if (!canSend) return;
    send({ type: 'mj:donate', payload: { fromId, toId, amount } });
    setFromId('');
    setToId('');
    setAmount(1);
  };

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
        Redistribuer (MJ)
      </summary>
      <div className="mt-2 space-y-2">
        <p className="text-xs text-muted-foreground">
          Force un transfert depuis n'importe quel joueur (y compris éliminé) vers un joueur en vie.
        </p>
        <select
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={fromId}
          onChange={(e) => setFromId(e.target.value)}
        >
          <option value="">— Source —</option>
          {sources.map((p) => (
            <option key={p.id} value={p.id}>
              {p.pseudo} · {p.gold} pc{p.status === 'eliminated' ? ' · éliminé' : ''}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={toId}
          onChange={(e) => setToId(e.target.value)}
        >
          <option value="">— Bénéficiaire (en vie) —</option>
          {targets.map((p) => (
            <option key={p.id} value={p.id} disabled={p.id === fromId}>
              {p.pseudo} · {p.gold} pc
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, maxAmount)}
            value={amount}
            onChange={(e) => {
              const n = Number.parseInt(e.target.value, 10);
              setAmount(Number.isNaN(n) ? 0 : Math.max(0, n));
            }}
            className="text-center"
          />
          <Button size="sm" disabled={!canSend} onClick={submit}>
            Transférer
          </Button>
        </div>
        {fromPlayer && amount > maxAmount && (
          <p className="text-xs text-destructive">Max {maxAmount} (solde de {fromPlayer.pseudo})</p>
        )}
      </div>
    </details>
  );
}

function HistoryRow({ round, index }: { round: Round; index: number }) {
  const tournament = useStore((s) => s.tournament)!;
  const [open, setOpen] = useState(false);

  const playerName = (id: string) =>
    tournament.players.find((p) => p.id === id)?.pseudo ?? '???';

  const totals = new Map<string, number>();
  for (const gc of round.goldChanges) {
    totals.set(gc.playerId, (totals.get(gc.playerId) ?? 0) + gc.delta);
  }
  const sortedTotals = [...totals.entries()].sort((a, b) => b[1] - a[1]);

  const duration =
    round.startedAt && round.endedAt
      ? Math.max(
          0,
          Math.round(
            (new Date(round.endedAt).getTime() - new Date(round.startedAt).getTime()) / 60000
          )
        )
      : null;

  const winnerId = round.type === 'gold' && round.ranking?.[0];
  const winnerName = winnerId ? playerName(winnerId) : null;

  return (
    <li className="rounded-md border bg-card">
      <button
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="inline-flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">
            #{index + 1} · {round.gameName}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          {round.eliminatedPlayerId && (
            <Skull className="h-3.5 w-3.5 text-destructive" aria-label="élimination" />
          )}
          {duration !== null && (
            <span className="text-xs text-muted-foreground">{duration}min</span>
          )}
          <Badge variant={round.type === 'elimination' ? 'destructive' : 'secondary'}>
            {round.type === 'elimination' ? 'élim.' : 'pièces'}
          </Badge>
        </span>
      </button>
      {open && (
        <div className="border-t px-3 py-3 space-y-2 text-xs">
          {winnerName && (
            <p className="inline-flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" />
              <span>1er : <strong>{winnerName}</strong></span>
            </p>
          )}
          {round.eliminatedPlayerId && (
            <p className="inline-flex items-center gap-1.5">
              <Skull className="h-3.5 w-3.5 text-destructive" />
              <span>
                Éliminé : <strong>{playerName(round.eliminatedPlayerId)}</strong>
              </span>
            </p>
          )}
          {sortedTotals.length > 0 ? (
            <ul className="grid grid-cols-2 gap-1 pt-1">
              {sortedTotals.map(([pid, sum]) => (
                <li key={pid} className="flex items-center justify-between gap-2">
                  <span className="truncate">{playerName(pid)}</span>
                  <Coin
                    count={sum}
                    size="sm"
                    className={
                      sum < 0
                        ? 'text-red-400'
                        : sum > 0
                          ? 'text-emerald-400'
                          : 'text-muted-foreground'
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Aucun mouvement de pièces.</p>
          )}
        </div>
      )}
    </li>
  );
}
