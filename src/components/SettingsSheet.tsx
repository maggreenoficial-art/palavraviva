import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { clearSensitiveLocalData } from '../store/usePrivacyActions';
import {
  SUBSCRIPTION_PRICE_LABEL,
  computeAccessKind,
  computeTrialRemainingMs,
  useUserStore,
  type FontScale,
} from '../store/useUserStore';
import { MIN_TAP, colors, radius, spacing, useTypography } from '../theme';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  onChangeFeeling: () => void;
  onOpenSubscription?: () => void;
  onOpenHelp?: () => void;
}

const FONT_OPTIONS: { id: FontScale; label: string }[] = [
  { id: 'padrao', label: 'Padrão' },
  { id: 'medio', label: 'Médio' },
  { id: 'grande', label: 'Grande' },
];

export function SettingsSheet({
  visible,
  onClose,
  onChangeFeeling,
  onOpenSubscription,
  onOpenHelp,
}: SettingsSheetProps) {
  const type = useTypography();
  const displayName = useUserStore((s) => s.displayName);
  const userId = useUserStore((s) => s.userId);
  const fontScale = useUserStore((s) => s.fontScale);
  const setFontScale = useUserStore((s) => s.setFontScale);
  const trialStartedAt = useUserStore((s) => s.trialStartedAt);
  const subscriptionExpiresAt = useUserStore((s) => s.subscriptionExpiresAt);
  const accessKind = computeAccessKind(trialStartedAt, subscriptionExpiresAt);
  const trialRemainingMs = computeTrialRemainingMs(trialStartedAt);
  const [localScale, setLocalScale] = useState<FontScale>(fontScale);

  useEffect(() => {
    if (visible) setLocalScale(fontScale);
  }, [visible, fontScale]);

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          ...type.title,
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
          ...type.bodyMedium,
          color: colors.textPrimary,
        },
        profileMeta: {
          ...type.caption,
          color: colors.accent,
        },
        profileId: {
          ...type.caption,
          color: colors.textMuted,
        },
        sectionLabel: {
          ...type.caption,
          color: colors.textMuted,
          fontFamily: 'DMSans_600SemiBold',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
        },
        scaleRow: {
          flexDirection: 'row',
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        scaleBtn: {
          flex: 1,
          minHeight: MIN_TAP,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.backgroundSoft,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.sm,
        },
        scaleBtnActive: {
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
        },
        scaleBtnText: {
          ...type.caption,
          color: colors.textSecondary,
          fontFamily: 'DMSans_600SemiBold',
        },
        scaleBtnTextActive: {
          color: colors.accent,
        },
        row: {
          minHeight: 52,
          justifyContent: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        rowText: {
          ...type.bodyMedium,
          color: colors.textPrimary,
        },
        disclaimer: {
          ...type.caption,
          color: colors.textSecondary,
          marginTop: spacing.lg,
          lineHeight: type.caption.lineHeight ?? 22,
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
        pressed: {
          opacity: 0.85,
        },
      }),
    [type],
  );

  function handleClear() {
    Alert.alert(
      'Apagar dados sensíveis?',
      'Remove o sentimento salvo, check-ins e as entradas do diário neste aparelho.',
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

  function selectScale(scale: FontScale) {
    setLocalScale(scale);
    setFontScale(scale);
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

          <Text style={styles.sectionLabel}>Tamanho do texto</Text>
          <View style={styles.scaleRow}>
            {FONT_OPTIONS.map((option) => {
              const active = localScale === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Tamanho do texto ${option.label}`}
                  onPress={() => selectScale(option.id)}
                  style={({ pressed }) => [
                    styles.scaleBtn,
                    active && styles.scaleBtnActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.scaleBtnText,
                      active && styles.scaleBtnTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Alterar como estou me sentindo"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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

          {onOpenHelp ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ajuda e perguntas frequentes"
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => {
                onClose();
                onOpenHelp();
              }}
            >
              <Text style={styles.rowText}>Ajuda e perguntas frequentes</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apagar dados sensíveis locais"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={handleClear}
          >
            <Text style={styles.rowText}>
              Privacidade · Apagar dados sensíveis
            </Text>
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
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>Fechar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
