import { useMemo, useState } from 'react';
import type { Tournament } from '@/types';
import { useStore } from '@/lib/store';
import {
  type SnapshotMeta,
  deleteSnapshot,
  listSnapshots,
  loadSnapshot,
  markFinished,
  downloadSnapshot,
} from '@/lib/persistence';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Archive,
  BookOpen,
  Download,
  Flame,
  Play,
  RotateCcw,
  Skull,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';

const PHASE_LABEL: Record<Tournament['phase'], string> = {
  setup: 'En préparation',
  dashboard: 'En cours',
  presenting: 'En cours · présentation',
  playing: 'En cours · manche',
  finished: 'Terminé',
};

type Row = SnapshotMeta & { active: boolean };

export function HomeScreen({
  onNewTournament,
  onOpenCatalog,
  onEnterLive,
}: {
  onNewTournament: () => void;
  onOpenCatalog: () => void;
  /** Appelé après avoir restauré ou repris un tournoi actif. */
  onEnterLive: () => void;
}) {
  const send = useStore((s) => s.send);
  const activeTournament = useStore((s) => s.tournament);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  const rows: Row[] = useMemo(() => {
    void tick;
    const snapshots = listSnapshots();
    const activeId = activeTournament?.id ?? null;
    const out: Row[] = snapshots.map((s) => ({ ...s, active: s.id === activeId }));
    if (activeTournament && !snapshots.some((s) => s.id === activeTournament.id)) {
      out.unshift({
        id: activeTournament.id,
        name: activeTournament.name,
        phase: activeTournament.phase,
        playerCount: activeTournament.players.length,
        alivePlayerCount: activeTournament.players.filter((p) => p.status === 'alive').length,
        roundsPlayed: activeTournament.rounds.length,
        savedAt: Date.now(),
        createdAt: activeTournament.createdAt,
        active: true,
      });
    }
    return out;
  }, [activeTournament, tick]);

  const handleResume = (row: Row) => {
    if (row.active) {
      onEnterLive();
      return;
    }
    const snap = loadSnapshot(row.id);
    if (!snap) return;
    send({ type: 'mj:tournament:restore', payload: { tournament: snap } });
    onEnterLive();
  };

  const handleFinish = (row: Row) => {
    if (!confirm(`Terminer "${row.name}" ? Le tournoi sera archivé (lecture seule).`)) return;
    const updated = markFinished(row.id);
    if (row.active && updated) {
      send({ type: 'mj:tournament:restore', payload: { tournament: updated } });
    }
    refresh();
  };

  const handleDelete = (row: Row) => {
    if (!confirm(`Supprimer définitivement "${row.name}" ? Cette action est irréversible.`)) return;
    deleteSnapshot(row.id);
    if (row.active) send({ type: 'mj:tournament:reset' });
    refresh();
  };

  const handleExport = (row: Row) => {
    const snap = row.active ? activeTournament : loadSnapshot(row.id);
    if (snap) downloadSnapshot(snap);
  };

  const handleNew = () => {
    if (activeTournament) {
      if (
        !confirm(
          `Un tournoi est actif sur le serveur ("${activeTournament.name}"). Il sera fermé (et conservé dans la liste). Continuer ?`,
        )
      ) {
        return;
      }
      send({ type: 'mj:tournament:reset' });
    }
    onNewTournament();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Flame className="h-8 w-8 text-primary" />
          <div className="flex-1">
            <CardTitle className="text-xl">Bienvenue, MJ.</CardTitle>
            <CardDescription>
              Reprends un tournoi en cours, lances-en un nouveau, ou ajuste le catalogue de jeux.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={handleNew}>
            <Sparkles className="h-4 w-4" /> Nouveau tournoi
          </Button>
          <Button variant="outline" onClick={onOpenCatalog}>
            <BookOpen className="h-4 w-4" /> Gérer les jeux
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tournois</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? 'Aucun tournoi enregistré pour l’instant.'
              : 'Liste de tous les tournois enregistrés dans ce navigateur.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <div className="rounded-md border border-dashed bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Lance ton premier tournoi pour le voir apparaître ici.
            </div>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <TournamentRow
                  key={row.id}
                  row={row}
                  onResume={() => handleResume(row)}
                  onFinish={() => handleFinish(row)}
                  onDelete={() => handleDelete(row)}
                  onExport={() => handleExport(row)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TournamentRow({
  row,
  onResume,
  onFinish,
  onDelete,
  onExport,
}: {
  row: Row;
  onResume: () => void;
  onFinish: () => void;
  onDelete: () => void;
  onExport: () => void;
}) {
  const finished = row.phase === 'finished';
  return (
    <li className="rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium truncate">{row.name}</h3>
            {row.active && (
              <Badge variant="default" className="gap-1">
                <Play className="h-3 w-3" /> Actif
              </Badge>
            )}
            {finished && !row.active && (
              <Badge variant="secondary" className="gap-1">
                <Archive className="h-3 w-3" /> Archivé
              </Badge>
            )}
            <Badge variant="outline">{PHASE_LABEL[row.phase]}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {row.playerCount} joueur{row.playerCount > 1 ? 's' : ''}
              {row.playerCount > 0 && row.alivePlayerCount !== row.playerCount && (
                <span> · {row.alivePlayerCount} en vie</span>
              )}
            </span>
            <span>
              {row.roundsPlayed} manche{row.roundsPlayed > 1 ? 's' : ''} jouée
              {row.roundsPlayed > 1 ? 's' : ''}
            </span>
            <span>Sauvé {formatRelative(row.savedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onResume} variant={finished ? 'outline' : 'default'}>
            {finished ? (
              <>
                <BookOpen className="h-4 w-4" /> Consulter
              </>
            ) : row.active ? (
              <>
                <Play className="h-4 w-4" /> Continuer
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" /> Reprendre
              </>
            )}
          </Button>
          {!finished && (
            <Button size="sm" variant="outline" onClick={onFinish} title="Terminer (archiver)">
              <Skull className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onExport} title="Exporter JSON">
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d} j`;
  const dt = new Date(ts);
  return dt.toLocaleDateString();
}
