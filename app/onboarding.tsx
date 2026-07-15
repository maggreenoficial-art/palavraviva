import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BrandMark } from '../src/components/BrandMark';
import { FeelingButton } from '../src/components/FeelingButton';
import { trackAnalytics } from '../src/services/analytics';
import { useUserStore } from '../src/store/useUserStore';
import { colors, radius, spacing, typography } from '../src/theme';
import type { Feeling } from '../src/types';

const feelings: Array<{
  id: Feeling;
  label: string;
  description: string;
}> = [
  {
    id: 'ansioso',
    label: 'Ansioso',
    description: 'Quero acalmar o coração com a Palavra',
  },
  {
    id: 'sobrecarregado',
    label: 'Sobrecarregado',
    description: 'Preciso entregar o peso nas mãos de Deus',
  },
  {
    id: 'triste',
    label: 'Triste',
    description: 'Busco consolo e esperança em Cristo',
  },
];

export default function OnboardingScreen() {
  const displayName = useUserStore((s) => s.displayName);
  const completeProfile = useUserStore((s) => s.completeProfile);
  const setFeeling = useUserStore((s) => s.setFeeling);

  const [step, setStep] = useState<'profile' | 'feeling'>(
    displayName ? 'feeling' : 'profile',
  );
  const [name, setName] = useState(displayName ?? '');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleContinueProfile() {
    const cleaned = name.trim();
    if (cleaned.length < 2) {
      setError('Informe seu nome (mínimo 2 letras).');
      return;
    }
    setError(null);
    completeProfile({ name: cleaned, whatsapp });
    void trackAnalytics({ name: 'signup', path: '/onboarding' });
    setStep('feeling');
  }

  function handleSelect(feeling: Feeling) {
    if (!useUserStore.getState().displayName) {
      setStep('profile');
      return;
    }
    setFeeling(feeling);
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.atmosphere} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.brandWrap}>
            <BrandMark variant="logo" size={68} />
          </View>
          <Text style={styles.tagline}>A Palavra de Cristo, viva em você</Text>

          {step === 'profile' ? (
            <>
              <Text style={styles.question}>Como podemos te chamar?</Text>
              <Text style={styles.support}>
                Seu nome aparece na saudação. WhatsApp é opcional — só para
                métrica e apoio à missão. Você ganha 3 dias (72h) de acesso
                completo.
              </Text>

              <Text style={styles.label}>Nome *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.input}
                accessibilityLabel="Nome"
              />

              <Text style={styles.label}>WhatsApp (opcional)</Text>
              <TextInput
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="DDD + número"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={styles.input}
                accessibilityLabel="WhatsApp opcional"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continuar"
                onPress={handleContinueProfile}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryText}>Continuar</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.question}>
                {displayName
                  ? `${displayName.split(' ')[0]}, como você está se sentindo agora?`
                  : 'Como você está se sentindo agora?'}
              </Text>
              <Text style={styles.support}>
                Escolha o que pesa no coração e receba oração, versículos e a paz
                que vem da Palavra.
              </Text>

              <View style={styles.actions}>
                {feelings.map((feeling) => (
                  <FeelingButton
                    key={feeling.id}
                    label={feeling.label}
                    description={feeling.description}
                    onPress={() => handleSelect(feeling.id)}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  atmosphere: {
    position: 'absolute',
    top: -80,
    left: -40,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(61, 220, 151, 0.08)',
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    justifyContent: 'center',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tagline: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  question: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  support: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    maxWidth: 360,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: 'DMSans_600SemiBold',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    marginBottom: spacing.md,
    minHeight: 52,
  },
  error: {
    ...typography.caption,
    color: colors.sos,
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryText: {
    ...typography.button,
    color: colors.background,
  },
  pressed: {
    opacity: 0.9,
  },
  actions: {
    gap: spacing.md,
  },
});
