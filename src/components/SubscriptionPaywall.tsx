import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SUBSCRIPTION_PRICE_LABEL,
  TRIAL_HOURS,
  useUserStore,
} from '../store/useUserStore';
import { colors, radius, spacing, typography } from '../theme';

interface SubscriptionPaywallProps {
  visible: boolean;
  onClose: () => void;
  /** Se true, o fechamento só volta à Home (doação continua disponível). */
  blocking?: boolean;
  onDonate?: () => void;
}

export function SubscriptionPaywall({
  visible,
  onClose,
  blocking = false,
  onDonate,
}: SubscriptionPaywallProps) {
  const userId = useUserStore((s) => s.userId);
  const displayName = useUserStore((s) => s.displayName);
  const firstName = (displayName ?? '').trim().split(/\s+/)[0] ?? '';
  const activateSubscription = useUserStore((s) => s.activateSubscription);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setMessage(null);
    try {
      // Ponto de integração futura (Stripe/Pix/Play Billing).
      // Por enquanto libera o mês localmente pelo ID do usuário.
      await new Promise((resolve) => setTimeout(resolve, 700));
      activateSubscription(30);
      setMessage('Assinatura ativada por 30 dias. Obrigado por apoiar a missão.');
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 900);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!blocking) onClose();
      }}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => {
          if (!blocking) onClose();
        }}
      >
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          accessibilityLabel="Assinatura Missão Plus"
        >
          <View style={styles.handle} />

          <Text style={styles.kicker}>Missão+</Text>
          <Text style={styles.title}>
            {firstName
              ? `${firstName}, seus ${TRIAL_HOURS}h de acesso terminaram`
              : `Seus ${TRIAL_HOURS}h de acesso terminaram`}
          </Text>
          <Text style={styles.body}>
            Para continuar ouvindo jornadas, meditações e orações, assine o
            Palavra Viva. O apoio à missão (doação) continua disponível.
          </Text>

          <View style={styles.card}>
            <Text style={styles.price}>{SUBSCRIPTION_PRICE_LABEL}</Text>
            <Text style={styles.benefit}>Biblioteca completa · Novos áudios no mês</Text>
            <Text style={styles.benefit}>Offline nas sessões · Sem anúncios</Text>
            {userId ? (
              <Text style={styles.idLine}>Seu ID: {userId}</Text>
            ) : null}
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Assinar por ${SUBSCRIPTION_PRICE_LABEL}`}
            onPress={() => void handleSubscribe()}
            disabled={loading}
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.ctaText}>
                Assinar · {SUBSCRIPTION_PRICE_LABEL}
              </Text>
            )}
          </Pressable>

          {onDonate ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Apoiar a missão com doação"
              onPress={() => {
                onClose();
                onDonate();
              }}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryText}>Apoiar a missão (doação)</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={blocking ? 'Voltar ao início' : 'Fechar'}
            onPress={onClose}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryText}>
              {blocking ? 'Voltar ao início' : 'Agora não'}
            </Text>
          </Pressable>

          <Text style={styles.footnote}>
            Após o pagamento, este ID libera o acesso mensal. Enquanto a
            integração de pagamento é finalizada, o botão ativa a liberação
            local para testes.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  kicker: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    ...typography.section,
    color: colors.textPrimary,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  price: {
    ...typography.title,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  benefit: {
    ...typography.body,
    color: colors.textPrimary,
  },
  idLine: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  message: {
    ...typography.caption,
    color: colors.accent,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  ctaText: {
    ...typography.button,
    color: colors.background,
  },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  secondaryBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.7,
  },
});
