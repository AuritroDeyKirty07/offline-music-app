import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const LIKED_SONGS_KEY = '@chord_liked_songs';
const PLAYLISTS_KEY = '@chord_custom_playlists';

const isServerSide = typeof window === 'undefined' && Platform.OS === 'web';

const listeners = {
    likes: new Set(),
    playlists: new Set()
};

const notifyLikes = (likedList) => {
    listeners.likes.forEach(cb => {
        try { cb(likedList); } catch (e) {}
    });
};

const notifyPlaylists = (playlistList) => {
    listeners.playlists.forEach(cb => {
        try { cb(playlistList); } catch (e) {}
    });
};

export const subscribeToLikes = (callback) => {
    listeners.likes.add(callback);
    return () => listeners.likes.delete(callback);
};

export const subscribeToPlaylists = (callback) => {
    listeners.playlists.add(callback);
    return () => listeners.playlists.delete(callback);
};

// ============================================================
// LIKED SONGS
// ============================================================

export const getLikedSongs = async () => {
    if (isServerSide) return [];
    try {
        const raw = await AsyncStorage.getItem(LIKED_SONGS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to load liked songs', e);
        return [];
    }
};

export const isSongLiked = async (songId) => {
    if (!songId) return false;
    const liked = await getLikedSongs();
    return liked.some(s => s.id === songId);
};

export const toggleLikeSong = async (song) => {
    if (!song || !song.id) return false;
    try {
        const liked = await getLikedSongs();
        const exists = liked.some(s => s.id === song.id);
        let updated;

        if (exists) {
            updated = liked.filter(s => s.id !== song.id);
        } else {
            const cleanSong = {
                id: song.id,
                title: song.title || 'Unknown Title',
                author: song.author || 'Unknown Artist',
                thumbnail: song.thumbnail || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`,
                duration: song.duration || 210,
                likedAt: Date.now()
            };
            updated = [cleanSong, ...liked];
        }

        await AsyncStorage.setItem(LIKED_SONGS_KEY, JSON.stringify(updated));
        notifyLikes(updated);
        return !exists;
    } catch (e) {
        console.error('Failed to toggle like song', e);
        return false;
    }
};

// ============================================================
// CUSTOM PLAYLISTS
// ============================================================

export const getPlaylists = async () => {
    try {
        const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to load playlists', e);
        return [];
    }
};

export const getPlaylist = async (playlistId) => {
    const playlists = await getPlaylists();
    return playlists.find(p => p.id === playlistId) || null;
};

export const createPlaylist = async (name) => {
    if (!name || !name.trim()) throw new Error('Playlist name is required');
    try {
        const playlists = await getPlaylists();
        const newPlaylist = {
            id: `pl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: name.trim(),
            songs: [],
            createdAt: Date.now()
        };
        const updated = [newPlaylist, ...playlists];
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
        notifyPlaylists(updated);
        return newPlaylist;
    } catch (e) {
        console.error('Failed to create playlist', e);
        throw e;
    }
};

export const deletePlaylist = async (playlistId) => {
    try {
        const playlists = await getPlaylists();
        const updated = playlists.filter(p => p.id !== playlistId);
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
        notifyPlaylists(updated);
        return true;
    } catch (e) {
        console.error('Failed to delete playlist', e);
        return false;
    }
};

export const addSongToPlaylist = async (playlistId, song) => {
    if (!playlistId || !song || !song.id) return false;
    try {
        const playlists = await getPlaylists();
        const playlistIndex = playlists.findIndex(p => p.id === playlistId);
        if (playlistIndex === -1) return false;

        const target = playlists[playlistIndex];
        if (target.songs.some(s => s.id === song.id)) {
            return false; // Already in playlist
        }

        const cleanSong = {
            id: song.id,
            title: song.title || 'Unknown Title',
            author: song.author || 'Unknown Artist',
            thumbnail: song.thumbnail || `https://i.ytimg.com/vi/${song.id}/hqdefault.jpg`,
            duration: song.duration || 210,
            addedAt: Date.now()
        };

        target.songs.push(cleanSong);
        playlists[playlistIndex] = target;

        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
        notifyPlaylists(playlists);
        return true;
    } catch (e) {
        console.error('Failed to add song to playlist', e);
        return false;
    }
};

export const removeSongFromPlaylist = async (playlistId, songId) => {
    try {
        const playlists = await getPlaylists();
        const playlistIndex = playlists.findIndex(p => p.id === playlistId);
        if (playlistIndex === -1) return false;

        const target = playlists[playlistIndex];
        target.songs = target.songs.filter(s => s.id !== songId);
        playlists[playlistIndex] = target;

        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
        notifyPlaylists(playlists);
        return true;
    } catch (e) {
        console.error('Failed to remove song from playlist', e);
        return false;
    }
};
