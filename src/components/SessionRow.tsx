import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Session } from '../types';
import { colors, spacing, useTypography } from '../theme';
import { SessionCard } from './SessionCard';

interface SessionRowProps {
  title: string;
  sessions: Session[];
  onSelect: (session: Session) => void;
  isLocked?: (session: Session) => boolean;
  /** Rótulo opcional (ex.: Missão+) */
  badge?: string;
}

export function SessionRow({
  title,
  sessions,
  onSelect,
  isLocked,
  badge,
}: SessionRowProps) {
  const type = useTypography();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: {
          marginBottom: spacing.xl,
        },
        header: {
          paddingHorizontal: spacing.screen,
          marginBottom: spacing.md,
          gap: 4,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          flexWrap: 'wrap',
        },
        title: {
          ...type.section,
          color: colors.textPrimary,
        },
        badge: {
          backgroundColor: colors.accentSoft,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 4,
          minHeight: 28,
          justifyContent: 'center',
        },
        badgeText: {
          ...type.caption,
          color: colors.accent,
          fontFamily: 'DMSans_600SemiBold',
          fontSize: Math.max(12, type.caption.fontSize - 1),
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
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <FlatList
        horizontal
        data={sessions}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            locked={isLocked?.(item) ?? false}
            onPress={() => onSelect(item)}
          />
        )}
      />
    </View>
  );
}
