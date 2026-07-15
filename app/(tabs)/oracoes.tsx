import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  prayerThemes,
  type BiblicalPrayerMeta,
  type PrayerTheme,
} from '../../src/constants/biblicalPrayers';
import { listValidBiblicalPrayers } from '../../src/services/biblicalContent';
import { useFavoritesStore } from '../../src/store/useFavoritesStore';
import {
  TAB_BAR_OFFSET,
  colors,
  radius,
  spacing,
  typography,
} from '../../src/theme';

type FilterId = PrayerTheme | 'todas' | 'favoritos' | 'mais';

const primaryFilters: Array<{ id: FilterId; label: string }> = [
  { id: 'favoritos', label: 'Favoritos' },
  { id: 'todas', label: 'Todas' },
  { id: 'ansiedade', label: 'Ansiedade' },
  { id: 'protecao', label: 'Proteção' },
  { id: 'mais', label: 'Mais' },
];

const moreThemes = prayerThemes.filter(
  (item) => !['todas', 'ansiedade', 'protecao'].includes(item.id),
);

export default function OracoesScreen() {
  const [theme, setTheme] = useState<FilterId>('todas');
  const [query, setQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const favorites = useFavoritesStore((s) => s.items);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const validPrayers = useMemo(() => listValidBiblicalPrayers(), []);

  const activeTheme: FilterId =
    theme === 'mais' ? 'todas' : theme;

  const filtered = useMemo(() => {
    let list = validPrayers;

    if (activeTheme === 'favoritos') {
      const favoriteIds = new Set(
        favorites.filter((item) => item.kind === 'prayer').map((item) => item.id),
      );
      list = validPrayers.filter((prayer) => favoriteIds.has(prayer.id));
    } else if (activeTheme !== 'todas') {
      list = validPrayers.filter((prayer) => prayer.theme === activeTheme);
    }

    const q = query.trim().toLowerCase();
    if (!q) return list;

    return list.filter((prayer) => {
      const haystack = [
        prayer.title,
        prayer.referenceLabel,
        prayer.themeLabel,
        prayer.theme,
        prayer.apiPassage,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [activeTheme, validPrayers, favorites, query]);

  function selectFilter(id: FilterId) {
    if (id === 'mais') {
      setShowMore((value) => !value);
      return;
    }
    setShowMore(false);
    setTheme(id);
  }

  function renderItem({ item }: { item: BiblicalPrayerMeta }) {
    const favorite = isFavorite('prayer', item.id);
    return (
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
          onPress={() => router.push(`/oracao/${item.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`${item.title}. ${item.referenceLabel}. Texto bíblico.`}
        >
          <Text style={styles.theme}>{item.themeLabel}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.reference}>{item.referenceLabel}</Text>
          <Text style={styles.badge}>Texto bíblico</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'
          }
          hitSlop={10}
          onPress={() => toggleFavorite('prayer', item.id)}
          style={styles.favHit}
        >
          <Text style={styles.fav}>{favorite ? '★' : '☆'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading} accessibilityRole="header">
          Orações
        </Text>
        <Text style={styles.support}>
          Passagens bíblicas verificadas
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar passagem ou tema"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Buscar passagem ou tema"
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />

        <View style={styles.filtersWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filters}
          >
            {primaryFilters.map((item) => {
              const active =
                item.id === 'mais'
                  ? showMore
                  : theme === item.id && !showMore;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => selectFilter(item.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View pointerEvents="none" style={styles.filtersFade} />
        </View>

        {showMore ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
          >
            {moreThemes.map((item) => {
              const active = theme === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setTheme(item.id);
                    setShowMore(false);
                  }}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Nenhuma passagem encontrada. Tente outro termo ou filtro.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  heading: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  support: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  search: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
  },
  filtersWrap: {
    position: 'relative',
    marginHorizontal: -spacing.screen,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filters: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.sm,
    alignItems: 'center',
    paddingRight: spacing.section,
  },
  filtersFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: spacing.sm,
    width: 20,
    backgroundColor: colors.background,
    opacity: 0.72,
  },
  chip: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginRight: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentMuted,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accent,
    fontFamily: 'DMSans_600SemiBold',
  },
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: TAB_BAR_OFFSET + spacing.lg,
  },
  row: {
    minHeight: 112,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowMain: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 96,
  },
  favHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  fav: {
    fontSize: 20,
    color: colors.accent,
  },
  pressed: {
    opacity: 0.9,
  },
  theme: {
    ...typography.caption,
    color: colors.accentMuted,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginTop: 2,
  },
  reference: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  badge: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
