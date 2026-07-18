import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type JournalMood = 1 | 2 | 3 | 4 | 5;

export interface JournalEntry {
  id: string;
  date: string;
  promptId: string;
  mood: JournalMood;
  gratitude: string;
  reflection: string;
  createdAt: string;
}

interface JournalState {
  entries: JournalEntry[];
  addEntry: (input: {
    promptId: string;
    mood: JournalMood;
    gratitude: string;
    reflection: string;
  }) => JournalEntry | null;
  clearEntries: () => void;
}

function createId() {
  return `jr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: ({ promptId, mood, gratitude, reflection }) => {
        const g = gratitude.trim();
        const r = reflection.trim();
        if (!g && !r) return null;

        const now = new Date().toISOString();
        const entry: JournalEntry = {
          id: createId(),
          date: todayKey(),
          promptId,
          mood,
          gratitude: g,
          reflection: r,
          createdAt: now,
        };

        set({
          entries: [entry, ...get().entries].slice(0, 365),
        });
        return entry;
      },

      clearEntries: () => set({ entries: [] }),
    }),
    {
      name: 'palavra-viva-journal',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);

export function entriesInLastDays(
  entries: JournalEntry[],
  days: number,
): JournalEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => Date.parse(e.createdAt) >= cutoff);
}
