import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AudioPlayer } from '../../src/components/AudioPlayer';
import { CheckInSheet } from '../../src/components/CheckInSheet';
import { SubscriptionPaywall } from '../../src/components/SubscriptionPaywall';
import { getSessionById } from '../../src/constants/sessions';
import {
  canAccessSession,
  gateMessage,
} from '../../src/services/contentAccess';
import { trackMetaViewContent } from '../../src/services/metaPixel';
import { useFavoritesStore } from '../../src/store/useFavoritesStore';
import { useJourneyProgressStore } from '../../src/store/useJourneyProgressStore';
import {
  computeAccessKind,
  useUserStore,
} from '../../src/store/useUserStore';
import { useWellbeingStore } from '../../src/store/useWellbeingStore';
import { colors, spacing, typography } from '../../src/theme';
import type { CheckInScore } from '../../src/types';

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = getSessionById(id);
  const trialStartedAt = useUserStore((s) => s.trialStartedAt);
  const subscriptionExpiresAt = useUserStore((s) => s.subscriptionExpiresAt);
  const accessKind = computeAccessKind(trialStartedAt, subscriptionExpiresAt);
  const maxUnlockedDay = useJourneyProgressStore((s) => s.maxUnlockedDay);
  const markJourneySessionCompleted = useJourneyProgressStore(
    (s) => s.markJourneySessionCompleted,
  );
  const saveAfterOnly = useWellbeingStore((s) => s.saveAfterOnly);
  const isFavorite = useFavoritesStore((s) =>
    s.isFavorite('session', id ?? ''),
  );
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  useEffect(() => {
    if (!session?.id) return;
    trackMetaViewContent(session.id, 'audio_session');
  }, [session?.id]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Sessão não encontrada.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Text style={styles.backLink}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const gate = canAccessSession(session, accessKind, maxUnlockedDay);

  if (gate === 'journey_locked') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>{gateMessage(gate)}</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Text style={styles.backLink}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (gate !== 'ok') {
    return (
      <SafeAreaView style={styles.safe}>
        <SubscriptionPaywall
          visible
          blocking
          onClose={() => router.replace('/(tabs)/home')}
        />
      </SafeAreaView>
    );
  }

  function handleCheckIn(score: CheckInScore) {
    saveAfterOnly(session!.id, score);
    setCheckInVisible(false);
  }

  function handleFinished() {
    if (session!.category === 'jornada') {
      markJourneySessionCompleted(session!.id);
      Alert.alert(
        'Dia concluído',
        session!.journeyDay && session!.journeyDay < 7
          ? `Dia ${session!.journeyDay + 1} liberado na jornada.`
          : 'Você concluiu os sete dias. Que a paz de Cristo permaneça.',
      );
    }
    setCheckInVisible(true);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.sideBtn}
        >
          <Text style={styles.backLink}>Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Sessão</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite ? 'Remover dos favoritos' : 'Favoritar sessão'
          }
          onPress={() => toggleFavorite('session', session.id)}
          hitSlop={8}
          style={styles.sideBtn}
        >
          <Text style={styles.favLink}>
            {isFavorite ? '★ Favoritado' : '☆ Favoritar'}
          </Text>
        </Pressable>
      </View>

      <AudioPlayer session={session} onFinished={handleFinished} />

      <CheckInSheet
        visible={checkInVisible}
        title="Como você está se sentindo agora?"
        onSelect={handleCheckIn}
        onSkip={() => setCheckInVisible(false)}
      />

      <SubscriptionPaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    minHeight: 52,
  },
  sideBtn: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  backLink: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  favLink: {
    ...typography.caption,
    color: colors.accent,
    textAlign: 'right',
  },
  headerTitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  fallbackText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
