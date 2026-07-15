import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CheckInScore } from '../types';
import { colors, radius, spacing, typography } from '../theme';

const SCORES: Array<{ value: CheckInScore; label: string }> = [
  { value: 1, label: 'Muito difícil' },
  { value: 2, label: 'Difícil' },
  { value: 3, label: 'Igual' },
  { value: 4, label: 'Um pouco melhor' },
  { value: 5, label: 'Melhor' },
];

interface CheckInSheetProps {
  visible: boolean;
  title: string;
  onSelect: (score: CheckInScore) => void;
  onSkip: () => void;
}

export function CheckInSheet({
  visible,
  title,
  onSelect,
  onSkip,
}: CheckInSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        <View
          style={styles.sheet}
          accessibilityViewIsModal
          accessibilityLabel="Check-in opcional de bem-estar"
        >
          <Text style={styles.kicker}>Momento opcional</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>
            Isso não é diagnóstico nem avaliação clínica. Serve só para você
            notar como está se sentindo.
          </Text>

          <View style={styles.scores}>
            {SCORES.map((item) => (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                accessibilityLabel={`${item.value}: ${item.label}`}
                onPress={() => onSelect(item.value)}
                style={({ pressed }) => [styles.score, pressed && styles.pressed]}
              >
                <Text style={styles.scoreValue}>{item.value}</Text>
                <Text style={styles.scoreLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pular check-in"
            onPress={onSkip}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Pular</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  kicker: {
    ...typography.caption,
    color: colors.accent,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  scores: {
    gap: spacing.sm,
  },
  score: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scoreValue: {
    ...typography.button,
    color: colors.accent,
    width: 20,
  },
  scoreLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  skip: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  skipText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});
