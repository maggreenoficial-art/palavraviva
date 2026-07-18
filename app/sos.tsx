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
          Vamos passar pelos próximos minutos juntos. Não há pressa.
        </Text>

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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Aprofunde sua paz no Diário de Gratidão"
          onPress={() => router.push('/diario')}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>
            Aprofunde sua paz no Diário de Gratidão
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
  secondary: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  secondaryText: {
    ...typography.bodyMedium,
    color: colors.accent,
    textAlign: 'center',
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
