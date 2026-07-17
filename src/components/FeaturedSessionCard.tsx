import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Session } from '../types';
import { colors, radius, spacing, typography } from '../theme';

const COVER_HEIGHT = 148;

interface FeaturedSessionCardProps {
  session: Session;
  onPress: () => void;
}

export function FeaturedSessionCard({
  session,
  onPress,
}: FeaturedSessionCardProps) {
  const minutes = Math.round(session.durationSeconds / 60);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${session.title}. Ouvir. ${minutes} minutos`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.cover, { backgroundColor: session.coverColor }]}>
        {session.coverImage != null ? (
          <Image
            source={session.coverImage}
            style={styles.coverImage}
            contentFit="cover"
            contentPosition="center"
            recyclingKey={session.id}
            cachePolicy="memory-disk"
            transition={120}
            accessibilityIgnoresInvertColors
          />
        ) : null}
      </View>
      <View style={styles.body}>
        <Text style={styles.kicker}>Recomendado</Text>
        <Text style={styles.title} numberOfLines={2}>
          {session.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Reflexão e oração · {minutes} min
        </Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Ouvir</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
  },
  pressed: {
    opacity: 0.92,
  },
  cover: {
    width: '100%',
    height: COVER_HEIGHT,
  },
  coverImage: {
    width: '100%',
    height: COVER_HEIGHT,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
  kicker: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    ...typography.section,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  ctaText: {
    ...typography.caption,
    color: colors.background,
    fontFamily: 'DMSans_600SemiBold',
  },
});
