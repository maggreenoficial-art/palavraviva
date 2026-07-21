import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeelingPickerModal } from '../../src/components/FeelingPickerModal';
import { HelpFaqSheet } from '../../src/components/HelpFaqSheet';
import { SettingsSheet } from '../../src/components/SettingsSheet';
import { SubscriptionPaywall } from '../../src/components/SubscriptionPaywall';
import { trackMissaoInitiateCheckout } from '../../src/services/metaPixel';
import {
  SUBSCRIPTION_PRICE_LABEL,
  computeAccessKind,
  useUserStore,
} from '../../src/store/useUserStore';
import {
  MIN_TAP,
  TAB_BAR_OFFSET,
  colors,
  radius,
  spacing,
  useTypography,
} from '../../src/theme';
import { firstNameFrom } from '../../src/utils/userId';

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function PerfilScreen() {
  const type = useTypography();
  const displayName = useUserStore((s) => s.displayName);
  const userId = useUserStore((s) => s.userId);
  const feeling = useUserStore((s) => s.feeling);
  const setFeeling = useUserStore((s) => s.setFeeling);
  const trialStartedAt = useUserStore((s) => s.trialStartedAt);
  const subscriptionExpiresAt = useUserStore((s) => s.subscriptionExpiresAt);
  const accessKind = computeAccessKind(trialStartedAt, subscriptionExpiresAt);
  const isSubscribed = accessKind === 'subscribed';
  const firstName = firstNameFrom(displayName ?? '');
  const daysLeft = daysUntil(subscriptionExpiresAt);

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [feelingVisible, setFeelingVisible] = useState(false);

  function openMissaoPaywall() {
    trackMissaoInitiateCheckout();
    setPaywallVisible(true);
  }

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scroll: {
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.lg,
          paddingBottom: TAB_BAR_OFFSET + spacing.xxl,
          gap: spacing.lg,
        },
        kicker: {
          ...type.caption,
          color: colors.accent,
          fontFamily: 'DMSans_700Bold',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        },
        title: {
          ...type.title,
          color: colors.textPrimary,
        },
        body: {
          ...type.body,
          color: colors.textSecondary,
          lineHeight: Math.round(type.body.fontSize * 1.45),
        },
        card: {
          backgroundColor: colors.backgroundElevated,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        cardAccent: {
          borderColor: colors.accentMuted,
          backgroundColor: colors.accentSoft,
        },
        statusLabel: {
          ...type.caption,
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        statusValue: {
          ...type.section,
          color: colors.textPrimary,
        },
        statusMeta: {
          ...type.body,
          color: colors.textSecondary,
        },
        benefit: {
          ...type.body,
          color: colors.textPrimary,
          lineHeight: Math.round(type.body.fontSize * 1.4),
        },
        cta: {
          backgroundColor: colors.accent,
          borderRadius: radius.md,
          minHeight: 54,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: spacing.sm,
        },
        ctaSecondary: {
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.accent,
        },
        ctaText: {
          ...type.button,
          color: colors.onAccent,
        },
        ctaSecondaryText: {
          color: colors.accent,
        },
        linkBtn: {
          minHeight: MIN_TAP,
          justifyContent: 'center',
        },
        linkText: {
          ...type.bodyMedium,
          color: colors.textSecondary,
        },
        idBox: {
          ...type.caption,
          color: colors.textMuted,
          fontFamily: 'DMSans_500Medium',
        },
        pressed: {
          opacity: 0.9,
        },
      }),
    [type],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.kicker}>Meu perfil</Text>
          <Text style={styles.title}>
            {firstName ? `Olá, ${firstName}` : 'Sua conta'}
          </Text>
          <Text style={styles.body}>
            Veja o status da Missão+ e gerencie sua experiência no app.
          </Text>
        </View>

        <View style={[styles.card, isSubscribed && styles.cardAccent]}>
          <Text style={styles.statusLabel}>Assinatura</Text>
          <Text style={styles.statusValue}>
            {isSubscribed ? 'Missão+ ativo' : 'Plano gratuito'}
          </Text>
          {isSubscribed && subscriptionExpiresAt ? (
            <Text style={styles.statusMeta}>
              Válida até{' '}
              {new Date(subscriptionExpiresAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              {daysLeft != null ? ` · ${daysLeft} dia${daysLeft === 1 ? '' : 's'} restantes` : ''}
            </Text>
          ) : (
            <Text style={styles.statusMeta}>
              SOS, Bíblia e vários áudios continuam livres. A Missão+ libera
              todos os áudios premium por {SUBSCRIPTION_PRICE_LABEL}/mês.
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isSubscribed
                ? 'Ver detalhes da Missão+'
                : `Assinar Missão+ por ${SUBSCRIPTION_PRICE_LABEL}`
            }
            onPress={openMissaoPaywall}
            style={({ pressed }) => [
              styles.cta,
              isSubscribed && styles.ctaSecondary,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.ctaText,
                isSubscribed && styles.ctaSecondaryText,
              ]}
            >
              {isSubscribed
                ? 'Você já é Missão+'
                : `Assinar Missão+ · ${SUBSCRIPTION_PRICE_LABEL}`}
            </Text>
          </Pressable>
        </View>

        {isSubscribed ? (
          <View style={styles.card}>
            <Text style={styles.statusLabel}>Seus benefícios</Text>
            <Text style={styles.benefit}>· Todos os áudios e séries premium</Text>
            <Text style={styles.benefit}>· Jornada de 7 dias completa</Text>
            <Text style={styles.benefit}>· Novos conteúdos sem bloqueio</Text>
            <Text style={styles.benefit}>
              · SOS e Bíblia continuam disponíveis
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.statusLabel}>Preferências</Text>
          <Text style={styles.statusMeta}>
            Como você se sente agora:{' '}
            {feeling === 'ansioso'
              ? 'Ansioso(a)'
              : feeling === 'sobrecarregado'
                ? 'Sobrecarregado(a)'
                : feeling === 'triste'
                  ? 'Triste'
                  : 'Não definido'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFeelingVisible(true)}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Alterar sentimento</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setSettingsVisible(true)}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Configurações e acessibilidade</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setHelpVisible(true)}
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Ajuda e perguntas frequentes</Text>
          </Pressable>
        </View>

        {userId ? (
          <Text style={styles.idBox}>ID da conta: {userId}</Text>
        ) : null}
      </ScrollView>

      <SubscriptionPaywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
      <FeelingPickerModal
        visible={feelingVisible}
        onClose={() => setFeelingVisible(false)}
        onSelect={setFeeling}
      />
      <SettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onChangeFeeling={() => setFeelingVisible(true)}
        onOpenSubscription={openMissaoPaywall}
        onOpenHelp={() => setHelpVisible(true)}
      />
      <HelpFaqSheet
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />
    </SafeAreaView>
  );
}
