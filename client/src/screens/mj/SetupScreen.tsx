import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { clearLocalStorage, downloadSnapshot } from '@/lib/persistence';
import type { Game } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Coin } from '@/components/Coin';
import { QRPanel } from './QRPanel';
import { GameCreatorScreen } from './GameCreatorScreen';
import { Check, Download, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';

export function SetupScreen() {
  const tournament = useStore((s) => s.tournament);
  const send = useStore((s) => s.send);
  const [editor, setEditor] = useState<{ kind: 'create' } | { kind: 'edit'; game: Game } | null>(null);

  if (!tournament) return <CreateTournamentForm />;

  if (editor) {
    return (
      <GameCreatorScreen
        initial={editor.kind === 'edit' ? editor.game : undefined}
        onClose={() => setEditor(null)}
      />
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <PlayersPanel />
        <CatalogPanel
          onCreateGame={() => setEditor({ kind: 'create' })}
          onEditGame={(g) => setEditor({ kind: 'edit', game: g })}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prêt à lancer ?</CardTitle>
            <CardDescription>
              Une fois lancé, le tournoi passe en mode "dashboard" et tu peux choisir un jeu.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() => send({ type: 'mj:phase:set', payload: { phase: 'dashboard' } })}
              disabled={tournament.players.length < 2 || tournament.catalog.length === 0}
            >
              Démarrer le tournoi
            </Button>
            <Button variant="outline" onClick={() => downloadSnapshot(tournament)}>
              <Download className="h-4 w-4" /> Exporter snapshot
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm('Réinitialiser le tournoi (tout perdre) ?')) {
                  clearLocalStorage();
                  send({ type: 'mj:tournament:reset' });
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Réinitialiser
            </Button>
          </CardContent>
        </Card>
      </div>
      <QRPanel />
    </div>
  );
}

function CreateTournamentForm() {
  const send = useStore((s) => s.send);
  const [name, setName] = useState('Tournoi du Diable');
  const [startGold, setStartGold] = useState(1);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Nouveau tournoi</CardTitle>
          <CardDescription>
            Choisis le nom et le nombre de pièces d'or de départ par joueur.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du tournoi</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Diable de février"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gold">Pièces d'or de départ</Label>
            <Input
              id="gold"
              type="number"
              min={1}
              max={20}
              value={startGold}
              onChange={(e) => setStartGold(Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="text-xs text-muted-foreground">
              <Coin count={startGold} size="sm" /> par joueur en début de tournoi.
            </p>
          </div>
          <Button
            className="w-full"
            disabled={!name.trim()}
            onClick={() =>
              send({
                type: 'mj:tournament:create',
                payload: { name: name.trim(), startGold },
              })
            }
          >
            Créer le tournoi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PlayersPanel() {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const [pseudo, setPseudo] = useState('');

  const submit = () => {
    if (!pseudo.trim()) return;
    send({ type: 'mj:player:add', payload: { pseudo: pseudo.trim() } });
    setPseudo('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Joueurs <Badge variant="secondary">{tournament.players.length}</Badge>
        </CardTitle>
        <CardDescription>Ajoute 6 à 10 joueurs avec leur pseudo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Pseudo du joueur"
          />
          <Button type="submit" variant="default">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </form>
        {tournament.players.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun joueur pour l'instant.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {tournament.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
              >
                <span className="font-medium">{p.pseudo}</span>
                <span className="flex items-center gap-2">
                  <Coin count={p.gold} size="sm" />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Retirer"
                    onClick={() =>
                      send({ type: 'mj:player:remove', payload: { playerId: p.id } })
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CatalogPanel({
  onCreateGame,
  onEditGame,
}: {
  onCreateGame: () => void;
  onEditGame: (g: Game) => void;
}) {
  const tournament = useStore((s) => s.tournament)!;
  const send = useStore((s) => s.send);
  const [available, setAvailable] = useState<Game[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/catalog/default')
      .then((r) => r.json())
      .then(setAvailable)
      .catch(() => setAvailable([]));
  }, []);

  // Si le tournoi contient un jeu absent du catalogue chargé (jeu créé en cours
  // de session), on le fusionne pour qu'il reste toggle-able.
  const mergedAvailable: Game[] | null = useMemo(() => {
    if (!available) return null;
    const known = new Set(available.map((g) => g.id));
    const extras = tournament.catalog.filter((g) => !known.has(g.id));
    return extras.length ? [...available, ...extras] : available;
  }, [available, tournament.catalog]);

  useEffect(() => {
    if (loaded || !available || tournament.catalog.length > 0) return;
    send({ type: 'mj:catalog:set', payload: { games: available } });
    setLoaded(true);
  }, [available, tournament.catalog.length, loaded, send]);

  const inCatalog = new Set(tournament.catalog.map((g) => g.id));

  const toggle = (g: Game) => {
    const next = inCatalog.has(g.id)
      ? tournament.catalog.filter((x) => x.id !== g.id)
      : [...tournament.catalog, g];
    send({ type: 'mj:catalog:set', payload: { games: next } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Catalogue de jeux <Badge variant="secondary">{tournament.catalog.length} actifs</Badge>
        </CardTitle>
        <CardDescription>
          Active/désactive les jeux pour ce tournoi. Le catalogue par défaut est dans
          <code className="mx-1">server/data/games.json</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!mergedAvailable ? (
          <p className="text-sm text-muted-foreground">Chargement du catalogue…</p>
        ) : mergedAvailable.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun jeu dans le catalogue par défaut.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {mergedAvailable.map((g) => {
              const active = inCatalog.has(g.id);
              return (
                <li
                  key={g.id}
                  className={`flex items-start justify-between gap-3 rounded-md border bg-card px-3 py-2 ${
                    active ? 'border-primary/50' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{g.name}</span>
                      <Badge variant={g.type === 'elimination' ? 'destructive' : 'secondary'}>
                        {g.type === 'elimination' ? 'élim.' : 'pièces'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{g.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {g.minPlayers}-{g.maxPlayers} j · {g.durationMin}min
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      onClick={() => toggle(g)}
                      title={active ? 'Retirer du tournoi' : 'Ajouter au tournoi'}
                    >
                      {active ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditGame(g)}
                      title="Éditer la fiche"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Separator className="my-3" />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Tu peux aussi éditer <code>server/data/games.json</code> à la main.
          </p>
          <Button size="sm" variant="outline" onClick={onCreateGame}>
            <Sparkles className="h-4 w-4" /> Créer un jeu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
