import { useEffect } from 'react';
import { useStore } from '@/lib/store';
import { JoinScreen } from './JoinScreen';
import { LobbyScreen } from './LobbyScreen';
import { Flame, Loader2, WifiOff } from 'lucide-react';

const PLAYER_KEY = 'player:identity';

export function PlayerApp() {
  const conn = useStore((s) => s.conn);
  const role = useStore((s) => s.role);
  const send = useStore((s) => s.send);

  // Tente une reconnexion automatique avec l'identité sauvegardée
  useEffect(() => {
    if (conn !== 'open' || role !== 'guest') return;
    try {
      const raw = localStorage.getItem(PLAYER_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { playerId: string; pseudo: string };
      send({ type: 'player:join', payload: { pseudo: parsed.pseudo, playerId: parsed.playerId } });
    } catch {
      // ignore
    }
  }, [conn, role, send]);

  if (conn !== 'open') {
    return (
      <Fullscreen icon={<WifiOff className="h-8 w-8" />} label="Connexion au serveur…" />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PlayerHeader />
      <main className="container max-w-md py-6">
        {role === 'guest' ? <JoinScreen /> : <LobbyScreen />}
      </main>
    </div>
  );
}

function PlayerHeader() {
  const tournament = useStore((s) => s.tournament);
  return (
    <header className="border-b bg-card/40">
      <div className="container max-w-md flex items-center gap-3 py-4">
        <Flame className="h-6 w-6 text-primary" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold tracking-tight truncate">
            {tournament?.name ?? "À l'épreuve du diable"}
          </h1>
          <p className="text-xs text-muted-foreground">Console joueur</p>
        </div>
      </div>
    </header>
  );
}

function Fullscreen({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        {icon}
        <span>{label}</span>
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    </div>
  );
}

export function savePlayerIdentity(playerId: string, pseudo: string) {
  try {
    localStorage.setItem(PLAYER_KEY, JSON.stringify({ playerId, pseudo }));
  } catch {
    // ignore
  }
}

export function clearPlayerIdentity() {
  try {
    localStorage.removeItem(PLAYER_KEY);
  } catch {
    // ignore
  }
}
