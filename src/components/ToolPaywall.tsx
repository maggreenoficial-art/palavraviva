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
  TOOL_FOTO_JESUS_PRICE_LABEL,
  getToolById,
  type ToolId,
} from '../constants/toolsCatalog';
import { useResponsive } from '../hooks/useResponsive';
import { trackAnalytics } from '../services/analytics';
import { trackMetaEvent } from '../services/metaPixel';
import { checkFotoJesusPayment } from '../services/fotoJesus';
import {
  formatCpf,
  formatExpiry,
  isValidCpf,
  payWithCard,
  payWithPix,
} from '../services/wivenCheckout';
import { CardBrandIcons } from './CardBrandIcons';
import { useUserStore } from '../store/useUserStore';
import { MIN_TAP, colors, radius, spacing, useTypography } from '../theme';
import {
  detectCardBrand,
  formatCardNumberByBrand,
} from '../utils/inputMasks';

interface ToolPaywallProps {
  visible: boolean;
  toolId: ToolId;
  onClose: () => void;
  onUnlocked?: (meta?: {
    kieTaskId?: string | null;
    resultUrl?: string | null;
  }) => void;
  onPixReady?: (info: {
    transactionId: string | null;
    transactionIds: string[];
    clientIdentifier: string | null;
    checkoutId: string | null;
    pixCode: string | null;
    pixImage: string | null;
  }) => void;
  /** Para cobrança por imagem (Foto com Jesus) */
  generationId?: string | null;
  inputUrl?: string | null;
  generationToken?: string | null;
  /** Retomar Pix já gerado */
  initialPixCode?: string | null;
  initialPixImage?: string | null;
  initialTransactionId?: string | null;
  initialTransactionIds?: string[] | null;
  initialClientIdentifier?: string | null;
  consumable?: boolean;
}

type PayMethod = 'card' | 'pix';

const PRODUCT_BY_TOOL: Record<string, string> = {
  diario: 'tool-diario',
  'foto-jesus': 'tool-foto-jesus',
};

