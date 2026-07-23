import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToolPaywall } from '../src/components/ToolPaywall';
import {
  TOOL_FOTO_JESUS_PRICE_LABEL,
  getToolById,
} from '../src/constants/toolsCatalog';
import { trackAnalytics } from '../src/services/analytics';
import {
  checkFotoJesusPayment,
  confirmFotoJesusPayment,
  pollFotoJesusResult,
  prepareFotoJesus,
} from '../src/services/fotoJesus';
import {
  cacheImageAsDataUri,
  downloadFotoJesusImage,
  shareFotoJesusInvite,
} from '../src/services/fotoJesusShare';
import { compressImageForUpload } from '../src/utils/compressImage';
import { useFotoJesusStore } from '../src/store/useFotoJesusStore';
import { useUserStore } from '../src/store/useUserStore';
import {
  MIN_TAP,
  colors,
  radius,
  spacing,
  useTypography,
} from '../src/theme';

const examplePhoto = require('../assets/examples/foto-jesus-exemplo.jpg');

type Step = 'pick' | 'ready' | 'paying' | 'generating' | 'done' | 'error';

export default function FotoJesusScreen() {
  const type = useTypography();
  const tool = getToolById('foto-jesus');
  const userId = useUserStore((s) => s.userId);
  const saveResult = useFotoJesusStore((s) => s.saveResult);
  const savePending = useFotoJesusStore((s) => s.savePending);
  const patchPending = useFotoJesusStore((s) => s.patchPending);
  const clearPending = useFotoJesusStore((s) => s.clearPending);
  const pending = useFotoJesusStore((s) => s.pending);

  const [step, setStep] = useState<Step>('pick');
  const [hydrated, setHydrated] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [previewDataUri, setPreviewDataUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState<string | null>(null);
  const [generationToken, setGenerationToken] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [transactionIds, setTransactionIds] = useState<string[]>([]);
  const [clientIdentifier, setClientIdentifier] = useState<string | null>(
    null,
  );
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixImage, setPixImage] = useState<string | null>(null);
  const [kieTaskId, setKieTaskId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated) return;

    const finish = () => {
      const state = useFotoJesusStore.getState();
      const open = state.pending;

      // Pix / geração em andamento tem prioridade sobre a última foto salva
      if (open?.generationId && open.inputUrl && open.token) {
        setGenerationId(open.generationId);
        setInputUrl(open.inputUrl);
        setGenerationToken(open.token);
        setTransactionId(open.transactionId);
        setTransactionIds(
          Array.isArray(open.transactionIds)
            ? open.transactionIds
            : open.transactionId
              ? [open.transactionId]
              : [],
        );
        setClientIdentifier(open.clientIdentifier ?? null);
        setPixCode(open.pixCode);
        setPixImage(open.pixImage);
        setKieTaskId(open.kieTaskId);
        setResultUrl(null);
        if (open.previewDataUri) {
          setPreviewDataUri(open.previewDataUri);
          setLocalUri(open.previewDataUri);
        }
        if (open.kieTaskId) {
          setStep('generating');
          setStatusText(
            'Continuando a criação da sua imagem… Isso pode levar 1 a 2 minutos.',
          );
        } else {
          setStep('paying');
          setStatusText(
            open.transactionId
              ? 'Há um Pix em aberto nesta foto. Toque em “Verificar pagamento” (não gere outro Pix se já pagou).'
              : 'Continue o pagamento para gerar sua imagem.',
          );
        }
        setHydrated(true);
        return;
      }

      const saved = state.lastResult;
      if (saved?.dataUri || saved?.resultUrl) {
        setResultUrl(saved.dataUri || saved.resultUrl);
        setGenerationId(saved.generationId);
        setStep('done');
      }
      setHydrated(true);
    };

    if (useFotoJesusStore.persist.hasHydrated()) {
      finish();
      return;
    }

    const unsub = useFotoJesusStore.persist.onFinishHydration(finish);
    return unsub;
  }, [hydrated]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: {
          flex: 1,
          backgroundColor: colors.background,
        },
        topBar: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.screen,
          minHeight: 52,
        },
        sideBtn: {
          minWidth: 64,
          minHeight: MIN_TAP,
          justifyContent: 'center',
        },
        back: {
          ...type.bodyMedium,
          color: colors.accent,
        },
        headerTitle: {
          ...type.bodyMedium,
          color: colors.textSecondary,
          flex: 1,
          textAlign: 'center',
        },
        content: {
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.xxl,
          gap: spacing.md,
        },
        lead: {
          ...type.title,
          color: colors.textPrimary,
          marginTop: spacing.sm,
        },
        body: {
          ...type.body,
          color: colors.textSecondary,
        },
        price: {
          ...type.section,
          color: colors.accent,
        },
        preview: {
          width: '100%',
          aspectRatio: 1,
          borderRadius: radius.lg,
          backgroundColor: colors.backgroundSoft,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          position: 'relative',
        },
        previewImage: {
          width: '100%',
          height: '100%',
        },
        exampleBadge: {
          position: 'absolute',
          top: spacing.sm,
          left: spacing.sm,
          backgroundColor: colors.overlay,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        exampleBadgeText: {
          ...type.caption,
          color: colors.white,
          fontFamily: 'DMSans_600SemiBold',
        },
        actionsRow: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        actionHalf: {
          flex: 1,
        },
        cta: {
          minHeight: 54,
          borderRadius: radius.md,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        ctaSecondary: {
          backgroundColor: colors.accentSoft,
          borderWidth: 1,
          borderColor: colors.accentMuted,
        },
        ctaText: {
          ...type.button,
          color: colors.onAccent,
          textAlign: 'center',
        },
        ctaTextSecondary: {
          ...type.bodyMedium,
          color: colors.accent,
          textAlign: 'center',
        },
        previewEmpty: {
          ...StyleSheet.absoluteFill,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        previewEmptyText: {
          ...type.bodyMedium,
          color: colors.textMuted,
          textAlign: 'center',
        },
        status: {
          ...type.body,
          color: colors.cyan,
          textAlign: 'center',
          lineHeight: Math.round(type.body.fontSize * 1.4),
        },
        error: {
          ...type.caption,
          color: colors.sos,
        },
        tip: {
          ...type.caption,
          color: colors.textMuted,
          lineHeight: 20,
        },
        pressed: {
          opacity: 0.88,
        },
      }),
    [type],
  );

  const displayImage = resultUrl || previewDataUri || localUri;
  const showExample = !displayImage;
  const previewSource = resultUrl
    ? { uri: resultUrl }
    : previewDataUri
      ? { uri: previewDataUri }
      : localUri
        ? { uri: localUri }
        : examplePhoto;
  const hasSavedImage = Boolean(resultUrl) && step === 'done';

  const persistGenerated = useCallback(
    async (generationIdValue: string, remoteUrl: string) => {
      const dataUri = await cacheImageAsDataUri(remoteUrl);
      const display = dataUri || remoteUrl;
      setResultUrl(display);
      saveResult({
        generationId: generationIdValue,
        resultUrl: remoteUrl,
        dataUri,
      });
    },
    [saveResult],
  );

  const pickPhoto = useCallback(async () => {
    setError(null);
    setActionMessage(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permita o acesso às fotos para continuar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.45,
      base64: true,
      exif: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      setError('Não foi possível ler a foto. Tente outra imagem.');
      return;
    }

    let nextBase64 = asset.base64;
    let nextMime = asset.mimeType || 'image/jpeg';
    try {
      const compressed = await compressImageForUpload(nextBase64, nextMime);
      nextBase64 = compressed.base64;
      nextMime = compressed.mimeType;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível preparar a foto. Tente outra imagem.',
      );
      return;
    }

    setLocalUri(asset.uri);
    const dataUri = `data:${nextMime};base64,${nextBase64}`;
    setPreviewDataUri(dataUri);
    setImageBase64(nextBase64);
    setMimeType(nextMime);
    setGenerationId(null);
    setInputUrl(null);
    setGenerationToken(null);
    setTransactionId(null);
    setPixCode(null);
    setPixImage(null);
    setKieTaskId(null);
    setResultUrl(null);
    setStep('ready');
    setStatusText(null);
    clearPending();
  }, [clearPending]);

  const uploadAndPay = useCallback(async () => {
    if (!userId) {
      setError('Faça o onboarding novamente para gerar seu ID.');
      return;
    }
    if (!imageBase64) {
      setError('Escolha uma foto primeiro.');
      return;
    }

    setBusy(true);
    setError(null);
    setStatusText('Preparando e enviando sua foto…');
    try {
      const compressed = await compressImageForUpload(imageBase64, mimeType);
      const prepared = await prepareFotoJesus({
        userId,
        imageBase64: compressed.base64,
        mimeType: compressed.mimeType,
      });
      setImageBase64(compressed.base64);
      setMimeType(compressed.mimeType);
      setGenerationId(prepared.generationId);
      setInputUrl(prepared.inputUrl);
      setGenerationToken(prepared.token);
      setStep('paying');
      setPaywallVisible(true);
      void trackAnalytics({
        name: 'foto_jesus_prepare',
        meta: { generationId: prepared.generationId },
      });
    } catch (err) {
      setStep('error');
      setError(
        err instanceof Error ? err.message : 'Não foi possível enviar a foto.',
      );
    } finally {
      setBusy(false);
      setStatusText(null);
    }
  }, [imageBase64, mimeType, userId]);

  const resumeRef = useRef(false);
  const pollingLockRef = useRef(false);

  const startPolling = useCallback(
    async (seed?: { kieTaskId?: string | null; resultUrl?: string | null }) => {
      if (!userId || !generationId) return;
      if (pollingLockRef.current) return;
      pollingLockRef.current = true;
      setPaywallVisible(false);

      try {
      if (seed?.resultUrl) {
        setStatusText('Salvando sua imagem neste aparelho…');
        await persistGenerated(generationId, seed.resultUrl);
        setLocalUri(null);
        setImageBase64(null);
        clearPending();
        setStep('done');
        setStatusText(null);
        return;
      }

      if (seed?.kieTaskId) {
        setKieTaskId(seed.kieTaskId);
        patchPending({ kieTaskId: seed.kieTaskId });
      }

      setStep('generating');
      setStatusText(
        'Pagamento ok. Criando sua imagem… Isso pode levar 1 a 2 minutos.',
      );
      setError(null);

      const activeKieTaskId = seed?.kieTaskId || kieTaskId;
      const signal = { cancelled: false };
      const openPending = useFotoJesusStore.getState().pending;
      const result = await pollFotoJesusResult(
        {
          generationId,
          userId,
          inputUrl,
          token: generationToken,
          kieTaskId: activeKieTaskId,
          transactionId:
            transactionId || openPending?.transactionId || null,
          transactionIds:
            transactionIds.length > 0
              ? transactionIds
              : openPending?.transactionIds || [],
          clientIdentifier:
            clientIdentifier || openPending?.clientIdentifier || null,
        },
        {
          signal,
          initialDelayMs: 2500,
          maxAttempts: 72,
          onUpdate: (status) => {
            if (status.kieTaskId) {
              setKieTaskId(status.kieTaskId);
              patchPending({ kieTaskId: status.kieTaskId });
            }
            if (status.status === 'awaiting_payment') {
              setStatusText(
                'Aguardando confirmação do pagamento… Se já pagou, toque em “Verificar pagamento”.',
              );
            } else if (
              status.status === 'paid' ||
              status.status === 'generating'
            ) {
              setStatusText(
                status.error
                  ? `Gerando… (${status.error})`
                  : 'Gerando sua imagem com Jesus… Pode levar 1 a 2 minutos.',
              );
            }
          },
        },
      );

      if (!result) {
        setStep('paying');
        setError(
          'Ainda não confirmamos o pagamento ou a geração demorou. Toque em “Verificar pagamento” ou abra o Pix de novo.',
        );
        return;
      }

      if (result.status === 'success' && result.resultUrl) {
        setStatusText('Salvando sua imagem neste aparelho…');
        await persistGenerated(generationId, result.resultUrl);
        setLocalUri(null);
        setImageBase64(null);
        clearPending();
        setStep('done');
        setStatusText(null);
        void trackAnalytics({
          name: 'foto_jesus_success',
          meta: { generationId },
        });
        return;
      }

      if (result.status === 'awaiting_payment') {
        setStep('paying');
        setStatusText(
          'Pagamento ainda não confirmado. Abra o Pix ou verifique de novo.',
        );
        return;
      }

      setStep('error');
      setError(
        result.error || 'Não foi possível gerar a imagem. Tente outra foto.',
      );
      } finally {
        pollingLockRef.current = false;
      }
    },
    [
      clearPending,
      clientIdentifier,
      generationId,
      generationToken,
      inputUrl,
      kieTaskId,
      patchPending,
      persistGenerated,
      transactionId,
      transactionIds,
      userId,
    ],
  );

  // Retoma pending ao reabrir: gera se já tem kieTaskId; senão tenta confirmar Pix 1x
  useEffect(() => {
    if (!hydrated || resumeRef.current) return;
    const open = useFotoJesusStore.getState().pending;
    if (!open?.generationId || !userId) {
      resumeRef.current = true;
      return;
    }
    resumeRef.current = true;
    if (open.kieTaskId) {
      void startPolling({ kieTaskId: open.kieTaskId });
      return;
    }
    if (open.transactionId && (step === 'paying' || step === 'generating')) {
      void (async () => {
        setBusy(true);
        setStatusText('Verificando seu pagamento…');
        try {
          const payment = await confirmFotoJesusPayment({
            generationId: open.generationId,
            userId,
            inputUrl: open.inputUrl,
            token: open.token,
            transactionId: open.transactionId,
            transactionIds: open.transactionIds,
            clientIdentifier: open.clientIdentifier,
            kieTaskId: open.kieTaskId,
          });
          if (
            payment &&
            (payment.paymentCheck?.paid ||
              payment.status === 'paid' ||
              payment.status === 'generating' ||
              payment.status === 'success' ||
              payment.kieTaskId)
          ) {
            if (payment.kieTaskId) {
              setKieTaskId(payment.kieTaskId);
              patchPending({ kieTaskId: payment.kieTaskId });
            }
            await startPolling({ kieTaskId: payment.kieTaskId });
            return;
          }
          setStatusText(
            'Se você já pagou este Pix, toque em “Verificar pagamento”. Não gere outro código.',
          );
        } finally {
          setBusy(false);
        }
      })();
    }
  }, [hydrated, step, userId, startPolling, patchPending]);

  const checkStatus = useCallback(async () => {
    const open = useFotoJesusStore.getState().pending;
    const activeGenerationId = generationId || open?.generationId || null;
    const activeInputUrl = inputUrl || open?.inputUrl || null;
    const activeToken = generationToken || open?.token || null;
    const activeTx = transactionId || open?.transactionId || null;
    const activeTxIds =
      transactionIds.length > 0
        ? transactionIds
        : open?.transactionIds ||
          (activeTx ? [activeTx] : []);
    const activeIdentifier =
      clientIdentifier || open?.clientIdentifier || null;
    const activeKie = kieTaskId || open?.kieTaskId || null;

    if (!userId || !activeGenerationId) {
      setError('Envie a foto e gere o Pix antes de verificar.');
      return;
    }

    // Sincroniza estado se veio só do pending
    if (!generationId && open) {
      setGenerationId(open.generationId);
      setInputUrl(open.inputUrl);
      setGenerationToken(open.token);
      setTransactionId(open.transactionId);
      setTransactionIds(
        Array.isArray(open.transactionIds)
          ? open.transactionIds
          : open.transactionId
            ? [open.transactionId]
            : [],
      );
      setClientIdentifier(open.clientIdentifier ?? null);
      setPixCode(open.pixCode);
      setPixImage(open.pixImage);
      setKieTaskId(open.kieTaskId);
      if (open.previewDataUri) {
        setPreviewDataUri(open.previewDataUri);
        setLocalUri(open.previewDataUri);
      }
    }

    setBusy(true);
    setError(null);
    setStatusText('Verificando seu pagamento…');
    try {
      if (activeKie) {
        await startPolling({ kieTaskId: activeKie });
        return;
      }

      const payment = await confirmFotoJesusPayment({
        generationId: activeGenerationId,
        userId,
        inputUrl: activeInputUrl,
        token: activeToken,
        transactionId: activeTx,
        transactionIds: activeTxIds,
        clientIdentifier: activeIdentifier,
      });

      if (!payment) {
        setError(
          'Não foi possível verificar agora. Confira a conexão e tente de novo.',
        );
        setStep('paying');
        return;
      }

      if (
        payment.paymentCheck?.paid ||
        payment.status === 'paid' ||
        payment.status === 'generating' ||
        payment.status === 'success' ||
        payment.kieTaskId
      ) {
        if (payment.kieTaskId) {
          setKieTaskId(payment.kieTaskId);
          patchPending({ kieTaskId: payment.kieTaskId });
        }
        await startPolling({ kieTaskId: payment.kieTaskId });
        return;
      }

      const wiven = payment.paymentCheck?.wivenStatus;
      setStep('paying');
      if (payment.paymentCheck?.error === 'transactionId_ausente') {
        setStatusText(
          'Abra o Pix desta foto e pague. Depois toque em Verificar pagamento.',
        );
      } else if (wiven && String(wiven).toUpperCase() === 'PENDING') {
        setStatusText(
          activeTxIds.length > 1
            ? 'Ainda não achamos um Pix pago nesta foto. Se pagou agora, aguarde ~30s e verifique de novo — sem gerar outro código.'
            : 'O banco ainda mostra Pix pendente. Se já pagou, aguarde ~30s e verifique de novo — sem gerar outro Pix.',
        );
      } else {
        setStatusText(
          'Pagamento ainda não confirmado. Use o mesmo Pix desta foto (não gere outro).',
        );
      }
    } finally {
      setBusy(false);
    }
  }, [
    clientIdentifier,
    generationId,
    generationToken,
    inputUrl,
    kieTaskId,
    patchPending,
    startPolling,
    transactionId,
    transactionIds,
    userId,
  ]);

  const handleDownload = useCallback(async () => {
    if (!resultUrl) return;
    setBusy(true);
    setActionMessage(null);
    setError(null);
    try {
      await downloadFotoJesusImage(resultUrl);
      setActionMessage('Download iniciado.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível baixar a imagem.',
      );
    } finally {
      setBusy(false);
    }
  }, [resultUrl]);

  const handleIndicate = useCallback(async () => {
    setActionMessage(null);
    try {
      await shareFotoJesusInvite();
      setActionMessage('Convite pronto para enviar.');
      void trackAnalytics({
        name: 'foto_jesus_success',
        meta: { action: 'indicate_friend' },
      });
    } catch {
      setError('Não foi possível abrir o compartilhamento.');
    }
  }, []);

  const startNewGeneration = useCallback(() => {
    setStep('pick');
    setLocalUri(null);
    setPreviewDataUri(null);
    setImageBase64(null);
    setGenerationId(null);
    setInputUrl(null);
    setGenerationToken(null);
    setTransactionId(null);
    setPixCode(null);
    setPixImage(null);
    setKieTaskId(null);
    setResultUrl(null);
    setError(null);
    setActionMessage(null);
    setStatusText(null);
    clearPending();
    // Mantém lastResult no storage, mas a UI não mostra até concluir a nova
    resumeRef.current = true;
  }, [clearPending]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.sideBtn}
        >
          <Text style={styles.back}>Voltar</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Foto com Jesus</Text>
        <View style={styles.sideBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>{tool?.title ?? 'Foto com Jesus'}</Text>
        <Text style={styles.body}>
          {hasSavedImage
            ? 'Sua foto está salva neste aparelho. Baixe quando quiser ou gere uma nova.'
            : (tool?.benefit ??
              'Envie sua foto. Após o pagamento, geramos uma imagem artística ao seu lado de Jesus.')}
        </Text>
        {!hasSavedImage ? (
          <Text style={styles.price}>
            {TOOL_FOTO_JESUS_PRICE_LABEL} por imagem gerada
          </Text>
        ) : null}

        <View style={styles.preview}>
          <Image
            source={previewSource}
            style={styles.previewImage}
            contentFit="cover"
            transition={160}
            accessibilityLabel={
              showExample
                ? 'Exemplo de foto com Jesus'
                : hasSavedImage
                  ? 'Sua foto com Jesus'
                  : 'Prévia da sua foto'
            }
          />
          {showExample ? (
            <View style={styles.exampleBadge}>
              <Text style={styles.exampleBadgeText}>Exemplo</Text>
            </View>
          ) : null}
          {!showExample && !displayImage ? (
            <View style={styles.previewEmpty}>
              <Text style={styles.previewEmptyText}>
                Sua foto aparece aqui depois de escolher na galeria
              </Text>
            </View>
          ) : null}
        </View>

        {statusText ? <Text style={styles.status}>{statusText}</Text> : null}
        {actionMessage ? (
          <Text style={styles.status}>{actionMessage}</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {hasSavedImage ? (
          <>
            <View style={styles.actionsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Baixar imagem"
                disabled={busy}
                onPress={() => void handleDownload()}
                style={({ pressed }) => [
                  styles.cta,
                  styles.actionHalf,
                  pressed && styles.pressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.ctaText}>Baixar</Text>
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Indicar para uma amiga"
                onPress={() => void handleIndicate()}
                style={({ pressed }) => [
                  styles.cta,
                  styles.ctaSecondary,
                  styles.actionHalf,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.ctaTextSecondary}>Indicar amiga</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={startNewGeneration}
              style={({ pressed }) => [
                styles.cta,
                styles.ctaSecondary,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.ctaTextSecondary}>
                Gerar outra · {TOOL_FOTO_JESUS_PRICE_LABEL}
              </Text>
            </Pressable>
          </>
        ) : null}

        {!hasSavedImage &&
        (step === 'pick' || step === 'ready' || step === 'error') ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escolher foto"
            disabled={busy}
            onPress={() => void pickPhoto()}
            style={({ pressed }) => [
              styles.cta,
              styles.ctaSecondary,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.ctaTextSecondary}>
              {localUri ? 'Trocar foto' : 'Escolher foto da galeria'}
            </Text>
          </Pressable>
        ) : null}

        {step === 'ready' && !pending?.transactionId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Pagar ${TOOL_FOTO_JESUS_PRICE_LABEL} e gerar`}
            disabled={busy}
            onPress={() => void uploadAndPay()}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            {busy ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.ctaText}>
                Continuar · {TOOL_FOTO_JESUS_PRICE_LABEL}
              </Text>
            )}
          </Pressable>
        ) : null}

        {step === 'paying' || (step === 'ready' && pending?.transactionId) ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir pagamento Pix"
              disabled={busy}
              onPress={() => {
                setStep('paying');
                setPaywallVisible(true);
              }}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Text style={styles.ctaText}>
                {pixCode ? 'Ver código Pix' : 'Abrir pagamento Pix'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy || !generationId}
              onPress={() => void checkStatus()}
              style={({ pressed }) => [
                styles.cta,
                styles.ctaSecondary,
                pressed && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.ctaTextSecondary}>Verificar pagamento</Text>
              )}
            </Pressable>
            <Text style={styles.tip}>
              Se já pagou, toque só em “Verificar pagamento”. Gerar outro Pix
              cria um código novo e o pagamento anterior não libera a foto.
            </Text>
          </>
        ) : null}

        {step === 'generating' ? (
          <>
            <ActivityIndicator color={colors.accent} />
            {generationId ? (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={() => void checkStatus()}
                style={({ pressed }) => [
                  styles.cta,
                  styles.ctaSecondary,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.ctaTextSecondary}>Verificar status</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        <Text style={styles.tip}>
          Use uma foto clara do rosto, de frente e com boa luz. Depois do Pix,
          toque em “Já paguei” ou “Verificar pagamento” para liberar a imagem.
        </Text>
      </ScrollView>

      <ToolPaywall
        visible={paywallVisible}
        toolId="foto-jesus"
        consumable
        generationId={generationId}
        inputUrl={inputUrl}
        generationToken={generationToken}
        initialPixCode={pixCode}
        initialPixImage={pixImage}
        initialTransactionId={transactionId}
        initialTransactionIds={transactionIds}
        initialClientIdentifier={clientIdentifier}
        onPixReady={(info) => {
          setTransactionId(info.transactionId);
          setTransactionIds(info.transactionIds);
          setClientIdentifier(info.clientIdentifier);
          setPixCode(info.pixCode);
          setPixImage(info.pixImage);
          if (generationId && inputUrl && generationToken) {
            savePending({
              generationId,
              inputUrl,
              token: generationToken,
              transactionId: info.transactionId,
              transactionIds: info.transactionIds,
              clientIdentifier: info.clientIdentifier,
              checkoutId: info.checkoutId,
              pixCode: info.pixCode,
              pixImage: info.pixImage,
              previewDataUri:
                previewDataUri ||
                (imageBase64
                  ? `data:${mimeType};base64,${imageBase64}`
                  : null),
              kieTaskId: kieTaskId,
              createdAt: new Date().toISOString(),
            });
          }
          setStep('paying');
          setStatusText(
            'Pix gerado. Pague no banco e toque em “Já paguei” ou “Verificar pagamento”.',
          );
        }}
        onClose={() => {
          setPaywallVisible(false);
          if (step === 'paying' || pixCode) {
            setStep('paying');
            setStatusText(
              pixCode
                ? 'Pix em aberto. Toque em “Abrir Pix” ou “Verificar pagamento”.'
                : 'Continue o pagamento para gerar sua imagem.',
            );
          }
        }}
        onUnlocked={(meta) => {
          void startPolling(meta);
        }}
      />
    </SafeAreaView>
  );
}
