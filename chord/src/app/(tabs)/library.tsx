import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Download, Heart, ListMusic, Trash2, ArrowLeft, Play, Shuffle, Plus, X } from 'lucide-react-native';
import { useAudioPlayer } from '../../services/audioPlayer';
import { getOfflineSongs, deleteOfflineSong } from '../../services/offlineStorage';
import { getFavorites, getPlaylists, createPlaylist, deletePlaylist, removeSongFromPlaylist } from '../../services/playlistStorage';
import LikeButton from '../../services/LikeButton';
import DownloadButton from '../../services/DownloadButton';

export default function LibraryScreen() {
    const { playSong } = useAudioPlayer() as any;
    const [tab, setTab] = useState<'downloads' | 'favorites' | 'playlists'>('downloads');
    const [downloads, setDownloads] = useState<any[]>([]);
    const [favorites, setFavorites] = useState<any[]>([]);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<any | null>(null);
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const loadData = async () => {
        const d = await getOfflineSongs();
        const f = await getFavorites();
        const p = await getPlaylists();
        setDownloads(d);
        setFavorites(f);
        setPlaylists(p);
        if (selectedPlaylist) {
            const updated = p.find((item: any) => item.id === selectedPlaylist.id);
            if (updated) setSelectedPlaylist(updated);
        }
    };

    useEffect(() => { loadData(); }, [tab]);

    const handleDeleteDownload = async (songId: string) => {
        await deleteOfflineSong(songId);
        loadData();
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        const pl = await createPlaylist(newPlaylistName.trim());
        if (pl) {
            setNewPlaylistName('');
            setShowCreatePlaylist(false);
            loadData();
        }
    };

    const handleDeletePlaylist = async (plId: string) => {
        await deletePlaylist(plId);
        if (selectedPlaylist?.id === plId) setSelectedPlaylist(null);
        loadData();
    };

    const handleRemoveFromPlaylist = async (plId: string, songId: string) => {
        await removeSongFromPlaylist(plId, songId);
        loadData();
    };

    const playAllPlaylist = (songs: any[]) => {
        if (!songs || songs.length === 0) return;
        playSong(songs[0], songs, 0, { isLibrary: true });
    };

    const shufflePlaylist = (songs: any[]) => {
        if (!songs || songs.length === 0) return;
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        playSong(shuffled[0], shuffled, 0, { isLibrary: true });
    };

    // If a playlist is selected, render the Playlist Details screen
    if (selectedPlaylist) {
        const songs = selectedPlaylist.songs || [];
        return (
            <View style={styles.container}>
                <TouchableOpacity onPress={() => setSelectedPlaylist(null)} style={styles.backBtn}>
                    <ArrowLeft color="#fff" size={20} />
                    <Text style={styles.backBtnText}>Playlists</Text>
                </TouchableOpacity>

                <View style={styles.playlistHeader}>
                    <View style={styles.playlistArtPlaceholder}>
                        <ListMusic color="#1ed760" size={36} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.playlistDetailTitle} numberOfLines={1}>{selectedPlaylist.name}</Text>
                        <Text style={styles.playlistDetailSubtitle}>{songs.length} songs</Text>
                    </View>
                </View>

                {songs.length > 0 && (
                    <View style={styles.playlistActionsRow}>
                        <TouchableOpacity onPress={() => playAllPlaylist(songs)} style={styles.playAllBtn}>
                            <Play color="#000" size={18} fill="#000" />
                            <Text style={styles.playAllBtnText}>Play All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => shufflePlaylist(songs)} style={styles.shuffleBtn}>
                            <Shuffle color="#fff" size={18} />
                            <Text style={styles.shuffleBtnText}>Shuffle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeletePlaylist(selectedPlaylist.id)} style={styles.deletePlBtn}>
                            <Trash2 color="#ef4444" size={18} />
                        </TouchableOpacity>
                    </View>
                )}

                <FlatList
                    data={songs}
                    keyExtractor={(item, idx) => item.id || String(idx)}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No songs in this playlist yet. Browse and add songs from any track menu!</Text>}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity onPress={() => playSong(item, songs, index, { isLibrary: true })} style={styles.songRow}>
                            <Image source={{ uri: item.thumbnail }} style={styles.songThumb} />
                            <View style={styles.songInfo}>
                                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.songAuthor} numberOfLines={1}>{item.author}</Text>
                            </View>
                            <LikeButton song={item} size={20} style={{ marginRight: 10 }} />
                            <DownloadButton song={item} size={20} style={{ marginRight: 10 }} />
                            <TouchableOpacity onPress={() => handleRemoveFromPlaylist(selectedPlaylist.id, item.id)} style={{ padding: 6 }}>
                                <Trash2 color="#ef4444" size={18} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    )}
                />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                    ListEmptyComponent={<Text style={styles.emptyText}>No liked songs yet. Tap heart on any song to save here!</Text>}
                    renderItem={({ item, index }) => (
                        <TouchableOpacity onPress={() => playSong(item, favorites, index, { isLibrary: true })} style={styles.songRow}>
                            <Image source={{ uri: item.thumbnail }} style={styles.songThumb} />
                            <View style={styles.songInfo}>
                                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.songAuthor} numberOfLines={1}>{item.author}</Text>
                            </View>
                            <DownloadButton song={item} size={20} style={{ marginRight: 8 }} />
                        </TouchableOpacity>
                    )}
                />
            )}

            {tab === 'playlists' && (
                <View style={{ flex: 1 }}>
                    {showCreatePlaylist ? (
                        <View style={styles.createPlBox}>
                            <TextInput
                                placeholder="Playlist name..."
                                placeholderTextColor="#71717a"
                                value={newPlaylistName}
                                onChangeText={setNewPlaylistName}
                                autoFocus
                                style={styles.createPlInput}
                            />
                            <View style={styles.createPlBtns}>
                                <TouchableOpacity onPress={() => setShowCreatePlaylist(false)} style={styles.cancelBtn}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleCreatePlaylist} style={styles.savePlBtn}>
                                    <Text style={styles.savePlBtnText}>Create</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => setShowCreatePlaylist(true)} style={styles.newPlBar}>
                            <Plus color="#1ed760" size={20} />
                            <Text style={styles.newPlBarText}>Create New Playlist</Text>
                        </TouchableOpacity>
                    )}

                    <FlatList
                        data={playlists}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={<Text style={styles.emptyText}>No playlists created yet. Create one above!</Text>}
                        renderItem={({ item }) => (
                            <TouchableOpacity onPress={() => setSelectedPlaylist(item)} style={styles.playlistRow}>
                                <View style={styles.playlistThumb}>
                                    <ListMusic color="#1ed760" size={24} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.playlistName}>{item.name}</Text>
                                    <Text style={styles.playlistCount}>{item.songs?.length || 0} songs</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeletePlaylist(item.id)} style={{ padding: 8 }}>
                                    <Trash2 color="#ef4444" size={20} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            )}
        </KeyboardAvoidingView>
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
    emptyText: { color: '#71717a', fontSize: 15, textAlign: 'center', marginTop: 40, paddingHorizontal: 20, lineHeight: 22 },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#18181b' },
    songThumb: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#27272a', marginRight: 12 },
    songInfo: { flex: 1 },
    songTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
    songAuthor: { color: '#71717a', fontSize: 13 },
    playlistRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#18181b' },
    playlistThumb: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#27272a' },
    playlistName: { color: '#fff', fontSize: 16, fontWeight: '600' },
    playlistCount: { color: '#71717a', fontSize: 13, marginTop: 2 },
    newPlBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
    newPlBarText: { color: '#1ed760', fontSize: 15, fontWeight: 'bold', marginLeft: 10 },
    createPlBox: { backgroundColor: '#18181b', padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
    createPlInput: { backgroundColor: '#27272a', color: '#fff', padding: 10, borderRadius: 8, fontSize: 15, marginBottom: 10 },
    createPlBtns: { flexDirection: 'row', justifyContent: 'flex-end' },
    cancelBtn: { paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
    cancelBtnText: { color: '#a1a1aa', fontSize: 14 },
    savePlBtn: { backgroundColor: '#1ed760', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
    savePlBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
    backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    backBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    playlistHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
    playlistArtPlaceholder: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#27272a', alignItems: 'center', justifyContent: 'center' },
    playlistDetailTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    playlistDetailSubtitle: { color: '#a1a1aa', fontSize: 14 },
    playlistActionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    playAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1ed760', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, marginRight: 10 },
    playAllBtnText: { color: '#000', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
    shuffleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272a', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 20, marginRight: 'auto' },
    shuffleBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginLeft: 6 },
    deletePlBtn: { padding: 10, backgroundColor: '#27272a', borderRadius: 20 }
});
