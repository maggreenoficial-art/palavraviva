import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius, spacing, typography } from '../theme';

const DISMISS_KEY = 'pv_pwa_install_dismissed_v2';

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

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/** Banner web: Baixar / instalar o app na tela inicial. */
export function InstallPwaBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (isStandaloneDisplay()) return;

    let removeListener: (() => void) | undefined;
    let cancelled = false;

    AsyncStorage.getItem(DISMISS_KEY).then((dismissed) => {
      if (cancelled || dismissed === '1') return;

      // Mostra sempre no mobile web (não depende só do beforeinstallprompt)
      setVisible(true);

      const onBeforeInstall = (event: Event) => {
        event.preventDefault();
        setDeferred(event as BeforeInstallPromptEvent);
        setVisible(true);
      };

      window.addEventListener('beforeinstallprompt', onBeforeInstall);
      removeListener = () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  async function dismiss() {
    setVisible(false);
    setDeferred(null);
    setShowHelp(false);
    await AsyncStorage.setItem(DISMISS_KEY, '1');
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      await dismiss();
      return;
    }
    setShowHelp((v) => !v);
  }

  if (Platform.OS !== 'web' || !visible) return null;

  const helpText = isIos()
    ? 'No Safari: toque em Compartilhar (□↑) → “Adicionar à Tela de Início”.'
    : isAndroid()
      ? 'No Chrome: menu ⋮ → “Instalar app” ou “Adicionar à tela inicial”.'
      : 'No menu do navegador, escolha “Instalar app” ou “Adicionar à tela inicial”.';

  return (
    <View style={styles.banner} accessibilityRole="summary">
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.title}>Baixar o app</Text>
          <Text style={styles.body}>
            {deferred
              ? 'Instale na tela inicial — rápido, sem loja.'
              : 'Use como aplicativo na tela inicial do celular.'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Baixar aplicativo Palavra Viva"
          onPress={() => void install()}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{deferred ? 'Instalar' : 'Baixar'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar aviso de download"
          onPress={() => void dismiss()}
          style={styles.close}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      {showHelp && !deferred ? (
        <Text style={styles.help}>{helpText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.screen,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentMuted,
    backgroundColor: colors.backgroundElevated,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textCol: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
  },
  body: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  help: {
    ...typography.caption,
    color: colors.accent,
    lineHeight: 18,
  },
  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    minWidth: 88,
    justifyContent: 'center',
    alignItems: 'center',
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
