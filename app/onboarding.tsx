import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BrandMark } from '../src/components/BrandMark';
import { FeelingButton } from '../src/components/FeelingButton';
import { useUserStore } from '../src/store/useUserStore';
import { colors, spacing, typography } from '../src/theme';
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
  const setFeeling = useUserStore((state) => state.setFeeling);

  function handleSelect(feeling: Feeling) {
    setFeeling(feeling);
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.atmosphere} />
      <View style={styles.container}>
        <View style={styles.brandWrap}>
          <BrandMark variant="logo" size={68} />
        </View>
        <Text style={styles.tagline}>A Palavra de Cristo, viva em você</Text>
        <Text style={styles.question}>Como você está se sentindo agora?</Text>
        <Text style={styles.support}>
          Sem cadastro. Escolha o que pesa no coração e receba oração, versículos
          e a paz que vem da Palavra.
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
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
    maxWidth: 340,
  },
  actions: {
    gap: spacing.md,
  },
});
