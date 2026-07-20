import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  TOOL_FOTO_JESUS_PRICE_LABEL,
  toolsCatalog,
} from '../../src/constants/toolsCatalog';
import {
  MIN_TAP,
  TAB_BAR_OFFSET,
  colors,
  radius,
  spacing,
  useTypography,
} from '../../src/theme';

export default function FerramentasScreen() {
  const type = useTypography();
  const tool = toolsCatalog[0];

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: {
          flex: 1,
          backgroundColor: colors.background,
        },
        content: {
          paddingHorizontal: spacing.screen,
          paddingTop: spacing.lg,
          paddingBottom: TAB_BAR_OFFSET + spacing.lg,
        },
        heading: {
          ...type.title,
          color: colors.textPrimary,
          marginBottom: spacing.xs,
        },
        support: {
          ...type.body,
          color: colors.textSecondary,
          marginBottom: spacing.xl,
        },
        card: {
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.accentMuted,
          backgroundColor: colors.backgroundElevated,
          padding: spacing.lg,
          minHeight: MIN_TAP,
          gap: spacing.sm,
        },
        title: {
          ...type.section,
          color: colors.textPrimary,
        },
        benefit: {
          ...type.body,
          color: colors.textSecondary,
        },
        price: {
          ...type.bodyMedium,
          color: colors.textPrimary,
          marginTop: spacing.xs,
        },
        ctaHint: {
          ...type.caption,
          color: colors.cyan,
          fontFamily: 'DMSans_600SemiBold',
        },
        pressed: {
          opacity: 0.85,
        },
      }),
    [type],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Ferramentas</Text>
        <Text style={styles.support}>
          Uma ferramenta especial: envie sua foto e receba uma imagem artística
          ao lado de Jesus. Cobrança por imagem gerada.
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${tool.title}. ${tool.priceLabel} por imagem`}
          onPress={() => router.push('/foto-jesus')}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <Text style={styles.title}>{tool.title}</Text>
          <Text style={styles.benefit}>{tool.benefit}</Text>
          <Text style={styles.price}>
            Por imagem · {TOOL_FOTO_JESUS_PRICE_LABEL}
          </Text>
          <Text style={styles.ctaHint}>Enviar foto e gerar →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
