import type { OldTestamentPrayer } from '../constants/oldTestamentPrayers';
import type { AccessKind } from '../store/useUserStore';
import type { Session } from '../types';

/**
 * Regras freemium (fonte da verdade):
 * - trial (72h) / subscribed → todos os áudios
 * - locked → SOS livre; jornada dia a dia; série só dia 1; OT order≤3;
 *   meditações/manhã/noite = Missão+; leituras bíblicas (texto) sempre livres
 *
 * NÃO usar IDs inventados (jornada-1, serie-1). Usar session.category + journeyDay
 * e prayer.order do catálogo real.
 */

/** Quantas orações OT ficam liberadas sem assinatura. */
export const FREE_OT_PRAYER_COUNT = 3;

export type ContentGateReason =
  | 'ok'
  | 'subscription_required'
  | 'journey_locked'
  | 'series_locked'
  | 'ot_locked';

/**
 * Assinantes e trial têm acesso total a áudios.
 * Fora disso, regras freemium por tipo de conteúdo.
 */
export function hasFullAudioAccess(accessKind: AccessKind) {
  return accessKind === 'trial' || accessKind === 'subscribed';
}

/** Texto bíblico (aba Bíblia) é sempre gratuito. */
export function canAccessBiblicalReading() {
  return true;
}

export function canAccessOtPrayer(
  prayer: OldTestamentPrayer,
  accessKind: AccessKind,
): ContentGateReason {
  if (hasFullAudioAccess(accessKind)) return 'ok';
  if (prayer.order <= FREE_OT_PRAYER_COUNT) return 'ok';
  return 'ot_locked';
}

export function canAccessSession(
  session: Session,
  accessKind: AccessKind,
  maxUnlockedJourneyDay: number,
): ContentGateReason {
  if (hasFullAudioAccess(accessKind)) return 'ok';

  // SOS permanece livre (crise)
  if (session.category === 'sos' || session.id === 'sos-paz') return 'ok';

  // Jornada 7 dias: gratuita, mas dia a dia
  if (session.category === 'jornada') {
    const day = session.journeyDay ?? 1;
    return day <= maxUnlockedJourneyDay ? 'ok' : 'journey_locked';
  }

  // Séries (eco + premium Manus): teaser dia 1 livre; demais dias Missão+
  if (session.category === 'serie') {
    const day = session.journeyDay ?? 1;
    return day <= 1 ? 'ok' : 'series_locked';
  }

  // Demais áudios (meditações, manhã/noite avulsos, etc.)
  return 'subscription_required';
}

export function gateMessage(reason: ContentGateReason) {
  switch (reason) {
    case 'journey_locked':
      return 'Complete o dia anterior para liberar este.';
    case 'series_locked':
      return 'Os dias 2 e 3 desta série fazem parte da Missão+.';
    case 'ot_locked':
      return 'As demais orações do Velho Testamento fazem parte da Missão+.';
    case 'subscription_required':
      return 'Este áudio faz parte da Missão+.';
    default:
      return '';
  }
}
