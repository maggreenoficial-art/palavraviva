import { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Session } from '../types';
import { isRemoteAudio } from '../utils/audioSource';
import { colors, MIN_TAP, radius, spacing, useTypography } from '../theme';

const COVER_WIDTH = 168;
const COVER_HEIGHT = 112;

interface SessionCardProps {
  session: Session;
  onPress: () => void;
  locked?: boolean;
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

function categoryLabel(session: Session) {
  if (session.category === 'sos') return 'SOS';
  if (session.category === 'manha') return 'Manhã';
  if (session.category === 'noite') return 'Noite';
  if (session.category === 'jornada') return `Dia ${session.journeyDay}`;
  if (session.category === 'serie') return `Dia ${session.journeyDay}`;
  if (session.category === 'reflexao') return 'Meditação';
  return 'Sessão';
}

export function SessionCard({ session, onPress, locked = false }: SessionCardProps) {
  const type = useTypography();
  const offline = !isRemoteAudio(session.audioSource);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          width: COVER_WIDTH,
          marginRight: spacing.md,
          minHeight: MIN_TAP,
        },
        cardLocked: {
          opacity: 0.85,
        },
        lockBadge: {
          position: 'absolute',
          top: spacing.sm,
          right: spacing.sm,
          backgroundColor: 'rgba(18,26,33,0.9)',
          borderRadius: 6,
          paddingHorizontal: 8,
          paddingVertical: 4,
          minHeight: 28,
          justifyContent: 'center',
        },
        lockBadgeText: {
          ...type.caption,
          color: colors.accent,
          fontFamily: 'DMSans_600SemiBold',
          fontSize: Math.max(12, type.caption.fontSize - 2),
        },
        pressed: {
          opacity: 0.85,
        },
        cover: {
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
          borderRadius: radius.md,
          marginBottom: spacing.sm,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        },
        coverImage: {
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
        },
        coverOverlay: {
          ...StyleSheet.absoluteFill,
          paddingHorizontal: spacing.sm,
          paddingBottom: spacing.sm,
          justifyContent: 'flex-end',
        },
        coverGlow: {
          position: 'absolute',
          bottom: -20,
          left: -10,
          width: 90,
          height: 90,
          borderRadius: 45,
          backgroundColor: colors.accentSoft,
        },
        category: {
          ...type.caption,
          color: colors.accent,
          fontFamily: 'DMSans_600SemiBold',
          textShadowColor: 'rgba(0,0,0,0.55)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        },
        title: {
          ...type.bodyMedium,
          color: colors.textPrimary,
          marginBottom: 4,
          minHeight: 44,
        },
        meta: {
          ...type.caption,
          color: colors.textSecondary,
        },
      }),
    [type],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${session.title}. ${formatDuration(session.durationSeconds)}${locked ? '. Assinatura necessária' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        locked && styles.cardLocked,
      ]}
    >
      <View style={[styles.cover, { backgroundColor: session.coverColor }]}>
        {session.coverImage != null ? (
          <Image
            source={session.coverImage}
            style={styles.coverImage}
            contentFit="cover"
            contentPosition="center"
            recyclingKey={session.id}
            cachePolicy="memory-disk"
            transition={120}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.coverGlow} />
        )}
        <View style={styles.coverOverlay} pointerEvents="none">
          <Text style={styles.category}>{categoryLabel(session)}</Text>
        </View>
        {locked ? (
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>Missão+</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {session.title}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        Reflexão e oração · {formatDuration(session.durationSeconds)}
        {offline ? ' · Offline' : ''}
      </Text>
    </Pressable>
  );
}
