import type { Tournament } from '@/types';
import { useStore } from './store';

const STORAGE_KEY = 'tournaments:v2';
const LEGACY_KEY = 'tournament:current';

type Entry = { tournament: Tournament; savedAt: number };
type Store = Record<string, Entry>;

export type SnapshotMeta = {
  id: string;
  name: string;
  phase: Tournament['phase'];
  playerCount: number;
  alivePlayerCount: number;
  roundsPlayed: number;
  savedAt: number;
  createdAt: string;
};

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // fall through
  }
  // migrate legacy single-entry key if present
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { tournament: Tournament; savedAt: number };
      if (parsed?.tournament?.id) {
        const migrated: Store = {
          [parsed.tournament.id]: {
            tournament: parsed.tournament,
            savedAt: parsed.savedAt ?? Date.now(),
          },
        };
        writeStore(migrated);
        localStorage.removeItem(LEGACY_KEY);
        return migrated;
      }
    }
  } catch {
    // ignore
  }
  return {};
}

function writeStore(s: Store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // quota / disabled — silent
  }
}

export function listSnapshots(): SnapshotMeta[] {
  const s = readStore();
  return Object.values(s)
    .map(({ tournament: t, savedAt }) => ({
      id: t.id,
      name: t.name,
      phase: t.phase,
      playerCount: t.players.length,
      alivePlayerCount: t.players.filter((p) => p.status === 'alive').length,
      roundsPlayed: t.rounds.length,
      savedAt,
      createdAt: t.createdAt,
    }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function loadSnapshot(id: string): Tournament | null {
  const s = readStore();
  return s[id]?.tournament ?? null;
}

export function saveSnapshot(t: Tournament) {
  const s = readStore();
  s[t.id] = { tournament: t, savedAt: Date.now() };
  writeStore(s);
}

export function deleteSnapshot(id: string) {
  const s = readStore();
  if (!(id in s)) return;
  delete s[id];
  writeStore(s);
}

export function markFinished(id: string): Tournament | null {
  const s = readStore();
  const entry = s[id];
  if (!entry) return null;
  entry.tournament = {
    ...entry.tournament,
    phase: 'finished',
    currentRound: null,
    currentVote: null,
  };
  entry.savedAt = Date.now();
  writeStore(s);
  return entry.tournament;
}

export function attachAutoSave() {
  let last: Tournament | null = null;
  return useStore.subscribe((s) => {
    if (s.role !== 'mj') return;
    if (s.tournament === last) return;
    last = s.tournament;
    if (s.tournament) saveSnapshot(s.tournament);
  });
}

export function downloadSnapshot(t: Tournament) {
  const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tournoi-${t.name.replace(/\W+/g, '-').toLowerCase()}-${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
