import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, spacing, typography } from '../theme';

const DISMISS_KEY = 'pv_pwa_install_dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = Boolean(
    // @ts-expect-error — iOS Safari
    window.navigator.standalone,
  );
  return Boolean(media || iosStandalone);
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notChrome;
}

/** Banner web: oferece instalar o PWA (Chrome/Edge) ou instrução no iOS. */
export function InstallPwaBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (isStandaloneDisplay()) return;

    let removeListener: (() => void) | undefined;
    let cancelled = false;

    AsyncStorage.getItem(DISMISS_KEY).then((dismissed) => {
      if (cancelled || dismissed === '1') return;

      const onBeforeInstall = (event: Event) => {
        event.preventDefault();
        setDeferred(event as BeforeInstallPromptEvent);
        setVisible(true);
      };

      window.addEventListener('beforeinstallprompt', onBeforeInstall);
      removeListener = () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };

      if (isIosSafari()) {
        setShowIosHint(true);
        setVisible(true);
      }
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  async function dismiss() {
    setVisible(false);
    setDeferred(null);
    setShowIosHint(false);
    await AsyncStorage.setItem(DISMISS_KEY, '1');
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    await dismiss();
  }

  if (Platform.OS !== 'web' || !visible) return null;

  return (
    <View style={styles.banner} accessibilityRole="summary">
      <View style={styles.textCol}>
        <Text style={styles.title}>Instalar o Palavra Viva</Text>
        <Text style={styles.body}>
          {showIosHint && !deferred
            ? 'No Safari: Compartilhar → Adicionar à Tela de Início'
            : 'Use como app, pela tela inicial — sem loja.'}
        </Text>
      </View>
      {deferred ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Instalar aplicativo"
          onPress={install}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Instalar</Text>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar aviso de instalação"
        onPress={dismiss}
        style={styles.close}
      >
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.screen,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.backgroundElevated,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  ctaText: {
    ...typography.caption,
    color: colors.background,
    fontFamily: 'DMSans_600SemiBold',
  },
  close: {
    padding: spacing.xs,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.9,
  },
});
