import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { clearSensitiveLocalData } from '../store/usePrivacyActions';
import {
  SUBSCRIPTION_PRICE_LABEL,
  computeAccessKind,
  computeTrialRemainingMs,
  useUserStore,
} from '../store/useUserStore';
import { colors, radius, spacing, typography } from '../theme';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  onChangeFeeling: () => void;
  onOpenSubscription?: () => void;
}

export function SettingsSheet({
  visible,
  onClose,
  onChangeFeeling,
  onOpenSubscription,
}: SettingsSheetProps) {
  const displayName = useUserStore((s) => s.displayName);
  const userId = useUserStore((s) => s.userId);
  const trialStartedAt = useUserStore((s) => s.trialStartedAt);
  const subscriptionExpiresAt = useUserStore((s) => s.subscriptionExpiresAt);
  const accessKind = computeAccessKind(trialStartedAt, subscriptionExpiresAt);
  const trialRemainingMs = computeTrialRemainingMs(trialStartedAt);

  const accessLabel =
    accessKind === 'subscribed'
      ? `Missão+ ativo${
          subscriptionExpiresAt
            ? ` · até ${new Date(subscriptionExpiresAt).toLocaleDateString('pt-BR')}`
            : ''
        }`
      : accessKind === 'trial'
        ? `Acesso gratuito · ~${Math.ceil(trialRemainingMs / (60 * 60 * 1000))}h restantes`
        : 'Acesso gratuito encerrado';

  function handleClear() {
    Alert.alert(
      'Apagar dados sensíveis?',
      'Remove o sentimento salvo e o histórico local de check-ins neste aparelho.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            clearSensitiveLocalData();
            onClose();
          },
        },
      ],
    );
  }

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
          accessibilityLabel="Configurações"
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Configurações</Text>

          {displayName ? (
            <View style={styles.profileBox}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileMeta}>{accessLabel}</Text>
              {userId ? (
                <Text style={styles.profileId}>ID: {userId}</Text>
              ) : null}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alterar como estou me sentindo"
            style={styles.row}
            onPress={() => {
              onClose();
              onChangeFeeling();
            }}
          >
            <Text style={styles.rowText}>Alterar como estou me sentindo</Text>
          </Pressable>

          {onOpenSubscription ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Assinatura Missão Plus"
              style={styles.row}
              onPress={() => {
                onClose();
                onOpenSubscription();
              }}
            >
              <Text style={styles.rowText}>
                Assinatura Missão+ · {SUBSCRIPTION_PRICE_LABEL}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apagar dados sensíveis locais"
            style={styles.row}
            onPress={handleClear}
          >
            <Text style={styles.rowText}>Privacidade · Apagar dados sensíveis</Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            Este aplicativo oferece apoio espiritual e não substitui
            acompanhamento médico ou psicológico. Em emergência: CVV 188 · SAMU
            192.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar configurações"
            onPress={onClose}
            style={styles.close}
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
    paddingHorizontal: spacing.screen,
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
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  profileBox: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    gap: 4,
  },
  profileName: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  profileMeta: {
    ...typography.caption,
    color: colors.accent,
  },
  profileId: {
    ...typography.caption,
    color: colors.textMuted,
  },
  row: {
    minHeight: 52,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  close: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  closeText: {
    ...typography.bodyMedium,
    color: colors.textMuted,
  },
});
