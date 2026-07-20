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

export interface FotoJesusPending {
  generationId: string;
  inputUrl: string;
  token: string;
  transactionId: string | null;
  checkoutId: string | null;
  pixCode: string | null;
  pixImage: string | null;
  previewUri: string | null;
  createdAt: string;
}

interface FotoJesusState {
  lastResult: FotoJesusSavedResult | null;
  pending: FotoJesusPending | null;
  saveResult: (input: {
    generationId: string;
    resultUrl: string;
    dataUri?: string | null;
  }) => void;
  savePending: (pending: FotoJesusPending) => void;
  clearPending: () => void;
  clearResult: () => void;
}

export const useFotoJesusStore = create<FotoJesusState>()(
  persist(
    (set) => ({
      lastResult: null,
      pending: null,

      saveResult: ({ generationId, resultUrl, dataUri }) => {
        set({
          lastResult: {
            generationId,
            resultUrl,
            dataUri: dataUri ?? null,
            createdAt: new Date().toISOString(),
          },
          pending: null,
        });
      },

      savePending: (pending) => set({ pending }),

      clearPending: () => set({ pending: null }),

      clearResult: () => set({ lastResult: null }),
    }),
    {
      name: 'palavra-viva-foto-jesus',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      partialize: (state) => ({
        lastResult: state.lastResult,
        pending: state.pending,
      }),
    },
  ),
);
