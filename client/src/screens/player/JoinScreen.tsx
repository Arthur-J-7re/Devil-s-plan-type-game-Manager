import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function JoinScreen() {
  const tournament = useStore((s) => s.tournament);
  const send = useStore((s) => s.send);
  const [pseudo, setPseudo] = useState('');

  if (!tournament) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>En attente du MJ</CardTitle>
          <CardDescription>
            Le tournoi n'a pas encore commencé. Patiente, ou rafraîchis dans quelques instants.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rejoindre</CardTitle>
        <CardDescription>
          Entre ton pseudo (exactement celui ajouté par le MJ).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pseudo">Pseudo</Label>
          <Input
            id="pseudo"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Ton pseudo"
            autoCapitalize="none"
            autoComplete="off"
          />
        </div>
        <Button
          className="w-full"
          disabled={!pseudo.trim()}
          onClick={() => send({ type: 'player:join', payload: { pseudo: pseudo.trim() } })}
        >
          Entrer dans le tournoi
        </Button>
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Liste des joueurs inscrits ({tournament.players.length})
          </summary>
          <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
            {tournament.players.map((p) => (
              <li key={p.id}>· {p.pseudo}</li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
