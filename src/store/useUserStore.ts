import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Feeling } from '../types';
import { createUserId, firstNameFrom } from '../utils/userId';

const TRIAL_MS = 72 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const validFeelings: Feeling[] = ['ansioso', 'sobrecarregado', 'triste'];

function normalizeFeeling(value: unknown): Feeling | null {
  if (value === 'sem_sono') return 'sobrecarregado';
  if (typeof value === 'string' && validFeelings.includes(value as Feeling)) {
    return value as Feeling;
  }
  return null;
}

export type AccessKind = 'trial' | 'subscribed' | 'locked';
export type FontScale = 'padrao' | 'medio' | 'grande';

const validFontScales: FontScale[] = ['padrao', 'medio', 'grande'];

function normalizeFontScale(value: unknown): FontScale {
  if (typeof value === 'string' && validFontScales.includes(value as FontScale)) {
    return value as FontScale;
  }
  return 'padrao';
}

interface UserState {
  hasOnboarded: boolean;
  userId: string | null;
  displayName: string | null;
  whatsapp: string | null;
  feeling: Feeling | null;
  /** Escala tipográfica (acessibilidade sênior) */
  fontScale: FontScale;
  /** Ferramentas compradas (ex.: diario) */
  unlockedTools: string[];
  /** ISO — início do trial de 72h */
  trialStartedAt: string | null;
  /** ISO — fim da assinatura mensal ativa */
  subscriptionExpiresAt: string | null;
  completeProfile: (input: { name: string; whatsapp?: string }) => void;
  setFeeling: (feeling: Feeling) => void;
  clearFeeling: () => void;
  setFontScale: (scale: FontScale) => void;
  unlockTool: (toolId: string) => void;
  setUnlockedTools: (toolIds: string[]) => void;
  activateSubscription: (days?: number) => void;
  /** Sincroniza expiração vinda do servidor de pagamentos (Wiven). */
  setSubscriptionExpiresAt: (expiresAt: string | null) => void;
  resetOnboarding: () => void;
  getFirstName: () => string;
  getAccessKind: () => AccessKind;
  hasContentAccess: () => boolean;
  getTrialRemainingMs: () => number;
}

export function computeAccessKind(
  trialStartedAt: string | null,
  subscriptionExpiresAt: string | null,
  now = Date.now(),
): AccessKind {
  if (subscriptionExpiresAt) {
    const expires = Date.parse(subscriptionExpiresAt);
    if (Number.isFinite(expires) && expires > now) return 'subscribed';
  }
  if (trialStartedAt) {
    const start = Date.parse(trialStartedAt);
    if (Number.isFinite(start) && now < start + TRIAL_MS) return 'trial';
  }
  return 'locked';
}

