import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { X, Plus, ListMusic, Check } from 'lucide-react-native';
import {
    getPlaylists,
    createPlaylist,
    addSongToPlaylist,
    subscribeToPlaylists
} from './playlistStorage';

export default function AddToPlaylistModal({ visible, song, onClose }) {
    const [playlists, setPlaylists] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [addedMap, setAddedMap] = useState({});

    useEffect(() => {
        if (visible) {
            loadPlaylists();
            setIsCreating(false);
            setNewPlaylistName('');
        }
        const unsubscribe = subscribeToPlaylists((pl) => setPlaylists(pl));
        return () => unsubscribe();
    }, [visible, song]);

    const loadPlaylists = async () => {
        const pl = await getPlaylists();
        setPlaylists(pl);
        if (song) {
            const map = {};
            pl.forEach(p => {
                map[p.id] = p.songs.some(s => s.id === song.id);
            });
            setAddedMap(map);
        }
    };

    const handleCreate = async () => {
        if (!newPlaylistName.trim()) return;
        try {
            const newPl = await createPlaylist(newPlaylistName.trim());
            if (song) {
                await addSongToPlaylist(newPl.id, song);
            }
            setNewPlaylistName('');
            setIsCreating(false);
            loadPlaylists();
        } catch (e) {
            Alert.alert('Error', 'Failed to create playlist');
        }
    };

    const handleSelectPlaylist = async (playlistId) => {
        if (!song) return;
        const success = await addSongToPlaylist(playlistId, song);
        if (success) {
            setAddedMap(prev => ({ ...prev, [playlistId]: true }));
            setTimeout(() => {
                onClose();
            }, 300);
        } else {
            Alert.alert('Info', 'Song is already in this playlist');
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.backdrop}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.backdropTouch}>
                        <View style={styles.sheet}>
                            <View style={styles.header}>
                                <Text style={styles.title}>Add to Playlist</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <X color="white" size={22} />
                                </TouchableOpacity>
                            </View>

                            {song && (
                                <Text style={styles.songSub} numberOfLines={1}>
                                    "{song.title}" • {song.author}
                                </Text>
                            )}

                            {isCreating ? (
                                <View style={styles.createBox}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Playlist title..."
                                        placeholderTextColor="#71717a"
                                        value={newPlaylistName}
                                        onChangeText={setNewPlaylistName}
                                        autoFocus
                                    />
                                    <View style={styles.createBtnRow}>
                                        <TouchableOpacity
                                            style={[styles.btn, styles.cancelBtn]}
                                            onPress={() => setIsCreating(false)}
                                        >
                                            <Text style={styles.cancelText}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.btn, styles.saveBtn]}
                                            onPress={handleCreate}
                                        >
                                            <Text style={styles.saveText}>Create</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.newPlaylistRow}
                                    onPress={() => setIsCreating(true)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.plusIconBox}>
                                        <Plus color="#1ed760" size={22} />
                                    </View>
                                    <Text style={styles.newPlaylistText}>New Playlist</Text>
                                </TouchableOpacity>
                            )}

                            <FlatList
                                data={playlists}
                                keyExtractor={item => item.id}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                keyboardShouldPersistTaps="handled"
                                renderItem={({ item }) => {
                                    const alreadyAdded = addedMap[item.id];
                                    return (
                                        <TouchableOpacity
                                            style={styles.playlistItem}
                                            onPress={() => handleSelectPlaylist(item.id)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.iconBox}>
                                                <ListMusic color="#a1a1aa" size={20} />
                                            </View>
                                            <View style={styles.itemInfo}>
                                                <Text style={styles.itemName}>{item.name}</Text>
                                                <Text style={styles.itemCount}>{item.songs.length} songs</Text>
                                            </View>
                                            {alreadyAdded && (
                                                <Check color="#1ed760" size={18} strokeWidth={3} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    !isCreating ? (
                                        <Text style={styles.emptyText}>No custom playlists yet. Create one above!</Text>
                                    ) : null
                                }
                            />
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    backdropTouch: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#18181b',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '75%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    closeBtn: {
        padding: 4,
    },
    songSub: {
        fontSize: 13,
        color: '#a1a1aa',
        marginBottom: 16,
    },
    newPlaylistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    plusIconBox: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: 'rgba(30, 215, 96, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    newPlaylistText: {
        color: '#1ed760',
        fontSize: 16,
        fontWeight: 'bold',
    },
    createBox: {
        marginBottom: 16,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        color: 'white',
        fontSize: 15,
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    createBtnRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    btn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    cancelBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    cancelText: {
        color: '#a1a1aa',
        fontWeight: '600',
    },
    saveBtn: {
        backgroundColor: '#1ed760',
    },
    saveText: {
        color: 'black',
        fontWeight: 'bold',
    },
    playlistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    itemInfo: {
        flex: 1,
    },
    itemName: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    itemCount: {
        color: '#71717a',
        fontSize: 13,
        marginTop: 2,
    },
    emptyText: {
        color: '#71717a',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    },
});
