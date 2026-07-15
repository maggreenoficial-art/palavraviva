import { useFavoritesStore } from './useFavoritesStore';
import { useUserStore } from './useUserStore';
import { useWellbeingStore } from './useWellbeingStore';

/** Apaga feeling e check-ins locais. Mantém onboarding e favoritos. */
export function clearSensitiveLocalData() {
  useUserStore.getState().clearFeeling();
  useWellbeingStore.getState().clearCheckIns();
}

/** Apaga preferências locais amplas (feeling, check-ins e favoritos). */
export function clearAllLocalPreferences() {
  clearSensitiveLocalData();
  useFavoritesStore.getState().clearFavorites();
}
