import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { useAudioPlayer } from '../../services/audioPlayer';
import { searchMusic } from '../../services/youtube';
import LikeButton from '../../services/LikeButton';
import DownloadButton from '../../services/DownloadButton';

export default function SearchScreen() {
    const { playSong } = useAudioPlayer() as any;
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const QUICK_SEARCHES = ['Karan Aujla', 'Arijit Singh', 'Sidhu Moose Wala', 'AP Dhillon', 'Diljit Dosanjh', 'Taylor Swift', 'Coldplay'];

    const handleSearch = async (textToSearch = query) => {
        if (!textToSearch.trim()) return;
        setLoading(true);
        try {
            const res = await searchMusic(textToSearch);
            setResults(res);
        } catch (_) {}
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputBox}>
                <SearchIcon color="#71717a" size={20} style={{ marginRight: 8 }} />
                <TextInput
                    placeholder="Search songs, artists, albums..."
                    placeholderTextColor="#71717a"
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={() => handleSearch()}
                    returnKeyType="search"
                    style={styles.input}
                />
                {query.length > 0 && (
                    <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                        <X color="#71717a" size={20} />
                    </TouchableOpacity>
                )}
            </View>

            {results.length === 0 && !loading && (
                <View style={styles.quickBox}>
                    <Text style={styles.quickTitle}>Popular Searches</Text>
                    <View style={styles.chipContainer}>
                        {QUICK_SEARCHES.map(artist => (
                            <TouchableOpacity key={artist} onPress={() => { setQuery(artist); handleSearch(artist); }} style={styles.chip}>
                                <Text style={styles.chipText}>{artist}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {loading ? (
                <View style={styles.centerLoader}><ActivityIndicator size="large" color="#1ed760" /></View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity onPress={() => playSong(item, results, index)} style={styles.songRow}>
                            <Image source={{ uri: item.thumbnail }} style={styles.songRowThumb} />
                            <View style={styles.songRowInfo}>
                                <Text style={styles.songRowTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.songRowAuthor} numberOfLines={1}>{item.author}</Text>
                            </View>
                            <LikeButton song={item} size={22} style={{ marginRight: 12 }} />
                            <DownloadButton song={item} size={22} />
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b', paddingHorizontal: 20, paddingTop: 40 },
    inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#27272a', marginBottom: 16 },
    input: { flex: 1, color: '#fff', fontSize: 16 },
    quickBox: { marginTop: 20 },
    quickTitle: { color: '#a1a1aa', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: { backgroundColor: '#18181b', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#27272a' },
    chipText: { color: '#d4d4d8', fontSize: 14 },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#18181b' },
    songRowThumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#27272a', marginRight: 12 },
    songRowInfo: { flex: 1, marginRight: 8 },
    songRowTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
    songRowAuthor: { color: '#71717a', fontSize: 13 },
    centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
