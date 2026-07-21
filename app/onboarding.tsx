import { Redirect } from 'expo-router';

/** Onboarding removido — redireciona para o app. */
export default function OnboardingRedirect() {
  return <Redirect href="/(tabs)/home" />;
}
