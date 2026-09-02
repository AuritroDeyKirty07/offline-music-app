import { useState } from 'react';
import { Tabs } from 'expo-router';
import { Home, Search, Library, Settings as SettingsIcon, Play, Pause } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useAudioPlayer } from '../../services/audioPlayer';
import FullScreenPlayer from '../../services/FullScreenPlayer';
import LikeButton from '../../services/LikeButton';

function MiniPlayer({ onExpand }: { onExpand: () => void }) {
    const { currentSong, isPlaying, isBuffering, togglePlayPause }: any = useAudioPlayer();
    if (!currentSong) return null;

    return (
        <TouchableOpacity style={styles.miniPlayer} onPress={onExpand} activeOpacity={0.9}>
            <Image source={{ uri: currentSong.thumbnail }} style={styles.thumbnail} />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
                <Text style={styles.author} numberOfLines={1}>{currentSong.author}</Text>
            </View>
            <LikeButton song={currentSong} size={22} style={{ marginRight: 12 }} />
            <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
                {isBuffering && !isPlaying ? (
                    <ActivityIndicator color="black" size="small" />
                ) : isPlaying ? (
                    <Pause color="black" size={20} fill="currentColor" />
                ) : (
                    <Play color="black" size={20} fill="currentColor" />
                )}
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

export default function TabLayout() {
  const [playerExpanded, setPlayerExpanded] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#121212',
            borderTopColor: '#27272a',
            height: 64,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#1ed760',
          tabBarInactiveTintColor: '#a1a1aa',
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Home color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color }) => <Search color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: 'Library',
            tabBarIcon: ({ color }) => <Library color={color} size={24} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <SettingsIcon color={color} size={24} />,
          }}
        />
      </Tabs>
      <MiniPlayer onExpand={() => setPlayerExpanded(true)} />
      <FullScreenPlayer visible={playerExpanded} onClose={() => setPlayerExpanded(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  miniPlayer: {
    position: 'absolute',
    bottom: 64,
    left: 8,
    right: 8,
    backgroundColor: '#18181b',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#27272a',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  author: {
    color: '#a1a1aa',
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    backgroundColor: '#1ed760',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
