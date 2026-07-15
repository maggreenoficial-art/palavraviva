import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BiblicalText } from '../services/biblicalContent';
import { colors, radius, spacing, typography } from '../theme';

interface BiblicalPassageProps {
  passage: BiblicalText;
  /** Compacto ainda exibe todos os versículos da referência (não só o primeiro). */
  compact?: boolean;
  /** Recolhido por padrão para o player ficar visível sem scroll. */
  collapsible?: boolean;
  initiallyExpanded?: boolean;
}

/** Exibe somente texto bíblico real, com rótulo. */
export function BiblicalPassage({
  passage,
  compact = false,
  collapsible = true,
  initiallyExpanded = false,
}: BiblicalPassageProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const shouldCollapse = collapsible && passage.verses.length > 1;
  const visibleVerses =
    shouldCollapse && !expanded ? passage.verses.slice(0, 1) : passage.verses;

  return (
    <View
      style={[styles.box, compact && styles.boxCompact]}
      accessibilityRole="text"
      accessibilityLabel={`Texto bíblico. ${passage.reference}.`}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.badge}>Texto bíblico</Text>
          <Text style={styles.reference}>{passage.reference}</Text>
        </View>
        {shouldCollapse ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? 'Recolher texto bíblico' : 'Ver texto bíblico completo'
            }
            onPress={() => setExpanded((value) => !value)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>
              {expanded ? 'Recolher' : 'Ver texto'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {visibleVerses.map((verse) => (
        <Text
          key={verse.verse}
          style={[styles.verse, compact && styles.verseCompact]}
          numberOfLines={shouldCollapse && !expanded ? 3 : undefined}
        >
          <Text style={styles.verseNumber}>{verse.verse} </Text>
          {verse.text}
        </Text>
      ))}

      {shouldCollapse && !expanded && passage.verses.length > 1 ? (
        <Text style={styles.moreHint}>
          +{passage.verses.length - 1} versículo
          {passage.verses.length - 1 === 1 ? '' : 's'} — toque em Ver texto
        </Text>
      ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 4,
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
  toggle: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    justifyContent: 'center',
  },
  toggleText: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'DMSans_600SemiBold',
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
  moreHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
