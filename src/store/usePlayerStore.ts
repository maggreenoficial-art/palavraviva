import { create } from 'zustand';
import type { Session } from '../types';

interface PlayerState {
  currentSession: Session | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  setSession: (session: Session | null) => void;
  setPlaying: (playing: boolean) => void;
  setProgress: (positionMs: number, durationMs: number) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSession: null,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  setSession: (session) => set({ currentSession: session, positionMs: 0 }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setProgress: (positionMs, durationMs) => set({ positionMs, durationMs }),
  reset: () =>
    set({
      currentSession: null,
      isPlaying: false,
      positionMs: 0,
      durationMs: 0,
    }),
}));