export function computeTrialRemainingMs(
  trialStartedAt: string | null,
  now = Date.now(),
) {
  if (!trialStartedAt) return 0;
  const end = Date.parse(trialStartedAt) + TRIAL_MS;
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - now);
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      hasOnboarded: false,
      userId: null,
      displayName: null,
      whatsapp: null,
      feeling: null,
      fontScale: 'padrao',
      unlockedTools: [],
      trialStartedAt: null,
      subscriptionExpiresAt: null,

      completeProfile: ({ name, whatsapp }) => {
        const cleanedName = name.trim().replace(/\s+/g, ' ');
        if (!cleanedName) return;
        const digits = (whatsapp ?? '').replace(/\D/g, '');
        const existingId = get().userId;
        set({
          displayName: cleanedName,
          whatsapp: digits.length >= 10 ? digits : null,
          userId: existingId ?? createUserId(),
          trialStartedAt: get().trialStartedAt ?? new Date().toISOString(),
        });
      },

      setFeeling: (feeling) =>
        set({
          feeling,
          hasOnboarded: Boolean(get().displayName && get().userId),
        }),

      clearFeeling: () => set({ feeling: null }),

      setFontScale: (scale) => set({ fontScale: normalizeFontScale(scale) }),

      unlockTool: (toolId) => {
        const id = toolId.trim();
        if (!id) return;
        const current = get().unlockedTools;
        if (current.includes(id)) return;
        set({ unlockedTools: [...current, id] });
      },

      setUnlockedTools: (toolIds) => {
        const unique = [
          ...new Set(
            toolIds
              .filter((id) => typeof id === 'string')
              .map((id) => id.trim())
              .filter(Boolean),
          ),
        ];
        set({ unlockedTools: unique });
      },

      activateSubscription: (days = 30) => {
        const ms = Math.max(1, days) * 24 * 60 * 60 * 1000;
        const current = get().subscriptionExpiresAt;
        const base =
          current && Date.parse(current) > Date.now()
            ? Date.parse(current)
            : Date.now();
        set({
          subscriptionExpiresAt: new Date(base + ms).toISOString(),
        });
      },

      setSubscriptionExpiresAt: (expiresAt) => {
        if (!expiresAt) {
          set({ subscriptionExpiresAt: null });
          return;
        }
        const parsed = Date.parse(expiresAt);
        if (!Number.isFinite(parsed)) return;
        const current = get().subscriptionExpiresAt;
        const currentMs = current ? Date.parse(current) : 0;
        if (!currentMs || parsed > currentMs) {
          set({ subscriptionExpiresAt: new Date(parsed).toISOString() });
        }
      },

      resetOnboarding: () =>
        set({
          feeling: null,
          hasOnboarded: false,
          userId: null,
          displayName: null,
          whatsapp: null,
          unlockedTools: [],
          trialStartedAt: null,
          subscriptionExpiresAt: null,
        }),

      getFirstName: () => firstNameFrom(get().displayName ?? ''),

      getAccessKind: () =>
        computeAccessKind(get().trialStartedAt, get().subscriptionExpiresAt),

      hasContentAccess: () =>
        computeAccessKind(get().trialStartedAt, get().subscriptionExpiresAt) !==
        'locked',

      getTrialRemainingMs: () => computeTrialRemainingMs(get().trialStartedAt),
    }),
    {
      name: 'palavra-viva-user',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      partialize: (state) => ({
        hasOnboarded: state.hasOnboarded,
        userId: state.userId,
        displayName: state.displayName,
        whatsapp: state.whatsapp,
        feeling: state.feeling,
        fontScale: state.fontScale,
        unlockedTools: state.unlockedTools,
        trialStartedAt: state.trialStartedAt,
        subscriptionExpiresAt: state.subscriptionExpiresAt,
      }),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<UserState> & {
          hasOnboarded?: boolean;
        };
        const displayName =
          typeof state.displayName === 'string' ? state.displayName : null;
        const userId = typeof state.userId === 'string' ? state.userId : null;
        const trialStartedAt =
          typeof state.trialStartedAt === 'string'
            ? state.trialStartedAt
            : state.hasOnboarded
              ? new Date().toISOString()
              : null;
        const unlockedTools = Array.isArray(state.unlockedTools)
          ? state.unlockedTools.filter(
              (id): id is string => typeof id === 'string' && Boolean(id.trim()),
            )
          : [];

        return {
          hasOnboarded: Boolean(state.hasOnboarded && displayName && userId),
          userId,
          displayName,
          whatsapp:
            typeof state.whatsapp === 'string' ? state.whatsapp : null,
          feeling: normalizeFeeling(state.feeling),
          fontScale: normalizeFontScale(state.fontScale),
          unlockedTools,
          trialStartedAt,
          subscriptionExpiresAt:
            typeof state.subscriptionExpiresAt === 'string'
              ? state.subscriptionExpiresAt
              : null,
        };
      },
    },
  ),
);

export const TRIAL_HOURS = 72;
export const SUBSCRIPTION_PRICE_LABEL = 'R$ 19,90/mês';
export { TRIAL_MS, MONTH_MS };
