import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { DonationModal } from '../../src/components/DonationModal';
import { FeelingPickerModal } from '../../src/components/FeelingPickerModal';
import { BrandMark } from '../../src/components/BrandMark';
import { FeaturedSessionCard } from '../../src/components/FeaturedSessionCard';
import { HelpFaqSheet } from '../../src/components/HelpFaqSheet';
import { JourneyRow } from '../../src/components/JourneyRow';
import { OtPrayerRow } from '../../src/components/OtPrayerRow';
import { SessionRow } from '../../src/components/SessionRow';
import { SettingsSheet } from '../../src/components/SettingsSheet';
import { InstallPwaBanner } from '../../src/components/InstallPwaBanner';
import { SosButton } from '../../src/components/SosButton';
import { SubscriptionPaywall } from '../../src/components/SubscriptionPaywall';
import { getOldTestamentPrayerById } from '../../src/constants/oldTestamentPrayers';
import {
  ecosystemSessions,
  getRecommendedSessions,
  getSessionById,
  journeySessions,
  meditationSessions,
  morningSessions,
  nightSessions,
  premiumSeriesById,
} from '../../src/constants/sessions';
import { listValidBiblicalPrayers } from '../../src/services/biblicalContent';
import {
  canAccessOtPrayer,
  canAccessSession,
  gateMessage,
  hasFullAudioAccess,
} from '../../src/services/contentAccess';
import { useContinueStore } from '../../src/store/useContinueStore';
import { useJourneyProgressStore } from '../../src/store/useJourneyProgressStore';
import {
  computeAccessKind,
  computeTrialRemainingMs,
  useUserStore,
} from '../../src/store/useUserStore';
import {
  MIN_TAP,
  TAB_BAR_OFFSET,
  colors,
  radius,
  spacing,
  useTypography,
} from '../../src/theme';
import { formatTime } from '../../src/utils/formatTime';
import { firstNameFrom } from '../../src/utils/userId';
import type { Feeling, Session } from '../../src/types';

const greetingByFeeling: Record<Feeling, string> = {
  ansioso: 'Como está o seu coração agora?',
  sobrecarregado: 'Como está o seu coração agora?',
  triste: 'Como está o seu coração agora?',
};

const prayerThemeByFeeling: Record<Feeling, string[]> = {
  ansioso: ['ansiedade', 'protecao'],
  sobrecarregado: ['confianca', 'protecao'],
  triste: ['confianca', 'louvor', 'ansiedade'],
};

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function isEvening() {
  const hour = new Date().getHours();
  return hour >= 17 || hour < 5;
}

