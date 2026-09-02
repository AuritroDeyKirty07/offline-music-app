import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { Download, Heart, ListMusic, Trash2 } from 'lucide-react-native';
import { useAudioPlayer } from '../../services/audioPlayer';
import { getOfflineSongs, deleteOfflineSong } from '../../services/offlineStorage';
import { getFavorites, getPlaylists, deletePlaylist } from '../../services/playlistStorage';

export default function LibraryScreen() {
    const { playSong } = useAudioPlayer() as any;
    const [tab, setTab] = useState<'downloads' | 'favorites' | 'playlists'>('downloads');
    const [downloads, setDownloads] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [playlists, setPlaylists] = useState<any[]>([]);

    const loadData = async () => {
        setDownloads(await getOfflineSongs());
        setFavorites(await getFavorites());
        setPlaylists(await getPlaylists());
    };

    useEffect(() => { loadData(); }, [tab]);

    const handleDeleteDownload = async (songId: string) => {
        await deleteOfflineSong(songId);
        loadData();
    };

    const handleDeletePlaylist = async (plId: string) => {
        await deletePlaylist(plId);
        loadData();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Library</Text>

            <View style={styles.tabsRow}>
                <TouchableOpacity onPress={() => setTab('downloads')} style={[styles.tabBtn, tab === 'downloads' && styles.tabBtnActive]}>
                    <Download color={tab === 'downloads' ? '#1ed760' : '#71717a'} size={18} />
                    <Text style={[styles.tabText, tab === 'downloads' && styles.tabTextActive]}>Offline ({downloads.length})</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setTab('favorites')} style={[styles.tabBtn, tab === 'favorites' && styles.tabBtnActive]}>
                    <Heart color={tab === 'favorites' ? '#1ed760' : '#71717a'} size={18} />
                    <Text style={[styles.tabText, tab === 'favorites' && styles.tabTextActive]}>Favorites ({favorites.length})</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setTab('playlists')} style={[styles.tabBtn, tab === 'playlists' && styles.tabBtnActive]}>
                    <ListMusic color={tab === 'playlists' ? '#1ed760' : '#71717a'} size={18} />
                    <Text style={[styles.tabText, tab === 'playlists' && styles.tabTextActive]}>Playlists ({playlists.length})</Text>
                </TouchableOpacity>
            </View>

            {tab === 'downloads' && (
                <FlatList
                    data={downloads}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No downloaded songs yet. Tap download on any track to save 100% offline!</Text>}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity onPress={() => playSong(item, downloads, index, { isLibrary: true })} style={styles.songRow}>
                            <Image source={{ uri: item.thumbnail }} style={styles.songThumb} />
                            <View style={styles.songInfo}>
                                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.songAuthor} numberOfLines={1}>{item.author}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteDownload(item.id)} style={{ padding: 8 }}>
                                <Trash2 color="#ef4444" size={20} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                />
            )}

            {tab === 'favorites' && (
                <FlatList
                    data={favorites}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No liked songs yet.</Text>}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity onPress={() => playSong(item, favorites, index, { isLibrary: true })} style={styles.songRow}>
                            <Image source={{ uri: item.thumbnail }} style={styles.songThumb} />
                            <View style={styles.songInfo}>
                                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.songAuthor} numberOfLines={1}>{item.author}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {tab === 'playlists' && (
                <FlatList
                    data={playlists}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No playlists created yet.</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.playlistRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.playlistName}>{item.name}</Text>
                                <Text style={styles.playlistCount}>{item.songs?.length || 0} songs</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleDeletePlaylist(item.id)} style={{ padding: 8 }}>
                                <Trash2 color="#ef4444" size={20} />
                            </TouchableOpacity>
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b', paddingHorizontal: 20, paddingTop: 40 },
    title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 16 },
    tabsRow: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 12, padding: 4, marginBottom: 20 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8 },
    tabBtnActive: { backgroundColor: '#27272a' },
    tabText: { color: '#71717a', fontSize: 13, fontWeight: '600', marginLeft: 6 },
    tabTextActive: { color: '#1ed760' },
    emptyText: { color: '#71717a', fontSize: 15, textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#18181b' },
    songThumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#27272a', marginRight: 12 },
    songInfo: { flex: 1 },
    songTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
    songAuthor: { color: '#71717a', fontSize: 13 },
    playlistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#18181b' },
    playlistName: { color: '#fff', fontSize: 16, fontWeight: '600' },
    playlistCount: { color: '#71717a', fontSize: 13, marginTop: 2 }
});
