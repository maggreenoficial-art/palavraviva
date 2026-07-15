import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

const SUGGESTED_VALUES = [5, 15, 30];

interface DonationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function DonationModal({ visible, onClose }: DonationModalProps) {
  const [selected, setSelected] = useState<number | 'custom' | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmExternal, setConfirmExternal] = useState(false);

  function resetAndClose() {
    setSelected(null);
    setCustomValue('');
    setError(null);
    setConfirmExternal(false);
    setLoading(false);
    onClose();
  }

  function resolveAmount(): number | null {
    if (selected === 'custom') {
      const parsed = Number(customValue.replace(',', '.'));
      if (!Number.isFinite(parsed) || parsed < 1) return null;
      return parsed;
    }
    if (typeof selected === 'number') return selected;
    return null;
  }

  async function handleContinue() {
    const amount = resolveAmount();
    if (amount == null) {
      setError('Informe um valor válido (mínimo R$ 1).');
      return;
    }
    setError(null);
    setConfirmExternal(true);
  }

  async function handleConfirmExternal() {
    // Ponto de integração futuro com provedor de pagamento.
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setError(
        'A integração de pagamento ainda não está ativa. Nenhum valor foi cobrado.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={resetAndClose}
    >
      <Pressable style={styles.overlay} onPress={resetAndClose}>
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          accessibilityLabel="Apoie a Missão"
        >
          <View style={styles.handle} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar doação"
            onPress={resetAndClose}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>Fechar</Text>
          </Pressable>

          <Text style={styles.title}>Apoie a Missão</Text>
          <Text style={styles.body}>
            Sua contribuição ajuda a manter o conteúdo gratuito e disponível para
            quem precisa.
          </Text>

          <View style={styles.values}>
            {SUGGESTED_VALUES.map((value) => {
              const active = selected === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Selecionar ${value} reais`}
                  accessibilityState={{ selected: active }}
                  style={[styles.valueButton, active && styles.valueActive]}
                  onPress={() => {
                    setSelected(value);
                    setConfirmExternal(false);
                    setError(null);
                  }}
                >
                  <Text style={[styles.valueText, active && styles.valueTextActive]}>
                    R$ {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Outro valor"
            accessibilityState={{ selected: selected === 'custom' }}
            style={[
              styles.customButton,
              selected === 'custom' && styles.valueActive,
            ]}
            onPress={() => {
              setSelected('custom');
              setConfirmExternal(false);
              setError(null);
            }}
          >
            <Text style={styles.customText}>Outro Valor</Text>
          </Pressable>

          {selected === 'custom' ? (
            <TextInput
              accessibilityLabel="Digite outro valor em reais"
              keyboardType="decimal-pad"
              placeholder="Ex.: 20"
              placeholderTextColor={colors.textMuted}
              value={customValue}
              onChangeText={setCustomValue}
              style={styles.input}
            />
          ) : null}

          {selected != null ? (
            <Text style={styles.selected}>
              Valor selecionado:{' '}
              {selected === 'custom'
                ? customValue
                  ? `R$ ${customValue}`
                  : 'não informado'
                : `R$ ${selected}`}
            </Text>
          ) : null}

          {error ? (
            <Text style={styles.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}

          {!confirmExternal ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continuar com a contribuição"
              onPress={handleContinue}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>Continuar</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                Você será direcionado a um provedor externo de pagamento. Deseja
                continuar?
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirmar saída para pagamento externo"
                disabled={loading}
                onPress={handleConfirmExternal}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.primaryText}>Confirmar</Text>
                )}
              </Pressable>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agora não"
            onPress={resetAndClose}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Agora não</Text>
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
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
  },
  closeText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
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
  values: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  valueButton: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(61, 220, 151, 0.28)',
  },
  valueText: {
    ...typography.button,
    color: colors.accent,
  },
  valueTextActive: {
    color: colors.textPrimary,
  },
  customButton: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundSoft,
    marginBottom: spacing.md,
  },
  customText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
  },
  selected: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.sos,
    marginBottom: spacing.sm,
  },
  primary: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    ...typography.button,
    color: colors.background,
  },
  confirmBox: {
    gap: spacing.md,
  },
  confirmText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  skip: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  skipText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
  pressed: {
    opacity: 0.88,
  },
});
