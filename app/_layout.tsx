import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { AnalyticsBootstrap } from '../src/components/AnalyticsBootstrap';
import { useResponsive } from '../src/hooks/useResponsive';
import { colors } from '../src/theme';

const splashLogo = require('../assets/brand/logo.png');

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setReady(true);
      if (Platform.OS !== 'web') {
        SplashScreen.hideAsync().catch(() => undefined);
      }
    }
  }, [fontsLoaded, fontError]);

  // Evita tela branca infinita se as fontes demorarem no web
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Image
          source={splashLogo}
          style={styles.loadingLogo}
          resizeMode="contain"
          accessibilityLabel="Palavra Viva"
        />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ResponsiveShell>
        <AnalyticsBootstrap />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        />
      </ResponsiveShell>
    </SafeAreaProvider>
  );
}

function ResponsiveShell({ children }: { children: ReactNode }) {
  const { shellMaxWidth } = useResponsive();

  return (
    <View style={styles.shell}>
      <View
        style={[
          styles.root,
          Platform.OS === 'web' ? { maxWidth: shellMaxWidth } : null,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    // Faixas laterais no desktop (PWA centrado, tom espiritual)
    backgroundColor:
      Platform.OS === 'web' ? '#0B1116' : colors.background,
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
    alignItems: Platform.OS === 'web' ? 'center' : undefined,
    width: Platform.OS === 'web' ? ('100%' as unknown as number) : undefined,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: colors.border,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
  },
  loadingLogo: {
    width: 240,
    height: 62,
  },
});

