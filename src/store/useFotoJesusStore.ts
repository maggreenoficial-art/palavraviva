import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface FotoJesusSavedResult {
  generationId: string;
  resultUrl: string;
  dataUri: string | null;
  createdAt: string;
}

export interface FotoJesusPending {
  generationId: string;
  inputUrl: string;
  token: string;
  transactionId: string | null;
  /** Todos os Pix gerados para esta foto (verifica todos na confirmação) */
  transactionIds: string[];
  clientIdentifier: string | null;
  checkoutId: string | null;
  pixCode: string | null;
  pixImage: string | null;
  previewDataUri: string | null;
  kieTaskId: string | null;
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
  patchPending: (patch: Partial<FotoJesusPending>) => void;
  clearPending: () => void;
  clearResult: () => void;
}

function mergeTransactionIds(
  current: string[] | undefined,
  next: string | null | undefined,
) {
  const list = Array.isArray(current) ? [...current] : [];
  if (next && !list.includes(next)) list.push(next);
  return list;
}

export const useFotoJesusStore = create<FotoJesusState>()(
  persist(
    (set, get) => ({
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

      savePending: (pending) => {
        const txIds = mergeTransactionIds(
          pending.transactionIds,
          pending.transactionId,
        );
        set({
          pending: {
            ...pending,
            transactionIds: txIds,
          },
        });
      },

      patchPending: (patch) => {
        const current = get().pending;
        if (!current) return;
        const nextTx =
          patch.transactionId !== undefined
            ? patch.transactionId
            : current.transactionId;
        const mergedIds = mergeTransactionIds(
          patch.transactionIds || current.transactionIds,
          nextTx,
        );
        set({
          pending: {
            ...current,
            ...patch,
            transactionId: nextTx,
            transactionIds: mergedIds,
          },
        });
      },

      clearPending: () => set({ pending: null }),

      clearResult: () => set({ lastResult: null }),
    }),
    {
      name: 'palavra-viva-foto-jesus',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      partialize: (state) => ({
        lastResult: state.lastResult,
        pending: state.pending,
      }),
      migrate: (persisted: unknown) => {
        const state = (persisted || {}) as {
          lastResult?: FotoJesusSavedResult | null;
          pending?: (FotoJesusPending & { previewUri?: string }) | null;
        };
        if (state.pending) {
          const txIds = mergeTransactionIds(
            state.pending.transactionIds,
            state.pending.transactionId,
          );
          state.pending = {
            ...state.pending,
            previewDataUri: state.pending.previewDataUri ?? null,
            kieTaskId: state.pending.kieTaskId ?? null,
            clientIdentifier: state.pending.clientIdentifier ?? null,
            transactionIds: txIds,
          };
        }
        return state;
      },
    },
  ),
);
