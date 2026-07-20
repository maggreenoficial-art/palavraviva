import { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmergencyHelp } from '../src/components/EmergencyHelp';
import {
  sosAnxietySessions,
  sosSession,
} from '../src/constants/sessions';
import { colors, MIN_TAP, radius, spacing, typography } from '../src/theme';

function formatMinutes(seconds: number) {
  return Math.max(1, Math.round(seconds / 60));
}

export default function SosScreen() {
  const quickMinutes = formatMinutes(sosSession.durationSeconds);

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
        <Text style={styles.headerTitle}>SOS — Alívio Imediato</Text>
        <View style={styles.sideBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>Você está aqui.</Text>
        <Text style={styles.body}>
          Respire. Escolha um alívio rápido ou siga a sequência Paz na Ansiedade
          — sete áudios com Palavra, prática e oração. Tudo gratuito.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Alívio rápido, cerca de ${quickMinutes} minutos`}
          onPress={() => router.push(`/player/${sosSession.id}?from=sos`)}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>
            Alívio rápido · {quickMinutes} min
          </Text>
          <Text style={styles.primarySub}>Respirar, orar e acolher agora</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Paz na Ansiedade</Text>
        <Text style={styles.sectionLead}>
          Sequência de 7 áudios · ~4 a 5 minutos cada · sons ambiente suaves
        </Text>

        {sosAnxietySessions.map((session) => {
          const minutes = formatMinutes(session.durationSeconds);
          return (
            <Pressable
              key={session.id}
              accessibilityRole="button"
              accessibilityLabel={`${session.subtitle}. ${session.title}. Cerca de ${minutes} minutos`}
              onPress={() => router.push(`/player/${session.id}?from=sos`)}
              style={({ pressed }) => [
                styles.episode,
                pressed && styles.pressed,
              ]}
            >
              {session.coverImage ? (
                <Image
                  source={session.coverImage}
                  style={styles.episodeCover}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={100}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View
                  style={[
                    styles.episodeCover,
                    { backgroundColor: session.coverColor },
                  ]}
                />
              )}
              <View style={styles.episodeBody}>
                <Text style={styles.episodeKicker}>{session.subtitle}</Text>
                <Text style={styles.episodeTitle}>{session.title}</Text>
                <Text style={styles.episodeMeta}>{minutes} min · Grátis</Text>
              </View>
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gerar Foto com Jesus por cinco reais"
          onPress={() => router.push('/(tabs)/ferramentas')}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>
            Gerar Foto com Jesus · R$ 5,00
          </Text>
        </Pressable>

        <EmergencyHelp />

        <Text style={styles.disclaimer}>
          Este aplicativo oferece apoio espiritual e não substitui acompanhamento
          médico ou psicológico.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    ...typography.bodyMedium,
    color: colors.accent,
  },
  headerTitle: {
    ...typography.bodyMedium,
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
    ...typography.title,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  primary: {
    minHeight: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.sos,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  primaryText: {
    ...typography.button,
    color: colors.white,
  },
  primarySub: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
  },
  sectionTitle: {
    ...typography.section,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  sectionLead: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  episode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TAP,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    overflow: 'hidden',
    paddingRight: spacing.md,
  },
  episodeCover: {
    width: 72,
    height: 72,
  },
  episodeBody: {
    flex: 1,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  episodeKicker: {
    ...typography.caption,
    color: colors.sos,
    fontFamily: 'DMSans_600SemiBold',
  },
  episodeTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  episodeMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  secondary: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  secondaryText: {
    ...typography.bodyMedium,
    color: colors.accent,
    textAlign: 'center',
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.9,
  },
});
