import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AudioPlayer } from '../../src/components/AudioPlayer';
import { CheckInSheet } from '../../src/components/CheckInSheet';
import { SubscriptionPaywall } from '../../src/components/SubscriptionPaywall';
import { getSessionById } from '../../src/constants/sessions';
import { useFavoritesStore } from '../../src/store/useFavoritesStore';
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
  const hasContentAccess =
    computeAccessKind(trialStartedAt, subscriptionExpiresAt) !== 'locked';
  const saveAfterOnly = useWellbeingStore((s) => s.saveAfterOnly);
  const isFavorite = useFavoritesStore((s) =>
    s.isFavorite('session', id ?? ''),
  );
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const [checkInVisible, setCheckInVisible] = useState(false);

  if (!hasContentAccess) {
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

  function handleCheckIn(score: CheckInScore) {
    saveAfterOnly(session!.id, score);
    setCheckInVisible(false);
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

      <AudioPlayer
        session={session}
        onFinished={() => setCheckInVisible(true)}
      />

      <CheckInSheet
        visible={checkInVisible}
        title="Como você está se sentindo agora?"
        onSelect={handleCheckIn}
        onSkip={() => setCheckInVisible(false)}
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
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minHeight: 52,
  },
  sideBtn: {
    minHeight: 44,
    justifyContent: 'center',
    minWidth: 72,
  },
  backLink: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  headerTitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  favLink: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'right',
    fontFamily: 'DMSans_600SemiBold',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  fallbackText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
