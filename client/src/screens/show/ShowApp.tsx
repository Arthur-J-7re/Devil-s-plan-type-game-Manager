import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useStore } from '@/lib/store';
import type { Player, Round, Tournament } from '@/types';
import { sortPlayers } from '@/components/Leaderboard';
import { Coin } from '@/components/Coin';
import { GamePoster } from '@/components/GamePoster';
import { Badge } from '@/components/ui/badge';
import { Crown, Flame, Skull, Swords, Timer, Vote, WifiOff } from 'lucide-react';

export function ShowApp() {
  const conn = useStore((s) => s.conn);
  const tournament = useStore((s) => s.tournament);

  if (conn !== 'open') {
    return (
      <Fullscreen>
        <WifiOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">Connexion au serveur…</p>
      </Fullscreen>
    );
  }

  if (!tournament) {
    return (
      <Fullscreen>
        <Flame className="h-20 w-20 text-primary animate-ember" />
        <p className="mt-4 text-3xl font-bold tracking-tight">À l'épreuve du diable</p>
        <p className="mt-2 text-muted-foreground">En attente du Maître de jeu…</p>
      </Fullscreen>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ShowHeader tournament={tournament} />
      <main className="px-8 py-6 max-w-[1400px] mx-auto">
        <ShowRouter tournament={tournament} />
      </main>
    </div>
  );
}

function ShowHeader({ tournament }: { tournament: Tournament }) {
  const alive = tournament.players.filter((p) => p.status === 'alive').length;
  const total = tournament.players.length;
  return (
    <header className="border-b bg-card/40 px-8 py-4 flex items-center gap-4">
      <Flame className="h-9 w-9 text-primary" />
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">{tournament.name}</h1>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          À l'épreuve du diable · épreuve n°{tournament.gameCounter + 1}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{alive}</strong> / {total} joueurs en vie
        </span>
      </div>
    </header>
  );
}

function ShowRouter({ tournament }: { tournament: Tournament }) {
  if (tournament.phase === 'setup') return <SetupShow tournament={tournament} />;
  if (tournament.phase === 'finished') return <FinishedShow tournament={tournament} />;
  if (tournament.currentRound) {
    if (tournament.phase === 'presenting')
      return <PresentingShow tournament={tournament} round={tournament.currentRound} />;
    return <PlayingShow tournament={tournament} round={tournament.currentRound} />;
  }
  return <DashboardShow tournament={tournament} />;
}

// --- SETUP --------------------------------------------------------------

function SetupShow({ tournament }: { tournament: Tournament }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    detectPlayerURL().then(setUrl);
  }, []);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
            Joueurs inscrits
          </p>
          <p className="text-6xl font-bold mt-2">{tournament.players.length}</p>
        </div>
        {tournament.players.length === 0 ? (
          <p className="text-xl text-muted-foreground">
            En attente que le MJ inscrive les joueurs…
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tournament.players.map((p) => (
              <li
                key={p.id}
                className="rounded-md border bg-card px-4 py-3 text-xl font-medium truncate"
              >
                {p.pseudo}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ConnectQRBlock url={url} />
    </div>
  );
}

function ConnectQRBlock({ url }: { url: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Pour rejoindre
      </p>
      <div className="mt-3 rounded-md bg-white p-3 flex justify-center">
        {url ? <QRCodeSVG value={url} size={260} level="M" /> : null}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground break-all">{url}</p>
    </div>
  );
}

// --- DASHBOARD ----------------------------------------------------------

function DashboardShow({ tournament }: { tournament: Tournament }) {
  const nextType = tournament.gameCounter % 2 === 0 ? 'gold' : 'elimination';
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <BigLeaderboard tournament={tournament} />
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          Prochaine épreuve
        </p>
        <div className="rounded-lg border bg-card p-5">
          <Badge variant={nextType === 'elimination' ? 'destructive' : 'secondary'}>
            {nextType === 'elimination' ? (
              <>
                <Swords className="h-3 w-3 mr-1" />
                élimination
              </>
            ) : (
              'pièces'
            )}
          </Badge>
          <p className="mt-4 text-2xl font-semibold">
            En attente du choix du MJ…
          </p>
          <p className="mt-2 text-muted-foreground">
            Manche n°{tournament.gameCounter + 1}.
          </p>
        </div>
      </div>
    </div>
  );
}

// --- PRESENTING ---------------------------------------------------------

function PresentingShow({
  tournament,
  round,
}: {
  tournament: Tournament;
  round: Round;
}) {
  const game = tournament.catalog.find((g) => g.id === round.gameId);
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 2400);
    return () => clearTimeout(t);
  }, [round.id]);

  if (!game) return null;

  if (splash) {
    const isElim = game.type === 'elimination';
    return (
      <Fullscreen>
        <div className="animate-in fade-in zoom-in duration-700 text-center">
          {isElim ? (
            <Swords className="mx-auto h-32 w-32 text-destructive animate-ember" />
          ) : (
            <Flame className="mx-auto h-32 w-32 text-primary animate-ember" />
          )}
          <p className="mt-6 text-sm uppercase tracking-[0.5em] text-muted-foreground">
            {isElim ? 'duel à mort' : 'épreuve du diable'}
          </p>
          <h2 className="mt-3 text-7xl font-bold tracking-tight">{game.name}</h2>
        </div>
      </Fullscreen>
    );
  }

  return (
    <div className="space-y-6">
      <GamePoster
        game={game}
        episodeNumber={tournament.gameCounter + 1}
        round={round}
        players={tournament.players}
        variant="projection"
      />
    </div>
  );
}

