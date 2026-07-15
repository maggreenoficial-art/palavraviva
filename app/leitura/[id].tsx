import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { SubscriptionPaywall } from '../../src/components/SubscriptionPaywall';
import { SyncedScriptureReader } from '../../src/components/SyncedScriptureReader';
import { getOldTestamentPrayerById } from '../../src/constants/oldTestamentPrayers';
import { getOtPrayerAudioSource } from '../../src/constants/otPrayerAudio';
import { getBiblicalTextById } from '../../src/services/biblicalContent';
import { trackAnalytics } from '../../src/services/analytics';
import {
  computeAccessKind,
  useUserStore,
} from '../../src/store/useUserStore';
import { colors, spacing, typography } from '../../src/theme';

export default function LeituraGuiadaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const trialStartedAt = useUserStore((s) => s.trialStartedAt);
  const subscriptionExpiresAt = useUserStore((s) => s.subscriptionExpiresAt);
  const hasContentAccess =
    computeAccessKind(trialStartedAt, subscriptionExpiresAt) !== 'locked';
  const otPrayer = id ? getOldTestamentPrayerById(id) : undefined;
  const passage = useMemo(
    () => (otPrayer ? getBiblicalTextById(otPrayer.passageId) : null),
    [otPrayer],
  );
  const audioSource = otPrayer ? getOtPrayerAudioSource(otPrayer.id) : undefined;

  useEffect(() => {
    if (!hasContentAccess || !otPrayer) return;
    void trackAnalytics({
      name: 'read_open',
      contentId: otPrayer.id,
      contentTitle: otPrayer.title,
      contentKind: 'ot',
      path: `/leitura/${otPrayer.id}`,
    });
  }, [hasContentAccess, otPrayer?.id, otPrayer?.title]);

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

  if (!otPrayer || !passage || !audioSource) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.error}>
            Passagem ou narração indisponível.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Text style={styles.back}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.side}
        >
          <Text style={styles.back}>Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Leitura guiada
        </Text>
        <View style={styles.side} />
      </View>

      <View style={styles.meta}>
        <Text style={styles.emoji}>{otPrayer.emoji}</Text>
        <View style={styles.metaText}>
          <Text style={styles.title}>{otPrayer.title}</Text>
          <Text style={styles.who}>
            {otPrayer.whoPrayed} · {otPrayer.focus}
          </Text>
        </View>
      </View>

      <SyncedScriptureReader
        passage={passage}
        audioSource={audioSource}
        subtitle="Acompanhe o texto enquanto a narração avança"
        analyticsId={otPrayer.id}
        analyticsTitle={otPrayer.title}
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
  side: {
    minWidth: 64,
    minHeight: 44,
    justifyContent: 'center',
  },
  back: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  headerTitle: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    flex: 1,
    textAlign: 'center',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.md,
  },
  emoji: {
    fontSize: 28,
  },
  metaText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.section,
    color: colors.textPrimary,
  },
  who: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  error: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
