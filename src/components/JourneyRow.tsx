import { Image } from 'expo-image';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { Session } from '../types';
import { colors, radius, spacing, typography } from '../theme';

interface JourneyRowProps {
  title?: string;
  sessions: Session[];
  focusId?: string | null;
  continueSessionId?: string | null;
  progressRatio?: number;
  onSelect: (session: Session) => void;
}

export function JourneyRow({
  title = 'Sete dias para acalmar o coração',
  sessions,
  focusId,
  continueSessionId,
  progressRatio = 0,
  onSelect,
}: JourneyRowProps) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(
    156,
    Math.max(136, (width - spacing.screen * 2) / 2.25),
  );
  const imageHeight = Math.round(cardWidth * 1.15);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.hint}>Deslize para ver os dias</Text>
      </View>

      <FlatList
        horizontal
        data={sessions}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={cardWidth + spacing.md}
        snapToAlignment="start"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const focused = item.id === focusId;
          const isContinue = item.id === continueSessionId;
          const minutes = Math.round(item.durationSeconds / 60);

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Dia ${item.journeyDay}. ${item.title}. ${minutes} minutos`}
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.card,
                { width: cardWidth },
                focused && styles.cardFocused,
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[
                  styles.poster,
                  { height: imageHeight, backgroundColor: item.coverColor },
                  focused && styles.posterFocused,
                ]}
              >
                {item.coverImage != null ? (
                  <Image
                    source={item.coverImage}
                    style={{ width: cardWidth, height: imageHeight }}
                    contentFit="cover"
                    contentPosition="center"
                    recyclingKey={item.id}
                    cachePolicy="memory-disk"
                    transition={120}
                    accessibilityIgnoresInvertColors
                  />
                ) : null}

                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>DIA {item.journeyDay}</Text>
                </View>

                {isContinue && progressRatio > 0 && progressRatio < 0.98 ? (
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.round(progressRatio * 100)}%` },
                      ]}
                    />
                  </View>
                ) : null}
              </View>

              <View style={styles.metaBlock}>
                <Text style={styles.posterTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.posterMeta}>{minutes} min</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.section,
  },
  header: {
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.md,
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingRight: spacing.section,
  },
  card: {
    marginRight: spacing.md,
  },
  cardFocused: {
    transform: [{ scale: 1.02 }],
  },
  pressed: {
    opacity: 0.92,
  },
  poster: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
  },
  posterFocused: {
    borderColor: colors.accentMuted,
  },
  dayBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(18, 26, 33, 0.88)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(61, 220, 151, 0.45)',
  },
  dayBadgeText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.6,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  metaBlock: {
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 64,
    gap: 2,
  },
  posterTitle: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  posterMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