// --- PLAYING ------------------------------------------------------------

function PlayingShow({
  tournament,
  round,
}: {
  tournament: Tournament;
  round: Round;
}) {
  const game = tournament.catalog.find((g) => g.id === round.gameId);
  if (!game) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <GamePoster
          game={game}
          episodeNumber={tournament.gameCounter + 1}
          round={round}
          players={tournament.players}
          variant="full"
        />
        {round.startedAt && (
          <RoundClock startedAt={round.startedAt} targetMin={game.durationMin} />
        )}
      </div>
      <div className="space-y-6">
        <VoteShow tournament={tournament} />
        <BigLeaderboard tournament={tournament} compact />
      </div>
    </div>
  );
}

function VoteShow({ tournament }: { tournament: Tournament }) {
  const vote = tournament.currentVote;
  if (!vote) return null;
  const aliveCount = tournament.players.filter((p) => p.status === 'alive').length;
  const result =
    vote.closed && vote.result
      ? vote.options.find((o) => o.id === vote.result?.optionId)
      : null;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex items-center gap-2 text-sm">
        <Vote className="h-4 w-4" />
        <span className="uppercase tracking-widest text-xs text-muted-foreground">
          Vote en cours
        </span>
        {vote.closed && <Badge variant="default">clôturé</Badge>}
      </div>
      <p className="mt-2 text-2xl font-semibold">{vote.label}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {vote.totalCast} / {aliveCount} bulletins reçus
      </p>
      {vote.closed && (
        <p className="mt-3 text-lg">
          {result ? (
            <>
              Résultat : <strong>{result.label}</strong>{' '}
              <span className="text-muted-foreground">({vote.result?.count} voix)</span>
            </>
          ) : (
            <span className="text-muted-foreground">Aucun bulletin.</span>
          )}
        </p>
      )}
    </div>
  );
}

// --- FINISHED -----------------------------------------------------------

function FinishedShow({ tournament }: { tournament: Tournament }) {
  const winner = tournament.players.find((p) => p.status === 'alive');
  return (
    <div className="text-center py-12 space-y-8">
      <Crown className="mx-auto h-32 w-32 text-yellow-400 animate-ember" />
      <p className="text-sm uppercase tracking-[0.5em] text-muted-foreground">
        Le diable est repu
      </p>
      {winner ? (
        <>
          <p className="text-8xl font-bold tracking-tight">{winner.pseudo}</p>
          <div className="flex justify-center">
            <Coin count={winner.gold} size="xl" />
          </div>
        </>
      ) : (
        <p className="text-3xl text-muted-foreground">Aucun survivant.</p>
      )}
      <div className="max-w-xl mx-auto pt-8">
        <BigLeaderboard tournament={tournament} highlight={winner?.id} compact />
      </div>
    </div>
  );
}

// --- COMPONENTS ---------------------------------------------------------

function RoundClock({ startedAt, targetMin }: { startedAt: string; targetMin: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const elapsedSec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const mm = Math.floor(elapsedSec / 60);
  const ss = elapsedSec % 60;
  const over = elapsedSec > targetMin * 60;
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 font-mono tabular-nums text-lg ${
        over ? 'border-destructive/60 text-destructive' : 'text-muted-foreground'
      }`}
    >
      <Timer className="h-4 w-4" />
      {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      <span className="opacity-60 text-base">/ {targetMin}min</span>
    </div>
  );
}

function BigLeaderboard({
  tournament,
  highlight,
  compact,
}: {
  tournament: Tournament;
  highlight?: string;
  compact?: boolean;
}) {
  const sorted = sortPlayers(tournament.players);
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
        Classement
      </p>
      <ol className="space-y-2">
        {sorted.map((p, i) => (
          <LeaderRow
            key={p.id}
            player={p}
            rank={i + 1}
            highlight={p.id === highlight}
            compact={compact}
          />
        ))}
      </ol>
    </div>
  );
}

function LeaderRow({
  player,
  rank,
  highlight,
  compact,
}: {
  player: Player;
  rank: number;
  highlight?: boolean;
  compact?: boolean;
}) {
  const eliminated = player.status === 'eliminated';
  return (
    <li
      className={`flex items-center gap-4 rounded-md border bg-card px-4 ${
        compact ? 'py-2' : 'py-3'
      } ${eliminated ? 'opacity-50' : ''} ${highlight ? 'ring-2 ring-primary' : ''}`}
    >
      <span
        className={`w-10 text-center font-bold ${
          compact ? 'text-base' : 'text-2xl'
        } text-muted-foreground`}
      >
        {eliminated ? '—' : `#${rank}`}
      </span>
      <span
        className={`flex-1 font-semibold truncate ${compact ? 'text-lg' : 'text-2xl'}`}
      >
        {player.pseudo}
      </span>
      {eliminated ? (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Skull className="h-4 w-4" /> éliminé
        </span>
      ) : (
        <Coin count={player.gold} size={compact ? 'md' : 'lg'} />
      )}
    </li>
  );
}

function Fullscreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-8">
      {children}
    </div>
  );
}

async function detectPlayerURL(): Promise<string> {
  const fallback = `${location.protocol}//${location.host}/play`;
  const currentHost = location.hostname;
  if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    return fallback;
  }
  try {
    const r = await fetch('/api/network');
    const { ips } = (await r.json()) as { ips: string[] };
    if (ips && ips.length > 0) {
      return `${location.protocol}//${ips[0]}:${location.port || '5173'}/play`;
    }
  } catch {
    // ignore
  }
  return fallback;
}
