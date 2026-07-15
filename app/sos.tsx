import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BiblicalPassage } from '../src/components/BiblicalPassage';
import { EmergencyHelp } from '../src/components/EmergencyHelp';
import { sosSession } from '../src/constants/sessions';
import { getBiblicalTextById } from '../src/services/biblicalContent';
import { colors, radius, spacing, typography } from '../src/theme';

export default function SosScreen() {
  const passage = useMemo(
    () =>
      sosSession.biblicalPrayerId
        ? getBiblicalTextById(sosSession.biblicalPrayerId)
        : null,
    [],
  );
  const minutes = Math.round(sosSession.durationSeconds / 60);

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
        <Text style={styles.headerTitle}>SOS — Paz imediata</Text>
        <View style={styles.sideBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>Você está aqui.</Text>
        <Text style={styles.body}>
          Vamos passar pelos próximos minutos juntos. Respire. Não há pressa.
        </Text>

        <View style={styles.breathBox} accessibilityLabel="Respiração guiada">
          <View style={styles.breathCircle} />
          <Text style={styles.breathHint}>Inspire</Text>
          <Text style={styles.breathHintSoft}>Solte devagar</Text>
        </View>

        {passage ? (
          <BiblicalPassage passage={passage} compact />
        ) : (
          <Text style={styles.fallback}>
            A passagem bíblica desta sessão está temporariamente indisponível.
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Iniciar sessão SOS, cerca de ${minutes} minutos`}
          onPress={() => router.push(`/player/${sosSession.id}?from=sos`)}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>
            Iniciar sessão de {minutes} minutos
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
    minHeight: 44,
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
  breathBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  breathCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.sos,
    backgroundColor: colors.sosSoft,
    marginBottom: spacing.sm,
  },
  breathHint: {
    ...typography.section,
    color: colors.textPrimary,
  },
  breathHintSoft: {
    ...typography.body,
    color: colors.textSecondary,
  },
  primary: {
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryText: {
    ...typography.button,
    color: colors.background,
  },
  fallback: {
    ...typography.caption,
    color: colors.textMuted,
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
