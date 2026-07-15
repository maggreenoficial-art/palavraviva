import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FavoriteItem, FavoriteKind } from '../types';

interface FavoritesState {
  items: FavoriteItem[];
  isFavorite: (kind: FavoriteKind, id: string) => boolean;
  toggleFavorite: (kind: FavoriteKind, id: string) => void;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      isFavorite: (kind, id) =>
        get().items.some((item) => item.kind === kind && item.id === id),
      toggleFavorite: (kind, id) => {
        const exists = get().items.some(
          (item) => item.kind === kind && item.id === id,
        );
        if (exists) {
          set({
            items: get().items.filter(
              (item) => !(item.kind === kind && item.id === id),
            ),
          });
          return;
        }
        set({
          items: [
            {
              id,
              kind,
              createdAt: new Date().toISOString(),
            },
            ...get().items,
          ],
        });
      },
      clearFavorites: () => set({ items: [] }),
    }),
    {
      name: 'palavra-viva-favorites',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
