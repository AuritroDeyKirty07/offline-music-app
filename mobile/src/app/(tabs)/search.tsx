import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, Check, ArrowLeft } from 'lucide-react-native';
import { api } from '../../services/api';
import { useAudioPlayer } from '../../services/audioPlayer';
import DownloadButton from '../../services/DownloadButton';
import LikeButton from '../../services/LikeButton';
import { getPreferences, savePreferences } from '../../services/preferences';
import { getOfflineSongs } from '../../services/offlineStorage';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PREDEFINED_GENRES = ["Pop", "Hip Hop", "Bollywood", "Lo-Fi", "EDM", "Rock", "R&B"];
const PREDEFINED_LANGUAGES = ["Punjabi", "Hindi", "English", "Haryanvi", "Spanish", "Korean"];

export default function SearchScreen() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
    
    const [artists, setArtists] = useState<any[]>([]);
    const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
    const [visibleArtists, setVisibleArtists] = useState(24);
    const [officialOnly, setOfficialOnly] = useState(true);

    const { playSong, appendToQueue }: any = useAudioPlayer();

    const refreshDownloaded = async () => {
        try {
            const songs = await getOfflineSongs();
            setDownloadedIds(new Set(songs.map((s: any) => s.id)));
        } catch (e) {}
    };

    useFocusEffect(
        useCallback(() => {
            refreshDownloaded();
            getPreferences().then((prefs: any) => {
                if (prefs.artists) setSelectedArtists(prefs.artists);
                if (prefs.genres) setSelectedGenres(prefs.genres);
                if (prefs.languages) {
                    setSelectedLanguages(prefs.languages);
                    fetchArtists(prefs.languages);
                } else {
                    fetchArtists([]);
                }
                if (prefs.officialOnly !== undefined) setOfficialOnly(prefs.officialOnly);
            });
        }, [])
    );

    const fetchArtists = async (langs: string[]) => {
        try {
            const res = await api.post('/ai-artists', { languages: langs });
            if (res.data && res.data.length > 0) {
                setArtists(res.data);
            }
        } catch (e) {
            console.log('Error fetching AI artists', e);
        }
    };

    const savePrefs = (newA: string[], newG: string[], newL: string[]) => {
        getPreferences().then((prefs: any) => {
            savePreferences({ ...prefs, artists: newA, genres: newG, languages: newL });
        });
    };

    const toggleSelection = (item: string, list: string[], setList: (l: string[]) => void, type: string) => {
        let newList: string[] = [];
        if (list.includes(item)) newList = list.filter(i => i !== item);
        else newList = [...list, item];
        
        setList(newList);

        if (type === 'artist') savePrefs(newList, selectedGenres, selectedLanguages);
        if (type === 'genre') savePrefs(selectedArtists, newList, selectedLanguages);
        if (type === 'language') {
            savePrefs(selectedArtists, selectedGenres, newList);
            fetchArtists(newList);
        }
    };

    const performSearch = async (text: string) => {
        setQuery(text);
        if (text.length > 2) {
            setIsSearching(true);
            try {
                const res = await api.get(`/search?q=${encodeURIComponent(text)}&officialOnly=${officialOnly}`);
                setResults(res.data);
            } catch (error) {
                console.error(error);
            }
            setIsSearching(false);
        } else {
            setResults([]);
        }
    };

    const handlePlaySearchItem = async (item: any) => {
        // 1. Play searched song as current track
        playSong(item, [item], 0);

        // 2. Fetch AI recommended tracks based on this song and user's taste preferences in background
        try {
            const prefs: any = await getPreferences();
            const res = await api.post('/ai-recommend', {
                title: item.title,
                author: item.author,
                language: (prefs.languages && prefs.languages[0]) || 'English',
                artists: prefs.artists || [],
                genres: prefs.genres || []
            }, { timeout: 30000 });

            if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
                const filtered = res.data.filter((s: any) => s.id !== item.id);
                appendToQueue(filtered);
            }
        } catch (e: any) {
            console.warn("[Search] Background queue recommendation:", e?.message || e);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isDownloaded = downloadedIds.has(item.id) || item.isDownloaded;

        return (
            <TouchableOpacity style={styles.card} onPress={() => handlePlaySearchItem(item)}>
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                <View style={styles.cardInfo}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.authorRow}>
                        {isDownloaded && (
                            <View style={styles.downloadBadge}>
                                <Check color="#1ed760" size={12} strokeWidth={3} />
                                <Text style={styles.downloadBadgeText}>Downloaded</Text>
                            </View>
                        )}
                        <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
                    </View>
                </View>
                <LikeButton song={item} size={20} style={{ padding: 8 }} />
                <DownloadButton song={item} style={{ padding: 10 }} />
            </TouchableOpacity>
        );
    };

    const renderChip = (list: string[], setList: (l: string[]) => void, type: string, value: string) => {
        const isSelected = list.includes(value);
        return (
            <TouchableOpacity 
                key={value}
                style={[styles.chip, isSelected && styles.chipSelected]} 
                onPress={() => toggleSelection(value, list, setList, type)}
            >
                {isSelected && <Check color="black" size={14} style={{marginRight: 4}}/>}
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{value}</Text>
            </TouchableOpacity>
        );
    };

    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: Math.max(insets.top + 14, 44) }]}>
            <View style={styles.searchBar}>
                {query.trim() ? (
                    <TouchableOpacity onPress={() => setQuery('')} style={{ marginRight: 8, padding: 4 }}>
                        <ArrowLeft color="white" size={24} />
                    </TouchableOpacity>
                ) : (
                    <SearchIcon color="#a1a1aa" size={20} style={{ marginRight: 8 }} />
                )}
                <TextInput
                    style={styles.input}
                    placeholder="What do you want to listen to?"
                    placeholderTextColor="#a1a1aa"
                    value={query}
                    onChangeText={performSearch}
                    returnKeyType="search"
                />
            </View>
            
            {!query.trim() ? (
                <ScrollView contentContainerStyle={styles.tasteContainer}>
                    <Text style={styles.tasteHeader}>Customize Your Taste</Text>
                    
                    <Text style={styles.tasteSubheader}>Languages</Text>
                    <View style={styles.chipContainer}>
                        {PREDEFINED_LANGUAGES.map(l => renderChip(selectedLanguages, setSelectedLanguages, 'language', l))}
                    </View>

                    <View style={styles.artistHeaderRow}>
                        <Text style={styles.tasteSubheader}>Artists</Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            {visibleArtists < artists.length && (
                                <TouchableOpacity onPress={() => setVisibleArtists(prev => Math.min(prev + 12, artists.length))}>
                                    <Text style={styles.loadMoreText}>Show More (+12)</Text>
                                </TouchableOpacity>
                            )}
                            {visibleArtists > 24 && (
                                <TouchableOpacity onPress={() => setVisibleArtists(24)}>
                                    <Text style={[styles.loadMoreText, { color: '#a1a1aa' }]}>Show Less</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    
                    {artists.length === 0 ? (
                        <Text style={{color: '#a1a1aa', marginVertical: 20}}>Loading artists based on languages...</Text>
                    ) : (
                        <View style={styles.artistGrid}>
                            {artists.slice(0, visibleArtists).map(artist => {
                                const isSelected = selectedArtists.includes(artist.name);
                                return (
                                    <TouchableOpacity 
                                        key={artist.name}
                                        style={styles.artistCard} 
                                        onPress={() => toggleSelection(artist.name, selectedArtists, setSelectedArtists, 'artist')}
                                    >
                                        <View style={[styles.artistImgContainer, isSelected && styles.artistSelected]}>
                                            <Image source={{ uri: artist.image }} style={styles.artistImg} />
                                            {isSelected && (
                                                <View style={styles.artistCheck}>
                                                    <Check color="white" size={16} />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={styles.artistName} numberOfLines={1}>{artist.name}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    )}

                    <Text style={styles.tasteSubheader}>Genres</Text>
                    <View style={styles.chipContainer}>
                        {PREDEFINED_GENRES.map(g => renderChip(selectedGenres, setSelectedGenres, 'genre', g))}
                    </View>
                </ScrollView>
            ) : (
                <>
                    {isSearching ? <Text style={styles.loading}>Searching...</Text> : null}
                    <FlatList
                        data={results}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                        keyboardShouldPersistTaps="handled"
                    />
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        backgroundColor: '#09090b',
        paddingHorizontal: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    input: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        marginLeft: 10,
    },
    loading: {
        color: '#a1a1aa',
        textAlign: 'center',
        marginTop: 20,
    },
    list: {
        paddingBottom: 160,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    thumbnail: {
        width: 50,
        height: 50,
        borderRadius: 4,
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    author: {
        color: '#a1a1aa',
        fontSize: 14,
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    downloadBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: 'rgba(30, 215, 96, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    downloadBadgeText: {
        color: '#1ed760',
        fontSize: 11,
        fontWeight: 'bold',
    },
    tasteContainer: {
        paddingBottom: 160,
    },
    tasteHeader: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    tasteSubheader: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        marginTop: 8,
    },
    artistHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    loadMoreText: {
        color: '#1ed760',
        fontSize: 14,
        fontWeight: 'bold',
    },
    artistGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    artistCard: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 16,
    },
    artistImgContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        marginBottom: 8,
        position: 'relative',
    },
    artistImg: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
    },
    artistSelected: {
        borderWidth: 3,
        borderColor: '#1ed760',
        opacity: 0.8,
    },
    artistCheck: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#1ed760',
        borderRadius: 12,
        padding: 4,
    },
    artistName: {
        color: 'white',
        fontSize: 12,
        textAlign: 'center',
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
    },
    chipSelected: {
        backgroundColor: '#1ed760',
    },
    chipText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    chipTextSelected: {
        color: 'black',
    }
});
