import { Redirect, useLocalSearchParams } from 'expo-router';
import { captureMetaTestEventCode } from '../src/services/metaPixel';
import { useEffect } from 'react';

/** Onboarding removido — redireciona para o app preservando query string. */
export default function OnboardingRedirect() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();

  useEffect(() => {
    captureMetaTestEventCode();
  }, []);

  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    queryParams[key] = Array.isArray(value) ? String(value[0]) : String(value);
  }

  return (
    <Redirect
      href={{
        pathname: '/(tabs)/home',
        params: queryParams,
      }}
    />
  );
}
