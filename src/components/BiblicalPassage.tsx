import { StyleSheet, Text, View } from 'react-native';
import type { BiblicalText } from '../services/biblicalContent';
import { colors, radius, spacing, typography } from '../theme';

interface BiblicalPassageProps {
  passage: BiblicalText;
  /** Compacto ainda exibe todos os versículos da referência (não só o primeiro). */
  compact?: boolean;
}

/** Exibe somente texto bíblico real, com rótulo e fonte. */
export function BiblicalPassage({ passage, compact = false }: BiblicalPassageProps) {
  return (
    <View
      style={[styles.box, compact && styles.boxCompact]}
      accessibilityRole="text"
      accessibilityLabel={`Texto bíblico. ${passage.reference}.`}
    >
      <Text style={styles.badge}>Texto bíblico</Text>
      <Text style={styles.reference}>{passage.reference}</Text>
      {passage.verses.map((verse) => (
        <Text
          key={verse.verse}
          style={[styles.verse, compact && styles.verseCompact]}
        >
          <Text style={styles.verseNumber}>{verse.verse} </Text>
          {verse.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  boxCompact: {
    padding: spacing.md,
  },
  badge: {
    ...typography.caption,
    color: colors.accentMuted,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  reference: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  verse: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  verseCompact: {
    fontSize: 15,
    lineHeight: 24,
  },
  verseNumber: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'DMSans_600SemiBold',
  },
});
