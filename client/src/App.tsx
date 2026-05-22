import { useEffect } from 'react';
import { connectWS } from '@/lib/ws';
import { useStore } from '@/lib/store';
import { restoreFromLocalStorage } from '@/lib/persistence';
import { MJApp } from '@/screens/mj/MJApp';
import { PlayerApp } from '@/screens/player/PlayerApp';
import { ShowApp } from '@/screens/show/ShowApp';
import { ErrorToasts } from '@/components/ErrorToasts';

type AppMode = 'mj' | 'player' | 'show';

function detectMode(): AppMode {
  const path = location.pathname;
  if (path.startsWith('/play')) return 'player';
  if (path.startsWith('/show')) return 'show';
  return 'mj';
}

export default function App() {
  const mode = detectMode();
  const send = useStore((s) => s.send);

  useEffect(() => {
    if (mode === 'mj') return connectWS({ type: 'mj:identify' });
    // player + show restent en 'guest' côté serveur, juste un ping
    return connectWS({ type: 'ping', payload: { t: Date.now() } });
  }, [mode]);

  // Auto-restore depuis localStorage côté MJ après identification
  useEffect(() => {
    if (mode !== 'mj') return;
    const unsub = useStore.subscribe((s, prev) => {
      if (s.role === 'mj' && prev.role !== 'mj') {
        const t = restoreFromLocalStorage();
        if (t) send({ type: 'mj:tournament:restore', payload: { tournament: t } });
      }
    });
    return unsub;
  }, [mode, send]);

  return (
    <>
      {mode === 'player' ? <PlayerApp /> : mode === 'show' ? <ShowApp /> : <MJApp />}
      {mode !== 'show' && <ErrorToasts />}
    </>
  );
}
