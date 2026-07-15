import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { BiblicalPassage } from '../../src/components/BiblicalPassage';
import {
  getBiblicalTextById,
  listValidBiblicalPrayers,
} from '../../src/services/biblicalContent';
import { useFavoritesStore } from '../../src/store/useFavoritesStore';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function OracaoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const passage = useMemo(
    () => (id ? getBiblicalTextById(id) : null),
    [id],
  );
  const isFavorite = useFavoritesStore((s) => s.isFavorite('prayer', id ?? ''));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const related = useMemo(() => {
    if (!passage) return [];
    return listValidBiblicalPrayers()
      .filter(
        (item) =>
          item.id !== passage.id && item.themeLabel === passage.themeLabel,
      )
      .slice(0, 3);
  }, [passage]);

  if (!passage) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.error}>
            Texto bíblico não encontrado no dataset. Nenhum conteúdo foi
            inventado.
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()}>
            <Text style={styles.back}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  async function shareReference() {
    await Share.share({
      message: `${passage!.reference}\n\n(Somente a referência foi compartilhada.)`,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Text style={styles.back}>Voltar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
          }
          onPress={() => toggleFavorite('prayer', passage.id)}
          hitSlop={12}
        >
          <Text style={styles.fav}>
            {isFavorite ? '★ Favoritado' : '☆ Favoritar'}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.theme}>{passage.themeLabel}</Text>
        <Text style={styles.title}>{passage.title}</Text>
        <BiblicalPassage passage={passage} />

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartilhar referência"
            onPress={() => void shareReference()}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>Compartilhar referência</Text>
          </Pressable>
        </View>

        {related.length > 0 ? (
          <View style={styles.related}>
            <Text style={styles.relatedTitle}>
              Outras passagens sobre {passage.themeLabel.toLowerCase()}
            </Text>
            {related.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.referenceLabel}
                onPress={() => router.push(`/oracao/${item.id}`)}
                style={styles.relatedLink}
              >
                <Text style={styles.relatedText}>
                  · {item.referenceLabel}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  back: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  fav: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  theme: {
    ...typography.caption,
    color: colors.accentMuted,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...typography.bodyMedium,
    color: colors.cyan,
  },
  related: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  relatedTitle: {
    ...typography.section,
    color: colors.textPrimary,
    fontSize: 16,
  },
  relatedLink: {
    minHeight: 40,
    justifyContent: 'center',
  },
  relatedText: {
    ...typography.body,
    color: colors.cyan,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  error: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
