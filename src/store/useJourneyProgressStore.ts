import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { journeySessions } from '../constants/sessions';

interface JourneyProgressState {
  /** Maior dia da jornada liberado (começa em 1). */
  maxUnlockedDay: number;
  completedSessionIds: string[];
  markJourneySessionCompleted: (sessionId: string) => void;
  getMaxUnlockedDay: () => number;
  isDayUnlocked: (journeyDay: number) => boolean;
}

function dayForSessionId(sessionId: string) {
  return journeySessions.find((s) => s.id === sessionId)?.journeyDay;
}

export const useJourneyProgressStore = create<JourneyProgressState>()(
  persist(
    (set, get) => ({
      maxUnlockedDay: 1,
      completedSessionIds: [],

      markJourneySessionCompleted: (sessionId) => {
        const day = dayForSessionId(sessionId);
        if (!day) return;

        set((state) => {
          const completed = state.completedSessionIds.includes(sessionId)
            ? state.completedSessionIds
            : [...state.completedSessionIds, sessionId];
          const nextUnlock = Math.min(7, Math.max(state.maxUnlockedDay, day + 1));
          return {
            completedSessionIds: completed,
            maxUnlockedDay: nextUnlock,
          };
        });
      },

      getMaxUnlockedDay: () => get().maxUnlockedDay,

      isDayUnlocked: (journeyDay) => journeyDay <= get().maxUnlockedDay,
    }),
    {
      name: 'palavra-viva-journey-progress',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        maxUnlockedDay: state.maxUnlockedDay,
        completedSessionIds: state.completedSessionIds,
      }),
    },
  ),
);
