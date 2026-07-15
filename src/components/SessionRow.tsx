import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Session } from '../types';
import { colors, spacing, typography } from '../theme';
import { SessionCard } from './SessionCard';

interface SessionRowProps {
  title: string;
  sessions: Session[];
  onSelect: (session: Session) => void;
}

export function SessionRow({ title, sessions, onSelect }: SessionRowProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={sessions}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={() => onSelect(item)} />
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
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingRight: spacing.xxl,
  },
});
