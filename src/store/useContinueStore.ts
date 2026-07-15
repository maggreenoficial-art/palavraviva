import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ContinueState {
  sessionId: string | null;
  positionMs: number;
  durationMs: number;
  updatedAt: string | null;
  saveProgress: (
    sessionId: string,
    positionMs: number,
    durationMs: number,
  ) => void;
  clearProgress: () => void;
}

export const useContinueStore = create<ContinueState>()(
  persist(
    (set) => ({
      sessionId: null,
      positionMs: 0,
      durationMs: 0,
      updatedAt: null,
      saveProgress: (sessionId, positionMs, durationMs) => {
        if (!Number.isFinite(positionMs) || !Number.isFinite(durationMs)) return;
        if (durationMs > 0 && positionMs >= durationMs - 1500) {
          set({
            sessionId: null,
            positionMs: 0,
            durationMs: 0,
            updatedAt: null,
          });
          return;
        }
        set({
          sessionId,
          positionMs,
          durationMs,
          updatedAt: new Date().toISOString(),
        });
      },
      clearProgress: () =>
        set({
          sessionId: null,
          positionMs: 0,
          durationMs: 0,
          updatedAt: null,
        }),
    }),
    {
      name: 'palavra-viva-continue',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
