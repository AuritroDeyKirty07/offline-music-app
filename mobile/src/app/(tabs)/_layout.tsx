import { useState } from 'react';
import { Tabs } from 'expo-router';
import { Home, Search, Library, Settings as SettingsIcon } from 'lucide-react-native';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useAudioPlayer } from '../../services/audioPlayer';
import { Play, Pause } from 'lucide-react-native';
import FullScreenPlayer from '../../services/FullScreenPlayer';
import LikeButton from '../../services/LikeButton';
import DynamicIslandPill from '../../components/DynamicIslandPill';

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
      <DynamicIslandPill onPressExpand={() => setPlayerExpanded(true)} />
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
        bottom: 74, // Above 64px tab bar with clean clearance
        left: 10,
        right: 10,
        height: 60,
        backgroundColor: '#242427',
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 8,
        zIndex: 999,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    thumbnail: {
        width: 44,
        height: 44,
        borderRadius: 6,
    },
    info: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    author: {
        color: '#a1a1aa',
        fontSize: 12,
    },
    playButton: {
        width: 40,
        height: 40,
        backgroundColor: '#1ed760',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    }
});
