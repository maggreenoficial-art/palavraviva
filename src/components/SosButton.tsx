import { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, MIN_TAP, radius, spacing, useTypography } from '../theme';

const sosCover = require('../../assets/thumbnails/sos-paz.jpg');
const COVER_HEIGHT = 132;

interface SosButtonProps {
  onPress: () => void;
}

export function SosButton({ onPress }: SosButtonProps) {
  const type = useTypography();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: 'rgba(240, 113, 103, 0.4)',
          overflow: 'hidden',
          backgroundColor: colors.backgroundElevated,
          minHeight: MIN_TAP,
        },
        pressed: {
          opacity: 0.85,
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
          ...type.caption,
          color: colors.sos,
          fontFamily: 'DMSans_600SemiBold',
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: spacing.sm,
        },
        title: {
          ...type.section,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
        },
        subtitle: {
          ...type.body,
          color: colors.textSecondary,
          marginBottom: spacing.md,
        },
        cta: {
          alignSelf: 'flex-start',
          backgroundColor: colors.sos,
          borderRadius: radius.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          minHeight: MIN_TAP,
          justifyContent: 'center',
        },
        ctaText: {
          ...type.bodyMedium,
          color: colors.white,
          fontFamily: 'DMSans_600SemiBold',
        },
      }),
    [type],
  );

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
        <Text style={styles.subtitle}>7 áudios · Grátis · Começar agora</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Começar agora</Text>
        </View>
      </View>
    </Pressable>
  );
}
