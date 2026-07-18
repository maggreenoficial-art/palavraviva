import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import {
  oldTestamentPrayers,
  type OldTestamentPrayer,
} from '../constants/oldTestamentPrayers';
import { getOtPrayerCoverImage } from '../constants/otPrayerCovers';
import { FREE_OT_PRAYER_COUNT } from '../services/contentAccess';
import { colors, spacing, useTypography } from '../theme';
import { OtPrayerCard } from './OtPrayerCard';

interface OtPrayerRowProps {
  onSelect: (id: string) => void;
  isLocked?: (prayer: OldTestamentPrayer) => boolean;
}

export function OtPrayerRow({ onSelect, isLocked }: OtPrayerRowProps) {
  const type = useTypography();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          marginBottom: spacing.xl,
        },
        title: {
          ...type.section,
          color: colors.textPrimary,
          paddingHorizontal: spacing.screen,
          marginBottom: spacing.xs,
        },
        hint: {
          ...type.caption,
          color: colors.textSecondary,
          paddingHorizontal: spacing.screen,
          marginBottom: spacing.md,
        },
        list: {
          paddingHorizontal: spacing.screen,
          paddingRight: spacing.xxl,
        },
      }),
    [type],
  );

  return (
    <View style={styles.section}>
      <Text style={styles.title}>10 orações do Velho Testamento</Text>
      <Text style={styles.hint}>
        {FREE_OT_PRAYER_COUNT} grátis · Demais com Missão+
      </Text>
      <FlatList
        horizontal
        data={oldTestamentPrayers}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <OtPrayerCard
            prayer={item}
            coverImage={getOtPrayerCoverImage(item.id)}
            locked={isLocked?.(item) ?? false}
            onPress={() => onSelect(item.id)}
          />
        )}
      />
    </View>
  );
}
