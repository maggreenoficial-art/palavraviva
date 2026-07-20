import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface FotoJesusSavedResult {
  generationId: string;
  /** URL remota original (pode expirar) */
  resultUrl: string;
  /** data URI local para exibir/baixar depois */
  dataUri: string | null;
  createdAt: string;
}

interface FotoJesusState {
  lastResult: FotoJesusSavedResult | null;
  saveResult: (input: {
    generationId: string;
    resultUrl: string;
    dataUri?: string | null;
  }) => void;
  clearResult: () => void;
}

export const useFotoJesusStore = create<FotoJesusState>()(
  persist(
    (set) => ({
      lastResult: null,

      saveResult: ({ generationId, resultUrl, dataUri }) => {
        set({
          lastResult: {
            generationId,
            resultUrl,
            dataUri: dataUri ?? null,
            createdAt: new Date().toISOString(),
          },
        });
      },

      clearResult: () => set({ lastResult: null }),
    }),
    {
      name: 'palavra-viva-foto-jesus',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ lastResult: state.lastResult }),
    },
  ),
);
