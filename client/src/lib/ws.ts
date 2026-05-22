import type { ClientMessage, ServerMessage } from '@/types';
import { handleServerMessage, setSend, useStore } from './store';

let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;
let pendingHandshake: ClientMessage | null = null;

export function connectWS(handshake: ClientMessage) {
  pendingHandshake = handshake;
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

  const open = () => {
    useStore.getState().setConn('connecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
      useStore.getState().setConn('open');
      if (pendingHandshake) ws?.send(JSON.stringify(pendingHandshake));
    };
    ws.onclose = () => {
      useStore.getState().setConn('closed');
      reconnectTimer = window.setTimeout(open, 1500);
    };
    ws.onerror = () => ws?.close();
    ws.onmessage = (ev) => {
      try {
        const data: ServerMessage = JSON.parse(ev.data);
        handleServerMessage(data);
      } catch {
        // ignore
      }
    };
  };

  setSend((msg) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  });

  open();

  return () => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    ws?.close();
  };
}
