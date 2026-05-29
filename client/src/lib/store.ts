import { create } from 'zustand';
import type { ClientMessage, Role, ServerMessage, Tournament } from '@/types';

export type ConnState = 'connecting' | 'open' | 'closed';

type Store = {
  conn: ConnState;
  role: Role;
  playerId: string | null;
  tournament: Tournament | null;
  errors: { id: number; message: string }[];
  send: (msg: ClientMessage) => void;
  setConn: (c: ConnState) => void;
  pushError: (m: string) => void;
  clearErrors: () => void;
};

let errorSeq = 0;

export const useStore = create<Store>((set) => ({
  conn: 'connecting',
  role: 'guest',
  playerId: null,
  tournament: null,
  errors: [],
  send: () => {},
  setConn: (c) => set({ conn: c }),
  pushError: (m) =>
    set((s) => ({ errors: [...s.errors, { id: ++errorSeq, message: m }].slice(-5) })),
  clearErrors: () => set({ errors: [] }),
}));

export function setSend(fn: (msg: ClientMessage) => void) {
  useStore.setState({ send: fn });
}

export function handleServerMessage(msg: ServerMessage) {
  switch (msg.type) {
    case 'state':
      useStore.setState({ tournament: msg.payload.tournament });
      return;
    case 'identity':
      useStore.setState({ role: msg.payload.role, playerId: msg.payload.playerId ?? null });
      return;
    case 'error':
      useStore.getState().pushError(msg.payload.message);
      return;
    case 'pong':
      return;
  }
}