export function ToolPaywall({
  visible,
  toolId,
  onClose,
  onUnlocked,
  onPixReady,
  generationId = null,
  inputUrl = null,
  generationToken = null,
  initialPixCode = null,
  initialPixImage = null,
  initialTransactionId = null,
  initialTransactionIds = null,
  initialClientIdentifier = null,
  consumable = false,
}: ToolPaywallProps) {
  const type = useTypography();
  const tool = getToolById(toolId);
  const userId = useUserStore((s) => s.userId);
  const displayName = useUserStore((s) => s.displayName);
  const whatsapp = useUserStore((s) => s.whatsapp);
  const firstName = (displayName ?? '').trim().split(/\s+/)[0] ?? '';

  const isConsumable = consumable || Boolean(tool?.consumable);
  const [method, setMethod] = useState<PayMethod>(
    isConsumable ? 'pix' : 'card',
  );
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardOwner, setCardOwner] = useState(displayName ?? '');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixImage, setPixImage] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [transactionIds, setTransactionIds] = useState<string[]>([]);
  const [clientIdentifier, setClientIdentifier] = useState<string | null>(
    null,
  );
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const unlockingRef = useRef(false);
  const { isDesktop, shellMaxWidth } = useResponsive();
  const cardBrand = useMemo(
    () => detectCardBrand(cardNumber),
    [cardNumber],
  );

  function mergeTxIds(current: string[], next: string | null | undefined) {
    const list = [...current];
    if (next && !list.includes(next)) list.push(next);
    return list;
  }

  const priceLabel = tool?.priceLabel ?? TOOL_FOTO_JESUS_PRICE_LABEL;
  const productKey = PRODUCT_BY_TOOL[toolId] ?? `tool-${toolId}`;

  const checkoutTrackedRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      checkoutTrackedRef.current = false;
      return;
    }
    unlockingRef.current = false;
    setMethod(isConsumable ? 'pix' : 'card');
    setLoading(false);
    setChecking(false);
    setMessage(null);
    setError(null);
    setCopied(false);
    setCardOwner((prev) => prev || displayName || '');
    setPixCode(initialPixCode);
    setPixImage(initialPixImage);
    setTransactionId(initialTransactionId);
    setClientIdentifier(initialClientIdentifier);
    setTransactionIds(
      mergeTxIds(
        Array.isArray(initialTransactionIds) ? initialTransactionIds : [],
        initialTransactionId,
      ),
    );
    if (initialPixCode) {
      setMessage(
        'Pix pronto. Pague no banco e toque em “Já paguei” para continuar.',
      );
    }
    if (checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = true;
    trackMetaEvent('InitiateCheckout', {
      content_name: toolId,
      content_ids: [toolId],
      content_type: 'product',
      content_category: 'tool',
      currency: 'BRL',
      value: Number(tool?.price ?? 5),
      num_items: 1,
    });
  }, [
    visible,
    displayName,
    generationId,
    isConsumable,
    initialPixCode,
    initialPixImage,
    initialTransactionId,
    initialTransactionIds,
    initialClientIdentifier,
    toolId,
    tool?.price,
  ]);

  // Poll automático enquanto o Pix está na tela (Vercel precisa do transactionId)
  useEffect(() => {
    if (!visible || !pixCode || !isConsumable || !generationId || !userId) {
      return;
    }
    if (!transactionId && !clientIdentifier && !generationToken) return;

    const signal = { cancelled: false };
    let delay = 4000;

    const tick = async () => {
      if (signal.cancelled || unlockingRef.current) return;
      const status = await checkFotoJesusPayment({
        generationId,
        userId,
        inputUrl,
        token: generationToken,
        transactionId,
        transactionIds,
        clientIdentifier,
      });
      if (signal.cancelled || unlockingRef.current) return;

      if (
        status &&
        (status.status === 'paid' ||
          status.status === 'generating' ||
          status.status === 'success' ||
          status.paymentCheck?.paid)
      ) {
        unlockingRef.current = true;
        void trackAnalytics({
          name: 'tool_purchase_activated',
          meta: { toolId, method: 'pix_auto', consumable: isConsumable },
        });
        await handleSuccess({
          kieTaskId: status.kieTaskId,
          resultUrl: status.resultUrl,
        });
        return;
      }

      delay = Math.min(delay + 500, 8_000);
      if (!signal.cancelled) {
        timer = setTimeout(() => {
          void tick();
        }, delay);
      }
    };

    let timer = setTimeout(() => {
      void tick();
    }, delay);

    return () => {
      signal.cancelled = true;
      clearTimeout(timer);
    };
    // handleSuccess é estável o suficiente via closure do render atual
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    visible,
    pixCode,
    isConsumable,
    generationId,
    userId,
    transactionId,
    transactionIds,
    clientIdentifier,
    generationToken,
    inputUrl,
    toolId,
  ]);

  const qrUri = useMemo(() => {
    if (pixImage) return pixImage;
    if (!pixCode) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(pixCode)}`;
  }, [pixCode, pixImage]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: colors.overlay,
        },
        overlayDesktop: {
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
        },
        backdrop: {
          ...StyleSheet.absoluteFill,
        },
        sheet: {
          backgroundColor: colors.backgroundElevated,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          maxHeight: '94%',
          borderTopWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        sheetDesktop: {
          width: '100%',
          maxHeight: '90%',
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
          ...type.caption,
          color: colors.accent,
          fontFamily: 'DMSans_600SemiBold',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
        title: {
          ...type.title,
          fontSize: type.title.fontSize - 2,
          color: colors.textPrimary,
          marginTop: 2,
        },
        body: {
          ...type.body,
          color: colors.textSecondary,
          marginBottom: spacing.sm,
          lineHeight: Math.round(type.body.fontSize * 1.45),
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
          ...type.caption,
          color: colors.textMuted,
        },
        price: {
          ...type.title,
          color: colors.accent,
          marginTop: 2,
        },
        badge: {
          alignSelf: 'flex-start',
          maxWidth: '100%',
          backgroundColor: colors.accentSoft,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
        },
        badgeText: {
          ...type.caption,
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
          minHeight: MIN_TAP + 4,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabActive: {
          backgroundColor: colors.accent,
        },
        tabText: {
          ...type.bodyMedium,
          fontSize: type.bodyMedium.fontSize + 1,
          color: colors.textSecondary,
        },
        tabTextActive: {
          color: colors.onAccent,
          fontFamily: 'DMSans_700Bold',
        },
        label: {
          ...type.bodyMedium,
          color: colors.textSecondary,
          marginTop: spacing.sm,
          marginBottom: 6,
        },
        brandHint: {
          marginTop: 4,
          marginBottom: spacing.xs,
          color: colors.accent,
          fontFamily: 'DMSans_500Medium',
          fontSize: 12,
        },
        input: {
          minHeight: 54,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.backgroundSoft,
          color: colors.textPrimary,
          paddingHorizontal: spacing.md,
          fontFamily: 'DMSans_400Regular',
          fontSize: type.body.fontSize + 2,
        },
        row: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        half: {
          flex: 1,
        },
        cta: {
          marginTop: spacing.md,
          minHeight: 56,
          borderRadius: radius.md,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        ctaText: {
          ...type.button,
          fontSize: type.button.fontSize + 1,
          color: colors.onAccent,
        },
        ctaSecondaryFill: {
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.accent,
        },
        ctaSecondaryFillText: {
          color: colors.accent,
        },
        stepsBox: {
          marginTop: spacing.md,
          backgroundColor: colors.backgroundSoft,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        stepTitle: {
          ...type.bodyMedium,
          color: colors.textPrimary,
          fontFamily: 'DMSans_700Bold',
          marginBottom: 4,
        },
        stepLine: {
          ...type.body,
          color: colors.textSecondary,
          lineHeight: Math.round(type.body.fontSize * 1.4),
        },
        pixBox: {
          marginTop: spacing.md,
          alignItems: 'center',
          gap: spacing.md,
          width: '100%',
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
          ...type.bodyMedium,
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
          ...type.caption,
          fontSize: 13,
          lineHeight: 18,
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
        waitingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginTop: spacing.sm,
        },
        waitingText: {
          ...type.body,
          color: colors.accent,
          flex: 1,
        },
        close: {
          minHeight: MIN_TAP,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: spacing.md,
        },
        closeText: {
          ...type.bodyMedium,
          color: colors.textMuted,
        },
        message: {
          ...type.body,
          color: colors.accent,
          marginTop: spacing.sm,
          lineHeight: Math.round(type.body.fontSize * 1.4),
        },
        error: {
          ...type.body,
          color: colors.sos,
          marginTop: spacing.sm,
        },
        pressed: {
          opacity: 0.85,
        },
      }),
    [type],
  );

  async function handleSuccess(meta?: {
    kieTaskId?: string | null;
    resultUrl?: string | null;
  }) {
    trackMetaEvent('Purchase', {
      content_name: toolId,
      content_category: 'tool',
      currency: 'BRL',
      value: Number(tool?.price ?? 5),
      num_items: 1,
    });
    setMessage(
      isConsumable
        ? 'Pagamento confirmado! Gerando sua imagem…'
        : 'Pagamento confirmado. Ferramenta liberada!',
    );
    setTimeout(() => {
      setMessage(null);
      onUnlocked?.(meta);
      onClose();
    }, 700);
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
    if (isConsumable && !generationId) {
      setError('Envie a foto antes de pagar.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      void trackAnalytics({
        name: 'tool_purchase_start',
        meta: { toolId, method: 'card', consumable: isConsumable },
      });
      trackMetaEvent('AddPaymentInfo', {
        content_name: toolId,
        content_category: 'tool',
        currency: 'BRL',
        value: Number(tool?.price ?? 5),
        payment_type: 'card',
        num_items: 1,
      });
      const result = await payWithCard({
        userId,
        displayName,
        whatsapp,
        document,
        product: productKey,
        generationId,
        inputUrl,
        generationToken,
        card: {
          number: cardNumber,
          owner: cardOwner,
          expiresAt: expiry,
          cvv,
        },
      });
      if (result.approved) {
        void trackAnalytics({
          name: 'tool_purchase_activated',
          meta: { toolId, method: 'card', consumable: isConsumable },
        });
        await handleSuccess({
          kieTaskId: result.kieTaskId,
          resultUrl: result.resultUrl,
        });
        return;
      }
      setMessage(
        'Pagamento em análise. Aguarde alguns segundos e toque em “Já paguei”.',
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
    if (pixCode && transactionId) {
      setMessage(
        'Este Pix já está na tela. Pague ESTE código no banco e toque em “Já paguei”. Se você pagou um Pix antigo desta mesma foto, toque só em “Já paguei” — vamos conferir todos os códigos salvos.',
      );
      return;
    }
    if (!userId) {
      setError('Abra o app novamente para gerar seu ID de acesso.');
      return;
    }
    if (!isValidCpf(document)) {
      setError('Informe um CPF válido antes de gerar o Pix.');
      return;
    }
    if (isConsumable && !generationId) {
      setError('Envie a foto antes de pagar.');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    setCopied(false);
    try {
      void trackAnalytics({
        name: 'tool_purchase_start',
        meta: { toolId, method: 'pix', consumable: isConsumable },
      });
      trackMetaEvent('AddPaymentInfo', {
        content_name: toolId,
        content_category: 'tool',
        currency: 'BRL',
        value: Number(tool?.price ?? 5),
        payment_type: 'pix',
        num_items: 1,
      });
      const result = await payWithPix({
        userId,
        displayName: displayName || 'Assinante Palavra Viva',
        whatsapp,
        document,
        product: productKey,
        generationId,
        inputUrl,
        generationToken,
      });
      const tx = result.transactionId ?? null;
      const identifier = result.identifier ?? null;
      const nextIds = mergeTxIds(transactionIds, tx);
      setPixCode(result.pixCode);
      setPixImage(result.pixImage);
      setTransactionId(tx);
      setClientIdentifier(identifier);
      setTransactionIds(nextIds);
      setCheckoutId(result.checkoutId ?? null);
      onPixReady?.({
        transactionId: tx,
        transactionIds: nextIds,
        clientIdentifier: identifier,
        checkoutId: result.checkoutId ?? checkoutId ?? null,
        pixCode: result.pixCode,
        pixImage: result.pixImage,
      });
      setMessage(
        'Pix gerado. Pague no app do banco e depois toque em “Já paguei”.',
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
    if (!userId) {
      setError('Abra o app novamente para gerar seu ID de acesso.');
      return;
    }

    if (isConsumable && generationId) {
      setChecking(true);
      setError(null);
      setMessage('Confirmando seu pagamento…');
      try {
        const status = await checkFotoJesusPayment({
          generationId,
          userId,
          inputUrl,
          token: generationToken,
          transactionId,
          transactionIds,
          clientIdentifier,
        });

        if (
          status &&
          (status.status === 'paid' ||
            status.status === 'generating' ||
            status.status === 'success' ||
            status.paymentCheck?.paid)
        ) {
          void trackAnalytics({
            name: 'tool_purchase_activated',
            meta: { toolId, method: 'manual_check', consumable: true },
          });
          unlockingRef.current = true;
          await handleSuccess({
            kieTaskId: status.kieTaskId,
            resultUrl: status.resultUrl,
          });
          return;
        }

        const wiven = status?.paymentCheck?.wivenStatus;
        if (status?.paymentCheck?.error === 'transactionId_ausente') {
          setMessage(
            'Não encontramos o Pix desta sessão. Toque em “Gerar Pix” de novo, pague e depois em “Já paguei”.',
          );
        } else if (wiven && String(wiven).toUpperCase() === 'PENDING') {
          setMessage(
            transactionIds.length > 1
              ? 'Nenhum dos Pix desta foto está confirmado ainda. Se pagou há pouco, aguarde ~20s e toque de novo em “Já paguei”.'
              : 'O banco ainda não confirmou o Pix (pendente). Aguarde uns 20 segundos e toque de novo em “Já paguei”.',
          );
        } else if (status?.paymentCheck?.error) {
          setError(
            `Falha ao confirmar: ${status.paymentCheck.error}. Tente de novo.`,
          );
        } else {
          setMessage(
            'Ainda não identificamos o pagamento. Confira no banco e tente de novo em alguns segundos.',
          );
        }
      } catch {
        setError('Não foi possível verificar o pagamento agora. Tente de novo.');
      } finally {
        setChecking(false);
      }
      return;
    }

    void trackAnalytics({
      name: 'tool_purchase_activated',
      meta: { toolId, method: 'manual_check', consumable: false },
    });
    await handleSuccess();
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
        return;
      }
      await Share.share({ message: pixCode });
      setCopied(true);
      setMessage('Código Pix pronto para colar no banco.');
    } catch {
      setMessage('Pressione e segure o código abaixo para copiar.');
    }
  }

  const pixReady = Boolean(pixCode);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, isDesktop && styles.overlayDesktop]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            isDesktop && [
              styles.sheetDesktop,
              { maxWidth: Math.min(480, shellMaxWidth) },
            ],
          ]}
        >
          <View style={styles.handle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
          >
            <Text style={styles.kicker}>
              {isConsumable ? 'Por imagem' : 'Compra única'}
            </Text>
            <Text style={styles.title}>
              {firstName
                ? `${firstName}, finalize para gerar`
                : 'Finalize para gerar'}
            </Text>
            <Text style={styles.body}>
              {pixReady
                ? 'Pague com Pix no app do banco. Em seguida toque em “Já paguei” para começarmos a imagem.'
                : (tool?.benefit ??
                  'Após o pagamento confirmado, geramos sua imagem com Jesus.')}
            </Text>

            <View style={styles.priceCard}>
              <View style={styles.priceInfo}>
                <Text style={styles.priceLabel}>
                  {tool?.title ?? 'Ferramenta'}
                </Text>
                <Text style={styles.price}>{priceLabel}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {isConsumable ? '1 imagem' : 'Acesso vitalício'}
                </Text>
              </View>
            </View>

            {!pixReady ? (
              <View style={styles.tabs}>
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
              </View>
            ) : null}

            {!pixReady ? (
              <>
                <Text style={styles.label}>Seu CPF</Text>
                <TextInput
                  value={document}
                  onChangeText={(v) => setDocument(formatCpf(v))}
                  placeholder="000.000.000-00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  style={styles.input}
                  accessibilityLabel="CPF"
                />
              </>
            ) : null}

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
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      value={cvv}
                      onChangeText={(v) =>
                        setCvv(v.replace(/\D/g, '').slice(0, 4))
                      }
                      placeholder="000"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      style={styles.input}
                      secureTextEntry
                    />
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={loading}
                  onPress={() => void handlePayCard()}
                  style={({ pressed }) => [
                    styles.cta,
                    pressed && styles.pressed,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.onAccent} />
                  ) : (
                    <Text style={styles.ctaText}>
                      Pagar com cartão · {priceLabel}
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
                    disabled={loading}
                    onPress={() => void handlePayPix()}
                    style={({ pressed }) => [
                      styles.cta,
                      pressed && styles.pressed,
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.onAccent} />
                    ) : (
                      <Text style={styles.ctaText}>
                        Gerar Pix · {priceLabel}
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
                        4. Confirme o valor de {priceLabel} e pague
                      </Text>
                      <Text style={styles.stepLine}>
                        5. Volte aqui e toque em “Já paguei”
                      </Text>
                    </View>

                    {qrUri ? (
                      <View style={styles.qrWrap}>
                        <Image source={{ uri: qrUri }} style={styles.qr} />
                      </View>
                    ) : null}

                    <Text style={styles.copyHint}>Pix Copia e Cola</Text>
                    <View style={styles.pixCodeBox}>
                      <Text style={styles.pixCode} selectable>
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
                      accessibilityLabel="Já paguei, verificar pagamento"
                      disabled={checking || loading}
                      onPress={() => void handleAlreadyPaid()}
                      style={({ pressed }) => [
                        styles.cta,
                        styles.ctaSecondaryFill,
                        pressed && styles.pressed,
                      ]}
                    >
                      {checking ? (
                        <ActivityIndicator color={colors.accent} />
                      ) : (
                        <Text
                          style={[styles.ctaText, styles.ctaSecondaryFillText]}
                        >
                          Já paguei — verificar agora
                        </Text>
                      )}
                    </Pressable>

                    <View style={styles.waitingRow}>
                      <ActivityIndicator color={colors.accent} />
                      <Text style={styles.waitingText}>
                        Também verificamos automaticamente a cada poucos
                        segundos…
                      </Text>
                    </View>
                  </View>
                )}
              </>
            ) : null}

            {!pixReady ? (
              <Pressable
                onPress={() => void handleAlreadyPaid()}
                style={styles.close}
                disabled={loading || checking}
              >
                <Text style={styles.closeText}>Já paguei</Text>
              </Pressable>
            ) : null}

            {message ? <Text style={styles.message}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>
                {pixReady ? 'Fechar e continuar depois' : 'Agora não'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
