import { FlatList, StyleSheet, Text, View } from 'react-native';
import { oldTestamentPrayers } from '../constants/oldTestamentPrayers';
import { getOtPrayerCoverImage } from '../constants/otPrayerCovers';
import { colors, spacing, typography } from '../theme';
import { OtPrayerCard } from './OtPrayerCard';

interface OtPrayerRowProps {
  onSelect: (id: string) => void;
}

export function OtPrayerRow({ onSelect }: OtPrayerRowProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>10 orações do Velho Testamento</Text>
      <Text style={styles.hint}>
        Texto bíblico real · Ouça e acompanhe
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
            onPress={() => onSelect(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.section,
    color: colors.textPrimary,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingRight: spacing.xxl,
  },
});
