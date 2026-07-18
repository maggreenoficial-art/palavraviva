import { useFavoritesStore } from './useFavoritesStore';
import { useJournalStore } from './useJournalStore';
import { useUserStore } from './useUserStore';
import { useWellbeingStore } from './useWellbeingStore';

/** Apaga feeling, check-ins e diário locais. Mantém onboarding e favoritos. */
export function clearSensitiveLocalData() {
  useUserStore.getState().clearFeeling();
  useWellbeingStore.getState().clearCheckIns();
  useJournalStore.getState().clearEntries();
}

/** Apaga preferências locais amplas (feeling, check-ins e favoritos). */
export function clearAllLocalPreferences() {
  clearSensitiveLocalData();
  useFavoritesStore.getState().clearFavorites();
}
