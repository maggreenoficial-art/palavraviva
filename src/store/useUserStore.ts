import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Feeling } from '../types';

const validFeelings: Feeling[] = ['ansioso', 'sobrecarregado', 'triste'];

function normalizeFeeling(value: unknown): Feeling | null {
  if (value === 'sem_sono') return 'sobrecarregado';
  if (typeof value === 'string' && validFeelings.includes(value as Feeling)) {
    return value as Feeling;
  }
  return null;
}

interface UserState {
  hasOnboarded: boolean;
  feeling: Feeling | null;
  setFeeling: (feeling: Feeling) => void;
  clearFeeling: () => void;
  resetOnboarding: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      hasOnboarded: false,
      feeling: null,
      setFeeling: (feeling) => set({ feeling, hasOnboarded: true }),
      clearFeeling: () => set({ feeling: null }),
      resetOnboarding: () => set({ feeling: null, hasOnboarded: false }),
    }),
    {
      name: 'palavra-viva-user',
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<UserState>;
        return {
          hasOnboarded: Boolean(state.hasOnboarded),
          feeling: normalizeFeeling(state.feeling),
        };
      },
      version: 1,
    },
  ),
);
