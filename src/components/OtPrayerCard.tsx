import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OldTestamentPrayer } from '../constants/oldTestamentPrayers';
import { colors, radius, spacing, typography } from '../theme';

const COVER_WIDTH = 168;
const COVER_HEIGHT = 112;

interface OtPrayerCardProps {
  prayer: OldTestamentPrayer;
  coverImage: number;
  onPress: () => void;
}

export function OtPrayerCard({ prayer, coverImage, onPress }: OtPrayerCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${prayer.title}. ${prayer.whoPrayed}. ${prayer.focus}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.cover, { backgroundColor: prayer.coverColor }]}>
        <Image
          source={coverImage}
          style={styles.coverImage}
          contentFit="cover"
          contentPosition="center"
          recyclingKey={prayer.id}
          cachePolicy="memory-disk"
          transition={120}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.coverOverlay} pointerEvents="none">
          <Text style={styles.order}>ORAÇÃO {prayer.order}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {prayer.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {prayer.whoPrayed} · {prayer.focus}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: COVER_WIDTH,
    marginRight: spacing.md,
  },
  pressed: {
    opacity: 0.9,
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverImage: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
  },
  coverOverlay: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    justifyContent: 'flex-end',
  },
  order: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'DMSans_600SemiBold',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: 4,
    minHeight: 40,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
