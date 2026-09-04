import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Plus, Music } from 'lucide-react-native';
import { getPlaylists, createPlaylist, addSongToPlaylist } from './playlistStorage';

export default function AddToPlaylistModal({ visible, onClose, song }) {
    const [playlists, setPlaylists] = useState([]);
    const [newTitle, setNewTitle] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (visible) getPlaylists().then(setPlaylists);
    }, [visible]);

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        const pl = await createPlaylist(newTitle.trim());
        if (pl) {
            if (song) await addSongToPlaylist(pl.id, song);
            setNewTitle('');
            setShowCreate(false);
            onClose();
        }
    };

    const handleSelect = async (plId) => {
        if (song) {
            await addSongToPlaylist(plId, song);
            onClose();
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <Text style={styles.title}>Add to Playlist</Text>
                            <TouchableOpacity onPress={onClose}><X color="#fff" size={24} /></TouchableOpacity>
                        </View>
                        {showCreate ? (
                            <View style={styles.createBox}>
                                <TextInput
                                    placeholder="Playlist Name"
                                    placeholderTextColor="#71717a"
                                    value={newTitle}
                                    onChangeText={setNewTitle}
                                    style={styles.input}
                                    autoFocus
                                />
                                <TouchableOpacity onPress={handleCreate} style={styles.createBtn}>
                                    <Text style={styles.createBtnText}>Create & Add</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.newPlaylistBtn}>
                                <Plus color="#1ed760" size={20} />
                                <Text style={styles.newPlaylistText}>New Playlist</Text>
                            </TouchableOpacity>
                        )}
                        <FlatList
                            data={playlists}
                            keyExtractor={item => item.id}
                            style={{ maxHeight: 260 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity onPress={() => handleSelect(item.id)} style={styles.item}>
                                    <Music color="#a1a1aa" size={20} />
                                    <Text style={styles.itemName}>{item.name}</Text>
                                    <Text style={styles.itemCount}>{item.songs?.length || 0} songs</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    newPlaylistBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#27272a' },
    newPlaylistText: { color: '#1ed760', fontSize: 16, fontWeight: '600', marginLeft: 10 },
    item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#27272a' },
    itemName: { color: '#fff', fontSize: 16, marginLeft: 12, flex: 1 },
    itemCount: { color: '#71717a', fontSize: 14 },
    createBox: { marginBottom: 16 },
    input: { backgroundColor: '#27272a', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16, marginBottom: 10 },
    createBtn: { backgroundColor: '#1ed760', padding: 12, borderRadius: 8, alignItems: 'center' },
    createBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});
