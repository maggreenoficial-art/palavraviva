import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Audio } from 'expo-av';
import type { BiblicalText } from '../services/biblicalContent';
import { colors, radius, spacing, typography } from '../theme';
import { trackAnalytics } from '../services/analytics';
import { formatTime } from '../utils/formatTime';
import { getActiveVerseIndex } from '../utils/verseSync';
import { resolvePlaybackSource } from '../utils/audioSource';
import {
  bibliaMediaId,
  otMediaId,
  resolveProtectedAudioSource,
} from '../services/mediaAccess';
import type { AudioSource } from '../types';

interface SyncedScriptureReaderProps {
  passage: BiblicalText;
  audioSource: AudioSource;
  /** Preferir streaming: biblia | ot + id */
  mediaKind?: 'biblia' | 'ot';
  mediaId?: string;
  subtitle?: string;
  analyticsId?: string;
  analyticsTitle?: string;
}

export function SyncedScriptureReader({
  passage,
  audioSource,
  mediaKind = 'biblia',
  mediaId,
  subtitle,
  analyticsId,
  analyticsTitle,
}: SyncedScriptureReaderProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const verseY = useRef<Record<number, number>>({});
  const userScrolling = useRef(false);
  const listenTrackedRef = useRef(false);

  useEffect(() => {
    listenTrackedRef.current = false;
  }, [passage.id, analyticsId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [followReading, setFollowReading] = useState(true);
  const [textExpanded, setTextExpanded] = useState(false);

  const activeIndex = getActiveVerseIndex(
    passage.verses,
    positionMs,
    durationMs,
    {
      // Intro curta (título + referência); lead antecipa o destaque
      introWeight: 64,
      outroWeight: 56,
      pauseWeight: 22,
      leadMs: 850,
    },
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
        const resolvedId =
          mediaId ||
          (mediaKind === 'ot'
            ? otMediaId(analyticsId || passage.id)
            : bibliaMediaId(passage.id));
        const source = await resolveProtectedAudioSource({
          mediaId: resolvedId,
          localSource: typeof audioSource === 'number' ? audioSource : null,
        });
        const playbackSource =
          typeof source === 'number'
            ? resolvePlaybackSource(source)
            : source;
        const { sound } = await Audio.Sound.createAsync(
          playbackSource,
          { shouldPlay: false, progressUpdateIntervalMillis: 100 },
          (status) => {
            if (!mounted || !status.isLoaded) return;
            setPositionMs(status.positionMillis);
            if (status.durationMillis) setDurationMs(status.durationMillis);
            setPlaying(status.isPlaying);
          },
        );
        if (!mounted) {
          await sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          setDurationMs(status.durationMillis);
        }
        setReady(true);
        setLoading(false);
      } catch {
        if (mounted) {
          setError('Não foi possível carregar a narração.');
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      mounted = false;
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [audioSource, mediaId, mediaKind, analyticsId, passage.id]);

  useEffect(() => {
    if (!followReading || userScrolling.current) return;
    const y = verseY.current[activeIndex];
    if (y == null) return;
    // Sem animação: o destaque já muda; scroll animado atrasava a leitura
    scrollRef.current?.scrollTo({
      y: Math.max(0, y - 72),
      animated: false,
    });
  }, [activeIndex, followReading]);

  useEffect(() => {
    if (playing) setTextExpanded(true);
  }, [playing]);

  async function togglePlay() {
    const sound = soundRef.current;
    if (!sound || !ready) return;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await sound.pauseAsync();
      return;
    }
    await sound.playAsync();
    if (!listenTrackedRef.current) {
      listenTrackedRef.current = true;
      void trackAnalytics({
        name: 'listen_start',
        contentId: analyticsId || passage.id,
        contentTitle: analyticsTitle || passage.reference,
        contentKind: 'ot',
        path: `/leitura/${analyticsId || passage.id}`,
      });
    }
  }

  function onScrollBeginDrag() {
    userScrolling.current = true;
  }

  function onScrollEndDrag(_e: NativeSyntheticEvent<NativeScrollEvent>) {
    setTimeout(() => {
      userScrolling.current = false;
    }, 500);
  }

  const displayDurationMs = durationMs > 0 ? durationMs : 0;
  const progress =
    displayDurationMs > 0 ? Math.min(1, positionMs / displayDurationMs) : 0;
  const longPassage = passage.verses.length > 4;
  const visibleVerses =
    longPassage && !textExpanded && !playing
      ? passage.verses.slice(0, 2)
      : passage.verses;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.badge}>Texto bíblico</Text>
          <Text style={styles.reference}>{passage.reference}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {longPassage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              textExpanded || playing
                ? 'Recolher texto'
                : 'Ver texto completo'
            }
            onPress={() => setTextExpanded((v) => !v)}
            style={styles.expandBtn}
          >
            <Text style={styles.expandText}>
              {textExpanded || playing ? 'Recolher' : 'Ver texto'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Carregando narração…</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
      >
        {visibleVerses.map((verse, index) => {
          const active = index === activeIndex && (playing || positionMs > 0);
          return (
            <View
              key={verse.verse}
              onLayout={(e) => {
                verseY.current[index] = e.nativeEvent.layout.y;
              }}
              style={[styles.verseRow, active && styles.verseRowActive]}
            >
              <Text style={[styles.verseNumber, active && styles.verseNumberActive]}>
                {verse.verse}
              </Text>
              <Text style={[styles.verseText, active && styles.verseTextActive]}>
                {verse.text}
              </Text>
            </View>
          );
        })}
        {longPassage && !textExpanded && !playing ? (
          <Text style={styles.moreHint}>
            +{passage.verses.length - 2} versículos — toque em Ver texto ou
            Ouvir para acompanhar
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.controls}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.time}>{formatTime(positionMs)}</Text>
          <Text style={styles.time}>{formatTime(displayDurationMs)}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pausar' : 'Ouvir e acompanhar'}
            onPress={() => void togglePlay()}
            disabled={!ready || loading}
            style={[styles.playBtn, (!ready || loading) && styles.disabled]}
          >
            <Text style={styles.playText}>
              {playing ? 'Pausar' : 'Ouvir e acompanhar'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: followReading }}
            accessibilityLabel="Acompanhar leitura automática"
            onPress={() => setFollowReading((v) => !v)}
            style={[styles.followBtn, followReading && styles.followOn]}
          >
            <Text style={styles.followText}>
              {followReading ? 'Leitura ligada' : 'Leitura livre'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  badge: {
    ...typography.caption,
    color: colors.accentMuted,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reference: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  expandBtn: {
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    justifyContent: 'center',
  },
  expandText: {
    ...typography.caption,
    color: colors.accent,
    fontFamily: 'DMSans_600SemiBold',
  },
  moreHint: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingTop: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    marginBottom: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.sos,
    paddingHorizontal: spacing.screen,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  verseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  verseRowActive: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentMuted,
  },
  verseNumber: {
    ...typography.caption,
    color: colors.accentMuted,
    fontFamily: 'DMSans_600SemiBold',
    minWidth: 28,
    marginTop: 2,
  },
  verseNumberActive: {
    color: colors.accent,
  },
  verseText: {
    flex: 1,
    fontFamily: 'DMSans_400Regular',
    fontSize: 17,
    lineHeight: 28,
    color: colors.textSecondary,
  },
  verseTextActive: {
    color: colors.textPrimary,
    fontFamily: 'DMSans_500Medium',
  },
  controls: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.backgroundElevated,
    gap: spacing.sm,
    // Mantém o player sempre visível; o texto rola acima.
    flexShrink: 0,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    ...typography.caption,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  playBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    ...typography.button,
    color: colors.background,
    fontSize: 16,
  },
  followBtn: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    backgroundColor: colors.backgroundSoft,
  },
  followOn: {
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentSoft,
  },
  followText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
  },
  disabled: {
    opacity: 0.45,
  },
});
