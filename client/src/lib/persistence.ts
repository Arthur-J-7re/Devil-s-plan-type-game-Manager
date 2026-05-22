import type { Tournament } from '@/types';
import { useStore } from './store';

const KEY = 'tournament:current';

export function saveToLocalStorage(t: Tournament | null) {
  try {
    if (!t) {
      localStorage.removeItem(KEY);
      return;
    }
    localStorage.setItem(KEY, JSON.stringify({ tournament: t, savedAt: Date.now() }));
  } catch {
    // localStorage full / disabled, ignore
  }
}

export function restoreFromLocalStorage(): Tournament | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { tournament: Tournament; savedAt: number };
    return parsed.tournament;
  } catch {
    return null;
  }
}

export function clearLocalStorage() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function attachAutoSave() {
  let last: Tournament | null = null;
  return useStore.subscribe((s) => {
    if (s.role !== 'mj') return;
    if (s.tournament === last) return;
    last = s.tournament;
    // ne pas écraser une sauvegarde existante avec null
    // (les vrais resets utilisent clearLocalStorage explicitement)
    if (s.tournament) saveToLocalStorage(s.tournament);
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
