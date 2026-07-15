import { Redirect } from 'expo-router';
import { useUserStore } from '../src/store/useUserStore';

export default function Index() {
  const hasOnboarded = useUserStore((state) => state.hasOnboarded);

  if (hasOnboarded) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/onboarding" />;
}
