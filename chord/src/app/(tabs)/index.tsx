import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Sparkles, Flame } from 'lucide-react-native';
import { useAudioPlayer } from '../../services/audioPlayer';
import { getAiHomeRecommendations } from '../../services/gemini';
import { searchMusic } from '../../services/youtube';
import { getPreferences } from '../../services/preferences';
import LikeButton from '../../services/LikeButton';
import DownloadButton from '../../services/DownloadButton';

export default function HomeScreen() {
    const { playSong } = useAudioPlayer() as any;
    const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
    const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMood, setSelectedMood] = useState('All');

    const MOODS = ['All', 'Punjabi Hits', 'Bollywood Romantic', 'Hip-Hop Vibes', 'Chill Lofi', 'Gym Workout'];

    const getMoodQuery = (mood: string) => {
        switch (mood) {
            case 'Punjabi Hits': return 'Trending Punjabi Songs 2024';
            case 'Bollywood Romantic': return 'Bollywood Romantic Songs';
            case 'Hip-Hop Vibes': return 'Desi Hip Hop Rap Songs';
            case 'Chill Lofi': return 'Hindi Lofi Songs';
            case 'Gym Workout': return 'Workout Motivation Songs Hindi Punjabi';
            default: return 'Trending Indian Songs 2024';
        }
    };

    const loadContent = async (mood = selectedMood) => {
        setLoading(true);
        try {
            const prefs = await getPreferences();
            const aiRecs = await getAiHomeRecommendations(prefs);
            setAiRecommendations(aiRecs);

            const query = getMoodQuery(mood);
            const trending = await searchMusic(query, 15);
            setTrendingSongs(trending);
        } catch (_) {}
        setLoading(false);
    };

    useEffect(() => { loadContent(selectedMood); }, [selectedMood]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadContent(selectedMood);
        setRefreshing(false);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#1ed760"
                    progressViewOffset={60}
                />
            }
        >
            <View style={styles.header}>
                <Text style={styles.brandTitle}>CHORD</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodsScroll}>
                {MOODS.map(m => (
                    <TouchableOpacity key={m} onPress={() => setSelectedMood(m)} style={[styles.moodChip, selectedMood === m && styles.moodChipActive]}>
                        <Text style={[styles.moodText, selectedMood === m && styles.moodTextActive]}>{m}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {loading && !refreshing ? (
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color="#1ed760" />
                    <Text style={styles.loaderText}>Loading music & AI recommendations...</Text>
                </View>
            ) : (
                <>
                    <View style={styles.sectionHeader}>
                        <Sparkles color="#1ed760" size={20} />
                        <Text style={styles.sectionTitle}>AI For You</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        {aiRecommendations.map((song, idx) => (
                            <TouchableOpacity key={song.id || idx} onPress={() => playSong(song, aiRecommendations, idx)} style={styles.card}>
                                <Image source={{ uri: song.thumbnail }} style={styles.cardThumb} />
                                <Text style={styles.cardTitle} numberOfLines={1}>{song.title}</Text>
                                <Text style={styles.cardAuthor} numberOfLines={1}>{song.author}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                        <Flame color="#ef4444" size={20} />
                        <Text style={styles.sectionTitle}>{selectedMood === 'All' ? 'Trending Tracks' : selectedMood}</Text>
                    </View>
                    {trendingSongs.map((song, idx) => (
                        <TouchableOpacity key={song.id || idx} onPress={() => playSong(song, trendingSongs, idx)} style={styles.songRow}>
                            <Image source={{ uri: song.thumbnail }} style={styles.songRowThumb} />
                            <View style={styles.songRowInfo}>
                                <Text style={styles.songRowTitle} numberOfLines={1}>{song.title}</Text>
                                <Text style={styles.songRowAuthor} numberOfLines={1}>{song.author}</Text>
                            </View>
                            <LikeButton song={song} size={22} style={{ marginRight: 12 }} />
                            <DownloadButton song={song} size={22} />
                        </TouchableOpacity>
                    ))}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    content: { padding: 20, paddingBottom: 100, paddingTop: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    brandTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 1.5 },
    moodsScroll: { marginBottom: 20 },
    moodChip: { backgroundColor: '#18181b', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#27272a' },
    moodChipActive: { backgroundColor: '#1ed760', borderColor: '#1ed760' },
    moodText: { color: '#a1a1aa', fontSize: 14, fontWeight: '500' },
    moodTextActive: { color: '#000', fontWeight: 'bold' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
    horizontalScroll: { marginBottom: 10 },
    card: { width: 140, marginRight: 14 },
    cardThumb: { width: 140, height: 140, borderRadius: 12, backgroundColor: '#27272a', marginBottom: 8 },
    cardTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
    cardAuthor: { color: '#71717a', fontSize: 12 },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#18181b' },
    songRowThumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#27272a', marginRight: 12 },
    songRowInfo: { flex: 1, marginRight: 8 },
    songRowTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
    songRowAuthor: { color: '#71717a', fontSize: 13 },
    centerLoader: { paddingVertical: 40, alignItems: 'center' },
    loaderText: { color: '#71717a', fontSize: 14, marginTop: 10 }
});
