import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Entrada direta no app — redireciona para /home.
 * Lead e demais eventos Meta: AnalyticsBootstrap.
 */
export default function Index() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();

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
