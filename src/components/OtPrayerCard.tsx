import { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { OldTestamentPrayer } from '../constants/oldTestamentPrayers';
import { colors, MIN_TAP, radius, spacing, useTypography } from '../theme';

const COVER_WIDTH = 168;
const COVER_HEIGHT = 112;

interface OtPrayerCardProps {
  prayer: OldTestamentPrayer;
  coverImage: number;
  onPress: () => void;
  locked?: boolean;
}

export function OtPrayerCard({
  prayer,
  coverImage,
  onPress,
  locked = false,
}: OtPrayerCardProps) {
  const type = useTypography();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          width: COVER_WIDTH,
          marginRight: spacing.md,
          minHeight: MIN_TAP,
        },
        cardLocked: {
          opacity: 0.8,
        },
        pressed: {
          opacity: 0.85,
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
          ...type.caption,
          color: colors.accent,
          fontFamily: 'DMSans_600SemiBold',
          textShadowColor: 'rgba(0,0,0,0.55)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        },
        title: {
          ...type.bodyMedium,
          color: colors.textPrimary,
          marginBottom: 4,
          minHeight: 44,
        },
        meta: {
          ...type.caption,
          color: colors.textSecondary,
        },
      }),
    [type],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${prayer.title}. ${prayer.whoPrayed}. ${prayer.focus}${locked ? '. Assinatura necessária' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        locked && styles.cardLocked,
      ]}
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
          <Text style={styles.order}>
            {locked ? 'MISSÃO+' : `ORAÇÃO ${prayer.order}`}
          </Text>
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
