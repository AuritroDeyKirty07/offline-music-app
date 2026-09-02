import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@chord_favorites';
const PLAYLISTS_KEY = '@chord_playlists';

export const getFavorites = async () => {
    try {
        const data = await AsyncStorage.getItem(FAVORITES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (_) { return []; }
};

export const toggleFavorite = async (song) => {
    if (!song) return false;
    try {
        const favs = await getFavorites();
        const index = favs.findIndex(s => s.id === song.id || s.title === song.title);
        let updated;
        let isFav;
        if (index > -1) {
            updated = favs.filter((_, i) => i !== index);
            isFav = false;
        } else {
            updated = [song, ...favs];
            isFav = true;
        }
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
        return isFav;
    } catch (_) { return false; }
};

export const isFavorite = async (songId) => {
    if (!songId) return false;
    try {
        const favs = await getFavorites();
        return favs.some(s => s.id === songId);
    } catch (_) { return false; }
};

export const getPlaylists = async () => {
    try {
        const data = await AsyncStorage.getItem(PLAYLISTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (_) { return []; }
};

export const createPlaylist = async (name) => {
    if (!name || !name.trim()) return null;
    try {
        const pls = await getPlaylists();
        const nPl = { id: 'pl_' + Date.now(), name: name.trim(), songs: [], createdAt: Date.now() };
        const updated = [nPl, ...pls];
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
        return nPl;
    } catch (_) { return null; }
};

export const addSongToPlaylist = async (playlistId, song) => {
    if (!playlistId || !song) return false;
    try {
        const pls = await getPlaylists();
        const target = pls.find(p => p.id === playlistId);
        if (target) {
            if (!target.songs.some(s => s.id === song.id)) {
                target.songs.push(song);
                await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(pls));
            }
            return true;
        }
    } catch (_) {}
    return false;
};

export const deletePlaylist = async (playlistId) => {
    try {
        const pls = await getPlaylists();
        const updated = pls.filter(p => p.id !== playlistId);
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(updated));
    } catch (_) {}
};
