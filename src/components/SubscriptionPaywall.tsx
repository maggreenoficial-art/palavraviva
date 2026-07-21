import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  SUBSCRIPTION_PRICE_LABEL,
  useUserStore,
} from '../store/useUserStore';
import { trackAnalytics } from '../services/analytics';
import { trackMetaEvent } from '../services/metaPixel';
import {
  formatCardNumber,
  formatCpf,
  formatExpiry,
  payWithCard,
  payWithPix,
  pollSubscriptionAccess,
  syncSubscriptionAccess,
} from '../services/wivenCheckout';
import { useResponsive } from '../hooks/useResponsive';
import { colors, radius, spacing, typography } from '../theme';

interface SubscriptionPaywallProps {
  visible: boolean;
  onClose: () => void;
  blocking?: boolean;
  onDonate?: () => void;
}

type PayMethod = 'card' | 'pix';

export function SubscriptionPaywall({
  visible,
  onClose,
  blocking = false,
  onDonate,
}: SubscriptionPaywallProps) {
  const userId = useUserStore((s) => s.userId);
  const displayName = useUserStore((s) => s.displayName);
  const whatsapp = useUserStore((s) => s.whatsapp);
  const firstName = (displayName ?? '').trim().split(/\s+/)[0] ?? '';
  const setSubscriptionExpiresAt = useUserStore(
    (s) => s.setSubscriptionExpiresAt,
  );

  const [method, setMethod] = useState<PayMethod>('card');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardOwner, setCardOwner] = useState(displayName ?? '');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixImage, setPixImage] = useState<string | null>(null);
  const { isDesktop, shellMaxWidth } = useResponsive();

  useEffect(() => {
    if (!visible) return;
    setMethod('card');
    setLoading(false);
    setMessage(null);
    setError(null);
    setPixCode(null);
    setPixImage(null);
    setCardOwner((prev) => prev || displayName || '');
  }, [visible, displayName]);

  // Polling automático após gerar Pix (backoff)
  useEffect(() => {
    if (!visible || !pixCode || !userId) return;
    const signal = { cancelled: false };
    void (async () => {
      const unlocked = await pollSubscriptionAccess(
        userId,
        setSubscriptionExpiresAt,
        { signal, initialDelayMs: 5000, maxAttempts: 48 },
      );
      if (!signal.cancelled && unlocked) {
        void trackAnalytics({
          name: 'subscription_activated',
          meta: { method: 'pix' },
        });
        await handleSuccess();
      }
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [visible, pixCode, userId, setSubscriptionExpiresAt, onClose]);

  const qrUri = useMemo(() => {
    if (pixImage) return pixImage;
    if (!pixCode) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCode)}`;
  }, [pixCode, pixImage]);

  async function refreshAccess() {
    if (!userId) return false;
    return syncSubscriptionAccess(userId, setSubscriptionExpiresAt);
  }

  async function handleSuccess() {
    trackMetaEvent('Subscribe', {
      content_name: 'missao_plus',
      currency: 'BRL',
      value: 19.9,
    });
    setMessage('Pagamento confirmado. Assinatura ativa!');
    setTimeout(() => {
      setMessage(null);
      onClose();
    }, 900);
  }

  async function handlePayCard() {
    if (!userId) {
      setError('Faça o onboarding novamente para gerar seu ID.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await payWithCard({
        userId,
        displayName,
        whatsapp,
        document,
        card: {
          number: cardNumber,
          owner: cardOwner,
          expiresAt: expiry,
          cvv,
        },
      });
      void trackAnalytics({
        name: 'subscription_start',
        meta: { method: 'card' },
      });
      if (result.approved && result.subscriptionExpiresAt) {
        setSubscriptionExpiresAt(result.subscriptionExpiresAt);
        void trackAnalytics({
          name: 'subscription_activated',
          meta: { method: 'card' },
        });
        await handleSuccess();
        return;
      }
      const unlocked = await refreshAccess();
      if (unlocked) {
        await handleSuccess();
        return;
      }
      setMessage(
        'Pagamento em análise. Toque em “Já paguei” em alguns segundos.',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível pagar com cartão.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePayPix() {
    if (!userId) {
      setError('Faça o onboarding novamente para gerar seu ID.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      void trackAnalytics({
        name: 'subscription_start',
        meta: { method: 'pix' },
      });
      const result = await payWithPix({
        userId,
        displayName,
        whatsapp,
        document,
      });
      setPixCode(result.pixCode);
      setPixImage(result.pixImage);
      setMessage(
        'Pix gerado. Pague no banco — confirmamos automaticamente em instantes.',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível gerar o Pix.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAlreadyPaid() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const unlocked = await refreshAccess();
      if (unlocked) {
        void trackAnalytics({
          name: 'subscription_activated',
          meta: { method: 'manual_check' },
        });
        await handleSuccess();
      } else {
        setMessage(
          'Ainda não encontramos o pagamento. Aguarde alguns segundos e tente de novo.',
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyPix() {
    if (!pixCode) return;
    try {
      if (
        Platform.OS === 'web' &&
        typeof navigator !== 'undefined' &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(pixCode);
        setMessage('Código Pix copiado.');
        return;
      }
      await Share.share({ message: pixCode });
    } catch {
      setMessage('Selecione e copie o código Pix abaixo.');
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
      <KeyboardAvoidingView
        style={[styles.overlay, isDesktop && styles.overlayDesktop]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => {
            if (!blocking) onClose();
          }}
        />
        <View
          style={[
            styles.sheet,
            isDesktop && [
              styles.sheetDesktop,
              { maxWidth: Math.min(480, shellMaxWidth) },
            ],
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <Text style={styles.kicker}>Missão+</Text>
            <Text style={styles.title}>
              {firstName
                ? `${firstName}, continue com a assinatura`
                : 'Continue com a assinatura'}
            </Text>
            <Text style={styles.body}>
              O app é gratuito: SOS, Bíblia e vários áudios livres continuam
              liberados. A Missão+ é opcional e libera todos os áudios premium.
            </Text>

            <View style={styles.benefits}>
              <Text style={styles.benefitsTitle}>Com a Missão+ você tem</Text>
              <Text style={styles.benefitItem}>
                · Todos os áudios e séries premium
              </Text>
              <Text style={styles.benefitItem}>
                · Jornada de 7 dias completa
              </Text>
              <Text style={styles.benefitItem}>
                · Novos conteúdos sem bloqueio
              </Text>
            </View>

            <View style={styles.compare}>
              <View style={styles.compareCol}>
                <Text style={styles.compareHead}>Grátis</Text>
                <Text style={styles.compareItem}>SOS imediato</Text>
                <Text style={styles.compareItem}>Leituras em texto</Text>
                <Text style={styles.compareItem}>1º dia de cada série</Text>
              </View>
              <View style={[styles.compareCol, styles.compareColAccent]}>
                <Text style={[styles.compareHead, styles.compareHeadAccent]}>
                  Missão+
                </Text>
                <Text style={styles.compareItem}>Tudo do plano grátis</Text>
                <Text style={styles.compareItem}>Todos os áudios</Text>
                <Text style={styles.compareItem}>Séries e jornadas</Text>
              </View>
            </View>

            <View style={styles.priceCard}>
              <View>
                <Text style={styles.priceLabel}>Assinatura mensal</Text>
                <Text style={styles.price}>{SUBSCRIPTION_PRICE_LABEL}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Cancele quando quiser</Text>
              </View>
            </View>

            <View style={styles.tabs}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: method === 'card' }}
                onPress={() => setMethod('card')}
                style={[styles.tab, method === 'card' && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    method === 'card' && styles.tabTextActive,
                  ]}
                >
                  Cartão
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: method === 'pix' }}
                onPress={() => setMethod('pix')}
                style={[styles.tab, method === 'pix' && styles.tabActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    method === 'pix' && styles.tabTextActive,
                  ]}
                >
                  Pix
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>CPF</Text>
            <TextInput
              value={document}
              onChangeText={(v) => setDocument(formatCpf(v))}
              placeholder="000.000.000-00"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={styles.input}
              accessibilityLabel="CPF"
            />

            {method === 'card' ? (
              <>
                <Text style={styles.label}>Número do cartão</Text>
                <TextInput
                  value={cardNumber}
                  onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                  placeholder="ACCT-000003"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                  accessibilityLabel="Número do cartão"
                />

                <Text style={styles.label}>Nome no cartão</Text>
                <TextInput
                  value={cardOwner}
                  onChangeText={setCardOwner}
                  placeholder="Como está impresso"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  style={styles.input}
                  accessibilityLabel="Nome no cartão"
                />

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={styles.label}>Validade</Text>
                    <TextInput
                      value={expiry}
                      onChangeText={(v) => setExpiry(formatExpiry(v))}
                      placeholder="MM/AA"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      style={styles.input}
                      accessibilityLabel="Validade"
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      value={cvv}
                      onChangeText={(v) =>
                        setCvv(v.replace(/\D/g, '').slice(0, 4))
                      }
                      placeholder="123"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      secureTextEntry
                      style={styles.input}
                      accessibilityLabel="CVV"
                    />
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Pagar com cartão ${SUBSCRIPTION_PRICE_LABEL}`}
                  onPress={() => void handlePayCard()}
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
                      Pagar com cartão · {SUBSCRIPTION_PRICE_LABEL}
                    </Text>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                {!pixCode ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Gerar Pix"
                    onPress={() => void handlePayPix()}
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
                      <Text style={styles.ctaText}>Gerar Pix</Text>
                    )}
                  </Pressable>
                ) : (
                  <View style={styles.pixBox}>
                    {qrUri ? (
                      <Image
                        source={{ uri: qrUri }}
                        style={styles.qr}
                        accessibilityLabel="QR Code Pix"
                      />
                    ) : null}
                    <Text style={styles.pixHint}>
                      Escaneie o QR ou copie o código abaixo
                    </Text>
                    <Text selectable style={styles.pixCode}>
                      {pixCode}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void copyPix()}
                      style={styles.secondaryCta}
                    >
                      <Text style={styles.secondaryCtaText}>
                        Copiar código Pix
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => void handleAlreadyPaid()}
              disabled={loading}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Já paguei — verificar acesso</Text>
            </Pressable>

            {onDonate ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  onDonate();
                }}
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>Apoiar a missão (doação)</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>
                {blocking ? 'Voltar ao início' : 'Agora não'}
              </Text>
            </Pressable>

            <Text style={styles.footnote}>
              Pagamento seguro processado pela Wiven. Seus dados de cartão não
              ficam salvos no app.
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sheetDesktop: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: radius.xl,
    alignSelf: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: spacing.md,
  },
  scroll: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xs,
  },
  kicker: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    color: colors.textPrimary,
    marginTop: 2,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  benefits: {
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    gap: 6,
  },
  benefitsTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  benefitItem: {
    ...typography.body,
    color: colors.textSecondary,
  },
  compare: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  compareCol: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    padding: spacing.md,
    gap: 6,
    minHeight: 120,
  },
  compareColAccent: {
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentSoft,
  },
  compareHead: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: 'DMSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  compareHeadAccent: {
    color: colors.accent,
  },
  compareItem: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  price: {
    ...typography.title,
    color: colors.accent,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'DMSans_600SemiBold',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.sm,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.onAccent,
    fontFamily: 'DMSans_700Bold',
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  half: {
    flex: 1,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  ctaText: {
    ...typography.button,
    color: colors.background,
  },
  secondaryCta: {
    borderWidth: 1,
    borderColor: colors.accentMuted,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  secondaryCtaText: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  pixBox: {
    marginTop: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  qr: {
    width: 200,
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  pixHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pixCode: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  error: {
    ...typography.caption,
    color: colors.sos,
    marginTop: spacing.sm,
  },
  message: {
    ...typography.caption,
    color: colors.accent,
    marginTop: spacing.sm,
  },
  linkBtn: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
  },
  footnote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.7,
  },
});
