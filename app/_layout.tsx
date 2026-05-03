import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '@/services/database';
import { colors } from '@/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      retryDelay: 3000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    getDb().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg.primary },
              headerTintColor: colors.text.primary,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.bg.primary },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="transaction/alim" options={{ title: 'Yeni Alım', presentation: 'modal' }} />
            <Stack.Screen name="transaction/satim" options={{ title: 'Satış Girişi', presentation: 'modal' }} />
            <Stack.Screen name="fund/[kodu]" options={{ title: 'Fon Detayı' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
