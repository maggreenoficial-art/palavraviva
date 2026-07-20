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
  TOOL_FOTO_JESUS_PRICE_LABEL,
  getToolById,
  type ToolId,
} from '../constants/toolsCatalog';
import { useResponsive } from '../hooks/useResponsive';
import { trackAnalytics } from '../services/analytics';
import {
  formatCardNumber,
  formatCpf,
  formatExpiry,
  payWithCard,
  payWithPix,
} from '../services/wivenCheckout';
import { useUserStore } from '../store/useUserStore';
import { MIN_TAP, colors, radius, spacing, useTypography } from '../theme';

interface ToolPaywallProps {
  visible: boolean;
  toolId: ToolId;
  onClose: () => void;
  onUnlocked?: () => void;
  /** Para cobrança por imagem (Foto com Jesus) */
  generationId?: string | null;
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
  generationId = null,
  consumable = false,
}: ToolPaywallProps) {
  const type = useTypography();
  const tool = getToolById(toolId);
  const userId = useUserStore((s) => s.userId);
  const displayName = useUserStore((s) => s.displayName);
  const whatsapp = useUserStore((s) => s.whatsapp);
  const firstName = (displayName ?? '').trim().split(/\s+/)[0] ?? '';

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

  const priceLabel = tool?.priceLabel ?? TOOL_FOTO_JESUS_PRICE_LABEL;
  const productKey = PRODUCT_BY_TOOL[toolId] ?? `tool-${toolId}`;
  const isConsumable = consumable || Boolean(tool?.consumable);

  useEffect(() => {
    if (!visible) return;
    setMethod('card');
    setLoading(false);
    setMessage(null);
    setError(null);
    setPixCode(null);
    setPixImage(null);
    setCardOwner((prev) => prev || displayName || '');
  }, [visible, displayName, generationId]);

  useEffect(() => {
    if (!visible || !pixCode || !isConsumable || !generationId) return;
    const signal = { cancelled: false };
    const timer = setTimeout(() => {
      if (!signal.cancelled) {
        setMessage(
          'Se o Pix já foi pago, feche e aguarde a geração — ou toque em Já paguei.',
        );
      }
    }, 12_000);
    return () => {
      signal.cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, pixCode, isConsumable, generationId]);

  const qrUri = useMemo(() => {
    if (pixImage) return pixImage;
    if (!pixCode) return null;
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pixCode)}`;
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
          maxHeight: '92%',
          borderTopWidth: 1,
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
          ...type.caption,
          color: colors.textMuted,
        },
        price: {
          ...type.title,
          color: colors.accent,
          marginTop: 2,
        },
        badge: {
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
          minHeight: MIN_TAP,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabActive: {
          backgroundColor: colors.accent,
        },
        tabText: {
          ...type.bodyMedium,
          color: colors.textSecondary,
        },
        tabTextActive: {
          color: colors.onAccent,
          fontFamily: 'DMSans_700Bold',
        },
        label: {
          ...type.caption,
          color: colors.textMuted,
          marginTop: spacing.sm,
          marginBottom: 4,
        },
        input: {
          minHeight: 50,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.backgroundSoft,
          color: colors.textPrimary,
          paddingHorizontal: spacing.md,
          fontFamily: 'DMSans_400Regular',
          fontSize: type.body.fontSize,
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
          minHeight: 54,
          borderRadius: radius.md,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        ctaText: {
          ...type.button,
          color: colors.onAccent,
        },
        secondary: {
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: spacing.sm,
        },
        secondaryText: {
          ...type.bodyMedium,
          color: colors.cyan,
        },
        close: {
          minHeight: MIN_TAP,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: spacing.sm,
        },
        closeText: {
          ...type.bodyMedium,
          color: colors.textMuted,
        },
        message: {
          ...type.caption,
          color: colors.accent,
          marginTop: spacing.sm,
        },
        error: {
          ...type.caption,
          color: colors.sos,
          marginTop: spacing.sm,
        },
        pixBox: {
          marginTop: spacing.md,
          alignItems: 'center',
          gap: spacing.sm,
        },
        qr: {
          width: 200,
          height: 200,
          borderRadius: radius.md,
          backgroundColor: colors.white,
        },
        pixCode: {
          ...type.caption,
          color: colors.textSecondary,
          textAlign: 'center',
        },
        pressed: {
          opacity: 0.85,
        },
      }),
    [type],
  );

  async function handleSuccess() {
    setMessage(
      isConsumable
        ? 'Pagamento confirmado. Gerando sua imagem…'
        : 'Pagamento confirmado. Ferramenta liberada!',
    );
    setTimeout(() => {
      setMessage(null);
      onUnlocked?.();
      onClose();
    }, 700);
  }

  async function handlePayCard() {
    if (!userId) {
      setError('Faça o onboarding novamente para gerar seu ID.');
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
      const result = await payWithCard({
        userId,
        displayName,
        whatsapp,
        document,
        product: productKey,
        generationId,
        card: {
          number: cardNumber,
          owner: cardOwner,
          expiresAt: expiry,
          cvv,
        },
      });
      void trackAnalytics({
        name: 'tool_purchase_start',
        meta: { toolId, method: 'card', consumable: isConsumable },
      });
      if (result.approved) {
        void trackAnalytics({
          name: 'tool_purchase_activated',
          meta: { toolId, method: 'card', consumable: isConsumable },
        });
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
        meta: { toolId, method: 'pix', consumable: isConsumable },
      });
      const result = await payWithPix({
        userId,
        displayName,
        whatsapp,
        document,
        product: productKey,
        generationId,
      });
      setPixCode(result.pixCode);
      setPixImage(result.pixImage);
      setMessage(
        'Pix gerado. Após o pagamento, a imagem começa a ser criada automaticamente.',
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
    void trackAnalytics({
      name: 'tool_purchase_activated',
      meta: { toolId, method: 'manual_check', consumable: isConsumable },
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
        setMessage('Código Pix copiado.');
        return;
      }
      await Share.share({ message: pixCode });
    } catch {
      setMessage('Selecione e copie o código Pix abaixo.');
    }
  }

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
              {tool?.benefit ??
                'Após o pagamento confirmado, geramos sua imagem com Jesus.'}
            </Text>

            <View style={styles.priceCard}>
              <View>
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
                />
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
            ) : (
              <>
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
                {pixCode ? (
                  <View style={styles.pixBox}>
                    {qrUri ? (
                      <Image source={{ uri: qrUri }} style={styles.qr} />
                    ) : null}
                    <Text style={styles.pixCode} selectable>
                      {pixCode}
                    </Text>
                    <Pressable onPress={() => void copyPix()} style={styles.secondary}>
                      <Text style={styles.secondaryText}>Copiar código Pix</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            )}

            <Pressable
              onPress={() => void handleAlreadyPaid()}
              style={styles.secondary}
              disabled={loading}
            >
              <Text style={styles.secondaryText}>Já paguei</Text>
            </Pressable>

            {message ? <Text style={styles.message}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>Agora não</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
