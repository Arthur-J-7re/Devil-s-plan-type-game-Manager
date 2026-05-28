import { useCallback, useEffect, useState } from 'react';
import type { Game } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Pencil, Plus, Swords, Coins } from 'lucide-react';
import { GameCreatorScreen } from './GameCreatorScreen';

type Editor = { kind: 'create' } | { kind: 'edit'; game: Game } | null;

export function CatalogScreen({ onBack }: { onBack: () => void }) {
  const [games, setGames] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);

  const load = useCallback(() => {
    setError(null);
    fetch('/api/catalog/default')
      .then((r) => r.json())
      .then((data: Game[]) => setGames(data))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(load, [load]);

  if (editor) {
    return (
      <GameCreatorScreen
        initial={editor.kind === 'edit' ? editor.game : undefined}
        onClose={() => {
          setEditor(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Retour au menu
        </Button>
        <h2 className="text-lg font-semibold">Catalogue des jeux</h2>
        <Button onClick={() => setEditor({ kind: 'create' })}>
          <Plus className="h-4 w-4" /> Nouveau jeu
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jeux disponibles</CardTitle>
          <CardDescription>
            Source de vérité : <code>server/data/games.json</code>. Les jeux édités ici sont disponibles pour tous les tournois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">Erreur de chargement : {error}</p>
          ) : games === null ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
            </div>
          ) : games.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun jeu dans le catalogue. Crée le premier !
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {games.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setEditor({ kind: 'edit', game: g })}
                    className="w-full rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{g.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {g.minPlayers}-{g.maxPlayers} joueurs · {g.durationMin} min
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="gap-1">
                          {g.type === 'gold' ? (
                            <>
                              <Coins className="h-3 w-3" /> Pièces
                            </>
                          ) : (
                            <>
                              <Swords className="h-3 w-3" /> Élim
                            </>
                          )}
                        </Badge>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
