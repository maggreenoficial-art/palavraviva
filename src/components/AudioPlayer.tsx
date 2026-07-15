import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import type { Session } from '../types';
import { BiblicalPassage } from './BiblicalPassage';
import { getBiblicalTextById } from '../services/biblicalContent';
import { useContinueStore } from '../store/useContinueStore';
import { useDownloadStore } from '../store/useDownloadStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { colors, radius, spacing, typography } from '../theme';
import { formatTime } from '../utils/formatTime';
import { isRemoteAudio, resolvePlaybackSource } from '../utils/audioSource';

interface AudioPlayerProps {
  session: Session;
  onFinished?: () => void;
}

async function fadeVolume(
  sound: Audio.Sound,
  from: number,
  to: number,
  steps = 6,
) {
  const step = (to - from) / steps;
  for (let i = 1; i <= steps; i += 1) {
    await sound.setVolumeAsync(Math.max(0, Math.min(1, from + step * i)));
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
}

export function AudioPlayer({ session, onFinished }: AudioPlayerProps) {
  const [voice, setVoice] = useState<Audio.Sound | null>(null);
  const [ambient, setAmbient] = useState<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState(1);
  const [ambientVolume, setAmbientVolume] = useState(
    Math.min(session.ambientVolume ?? 0.15, 0.2),
  );
  const [ambientEnabled, setAmbientEnabled] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const finishedRef = useRef(false);

  const { isPlaying, positionMs, durationMs, setPlaying, setProgress, reset } =
    usePlayerStore();
  const saveProgress = useContinueStore((s) => s.saveProgress);
  const isDownloaded = useDownloadStore((s) => s.isDownloaded(session.id));
  const bundledOffline = !isRemoteAudio(session.audioSource);
  const offlineReady = bundledOffline || isDownloaded;

  const biblicalIds =
    session.biblicalPrayerIds ??
    (session.biblicalPrayerId ? [session.biblicalPrayerId] : []);
  const biblicalPassages = biblicalIds
    .map((passageId) => getBiblicalTextById(passageId))
    .filter((item): item is NonNullable<typeof item> => item != null);

  const canSeek = Boolean(voice) && !loading && durationMs > 0;
  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const minutes = Math.round(session.durationSeconds / 60);

  useEffect(() => {
    let mounted = true;
    let voiceSound: Audio.Sound | null = null;
    let ambientSound: Audio.Sound | null = null;
    finishedRef.current = false;

    async function load() {
      setLoading(true);
      setLoadError(false);
      reset();

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const voiceSource = resolvePlaybackSource(session.audioSource);
      const { sound: nextVoice } = await Audio.Sound.createAsync(
        voiceSource,
        { shouldPlay: false, volume: voiceVolume },
        (status) => {
          if (!status.isLoaded) return;
          const nextDuration = status.durationMillis ?? 0;
          setProgress(status.positionMillis, nextDuration);
          setPlaying(status.isPlaying);

          if (status.isPlaying || status.didJustFinish) {
            saveProgress(session.id, status.positionMillis, nextDuration);
          }

          if (status.didJustFinish && !finishedRef.current) {
            finishedRef.current = true;
            ambientSound?.stopAsync().catch(() => undefined);
            onFinished?.();
          }
        },
      );
      voiceSound = nextVoice;

      if (session.ambientSource != null) {
        const ambientSource = resolvePlaybackSource(session.ambientSource);
        const { sound: nextAmbient } = await Audio.Sound.createAsync(
          ambientSource,
          {
            shouldPlay: false,
            isLooping: true,
            volume: ambientEnabled ? ambientVolume : 0,
          },
        );
        ambientSound = nextAmbient;
      }

      if (!mounted) {
        await voiceSound.unloadAsync();
        await ambientSound?.unloadAsync();
        return;
      }

      setVoice(voiceSound);
      setAmbient(ambientSound);
      setLoading(false);
    }

    load().catch(() => {
      if (mounted) {
        setLoadError(true);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (voiceSound) {
        voiceSound
          .getStatusAsync()
          .then((status) => {
            if (status.isLoaded) {
              saveProgress(
                session.id,
                status.positionMillis,
                status.durationMillis ?? 0,
              );
            }
          })
          .catch(() => undefined);
      }
      voiceSound?.unloadAsync();
      ambientSound?.unloadAsync();
      reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    voice?.setVolumeAsync(voiceVolume).catch(() => undefined);
  }, [voice, voiceVolume]);

  useEffect(() => {
    if (!ambient) return;
    ambient
      .setVolumeAsync(ambientEnabled ? ambientVolume : 0)
      .catch(() => undefined);
  }, [ambient, ambientEnabled, ambientVolume]);

  async function togglePlayback() {
    if (!voice || loading) return;

    if (isPlaying) {
      await fadeVolume(voice, voiceVolume, Math.max(0.15, voiceVolume * 0.4));
      await Promise.all([
        voice.pauseAsync(),
        ambient?.pauseAsync() ?? Promise.resolve(),
      ]);
      await voice.setVolumeAsync(voiceVolume);
      const status = await voice.getStatusAsync();
      if (status.isLoaded) {
        saveProgress(session.id, status.positionMillis, status.durationMillis ?? 0);
      }
      return;
    }

    await voice.setVolumeAsync(0.2);
    await Promise.all([
      voice.playAsync(),
      ambientEnabled && ambient ? ambient.playAsync() : Promise.resolve(),
    ]);
    await fadeVolume(voice, 0.2, voiceVolume);
  }

  async function seekBy(deltaMs: number) {
    if (!voice || !canSeek) return;
    const next = Math.max(0, Math.min(durationMs, positionMs + deltaMs));
    await voice.setPositionAsync(next);
    saveProgress(session.id, next, durationMs);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.type}>
        {session.category === 'jornada'
          ? `Dia ${session.journeyDay} de 7`
          : session.category === 'serie'
            ? `Dia ${session.journeyDay} de 3`
            : 'Sessão guiada'}{' '}
        · {minutes} min
      </Text>
      <Text style={styles.title}>{session.title}</Text>
      <Text style={styles.contentLabel}>Reflexão devocional</Text>
      <Text style={styles.summary}>{session.summary}</Text>

      {biblicalPassages.map((passage) => (
        <BiblicalPassage key={passage.id} passage={passage} />
      ))}
      {biblicalPassages.length === 0 && session.biblicalPrayerId ? (
        <Text style={styles.error}>
          Texto bíblico temporariamente indisponível.
        </Text>
      ) : null}

      {loading ? (
        <View
          style={styles.loadingRow}
          accessibilityLiveRegion="polite"
          accessibilityLabel="Carregando áudio"
        >
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Carregando áudio…</Text>
        </View>
      ) : null}

      {loadError ? (
        <Text style={styles.error} accessibilityLiveRegion="assertive">
          Não foi possível carregar o áudio. Tente novamente.
        </Text>
      ) : null}

      <Text style={styles.offline}>
        {offlineReady
          ? '✓ Disponível offline'
          : 'Baixe esta sessão para ouvir offline.'}
      </Text>

      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel={`Progresso do áudio, ${formatTime(positionMs)} de ${formatTime(durationMs)}`}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(progress * 100),
        }}
        disabled={!canSeek}
        onPress={() => {
          if (canSeek) void seekBy(15_000);
        }}
        style={[styles.progressTrack, !canSeek && styles.disabled]}
      >
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </Pressable>
      <View style={styles.timeRow}>
        <Text style={styles.time}>{formatTime(positionMs)}</Text>
        <Text style={styles.time}>{formatTime(durationMs)}</Text>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar 15 segundos"
          onPress={() => void seekBy(-15_000)}
          disabled={!canSeek}
          style={({ pressed }) => [
            styles.seekButton,
            pressed && styles.pressed,
            !canSeek && styles.disabled,
          ]}
        >
          <Text style={styles.seekLabel}>−15</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pausar' : 'Reproduzir'}
          style={({ pressed }) => [
            styles.playButton,
            pressed && styles.pressed,
            (!voice || loading) && styles.disabled,
          ]}
          onPress={() => void togglePlayback()}
          disabled={!voice || loading}
        >
          <Text style={styles.playLabel}>{isPlaying ? 'Pausar' : 'Ouvir'}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Avançar 15 segundos"
          onPress={() => void seekBy(15_000)}
          disabled={!canSeek}
          style={({ pressed }) => [
            styles.seekButton,
            pressed && styles.pressed,
            !canSeek && styles.disabled,
          ]}
        >
          <Text style={styles.seekLabel}>+15</Text>
        </Pressable>
      </View>

      {session.ambientSource != null ? (
        <View style={styles.ambientRow}>
          <Text style={styles.ambientLabel}>♪ Ambiente suave</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: ambientEnabled }}
            accessibilityLabel="Áudio ambiente"
            onPress={() => setAmbientEnabled((value) => !value)}
            style={[styles.toggle, ambientEnabled && styles.toggleOn]}
          >
            <Text style={styles.toggleText}>
              {ambientEnabled ? 'Ligado' : 'Desligado'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          showOptions ? 'Ocultar opções de áudio' : 'Opções de áudio'
        }
        onPress={() => setShowOptions((value) => !value)}
        style={styles.optionsToggle}
      >
        <Text style={styles.optionsToggleText}>
          Opções de áudio {showOptions ? '▴' : '▾'}
        </Text>
      </Pressable>

      {showOptions ? (
        <View style={styles.options}>
          <View style={styles.volumeRow}>
            <Text style={styles.volumeLabel}>
              Voz {Math.round(voiceVolume * 100)}%
            </Text>
            <View style={styles.volumeActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Diminuir volume da voz"
                onPress={() => setVoiceVolume((v) => Math.max(0.2, v - 0.1))}
                style={styles.volumeBtn}
              >
                <Text style={styles.volumeBtnText}>−</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Aumentar volume da voz"
                onPress={() => setVoiceVolume((v) => Math.min(1, v + 0.1))}
                style={styles.volumeBtn}
              >
                <Text style={styles.volumeBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          {session.ambientSource != null ? (
            <View style={styles.volumeRow}>
              <Text style={styles.volumeLabel}>
                Ambiente{' '}
                {ambientEnabled
                  ? `${Math.round(ambientVolume * 100)}%`
                  : 'desligado'}
              </Text>
              <View style={styles.volumeActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Diminuir volume do ambiente"
                  onPress={() =>
                    setAmbientVolume((v) =>
                      Math.max(0.05, Math.min(voiceVolume, v - 0.05)),
                    )
                  }
                  style={styles.volumeBtn}
                  disabled={!ambientEnabled}
                >
                  <Text style={styles.volumeBtnText}>−</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar volume do ambiente"
                  onPress={() =>
                    setAmbientVolume((v) => Math.min(voiceVolume * 0.5, v + 0.05))
                  }
                  style={styles.volumeBtn}
                  disabled={!ambientEnabled}
                >
                  <Text style={styles.volumeBtnText}>+</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.section,
    gap: spacing.sm,
  },
  type: {
    ...typography.caption,
    color: colors.accentMuted,
    fontFamily: 'DMSans_600SemiBold',
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
  contentLabel: {
    ...typography.caption,
    color: colors.cyan,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  summary: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.sos,
  },
  offline: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.sm,
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
  controls: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  playButton: {
    flex: 1,
    minHeight: 56,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playLabel: {
    ...typography.button,
    color: colors.background,
  },
  seekButton: {
    minWidth: 64,
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekLabel: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  ambientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  ambientLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleOn: {
    borderColor: colors.accentMuted,
    backgroundColor: colors.accentSoft,
  },
  toggleText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontFamily: 'DMSans_600SemiBold',
  },
  optionsToggle: {
    minHeight: 44,
    justifyContent: 'center',
  },
  optionsToggleText: {
    ...typography.bodyMedium,
    color: colors.cyan,
  },
  options: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.backgroundSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  volumeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  volumeActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  volumeBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeBtnText: {
    ...typography.bodyMedium,
    color: colors.accent,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.88,
  },
});
