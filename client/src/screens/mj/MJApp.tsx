import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { attachAutoSave } from '@/lib/persistence';
import type { Game } from '@/types';
import { SetupScreen, CreateTournamentForm } from './SetupScreen';
import { DashboardScreen } from './DashboardScreen';
import { PresentScreen } from './PresentScreen';
import { RoundScreen } from './RoundScreen';
import { FinishedScreen } from './FinishedScreen';
import { GameCreatorScreen } from './GameCreatorScreen';
import { HomeScreen } from './HomeScreen';
import { CatalogScreen } from './CatalogScreen';
import { EliminationSplash } from '@/components/EliminationSplash';
import { Button } from '@/components/ui/button';
import { Flame, Home, Loader2, Sparkles, WifiOff } from 'lucide-react';

type View = 'home' | 'catalog' | 'create' | 'live';
type EditorState = { kind: 'create' } | { kind: 'edit'; game: Game } | null;

export function MJApp() {
  const conn = useStore((s) => s.conn);
  const role = useStore((s) => s.role);
  const tournament = useStore((s) => s.tournament);
  const [view, setView] = useState<View>('home');
  const [editor, setEditor] = useState<EditorState>(null);

  useEffect(() => attachAutoSave(), []);

  // Si on vient de créer un tournoi via le form, le state serveur arrive → live.
  useEffect(() => {
    if (view === 'create' && tournament) setView('live');
  }, [view, tournament]);

  // Si le tournoi disparaît du serveur (reset) pendant qu'on est en live → home.
  useEffect(() => {
    if (view === 'live' && !tournament) setView('home');
  }, [view, tournament]);

  if (conn !== 'open' || role === 'guest') {
    return (
      <FullScreenStatus
        icon={role === 'guest' ? <Loader2 className="h-8 w-8 animate-spin" /> : <WifiOff className="h-8 w-8" />}
        label={conn === 'open' ? 'Identification…' : 'Connexion au serveur…'}
      />
    );
  }

  const inLive = view === 'live' && tournament;

  return (
    <div className="min-h-screen bg-background">
      <Header
        tournamentName={inLive ? tournament.name : null}
        showHomeButton={view !== 'home'}
        onHome={() => {
          setEditor(null);
          setView('home');
        }}
        onCreateGame={inLive ? () => setEditor({ kind: 'create' }) : undefined}
      />
      <main className="container max-w-6xl py-6">
        {editor ? (
          <GameCreatorScreen
            initial={editor.kind === 'edit' ? editor.game : undefined}
            onClose={() => setEditor(null)}
          />
        ) : view === 'catalog' ? (
          <CatalogScreen onBack={() => setView('home')} />
        ) : view === 'create' ? (
          <CreateTournamentForm onCancel={() => setView('home')} />
        ) : inLive ? (
          <MJRouter />
        ) : (
          <HomeScreen
            onNewTournament={() => setView('create')}
            onOpenCatalog={() => setView('catalog')}
            onEnterLive={() => setView('live')}
          />
        )}
      </main>
      <EliminationSplash />
    </div>
  );
}

function MJRouter() {
  const tournament = useStore((s) => s.tournament);
  if (!tournament) return null;
  if (tournament.phase === 'setup') return <SetupScreen />;
  if (tournament.phase === 'finished') return <FinishedScreen />;
  if (tournament.currentRound) {
    if (tournament.phase === 'presenting') return <PresentScreen />;
    return <RoundScreen />;
  }
  return <DashboardScreen />;
}

function Header({
  tournamentName,
  showHomeButton,
  onHome,
  onCreateGame,
}: {
  tournamentName: string | null;
  showHomeButton: boolean;
  onHome: () => void;
  onCreateGame?: () => void;
}) {
  return (
    <header className="border-b bg-card/40">
      <div className="container max-w-6xl flex items-center gap-3 py-4">
        <Flame className="h-7 w-7 text-primary" />
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">À l'épreuve du diable</h1>
          {tournamentName && (
            <p className="text-xs text-muted-foreground">Tournoi : {tournamentName}</p>
          )}
        </div>
        {showHomeButton && (
          <Button size="sm" variant="ghost" onClick={onHome}>
            <Home className="h-4 w-4" /> Menu
          </Button>
        )}
        {onCreateGame && (
          <Button size="sm" variant="outline" onClick={onCreateGame}>
            <Sparkles className="h-4 w-4" /> Créer un jeu
          </Button>
        )}
        <span className="text-xs text-muted-foreground hidden sm:inline">Console MJ</span>
      </div>
    </header>
  );
}

function FullScreenStatus({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
    </div>
  );
}
