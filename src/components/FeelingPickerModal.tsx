import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Feeling } from '../types';
import { colors, radius, spacing, typography } from '../theme';

const OPTIONS: Array<{ id: Feeling; label: string; description: string }> = [
  {
    id: 'ansioso',
    label: 'Ansioso',
    description: 'Quero acalmar o coração com a Palavra',
  },
  {
    id: 'sobrecarregado',
    label: 'Sobrecarregado',
    description: 'Preciso entregar o peso nas mãos de Deus',
  },
  {
    id: 'triste',
    label: 'Triste',
    description: 'Busco consolo e esperança em Cristo',
  },
];

interface FeelingPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (feeling: Feeling) => void;
}

export function FeelingPickerModal({
  visible,
  onClose,
  onSelect,
}: FeelingPickerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Como você está se sentindo agora?</Text>
          <Text style={styles.body}>
            Isso ajuda a personalizar recomendações. Você pode mudar quando
            quiser.
          </Text>

          {OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityLabel={`${option.label}. ${option.description}`}
              onPress={() => {
                onSelect(option.id);
                onClose();
              }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDesc}>{option.description}</Text>
            </Pressable>
          ))}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar"
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  option: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.md,
  },
  optionLabel: {
    ...typography.button,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  optionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  close: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  closeText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.88,
  },
});
