import type { ClientMessage, ServerMessage } from '@/types';
import { handleServerMessage, setSend, useStore } from './store';

let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;
let reconnectAttempts = 0;
let pendingHandshake: ClientMessage | null = null;

const MAX_RECONNECT_DELAY = 10000; // Max 10 seconds between attempts
const BASE_DELAY = 1000; // Start with 1 second

function getReconnectDelay() {
  // Exponential backoff with max limit
  return Math.min(BASE_DELAY * Math.pow(1.5, reconnectAttempts), MAX_RECONNECT_DELAY);
}

export function connectWS(handshake: ClientMessage) {
  pendingHandshake = handshake;
  
  // Detect server URL (support for ngrok or custom servers)
  let serverUrl: string;
  
  // 1. Check URL query parameter (?wsServer=...)
  const params = new URLSearchParams(location.search);
  const queryServer = params.get('wsServer');
  
  // 2. Check localStorage
  const storedServer = localStorage.getItem('wsServerUrl');
  
  // 3. Check environment variable
  const envServer = import.meta.env.VITE_SERVER_URL;
  
  // 4. Default to localhost
  serverUrl = queryServer || storedServer || envServer || `${location.hostname}:3001`;
  
  // Store for future use
  if (queryServer) {
    localStorage.setItem('wsServerUrl', queryServer);
  }
  
  const wsProtocol = serverUrl.startsWith('https') || serverUrl.startsWith('wss') ? 'wss' : 'ws';
  const baseUrl = serverUrl.replace(/^(https?|wss?):\/\//, ''); // Remove protocol if present
  const url = `${wsProtocol}://${baseUrl}/ws`;
  
  console.log(`[WebSocket] Connecting to: ${url}`);

  const open = () => {
    useStore.getState().setConn('connecting');
    ws = new WebSocket(url);

    ws.onopen = () => {
      reconnectAttempts = 0; // Reset counter on successful connection
      useStore.getState().setConn('open');
      if (pendingHandshake) ws?.send(JSON.stringify(pendingHandshake));
    };
    ws.onclose = () => {
      useStore.getState().setConn('closed');
      reconnectAttempts++;
      const delay = getReconnectDelay();
      console.log(`WebSocket closed. Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
      reconnectTimer = window.setTimeout(open, delay);
    };
    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws?.close();
    };
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
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    } catch (err) {
      console.error('Failed to send WebSocket message:', err);
    }
  });

  open();

  return () => {
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    ws?.close();
  };
}
