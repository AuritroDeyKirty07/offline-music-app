import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getAudioStreamUrl } from './youtube';

const OFFLINE_SONGS_KEY = '@chord_offline_songs';

export const sanitizeFileName = (title, author) => {
    const cTitle = (title || 'Track').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
    const cAuthor = (author || 'Artist').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
    return `${cTitle} - ${cAuthor}.mp3`;
};

export const getOfflineSongs = async () => {
    if (Platform.OS === 'web') return [];
    try {
        const val = await AsyncStorage.getItem(OFFLINE_SONGS_KEY);
        return val != null ? JSON.parse(val) : [];
    } catch (_) { return []; }
};

export const findOfflineAudioUri = async (song) => {
    if (!song || Platform.OS === 'web') return null;
    try {
        const songId = typeof song === 'string' ? song : song.id;
        const songs = await getOfflineSongs();
        const found = songs.find(s => (songId && s.id === songId) || (song.title && s.title && s.title.toLowerCase().trim() === song.title.toLowerCase().trim()));
        if (found && found.localUri) {
            const inf = await FileSystem.getInfoAsync(found.localUri);
            if (inf.exists) return found.localUri;
        }
        if (typeof song === 'object' && song.localUri) {
            const inf = await FileSystem.getInfoAsync(song.localUri);
            if (inf.exists) return song.localUri;
        }
        if (typeof song === 'object' && song.title) {
            const cName = sanitizeFileName(song.title, song.author);
            const dUri = `${FileSystem.documentDirectory}${cName}`;
            const inf1 = await FileSystem.getInfoAsync(dUri);
            if (inf1.exists) return dUri;
        }
    } catch (_) {}
    return null;
};

export const isSongDownloaded = async (songId) => {
    const uri = await findOfflineAudioUri(songId);
    return !!uri;
};

export const downloadSong = async (song) => {
    if (!song || Platform.OS === 'web') return false;
    try {
        const already = await findOfflineAudioUri(song);
        if (already) return true;
        const streamUrl = await getAudioStreamUrl(song);
        if (!streamUrl) throw new Error('Stream URL not found');
        const cName = sanitizeFileName(song.title, song.author);
        const fileUri = `${FileSystem.documentDirectory}${cName}`;
        const res = await FileSystem.downloadAsync(streamUrl, fileUri);
        if (res.status === 200) {
            const item = { ...song, localUri: res.uri, downloadedAt: Date.now() };
            const existing = await getOfflineSongs();
            const updated = [item, ...existing.filter(s => s.id !== song.id && s.title !== song.title)];
            await AsyncStorage.setItem(OFFLINE_SONGS_KEY, JSON.stringify(updated));
            return true;
        }
    } catch (e) {
        console.warn('Download error:', e.message);
    }
    return false;
};

export const deleteOfflineSong = async (songId) => {
    if (Platform.OS === 'web') return;
    try {
        const songs = await getOfflineSongs();
        const target = songs.find(s => s.id === songId);
        if (target && target.localUri) {
            await FileSystem.deleteAsync(target.localUri, { idempotent: true });
        }
        const updated = songs.filter(s => s.id !== songId);
        await AsyncStorage.setItem(OFFLINE_SONGS_KEY, JSON.stringify(updated));
    } catch (_) {}
};
