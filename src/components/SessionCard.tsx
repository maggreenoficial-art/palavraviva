import { useMemo } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Session } from '../types';
import { isRemoteAudio } from '../utils/audioSource';
import { colors, MIN_TAP, radius, spacing, useTypography } from '../theme';

const COVER_WIDTH = 168;
const COVER_HEIGHT = 112;
const FALLBACK_COVER = require('../../assets/thumbnails/sos-paz.jpg');

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

export function SessionCard({
  session,
  onPress,
  locked = false,
}: SessionCardProps) {
  const type = useTypography();
  const offline = !isRemoteAudio(session.audioSource);
  const coverSource = session.coverImage ?? FALLBACK_COVER;
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
          borderRadius: radius.sm,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          zIndex: 2,
        },
        lockBadgeText: {
          ...type.caption,
          color: colors.accent,
          fontFamily: 'DMSans_600SemiBold',
          fontSize: Math.max(11, type.caption.fontSize - 1),
        },
        pressed: {
          opacity: 0.88,
        },
        cover: {
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
          borderRadius: radius.md,
          overflow: 'hidden',
          marginBottom: spacing.sm,
        },
        coverImage: {
          width: COVER_WIDTH,
          height: COVER_HEIGHT,
        },
        coverOverlay: {
          ...StyleSheet.absoluteFillObject,
          justifyContent: 'flex-end',
          padding: spacing.sm,
          backgroundColor: 'rgba(0,0,0,0.25)',
        },
        category: {
          ...type.caption,
          color: colors.white,
          fontFamily: 'DMSans_600SemiBold',
        },
        title: {
          ...type.bodyMedium,
          color: colors.textPrimary,
          minHeight: Math.round(type.bodyMedium.fontSize * 2.4),
        },
        meta: {
          ...type.caption,
          color: colors.textSecondary,
          marginTop: 2,
        },
      }),
    [type],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${session.title}. ${formatDuration(session.durationSeconds)}${locked ? '. Missão+' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
        locked && styles.cardLocked,
      ]}
    >
      <View style={[styles.cover, { backgroundColor: session.coverColor }]}>
        <Image
          source={coverSource}
          style={styles.coverImage}
          contentFit="cover"
          contentPosition="center"
          recyclingKey={session.id}
          cachePolicy="memory-disk"
          transition={120}
          accessibilityIgnoresInvertColors
        />
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
