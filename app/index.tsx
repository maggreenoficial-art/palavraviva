import { Redirect } from 'expo-router';
import { useUserStore } from '../src/store/useUserStore';

export default function Index() {
  const hasOnboarded = useUserStore((state) => state.hasOnboarded);
  const displayName = useUserStore((state) => state.displayName);
  const userId = useUserStore((state) => state.userId);

  if (hasOnboarded && displayName && userId) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/onboarding" />;
}
