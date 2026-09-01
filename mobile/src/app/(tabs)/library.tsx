import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    Alert,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOfflineSongs, removeOfflineSong } from '../../services/offlineStorage';
import {
    getLikedSongs,
    getPlaylists,
    createPlaylist,
    deletePlaylist,
    removeSongFromPlaylist,
    subscribeToLikes,
    subscribeToPlaylists
} from '../../services/playlistStorage';
import { useAudioPlayer } from '../../services/audioPlayer';
import LikeButton from '../../services/LikeButton';
import {
    Trash2,
    Play,
    Shuffle,
    DownloadCloud,
    Heart,
    ListMusic,
    Plus,
    X,
    ChevronRight,
    Music2
} from 'lucide-react-native';

type OfflineSong = {
    id: string;
    title: string;
    author: string;
    thumbnail?: string;
    localUri?: string;
    duration?: number;
    isOffline?: boolean;
};

export default function LibraryScreen() {
    const [activeTab, setActiveTab] = useState<'downloads' | 'playlists'>('downloads');
    const [downloads, setDownloads] = useState<OfflineSong[]>([]);
    const [likedSongs, setLikedSongs] = useState<any[]>([]);
    const [playlists, setPlaylists] = useState<any[]>([]);
    
    // Playlist Modal / Detail states
    const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
    const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const { playSong }: any = useAudioPlayer();
    const insets = useSafeAreaInsets();

    const loadData = async () => {
        const [off, liked, pl] = await Promise.all([
            getOfflineSongs(),
            getLikedSongs(),
            getPlaylists()
        ]);
        setDownloads(off as OfflineSong[]);
        setLikedSongs(liked);
        setPlaylists(pl);

        // Update active playlist view if open
        if (selectedPlaylist) {
            if (selectedPlaylist.id === 'liked') {
                setSelectedPlaylist({ id: 'liked', name: 'Liked Songs', songs: liked });
            } else {
                const refreshed = pl.find((p: any) => p.id === selectedPlaylist.id);
                setSelectedPlaylist(refreshed || null);
            }
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        const un1 = subscribeToLikes(() => loadData());
        const un2 = subscribeToPlaylists(() => loadData());
        return () => {
            un1();
            un2();
        };
    }, []);

    const handleRemoveDownload = async (id: string, title: string) => {
        Alert.alert(
            'Remove Download',
            `Delete "${title}" from offline downloads?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await removeOfflineSong(id);
                        await loadData();
                    },
                },
            ]
        );
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        try {
            await createPlaylist(newPlaylistName.trim());
            setNewPlaylistName('');
            setIsCreatingPlaylist(false);
            await loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to create playlist');
        }
    };

    const handleDeletePlaylist = (playlistId: string, name: string) => {
        Alert.alert(
            'Delete Playlist',
            `Are you sure you want to delete "${name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deletePlaylist(playlistId);
                        setSelectedPlaylist(null);
                        await loadData();
                    }
                }
            ]
        );
    };

    const handleRemoveFromPlaylist = async (playlistId: string, songId: string) => {
        await removeSongFromPlaylist(playlistId, songId);
        await loadData();
    };

    const playSongList = (songList: any[], startIndex = 0, isShuffle = false) => {
        if (!songList || songList.length === 0) return;
        let listToPlay = [...songList];
        if (isShuffle) {
            listToPlay = listToPlay.sort(() => Math.random() - 0.5);
            playSong(listToPlay[0], listToPlay, 0, { isLibrary: true });
        } else {
            playSong(listToPlay[startIndex], listToPlay, startIndex, { isLibrary: true });
        }
    };

    const renderDownloadItem = ({
        item,
        index,
    }: {
        item: OfflineSong;
        index: number;
    }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => playSongList(downloads, index)}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: item.thumbnail }}
                style={styles.thumbnail}
            />

            <View style={styles.cardInfo}>
                <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.author} numberOfLines={1}>
                    {item.author}
                </Text>
            </View>

            <LikeButton song={item} size={20} style={{ padding: 8 }} />

            <TouchableOpacity
                onPress={() => handleRemoveDownload(item.id, item.title)}
                style={styles.actionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Trash2 color="#ef4444" size={18} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: Math.max(insets.top + 14, 44) }]}>
            {/* Main Header */}
            <View style={styles.headerBlock}>
                <Text style={styles.header}>Your Library</Text>

                {/* Segmented Tab Switcher */}
                <View style={styles.tabSwitcher}>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'downloads' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('downloads')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'downloads' && styles.tabTextActive]}>
                            Downloads ({downloads.length})
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'playlists' && styles.tabBtnActive]}
                        onPress={() => setActiveTab('playlists')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'playlists' && styles.tabTextActive]}>
                            Playlists ({playlists.length + 1})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* TAB CONTENT: DOWNLOADS */}
            {activeTab === 'downloads' && (
                <>
                    <View style={styles.headerRow}>
                        <Text style={styles.subheader}>
                            {downloads.length} Downloaded {downloads.length === 1 ? 'Song' : 'Songs'}
                        </Text>

                        {downloads.length > 0 && (
                            <View style={styles.controlsRow}>
                                <TouchableOpacity
                                    style={styles.shuffleBtn}
                                    onPress={() => playSongList(downloads, 0, true)}
                                    activeOpacity={0.8}
                                >
                                    <Shuffle color="white" size={18} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.playAllBtn}
                                    onPress={() => playSongList(downloads, 0)}
                                    activeOpacity={0.8}
                                >
                                    <Play color="black" size={18} fill="black" style={{ marginLeft: 2 }} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {downloads.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <DownloadCloud color="#52525b" size={64} style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyTitle}>No downloads yet</Text>
                            <Text style={styles.emptyText}>
                                Songs you download will appear here for instant offline playback.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={downloads}
                            keyExtractor={(item) => item.id}
                            renderItem={renderDownloadItem}
                            contentContainerStyle={styles.list}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </>
            )}

            {/* TAB CONTENT: PLAYLISTS */}
            {activeTab === 'playlists' && (
                <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                    {/* Liked Songs Special Banner Card */}
                    <TouchableOpacity
                        style={styles.likedSongsCard}
                        onPress={() => setSelectedPlaylist({ id: 'liked', name: 'Liked Songs', songs: likedSongs })}
                        activeOpacity={0.85}
                    >
                        <View style={styles.heartBox}>
                            <Heart color="white" fill="white" size={28} />
                        </View>
                        <View style={styles.likedInfo}>
                            <Text style={styles.likedTitle}>Liked Songs</Text>
                            <Text style={styles.likedSub}>{likedSongs.length} tracks</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.circlePlayBtn}
                            onPress={() => playSongList(likedSongs, 0)}
                        >
                            <Play color="black" size={18} fill="currentColor" />
                        </TouchableOpacity>
                    </TouchableOpacity>

                    {/* Create New Playlist Button */}
                    <TouchableOpacity
                        style={styles.createPlaylistRow}
                        onPress={() => setIsCreatingPlaylist(true)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.plusBox}>
                            <Plus color="#1ed760" size={22} />
                        </View>
                        <Text style={styles.createPlaylistText}>New Custom Playlist</Text>
                    </TouchableOpacity>

                    {/* Custom Playlists List */}
                    <Text style={styles.sectionHeader}>Your Playlists</Text>

                    {playlists.length === 0 ? (
                        <View style={styles.emptyPlaylists}>
                            <Music2 color="#52525b" size={48} style={{ marginBottom: 12 }} />
                            <Text style={styles.emptyTitle}>No custom playlists</Text>
                            <Text style={styles.emptyText}>
                                Tap "New Custom Playlist" above to group your favorite songs together.
                            </Text>
                        </View>
                    ) : (
                        playlists.map((pl) => (
                            <TouchableOpacity
                                key={pl.id}
                                style={styles.playlistRow}
                                onPress={() => setSelectedPlaylist(pl)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.playlistIconBox}>
                                    <ListMusic color="#1ed760" size={22} />
                                </View>
                                <View style={styles.playlistInfo}>
                                    <Text style={styles.playlistName}>{pl.name}</Text>
                                    <Text style={styles.playlistCount}>{pl.songs.length} songs</Text>
                                </View>
                                <ChevronRight color="#52525b" size={20} />
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>
            )}

            {/* CREATE PLAYLIST MODAL */}
            <Modal
                visible={isCreatingPlaylist}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsCreatingPlaylist(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalBackdrop}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
                >
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Create New Playlist</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Gym Hype, Late Night Vibes"
                            placeholderTextColor="#71717a"
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            autoFocus
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalCancelBtn]}
                                onPress={() => setIsCreatingPlaylist(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalSaveBtn]}
                                onPress={handleCreatePlaylist}
                            >
                                <Text style={styles.modalSaveText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* PLAYLIST DETAIL VIEW MODAL */}
            <Modal
                visible={!!selectedPlaylist}
                animationType="slide"
                onRequestClose={() => setSelectedPlaylist(null)}
            >
                <View style={[styles.detailContainer, { paddingTop: Math.max(insets.top + 14, 44) }]}>
                    <View style={styles.detailHeader}>
                        <TouchableOpacity onPress={() => setSelectedPlaylist(null)} style={styles.closeBtn}>
                            <X color="white" size={24} />
                        </TouchableOpacity>
                        <Text style={styles.detailTitle} numberOfLines={1}>
                            {selectedPlaylist?.name}
                        </Text>
                        {selectedPlaylist?.id !== 'liked' ? (
                            <TouchableOpacity
                                onPress={() => handleDeletePlaylist(selectedPlaylist.id, selectedPlaylist.name)}
                                style={styles.deletePlBtn}
                            >
                                <Trash2 color="#ef4444" size={20} />
                            </TouchableOpacity>
                        ) : <View style={{ width: 24 }} />}
                    </View>

                    <View style={styles.detailControlRow}>
                        <Text style={styles.detailTrackCount}>
                            {selectedPlaylist?.songs?.length || 0} tracks
                        </Text>
                        {selectedPlaylist?.songs?.length > 0 && (
                            <View style={styles.controlsRow}>
                                <TouchableOpacity
                                    style={styles.shuffleBtn}
                                    onPress={() => playSongList(selectedPlaylist.songs, 0, true)}
                                    activeOpacity={0.8}
                                >
                                    <Shuffle color="white" size={18} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.playAllBtn}
                                    onPress={() => playSongList(selectedPlaylist.songs, 0)}
                                    activeOpacity={0.8}
                                >
                                    <Play color="black" size={18} fill="black" style={{ marginLeft: 2 }} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <FlatList
                        data={selectedPlaylist?.songs || []}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        renderItem={({ item, index }) => (
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => playSongList(selectedPlaylist.songs, index)}
                                activeOpacity={0.7}
                            >
                                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                                <View style={styles.cardInfo}>
                                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                                    <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
                                </View>
                                <LikeButton song={item} size={20} style={{ padding: 8 }} />
                                {selectedPlaylist.id !== 'liked' && (
                                    <TouchableOpacity
                                        onPress={() => handleRemoveFromPlaylist(selectedPlaylist.id, item.id)}
                                        style={styles.actionBtn}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Trash2 color="#71717a" size={16} />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Music2 color="#52525b" size={54} style={{ marginBottom: 12 }} />
                                <Text style={styles.emptyTitle}>This playlist is empty</Text>
                                <Text style={styles.emptyText}>
                                    Tap the heart icon or playlist icon on any track to add it here.
                                </Text>
                            </View>
                        }
                    />
                </View>
            </Modal>
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
    headerBlock: {
        marginBottom: 16,
    },
    header: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: -0.5,
        marginBottom: 14,
    },
    tabSwitcher: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        padding: 4,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 20,
    },
    tabBtnActive: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    tabText: {
        color: '#a1a1aa',
        fontSize: 13,
        fontWeight: '600',
    },
    tabTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    subheader: {
        fontSize: 14,
        color: '#1ed760',
        fontWeight: '600',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    playAllBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1ed760',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1ed760',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    shuffleBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    likedSongsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(225, 29, 72, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(225, 29, 72, 0.3)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
    },
    heartBox: {
        width: 50,
        height: 50,
        borderRadius: 10,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    likedInfo: {
        flex: 1,
    },
    likedTitle: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
    },
    likedSub: {
        color: '#fb7185',
        fontSize: 13,
        marginTop: 2,
    },
    circlePlayBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1ed760',
        alignItems: 'center',
        justifyContent: 'center',
    },
    createPlaylistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 215, 96, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(30, 215, 96, 0.25)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
    },
    plusBox: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: 'rgba(30, 215, 96, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    createPlaylistText: {
        color: '#1ed760',
        fontSize: 15,
        fontWeight: 'bold',
    },
    sectionHeader: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    playlistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
    },
    playlistIconBox: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    playlistInfo: {
        flex: 1,
    },
    playlistName: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    playlistCount: {
        color: '#a1a1aa',
        fontSize: 13,
        marginTop: 2,
    },
    emptyPlaylists: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 6,
    },
    emptyText: {
        color: '#a1a1aa',
        textAlign: 'center',
        maxWidth: 260,
        fontSize: 14,
        lineHeight: 20,
    },
    list: {
        paddingBottom: 160,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        padding: 10,
        borderRadius: 10,
    },
    thumbnail: {
        width: 48,
        height: 48,
        borderRadius: 6,
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    author: {
        color: '#a1a1aa',
        fontSize: 13,
        marginTop: 3,
    },
    actionBtn: {
        padding: 8,
        marginLeft: 2,
    },
    // Modal styles
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalBox: {
        width: '100%',
        backgroundColor: '#18181b',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 14,
    },
    modalInput: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        color: 'white',
        fontSize: 15,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    modalBtnRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    modalBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    modalCancelBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    modalCancelText: {
        color: '#a1a1aa',
        fontWeight: '600',
    },
    modalSaveBtn: {
        backgroundColor: '#1ed760',
    },
    modalSaveText: {
        color: 'black',
        fontWeight: 'bold',
    },
    // Detail View Styles
    detailContainer: {
        flex: 1,
        backgroundColor: '#09090b',
        paddingHorizontal: 16,
    },
    detailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    detailTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    closeBtn: {
        padding: 6,
    },
    deletePlBtn: {
        padding: 6,
    },
    detailControlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    detailTrackCount: {
        color: '#1ed760',
        fontSize: 14,
        fontWeight: '600',
    },
});