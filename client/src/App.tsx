import { useEffect } from 'react';
import { connectWS } from '@/lib/ws';
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

  useEffect(() => {
    if (mode === 'mj') return connectWS({ type: 'mj:identify' });
    return connectWS({ type: 'ping', payload: { t: Date.now() } });
  }, [mode]);

  return (
    <>
      {mode === 'player' ? <PlayerApp /> : mode === 'show' ? <ShowApp /> : <MJApp />}
      {mode !== 'show' && <ErrorToasts />}
    </>
  );
}
