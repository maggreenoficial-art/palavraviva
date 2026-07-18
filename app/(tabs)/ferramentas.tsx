import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  toolsCatalog,
  type ToolCatalogItem,
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
  const [soonTool, setSoonTool] = useState<ToolCatalogItem | null>(null);

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
          borderColor: colors.border,
          backgroundColor: colors.backgroundElevated,
          padding: spacing.lg,
          marginBottom: spacing.md,
          minHeight: MIN_TAP,
          gap: spacing.sm,
        },
        cardLive: {
          borderColor: colors.accentMuted,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        },
        title: {
          ...type.section,
          color: colors.textPrimary,
          flex: 1,
        },
        badge: {
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 4,
          backgroundColor: colors.accentSoft,
          minHeight: 28,
          justifyContent: 'center',
        },
        badgeSoon: {
          backgroundColor: colors.backgroundSoft,
        },
        badgeText: {
          ...type.caption,
          color: colors.accent,
          fontFamily: 'DMSans_600SemiBold',
          fontSize: Math.max(12, type.caption.fontSize - 1),
        },
        badgeTextSoon: {
          color: colors.textMuted,
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
        sheetTitle: {
          ...type.title,
          color: colors.textPrimary,
          marginBottom: spacing.sm,
        },
        sheetBody: {
          ...type.body,
          color: colors.textSecondary,
          marginBottom: spacing.md,
        },
        sheetPrice: {
          ...type.section,
          color: colors.accent,
          marginBottom: spacing.lg,
        },
        close: {
          minHeight: MIN_TAP,
          alignItems: 'center',
          justifyContent: 'center',
        },
        closeText: {
          ...type.bodyMedium,
          color: colors.textMuted,
        },
      }),
    [type],
  );

  function openTool(tool: ToolCatalogItem) {
    if (tool.status === 'live' && tool.href) {
      router.push(tool.href as '/diario');
      return;
    }
    setSoonTool(tool);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Ferramentas</Text>
        <Text style={styles.support}>
          Recursos práticos para viver a Palavra no dia a dia. O Diário de
          Gratidão já está disponível; as demais chegam em breve.
        </Text>

        {toolsCatalog.map((tool) => {
          const live = tool.status === 'live';
          return (
            <Pressable
              key={tool.id}
              accessibilityRole="button"
              accessibilityLabel={`${tool.title}. ${live ? 'Abrir' : 'Em breve'}. ${tool.priceLabel}`}
              onPress={() => openTool(tool)}
              style={({ pressed }) => [
                styles.card,
                live && styles.cardLive,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.titleRow}>
                <Text style={styles.title}>{tool.title}</Text>
                <View style={[styles.badge, !live && styles.badgeSoon]}>
                  <Text
                    style={[styles.badgeText, !live && styles.badgeTextSoon]}
                  >
                    {live ? 'Disponível' : 'Em breve'}
                  </Text>
                </View>
              </View>
              <Text style={styles.benefit}>{tool.benefit}</Text>
              <Text style={styles.price}>
                {live
                  ? `Compra única · ${tool.priceLabel}`
                  : `Preço previsto · ${tool.priceLabel}`}
              </Text>
              <Text style={styles.ctaHint}>
                {live ? 'Abrir diário →' : 'Saiba mais →'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={Boolean(soonTool)}
        transparent
        animationType="slide"
        onRequestClose={() => setSoonTool(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSoonTool(null)}>
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{soonTool?.title}</Text>
            <Text style={styles.sheetBody}>
              {soonTool?.benefit} Esta ferramenta estará disponível em breve
              como compra única ou no plano completo.
            </Text>
            <Text style={styles.sheetPrice}>
              Preço previsto · {soonTool?.priceLabel}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSoonTool(null)}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
