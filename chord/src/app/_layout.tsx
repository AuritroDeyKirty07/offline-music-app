import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AudioProvider } from '../services/audioPlayer';

export default function RootLayout() {
  return (
    <AudioProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AudioProvider>
  );
}