export default function HomeScreen() {
  const type = useTypography();
  const feeling = useUserStore((state) => state.feeling);
  const setFeeling = useUserStore((state) => state.setFeeling);
  const displayName = useUserStore((state) => state.displayName);
  const trialStartedAt = useUserStore((state) => state.trialStartedAt);
  const subscriptionExpiresAt = useUserStore(
    (state) => state.subscriptionExpiresAt,
  );
  const firstName = firstNameFrom(displayName ?? '');
  const accessKind = computeAccessKind(trialStartedAt, subscriptionExpiresAt);
  const fullAudio = hasFullAudioAccess(accessKind);
  const maxUnlockedDay = useJourneyProgressStore((s) => s.maxUnlockedDay);
  const trialRemainingMs = computeTrialRemainingMs(trialStartedAt);
  const continueId = useContinueStore((s) => s.sessionId);
  const positionMs = useContinueStore((s) => s.positionMs);
  const durationMs = useContinueStore((s) => s.durationMs);
  const [donationVisible, setDonationVisible] = useState(false);
  const [feelingVisible, setFeelingVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  const continueSession = continueId ? getSessionById(continueId) : undefined;
  const continueProgress =
    durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;

  const recommended = useMemo(
    () =>
      getRecommendedSessions(feeling)
        .filter((item) => item.category !== 'sos')
        .slice(0, 1),
    [feeling],
  );

  const journeyFocus = useMemo(() => {
    if (continueSession?.category === 'jornada') return continueSession;
    const firstRec = getRecommendedSessions(feeling).find(
      (item) => item.category === 'jornada',
    );
    return firstRec ?? journeySessions[0];
  }, [continueSession, feeling]);

  const daySessions = useMemo(() => {
    const morning = morningSessions[0];
    const night = nightSessions[0];
    return isEvening()
      ? [night, morning].filter(Boolean)
      : [morning, night].filter(Boolean);
  }, []);

  const suggestedPrayers = useMemo(() => {
    const all = listValidBiblicalPrayers();
    if (!feeling) return all.slice(0, 3);
    const themes = prayerThemeByFeeling[feeling];
    const filtered = all.filter((item) => themes.includes(item.theme));
    return (filtered.length ? filtered : all).slice(0, 3);
  }, [feeling]);

  const isSessionLocked = (session: Session) =>
    canAccessSession(session, accessKind, maxUnlockedDay) !== 'ok';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: {
          flex: 1,
          backgroundColor: colors.background,
        },
        content: {
          paddingBottom: TAB_BAR_OFFSET + spacing.lg,
        },
        header: {
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.lg,
          marginBottom: spacing.xl,
        },
        headerTop: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.sm,
        },
        settingsBtn: {
          minWidth: MIN_TAP,
          minHeight: MIN_TAP,
          alignItems: 'center',
          justifyContent: 'center',
        },
        settingsIcon: {
          fontSize: 24,
          color: colors.textSecondary,
        },
        greeting: {
          ...type.body,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
        },
        tagline: {
          ...type.body,
          color: colors.textSecondary,
        },
        trialHint: {
          ...type.caption,
          color: colors.accentMuted,
          marginTop: spacing.sm,
        },
        trialLocked: {
          marginTop: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: 'rgba(240, 113, 103, 0.45)',
          backgroundColor: 'rgba(240, 113, 103, 0.12)',
          minHeight: MIN_TAP,
          justifyContent: 'center',
        },
        trialLockedText: {
          ...type.caption,
          color: colors.sos,
          fontFamily: 'DMSans_600SemiBold',
        },
        sosWrap: {
          paddingHorizontal: spacing.screen,
          marginBottom: spacing.section,
        },
        section: {
          paddingHorizontal: spacing.screen,
          marginBottom: spacing.section,
        },
        blockHeader: {
          paddingHorizontal: spacing.screen,
          marginBottom: spacing.md,
          gap: 4,
        },
        blockTitle: {
          ...type.section,
          color: colors.textPrimary,
        },
        blockHint: {
          ...type.caption,
          color: colors.textSecondary,
          marginBottom: spacing.sm,
        },
        sectionLabel: {
          ...type.caption,
          color: colors.textMuted,
          fontFamily: 'DMSans_600SemiBold',
          textTransform: 'uppercase',
          letterSpacing: 0.7,
          marginBottom: spacing.md,
        },
        continueCard: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: colors.backgroundElevated,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          minHeight: MIN_TAP,
        },
        continueText: {
          flex: 1,
          gap: 4,
        },
        continueTitle: {
          ...type.bodyMedium,
          color: colors.textPrimary,
        },
        continueMeta: {
          ...type.caption,
          color: colors.textSecondary,
        },
        continueCta: {
          backgroundColor: colors.accent,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          minHeight: MIN_TAP,
          justifyContent: 'center',
        },
        continueCtaText: {
          ...type.button,
          color: colors.onAccent,
          fontSize: type.caption.fontSize,
        },
        dayRow: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 56,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing.md,
        },
        dayIcon: {
          fontSize: 18,
          width: 24,
          color: colors.accent,
        },
        dayText: {
          flex: 1,
        },
        dayTitle: {
          ...type.bodyMedium,
          color: colors.textPrimary,
        },
        dayMeta: {
          ...type.caption,
          color: colors.textSecondary,
        },
        prayerLink: {
          minHeight: 52,
          justifyContent: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        prayerTitle: {
          ...type.body,
          color: colors.textPrimary,
        },
        linkBtn: {
          minHeight: MIN_TAP,
          justifyContent: 'center',
          alignSelf: 'flex-start',
        },
        linkText: {
          ...type.bodyMedium,
          color: colors.cyan,
        },
        supportBanner: {
          marginHorizontal: spacing.screen,
          marginBottom: spacing.lg,
          padding: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: colors.backgroundSoft,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: MIN_TAP,
        },
        supportText: {
          ...type.bodyMedium,
          color: colors.textPrimary,
        },
        supportHint: {
          ...type.caption,
          color: colors.textSecondary,
          marginTop: 4,
        },
        toolsBanner: {
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.accentMuted,
          backgroundColor: colors.accentSoft,
          padding: spacing.lg,
          minHeight: MIN_TAP,
          gap: 4,
        },
        toolsBannerTitle: {
          ...type.bodyMedium,
          color: colors.textPrimary,
        },
        toolsBannerHint: {
          ...type.caption,
          color: colors.accent,
        },
        pressed: {
          opacity: 0.85,
        },
      }),
    [type],
  );

  function openSession(session: Session) {
    const gate = canAccessSession(session, accessKind, maxUnlockedDay);
    if (gate === 'ok') {
      router.push(`/player/${session.id}`);
      return;
    }
    if (gate === 'journey_locked') {
      Alert.alert('Dia ainda bloqueado', gateMessage(gate));
      return;
    }
    setPaywallVisible(true);
  }

  function openOtPrayer(id: string) {
    const prayer = getOldTestamentPrayerById(id);
    if (!prayer) return;
    const gate = canAccessOtPrayer(prayer, accessKind);
    if (gate === 'ok') {
      router.push(`/leitura/${id}`);
      return;
    }
    setPaywallVisible(true);
  }

  const trialHoursLeft = Math.ceil(trialRemainingMs / (60 * 60 * 1000));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <BrandMark variant="logo" size={40} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir configurações"
              onPress={() => setSettingsVisible(true)}
              hitSlop={8}
              style={styles.settingsBtn}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </Pressable>
          </View>
          <Text style={styles.greeting}>
            {timeGreeting()}
            {firstName ? `, ${firstName}` : ''}.{' '}
            {feeling
              ? greetingByFeeling[feeling]
              : 'Como está o seu coração agora?'}
          </Text>
          <Text style={styles.tagline}>
            Um momento de paz na presença de Deus.
          </Text>
          {accessKind === 'trial' && trialHoursLeft <= 24 ? (
            <Text style={styles.trialHint}>
              Restam cerca de {trialHoursLeft}h do seu acesso gratuito.
            </Text>
          ) : null}
          {!fullAudio ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setPaywallVisible(true)}
              style={({ pressed }) => [
                styles.trialLocked,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.trialLockedText}>
                Missão+ · R$ 19,90/mês · Liberar todos os áudios
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.sosWrap}>
          <InstallPwaBanner />
          <SosButton onPress={() => router.push('/sos')} />
        </View>

        {continueSession && positionMs > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Continuar</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Continuar ${continueSession.title}`}
              onPress={() => openSession(continueSession)}
              style={({ pressed }) => [
                styles.continueCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.continueText}>
                <Text style={styles.continueTitle} numberOfLines={2}>
                  {continueSession.title}
                </Text>
                <Text style={styles.continueMeta}>
                  Você parou em {formatTime(positionMs)}
                  {durationMs > 0 ? ` de ${formatTime(durationMs)}` : ''}
                </Text>
              </View>
              <View style={styles.continueCta}>
                <Text style={styles.continueCtaText}>Continuar</Text>
              </View>
            </Pressable>
          </View>
        ) : null}

        {recommended[0] ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Para você agora</Text>
            <FeaturedSessionCard
              session={recommended[0]}
              onPress={() => openSession(recommended[0])}
            />
          </View>
        ) : null}

        {/* Áudios gratuitos */}
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Áudios gratuitos</Text>
          <Text style={styles.blockHint}>
            Jornada diária, meditações e áudios do dia — sem assinatura.
          </Text>
        </View>

        <JourneyRow
          sessions={journeySessions}
          focusId={journeyFocus?.id}
          continueSessionId={
            continueSession?.category === 'jornada' ? continueSession.id : null
          }
          progressRatio={continueProgress}
          maxUnlockedDay={fullAudio ? 7 : maxUnlockedDay}
          onSelect={openSession}
        />

        <SessionRow
          title="Meditações bíblicas"
          sessions={meditationSessions}
          onSelect={openSession}
          isLocked={isSessionLocked}
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Para o seu dia</Text>
          {daySessions.map((session) => (
            <Pressable
              key={session.id}
              accessibilityRole="button"
              accessibilityLabel={`${session.title}, ${Math.round(session.durationSeconds / 60)} minutos`}
              onPress={() => openSession(session)}
              style={({ pressed }) => [styles.dayRow, pressed && styles.pressed]}
            >
              <Text style={styles.dayIcon}>
                {session.category === 'manha' ? '☀' : '☾'}
              </Text>
              <View style={styles.dayText}>
                <Text style={styles.dayTitle} numberOfLines={1}>
                  {session.title}
                </Text>
              </View>
              <Text style={styles.dayMeta}>
                {Math.round(session.durationSeconds / 60)} min
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Séries Premium */}
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Séries Premium</Text>
          <Text style={styles.blockHint}>
            Missão+ · O primeiro dia de cada série é uma amostra gratuita.
          </Text>
        </View>

        <SessionRow
          title="3 dias: mente, controle e ordem"
          badge="Missão+"
          sessions={ecosystemSessions}
          onSelect={openSession}
          isLocked={isSessionLocked}
        />

        <SessionRow
          title="Paz que Excede Todo Entendimento"
          badge="Missão+"
          sessions={premiumSeriesById.paz}
          onSelect={openSession}
          isLocked={isSessionLocked}
        />

        <SessionRow
          title="Construindo Resiliência na Fé"
          badge="Missão+"
          sessions={premiumSeriesById.resiliencia}
          onSelect={openSession}
          isLocked={isSessionLocked}
        />

        <SessionRow
          title="O Propósito que Acalma a Alma"
          badge="Missão+"
          sessions={premiumSeriesById.proposito}
          onSelect={openSession}
          isLocked={isSessionLocked}
        />

        <SessionRow
          title="Diário de Gratidão e Louvor"
          badge="Missão+"
          sessions={premiumSeriesById.gratidao}
          onSelect={openSession}
          isLocked={isSessionLocked}
        />

        <SessionRow
          title="Descanso em Deus"
          badge="Missão+"
          sessions={premiumSeriesById.descanso}
          onSelect={openSession}
          isLocked={isSessionLocked}
        />

        <SessionRow
          title="Libertando-se da Preocupação"
          badge="Missão+"
          sessions={premiumSeriesById.preocupacao}
          onSelect={openSession}
          isLocked={isSessionLocked}
        />

        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir Ferramentas — Foto com Jesus"
            onPress={() => router.push('/(tabs)/ferramentas')}
            style={({ pressed }) => [
              styles.toolsBanner,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.toolsBannerTitle}>Ferramentas</Text>
            <Text style={styles.toolsBannerHint}>
              Foto com Jesus · R$ 5,00 por imagem →
            </Text>
          </Pressable>
        </View>

        {/* Leituras e orações */}
        <View style={styles.blockHeader}>
          <Text style={styles.blockTitle}>Leituras e orações</Text>
          <Text style={styles.blockHint}>
            Textos bíblicos sempre disponíveis para ler com calma.
          </Text>
        </View>

        <OtPrayerRow
          onSelect={openOtPrayer}
          isLocked={(prayer) => canAccessOtPrayer(prayer, accessKind) !== 'ok'}
        />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Passagens para este momento</Text>
          {suggestedPrayers.map((prayer) => (
            <Pressable
              key={prayer.id}
              accessibilityRole="button"
              accessibilityLabel={`${prayer.title}. ${prayer.referenceLabel}`}
              onPress={() => router.push(`/oracao/${prayer.id}`)}
              style={({ pressed }) => [
                styles.prayerLink,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.prayerTitle}>
                {prayer.referenceLabel} — {prayer.themeLabel}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver todas as passagens"
            onPress={() => router.push('/(tabs)/oracoes')}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Ver todas as passagens</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apoie a Missão"
          style={({ pressed }) => [
            styles.supportBanner,
            pressed && styles.pressed,
          ]}
          onPress={() => setDonationVisible(true)}
        >
          <Text style={styles.supportText}>Apoie a Missão</Text>
          <Text style={styles.supportHint}>
            Contribuição voluntária, quando quiser
          </Text>
        </Pressable>
      </ScrollView>

      <DonationModal
        visible={donationVisible}
        onClose={() => setDonationVisible(false)}
      />
      <FeelingPickerModal
        visible={feelingVisible}
        onClose={() => setFeelingVisible(false)}
        onSelect={setFeeling}
      />
      <SettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onChangeFeeling={() => setFeelingVisible(true)}
        onOpenSubscription={() => setPaywallVisible(true)}
        onOpenHelp={() => setHelpVisible(true)}
      />
      <HelpFaqSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />
      <SubscriptionPaywall
        visible={paywallVisible}
        blocking={accessKind === 'locked'}
        onClose={() => setPaywallVisible(false)}
        onDonate={() => setDonationVisible(true)}
      />
    </SafeAreaView>
  );
}
