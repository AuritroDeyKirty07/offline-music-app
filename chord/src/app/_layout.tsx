import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AudioProvider } from '../services/audioPlayer';
import { FavoritesProvider } from '../services/favoritesContext';

export default function RootLayout() {
  return (
    <FavoritesProvider>
      <AudioProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AudioProvider>
    </FavoritesProvider>
  );
}
