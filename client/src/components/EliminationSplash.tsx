import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Skull } from 'lucide-react';

export function EliminationSplash() {
  const tournament = useStore((s) => s.tournament);
  const prevStatus = useRef<Map<string, 'alive' | 'eliminated'>>(new Map());
  const [target, setTarget] = useState<{ pseudo: string; key: number } | null>(null);

  useEffect(() => {
    if (!tournament) {
      prevStatus.current.clear();
      return;
    }
    const next = new Map<string, 'alive' | 'eliminated'>();
    let justEliminated: string | null = null;
    for (const p of tournament.players) {
      next.set(p.id, p.status);
      const before = prevStatus.current.get(p.id);
      if (before === 'alive' && p.status === 'eliminated') {
        justEliminated = p.pseudo;
      }
    }
    prevStatus.current = next;
    if (justEliminated) {
      setTarget({ pseudo: justEliminated, key: Date.now() });
    }
  }, [tournament]);

  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => setTarget(null), 2800);
    return () => clearTimeout(t);
  }, [target]);

  if (!target) return null;

  return (
    <div
      key={target.key}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-none"
    >
      <div className="text-center px-6 animate-in zoom-in duration-500">
        <Skull className="mx-auto h-28 w-28 text-destructive animate-ember" />
        <p className="mt-4 text-xs uppercase tracking-[0.45em] text-muted-foreground">
          le diable a choisi
        </p>
        <h2 className="mt-2 text-5xl font-bold tracking-tight">{target.pseudo}</h2>
        <p className="mt-3 text-lg text-destructive font-semibold">
          a été dévoré.
        </p>
      </div>
    </div>
  );
}
