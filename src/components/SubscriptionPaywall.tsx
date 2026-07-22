import { useEffect, useMemo, useRef, useState } from 'react';
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
  computeAccessKind,
  useUserStore,
} from '../store/useUserStore';
import { trackAnalytics } from '../services/analytics';
import {
  trackMissaoAddPaymentInfo,
  trackMissaoInitiateCheckout,
  trackMissaoSubscribe,
} from '../services/metaPixel';
import {
  formatCpf,
  formatExpiry,
  isValidCpf,
  payWithCard,
  payWithPix,
  pollSubscriptionAccess,
  syncSubscriptionAccess,
} from '../services/wivenCheckout';
import { CardBrandIcons } from './CardBrandIcons';
import { useResponsive } from '../hooks/useResponsive';
import { colors, radius, spacing, typography } from '../theme';
import {
  detectCardBrand,
  formatCardNumberByBrand,
} from '../utils/inputMasks';

interface SubscriptionPaywallProps {
  visible: boolean;
  onClose: () => void;
  blocking?: boolean;
}

type PayMethod = 'card' | 'pix';

export function SubscriptionPaywall({
  visible,
  onClose,
  blocking = false,
}: SubscriptionPaywallProps) {
  const userId = useUserStore((s) => s.userId);
  const displayName = useUserStore((s) => s.displayName);
  const whatsapp = useUserStore((s) => s.whatsapp);
  const trialStartedAt = useUserStore((s) => s.trialStartedAt);
  const subscriptionExpiresAt = useUserStore((s) => s.subscriptionExpiresAt);
  const firstName = (displayName ?? '').trim().split(/\s+/)[0] ?? '';
  const setSubscriptionExpiresAt = useUserStore(
    (s) => s.setSubscriptionExpiresAt,
  );
  const alreadySubscribed =
    computeAccessKind(trialStartedAt, subscriptionExpiresAt) === 'subscribed';

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
  const [copied, setCopied] = useState(false);
  const [success, setSuccess] = useState(false);
  const { isDesktop, shellMaxWidth } = useResponsive();
  const cardBrand = useMemo(
    () => detectCardBrand(cardNumber),
    [cardNumber],
  );
  const pixReady = Boolean(pixCode);

  const checkoutTrackedRef = useRef(false);

  function fireInitiateCheckout() {
    if (alreadySubscribed) return;
    if (checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = true;
    // rAF: modal já no DOM; sem setTimeout cancelável
    const run = () => trackMissaoInitiateCheckout();
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(run));
    } else {
      run();
    }
  }

  // Reset do formulário — separado do tracking
  useEffect(() => {
    if (!visible) {
      checkoutTrackedRef.current = false;
      return;
    }
    setMethod('card');
    setLoading(false);
    setMessage(null);
    setError(null);
    setPixCode(null);
    setPixImage(null);
    setCopied(false);
    setSuccess(false);
    setCardOwner((prev) => prev || displayName || '');
  }, [visible, displayName]);

  // Tracking: só quando visible muda para true
  useEffect(() => {
    if (!visible) return;
    fireInitiateCheckout();
  }, [visible, alreadySubscribed]);

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
    trackMissaoSubscribe();
    setError(null);
    setMessage(null);
    setLoading(false);
    setSuccess(true);
  }

  async function handlePayCard() {
    if (!userId) {
      setError('Abra o app novamente para gerar seu ID de acesso.');
      return;
    }
    if (!isValidCpf(document)) {
      setError('Informe um CPF válido antes de pagar.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      void trackAnalytics({
        name: 'subscription_start',
        meta: { method: 'card' },
      });
      trackMissaoAddPaymentInfo('card');
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
      const raw =
        err instanceof Error
          ? err.message
          : 'Não foi possível pagar com cartão.';
      if (/retentativ|bloqueado após várias/i.test(raw)) {
        setError(raw);
        setMessage(
          'Dica: use a aba Pix — libera na hora sem risco de bloqueio do cartão.',
        );
        setMethod('pix');
      } else {
        setError(raw);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePayPix() {
    if (!userId) {
      setError('Abra o app novamente para gerar seu ID de acesso.');
      return;
    }
    if (!isValidCpf(document)) {
      setError('Informe um CPF válido antes de gerar o Pix.');
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
      trackMissaoAddPaymentInfo('pix');
      const result = await payWithPix({
        userId,
        displayName: displayName || 'Assinante Palavra Viva',
        whatsapp,
        document,
      });
      if (typeof console !== 'undefined') {
        console.info('[meta-checkout] pix_server_meta', result.meta ?? null);
      }
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
        setCopied(true);
        setMessage('Código Pix copiado! Cole no app do seu banco.');
        setTimeout(() => setCopied(false), 2500);
        return;
      }
      await Share.share({ message: pixCode });
      setCopied(true);
      setMessage('Código Pix pronto para colar no banco.');
      setTimeout(() => setCopied(false), 2500);
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
            {success || alreadySubscribed ? (
              <View style={styles.successBox}>
                <Text style={styles.successKicker}>
                  {success ? 'Pagamento confirmado' : 'Assinatura ativa'}
                </Text>
                <Text style={styles.successTitle}>
                  {firstName
                    ? `${firstName}, você ${success ? 'agora' : 'já'} é Missão+`
                    : `Você ${success ? 'agora' : 'já'} é Missão+`}
                </Text>
                <Text style={styles.successBody}>
                  {success
                    ? 'Sua assinatura está ativa. Todos os áudios premium já estão liberados neste aparelho.'
                    : subscriptionExpiresAt
                      ? `Sua Missão+ está liberada até ${new Date(
                          subscriptionExpiresAt,
                        ).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}. Não precisa assinar de novo agora.`
                      : 'Sua assinatura Missão+ já está ativa neste aparelho. Não precisa assinar de novo.'}
                </Text>

                <View style={styles.successBenefits}>
                  <Text style={styles.benefitsTitle}>O que você tem</Text>
                  <Text style={styles.benefitItem}>
                    · Todos os áudios e séries premium
                  </Text>
                  <Text style={styles.benefitItem}>
                    · Jornada de 7 dias completa
                  </Text>
                  <Text style={styles.benefitItem}>
                    · Novos conteúdos sem bloqueio
                  </Text>
                  <Text style={styles.benefitItem}>
                    · SOS, Bíblia e conteúdos gratuitos continuam iguais
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continuar ouvindo"
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.cta,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.ctaText}>Continuar ouvindo</Text>
                </Pressable>
              </View>
            ) : (
              <>
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

            {!pixReady ? (
              <>
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
                    <Text
                      style={[styles.compareHead, styles.compareHeadAccent]}
                    >
                      Missão+
                    </Text>
                    <Text style={styles.compareItem}>Tudo do plano grátis</Text>
                    <Text style={styles.compareItem}>Todos os áudios</Text>
                    <Text style={styles.compareItem}>Séries e jornadas</Text>
                  </View>
                </View>

                <View style={styles.priceCard}>
                  <View style={styles.priceInfo}>
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
              </>
            ) : (
              <Text style={styles.body}>
                Pague com Pix no app do banco. Em seguida toque em “Já paguei”
                para liberar a Missão+.
              </Text>
            )}

            <Text style={styles.label}>CPF</Text>
            <TextInput
              value={document}
              onChangeText={(v) => setDocument(formatCpf(v))}
              placeholder="000.000.000-00"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              editable={!pixReady}
              style={styles.input}
              accessibilityLabel="CPF"
            />

            {method === 'card' && !pixReady ? (
              <>
                <Text style={styles.label}>Número do cartão</Text>
                <CardBrandIcons active={cardBrand} />
                <TextInput
                  value={cardNumber}
                  onChangeText={(v) =>
                    setCardNumber(
                      formatCardNumberByBrand(v, detectCardBrand(v)),
                    )
                  }
                  placeholder="0000 0000 0000 0000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={19}
                  style={styles.input}
                  accessibilityLabel="Número do cartão"
                />
                {cardBrand ? (
                  <Text style={styles.brandHint}>
                    Bandeira detectada:{' '}
                    {cardBrand === 'mastercard'
                      ? 'Mastercard'
                      : cardBrand === 'amex'
                        ? 'American Express'
                        : cardBrand === 'hipercard'
                          ? 'Hipercard'
                          : cardBrand.charAt(0).toUpperCase() +
                            cardBrand.slice(1)}
                  </Text>
                ) : null}

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
            ) : null}

            {method === 'pix' || pixReady ? (
              <>
                {!pixReady ? (
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
                      <Text style={styles.ctaText}>
                        Gerar Pix · {SUBSCRIPTION_PRICE_LABEL}
                      </Text>
                    )}
                  </Pressable>
                ) : (
                  <View style={styles.pixBox}>
                    <View style={styles.stepsBox}>
                      <Text style={styles.stepTitle}>Como pagar (Pix)</Text>
                      <Text style={styles.stepLine}>
                        1. Abra o app do seu banco
                      </Text>
                      <Text style={styles.stepLine}>
                        2. Escolha Pix → Pix Copia e Cola (ou QR Code)
                      </Text>
                      <Text style={styles.stepLine}>
                        3. Cole o código ou escaneie o QR abaixo
                      </Text>
                      <Text style={styles.stepLine}>
                        4. Confirme o valor de {SUBSCRIPTION_PRICE_LABEL} e pague
                      </Text>
                      <Text style={styles.stepLine}>
                        5. Volte aqui e toque em “Já paguei”
                      </Text>
                    </View>

                    {qrUri ? (
                      <View style={styles.qrWrap}>
                        <Image
                          source={{ uri: qrUri }}
                          style={styles.qr}
                          accessibilityLabel="QR Code Pix"
                        />
                      </View>
                    ) : null}

                    <Text style={styles.copyHint}>Pix Copia e Cola</Text>
                    <View style={styles.pixCodeBox}>
                      <Text selectable style={styles.pixCode}>
                        {pixCode}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Copiar código Pix"
                      onPress={() => void copyPix()}
                      style={({ pressed }) => [
                        styles.cta,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.ctaText}>
                        {copied ? 'Código copiado ✓' : 'Copiar código Pix'}
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Já paguei, verificar acesso"
                      disabled={loading}
                      onPress={() => void handleAlreadyPaid()}
                      style={({ pressed }) => [
                        styles.cta,
                        styles.ctaSecondaryFill,
                        pressed && styles.pressed,
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.accent} />
                      ) : (
                        <Text
                          style={[styles.ctaText, styles.ctaSecondaryFillText]}
                        >
                          Já paguei — verificar agora
                        </Text>
                      )}
                    </Pressable>
                  </View>
                )}
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {message ? <Text style={styles.message}>{message}</Text> : null}

            {!pixReady ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleAlreadyPaid()}
                disabled={loading}
                style={styles.linkBtn}
              >
                <Text style={styles.linkText}>Já paguei — verificar acesso</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>
                {pixReady
                  ? 'Fechar e continuar depois'
                  : blocking
                    ? 'Voltar ao início'
                    : 'Agora não'}
              </Text>
            </Pressable>

            <Text style={styles.footnote}>
              Pagamento seguro processado pela Wiven. Seus dados de cartão não
              ficam salvos no app.
            </Text>
              </>
            )}
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
    paddingBottom: spacing.xxl + spacing.lg,
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
    paddingRight: spacing.sm,
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  priceInfo: {
    width: '100%',
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
    alignSelf: 'flex-start',
    maxWidth: '100%',
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
  brandHint: {
    marginTop: -spacing.xs,
    marginBottom: spacing.sm,
    color: colors.accent,
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
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
    alignSelf: 'stretch',
  },
  ctaText: {
    ...typography.button,
    color: colors.background,
  },
  ctaSecondaryFill: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accent,
    marginTop: spacing.sm,
  },
  ctaSecondaryFillText: {
    color: colors.accent,
  },
  stepsBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  stepTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontFamily: 'DMSans_700Bold',
    marginBottom: 4,
  },
  stepLine: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: Math.round(typography.body.fontSize * 1.4),
  },
  pixBox: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    alignSelf: 'stretch',
  },
  qrWrap: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
  },
  qr: {
    width: 220,
    height: 220,
  },
  copyHint: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: 'DMSans_700Bold',
  },
  pixCodeBox: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden',
  },
  pixCode: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    textAlign: 'left',
    width: '100%',
    flexShrink: 1,
    ...(Platform.OS === 'web'
      ? ({
          wordBreak: 'break-all',
          overflowWrap: 'anywhere',
          whiteSpace: 'pre-wrap',
        } as object)
      : {}),
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
  successBox: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  successKicker: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'DMSans_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  successTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  successBody: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: Math.round(typography.body.fontSize * 1.45),
  },
  successBenefits: {
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
