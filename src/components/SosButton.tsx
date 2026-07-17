import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

const sosCover = require('../../assets/thumbnails/sos-paz.jpg');
const COVER_HEIGHT = 132;

interface SosButtonProps {
  onPress: () => void;
}

export function SosButton({ onPress }: SosButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="SOS Alívio Imediato. Começar agora"
      accessibilityHint="Abre apoio espiritual imediato, sem login e sem pagamento"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Image
        source={sosCover}
        style={styles.coverImage}
        contentFit="cover"
        contentPosition="center"
        cachePolicy="memory-disk"
        transition={120}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.body}>
        <Text style={styles.kicker}>Precisa de paz agora?</Text>
        <Text style={styles.title}>SOS — Alívio Imediato</Text>
        <Text style={styles.subtitle}>
          Respiração guiada, oração e Palavra · 3 min
        </Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Começar agora</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(240, 113, 103, 0.4)',
    overflow: 'hidden',
    backgroundColor: colors.backgroundElevated,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  coverImage: {
    width: '100%',
    height: COVER_HEIGHT,
  },
  body: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.backgroundElevated,
  },
  kicker: {
    ...typography.caption,
    color: colors.sos,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.section,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: colors.sos,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  ctaText: {
    ...typography.bodyMedium,
    color: colors.white,
    fontFamily: 'DMSans_600SemiBold',
  },
});
