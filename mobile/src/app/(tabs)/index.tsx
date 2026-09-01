import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAudioPlayer } from '../../services/audioPlayer';
import DownloadButton from '../../services/DownloadButton';
import LikeButton from '../../services/LikeButton';
import { RefreshCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPreferences } from '../../services/preferences';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function HomeScreen() {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const { playSong, appendToQueue }: any = useAudioPlayer();
    const insets = useSafeAreaInsets();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const [userName, setUserName] = useState('');

    useFocusEffect(
        useCallback(() => {
            getPreferences().then((prefs: any) => {
                setUserName(prefs.name || 'User');
            });
            
            if (recommendations.length === 0) {
                fetchRecs();
            }
        }, [recommendations.length])
    );

    const fetchRecs = async () => {
        setLoading(true);
        const prefs: any = await getPreferences();
        try {
            const res = await api.post('/ai-home-recommendations', {
                artists: prefs.artists || [],
                genres: prefs.genres || [],
                interests: [],
                languages: prefs.languages || ['Hindi', 'English'],
                library: [],
                officialOnly: prefs.officialOnly === true,
                refreshTimestamp: Date.now()
            }, { timeout: 35000 });

            if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
                setRecommendations(res.data);
            }
        } catch (e) {
            console.error("Failed to fetch AI home recs, checking fallback", e);
            try {
                const fb = await api.get('/recommendations', { timeout: 15000 });
                if (fb.data && Array.isArray(fb.data) && fb.data.length > 0) {
                    setRecommendations(fb.data);
                }
            } catch (err) {}
        }
        setLoading(false);
    };

    const handlePlayHomeItem = async (item: any, idx?: number) => {
        const initialIndex = idx !== undefined && idx >= 0 ? idx : recommendations.findIndex((s: any) => s.id === item.id);
        const startIdx = initialIndex >= 0 ? initialIndex : 0;
        const initialQueue = recommendations.length > 0 ? recommendations : [item];

        playSong(item, initialQueue, startIdx);

        try {
            const prefs: any = await getPreferences();
            const res = await api.post('/ai-recommend', {
                title: item.title,
                author: item.author,
                language: (prefs.languages && prefs.languages[0]) || 'English',
                artists: prefs.artists || [],
                genres: prefs.genres || []
            }, { timeout: 15000 });

            if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
                const existingIds = new Set(initialQueue.map(s => s.id));
                const filtered = res.data.filter((s: any) => !existingIds.has(s.id));
                if (filtered.length > 0) {
                    appendToQueue(filtered);
                }
            }
        } catch (e: any) {
            console.warn("[Home] Background queue recommendation:", e?.message || e);
        }
    };

    const renderGridItem = (item: any, index: number) => (
        <TouchableOpacity key={item.id} style={styles.gridCard} onPress={() => handlePlayHomeItem(item, index)}>
            <Image source={{ uri: item.thumbnail }} style={styles.gridImage} />
            <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
        </TouchableOpacity>
    );

    const renderListItem = ({ item, index }: { item: any; index: number }) => (
        <TouchableOpacity key={item.id} style={styles.listCard} onPress={() => handlePlayHomeItem(item, index)}>
            <Image source={{ uri: item.thumbnail }} style={styles.listImage} />
            <View style={styles.listInfo}>
                <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.listAuthor} numberOfLines={1}>{item.author}</Text>
            </View>
            <LikeButton song={item} size={20} style={{ padding: 8 }} />
            <DownloadButton song={item} style={{ padding: 10 }} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Gradient Background */}
            <View style={styles.gradientBg} />

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 12, 44) }]}>
                <View style={styles.headerRow}>
                    <Text style={styles.greeting}>{getGreeting()}, {userName}</Text>
                    <TouchableOpacity onPress={fetchRecs} style={styles.refreshBtn} activeOpacity={0.7}>
                        <Text style={styles.refreshText}>Refresh</Text>
                    </TouchableOpacity>
                </View>
                
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#1ed760" />
                        <Text style={styles.loading}>Curating your personalized mix...</Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.gridContainer}>
                            {recommendations.slice(0, 6).map((item, index) => renderGridItem(item, index))}
                        </View>

                        <Text style={styles.sectionTitle}>Recommended for you</Text>
                        <View style={styles.listContainer}>
                            {recommendations.slice(6).map((item, index) => renderListItem({item, index: index + 6}))}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: '#09090b',
    },
    gradientBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 300,
        backgroundColor: '#27272a',
        opacity: 0.3,
    },
    scrollContent: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingBottom: 160,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 22,
        fontWeight: 'bold',
        color: 'white',
        flex: 1,
        marginRight: 10,
    },
    refreshBtn: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 20,
    },
    refreshText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    loading: {
        color: '#a1a1aa',
        textAlign: 'center',
        marginTop: 14,
        fontSize: 15,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    gridCard: {
        width: '48%',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        overflow: 'hidden',
        minHeight: 56,
    },
    gridImage: {
        width: 54,
        height: 54,
        flexShrink: 0,
    },
    gridTitle: {
        flex: 1,
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        paddingHorizontal: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 14,
    },
    listContainer: {
        gap: 12,
    },
    listCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 8,
        borderRadius: 8,
    },
    listImage: {
        width: 48,
        height: 48,
        borderRadius: 6,
        flexShrink: 0,
    },
    listInfo: {
        flex: 1,
        marginLeft: 12,
        marginRight: 6,
    },
    listTitle: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    listAuthor: {
        color: '#a1a1aa',
        fontSize: 13,
        marginTop: 2,
    },
    downloadBtn: {
        padding: 10,
    }
});
