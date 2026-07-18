import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ToolPaywall } from '../src/components/ToolPaywall';
import {
  JOURNAL_FREE_ENTRIES,
  TOOL_DIARIO_PRICE_LABEL,
} from '../src/constants/toolsCatalog';
import { journalPrompts, promptForDate } from '../src/constants/journalPrompts';
import { getRecommendedSessions } from '../src/constants/sessions';
import { canUseTool } from '../src/services/toolAccess';
import {
  entriesInLastDays,
  useJournalStore,
  type JournalMood,
} from '../src/store/useJournalStore';
import {
  computeAccessKind,
  useUserStore,
} from '../src/store/useUserStore';
import {
  MIN_TAP,
  colors,
  radius,
  spacing,
  useTypography,
} from '../src/theme';
import type { Feeling } from '../src/types';

const MOOD_LABELS: Record<JournalMood, string> = {
  1: 'Pesado',
  2: 'Difícil',
  3: 'Neutro',
  4: 'Leve',
  5: 'Grato',
};

function moodToFeeling(mood: JournalMood): Feeling {
  if (mood <= 2) return 'ansioso';
  if (mood === 3) return 'sobrecarregado';
  return 'triste';
}

export default function DiarioScreen() {
  const type = useTypography();
  const prompt = useMemo(() => promptForDate(), []);
  const entries = useJournalStore((s) => s.entries);
  const addEntry = useJournalStore((s) => s.addEntry);
  const unlockedTools = useUserStore((s) => s.unlockedTools);
  const trialStartedAt = useUserStore((s) => s.trialStartedAt);
  const subscriptionExpiresAt = useUserStore((s) => s.subscriptionExpiresAt);
  const accessKind = computeAccessKind(trialStartedAt, subscriptionExpiresAt);
  const unlocked = canUseTool('diario', accessKind, unlockedTools);

  const [mood, setMood] = useState<JournalMood>(3);
  const [gratitude, setGratitude] = useState('');
  const [reflection, setReflection] = useState('');
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [suggestionId, setSuggestionId] = useState<string | null>(null);

  const weekEntries = useMemo(
    () => entriesInLastDays(entries, 7),
    [entries],
  );

  const avgMood = useMemo(() => {
    if (!weekEntries.length) return null;
    const sum = weekEntries.reduce((acc, e) => acc + e.mood, 0);
    return (sum / weekEntries.length).toFixed(1);
  }, [weekEntries]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
          minHeight: MIN_TAP,
          justifyContent: 'center',
        },
        back: {
          ...type.bodyMedium,
          color: colors.accent,
        },
        headerTitle: {
          ...type.bodyMedium,
          color: colors.textSecondary,
          flex: 1,
          textAlign: 'center',
        },
        content: {
          paddingHorizontal: spacing.screen,
          paddingBottom: spacing.section,
          gap: spacing.md,
        },
        lead: {
          ...type.title,
          fontSize: type.title.fontSize - 2,
          color: colors.textPrimary,
        },
        prompt: {
          ...type.body,
          color: colors.textSecondary,
          backgroundColor: colors.backgroundElevated,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
        },
        label: {
          ...type.caption,
          color: colors.textMuted,
          fontFamily: 'DMSans_600SemiBold',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        moodRow: {
          flexDirection: 'row',
          gap: spacing.sm,
          flexWrap: 'wrap',
        },
        moodBtn: {
          minWidth: MIN_TAP,
          minHeight: MIN_TAP,
          borderRadius: radius.sm,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.backgroundElevated,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.sm,
        },
        moodBtnActive: {
          borderColor: colors.accent,
          backgroundColor: colors.accentSoft,
        },
        moodText: {
          ...type.caption,
          color: colors.textSecondary,
          fontFamily: 'DMSans_600SemiBold',
        },
        moodTextActive: {
          color: colors.accent,
        },
        input: {
          minHeight: 96,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.backgroundElevated,
          color: colors.textPrimary,
          padding: spacing.md,
          fontFamily: 'DMSans_400Regular',
          fontSize: type.body.fontSize,
          lineHeight: type.body.lineHeight,
          textAlignVertical: 'top',
        },
        save: {
          minHeight: 54,
          borderRadius: radius.md,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        saveText: {
          ...type.button,
          color: colors.onAccent,
        },
        hint: {
          ...type.caption,
          color: colors.textMuted,
        },
        section: {
          marginTop: spacing.md,
          gap: spacing.sm,
        },
        sectionTitle: {
          ...type.section,
          color: colors.textPrimary,
        },
        weekCard: {
          backgroundColor: colors.backgroundSoft,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: 4,
        },
        weekText: {
          ...type.body,
          color: colors.textSecondary,
        },
        entryCard: {
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingVertical: spacing.md,
          gap: 4,
        },
        entryMeta: {
          ...type.caption,
          color: colors.accentMuted,
        },
        entryBody: {
          ...type.body,
          color: colors.textPrimary,
        },
        suggest: {
          marginTop: spacing.sm,
          minHeight: MIN_TAP,
          justifyContent: 'center',
        },
        suggestText: {
          ...type.bodyMedium,
          color: colors.cyan,
        },
        pressed: {
          opacity: 0.85,
        },
      }),
    [type],
  );

  function ensureCanWrite(): boolean {
    if (unlocked) return true;
    if (entries.length < JOURNAL_FREE_ENTRIES) return true;
    setPaywallVisible(true);
    return false;
  }

  function handleSave() {
    if (!ensureCanWrite()) return;
    if (!gratitude.trim() && !reflection.trim()) {
      Alert.alert(
        'Escreva um pouco',
        'Preencha a gratidão ou a reflexão para salvar.',
      );
      return;
    }

    const entry = addEntry({
      promptId: prompt.id,
      mood,
      gratitude,
      reflection,
    });
    if (!entry) return;

    setGratitude('');
    setReflection('');

    const feeling = moodToFeeling(mood);
    const suggested = getRecommendedSessions(feeling).find(
      (s) => s.category !== 'sos',
    );
    setSuggestionId(suggested?.id ?? null);

    Alert.alert(
      'Entrada salva',
      unlocked || entries.length + 1 <= JOURNAL_FREE_ENTRIES
        ? 'Que bom registrar o que o coração vive hoje.'
        : 'Entrada salva.',
    );
  }

  const promptLabel =
    journalPrompts.find((p) => p.id === prompt.id)?.text ?? prompt.text;

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
        <Text style={styles.headerTitle}>Diário de Gratidão</Text>
        <View style={styles.sideBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>Um espaço para lembrar o bem.</Text>
        <Text style={styles.prompt}>{promptLabel}</Text>

        {!unlocked ? (
          <Text style={styles.hint}>
            {entries.length < JOURNAL_FREE_ENTRIES
              ? `Primeira entrada gratuita. Depois: compra única ${TOOL_DIARIO_PRICE_LABEL} (ou Missão+).`
              : `Para continuar, liberte o diário por ${TOOL_DIARIO_PRICE_LABEL} (compra única) ou use a Missão+.`}
          </Text>
        ) : (
          <Text style={styles.hint}>Diário liberado neste aparelho.</Text>
        )}

        <Text style={styles.label}>Como está o humor agora?</Text>
        <View style={styles.moodRow}>
          {([1, 2, 3, 4, 5] as JournalMood[]).map((value) => {
            const active = mood === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Humor ${MOOD_LABELS[value]}`}
                onPress={() => setMood(value)}
                style={({ pressed }) => [
                  styles.moodBtn,
                  active && styles.moodBtnActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[styles.moodText, active && styles.moodTextActive]}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{MOOD_LABELS[mood]}</Text>

        <Text style={styles.label}>Pelo que sou grato</Text>
        <TextInput
          value={gratitude}
          onChangeText={setGratitude}
          placeholder="Escreva com calma..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
          accessibilityLabel="Pelo que sou grato"
        />

        <Text style={styles.label}>Reflexão ou oração</Text>
        <TextInput
          value={reflection}
          onChangeText={setReflection}
          placeholder="O que a Palavra ou o dia trouxe ao coração..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.input}
          accessibilityLabel="Reflexão ou oração"
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Salvar entrada do diário"
          onPress={handleSave}
          style={({ pressed }) => [styles.save, pressed && styles.pressed]}
        >
          <Text style={styles.saveText}>Salvar entrada</Text>
        </Pressable>

        {suggestionId ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/player/${suggestionId}`)}
            style={styles.suggest}
          >
            <Text style={styles.suggestText}>
              Ouvir um áudio sugerido para este momento →
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revisão da semana</Text>
          <View style={styles.weekCard}>
            <Text style={styles.weekText}>
              {weekEntries.length
                ? `${weekEntries.length} entrada${weekEntries.length > 1 ? 's' : ''} nos últimos 7 dias`
                : 'Ainda sem entradas nesta semana.'}
            </Text>
            {avgMood ? (
              <Text style={styles.weekText}>
                Humor médio: {avgMood} de 5
              </Text>
            ) : null}
          </View>
        </View>

        {entries.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entradas recentes</Text>
            {entries.slice(0, 8).map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <Text style={styles.entryMeta}>
                  {entry.date} · humor {entry.mood}/5
                </Text>
                {entry.gratitude ? (
                  <Text style={styles.entryBody} numberOfLines={3}>
                    {entry.gratitude}
                  </Text>
                ) : null}
                {entry.reflection ? (
                  <Text style={styles.entryBody} numberOfLines={2}>
                    {entry.reflection}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <ToolPaywall
        visible={paywallVisible}
        toolId="diario"
        onClose={() => setPaywallVisible(false)}
      />
    </SafeAreaView>
  );
}
