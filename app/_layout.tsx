import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import { View, Image } from 'react-native';
import * as NativeSplash from 'expo-splash-screen';
import { getAppLock, isSessionUnlocked, setUnlockedSession } from '../services/settings';
import { AppPreferencesProvider } from '../context/AppPreferencesContext';
import { useAppThemeAndText } from '../hooks/useAppThemeAndText';
import SplashScreenView from '../components/SplashScreenView';

NativeSplash.preventAutoHideAsync().catch(() => {});

function RootNavigation() {
  const router = useRouter();
  const { Theme } = useAppThemeAndText();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Image.prefetch(Image.resolveAssetSource(require('../assets/images/Asif & Company Logo.png')).uri);
      } catch (e) {
        console.warn('Splash asset prefetch issue:', e);
      } finally {
        await NativeSplash.hideAsync();
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (!splashDone) return;
    const checkLock = async () => {
      const lock = await getAppLock();
      if (!lock.enabled || !lock.passcodeHash) return;
      await setUnlockedSession(false);
      const unlocked = await isSessionUnlocked();
      if (!unlocked) {
        router.replace('/lock');
      }
    };
    checkLock();
  }, [splashDone, router]);

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: Theme.colors.background }}>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: Theme.colors.background },
        headerTintColor: Theme.colors.primary,
        contentStyle: { backgroundColor: Theme.colors.background },
        headerTitleStyle: { fontWeight: 'bold' },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lock" options={{ title: 'App Lock', presentation: 'modal' }} />
        <Stack.Screen name="visit/[id]" options={{ title: 'Visit Details', presentation: 'modal' }} />
      </Stack>

      {/* Premium splash shown on top until animation finishes */}
      {!splashDone && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <SplashScreenView onFinish={() => setSplashDone(true)} />
        </View>
      )}
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <AppPreferencesProvider>
      <RootNavigation />
    </AppPreferencesProvider>
  );
}
