import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AudioProvider } from '../services/audioPlayer';
import { View, StyleSheet } from 'react-native';
import { initApiUrl } from '../services/api';

export default function RootLayout() {
  useEffect(() => {
    initApiUrl();
  }, []);

  return (
    <SafeAreaProvider style={styles.root}>
      <AudioProvider>
        <StatusBar style="light" />
        <View style={styles.container}>
            <Stack screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: '#09090b' }
            }}>
                <Stack.Screen name="(tabs)" />
            </Stack>
        </View>
      </AudioProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#09090b',
  },
});
