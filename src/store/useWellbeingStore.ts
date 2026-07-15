import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CheckInEntry, CheckInScore } from '../types';

interface WellbeingState {
  checkIns: CheckInEntry[];
  saveBefore: (sessionId: string, score: CheckInScore) => string;
  saveAfter: (entryId: string, score: CheckInScore) => void;
  saveAfterOnly: (sessionId: string, score: CheckInScore) => void;
  clearCheckIns: () => void;
}

function createId() {
  return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useWellbeingStore = create<WellbeingState>()(
  persist(
    (set, get) => ({
      checkIns: [],
      saveBefore: (sessionId, score) => {
        const id = createId();
        const now = new Date().toISOString();
        const entry: CheckInEntry = {
          id,
          sessionId,
          before: score,
          createdAt: now,
          updatedAt: now,
        };
        set({ checkIns: [entry, ...get().checkIns].slice(0, 200) });
        return id;
      },
      saveAfter: (entryId, score) => {
        set({
          checkIns: get().checkIns.map((entry) =>
            entry.id === entryId
              ? { ...entry, after: score, updatedAt: new Date().toISOString() }
              : entry,
          ),
        });
      },
      saveAfterOnly: (sessionId, score) => {
        const now = new Date().toISOString();
        const entry: CheckInEntry = {
          id: createId(),
          sessionId,
          after: score,
          createdAt: now,
          updatedAt: now,
        };
        set({ checkIns: [entry, ...get().checkIns].slice(0, 200) });
      },
      clearCheckIns: () => set({ checkIns: [] }),
    }),
    {
      name: 'palavra-viva-wellbeing',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
