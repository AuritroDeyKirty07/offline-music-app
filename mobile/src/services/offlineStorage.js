import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const OFFLINE_SONGS_KEY = '@offline_songs';
const isServerSide = typeof window === 'undefined' && Platform.OS === 'web';

export const sanitizeFileName = (title, author) => {
    const cleanTitle = (title || 'Track')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    const cleanAuthor = (author || 'Artist')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    return `${cleanTitle} - ${cleanAuthor}.mp3`;
};

export const getFileUri = (songOrId) => {
    if (isServerSide) return '';
    if (typeof songOrId === 'object' && songOrId !== null) {
        const fileName = sanitizeFileName(songOrId.title, songOrId.author);
        return `${FileSystem.documentDirectory}${encodeURIComponent(fileName)}`;
    }
    return `${FileSystem.documentDirectory}${songOrId}.mp3`;
};

// Get all songs saved for offline playback
export const getOfflineSongs = async () => {
    if (isServerSide) return [];
    try {
        const jsonValue = await AsyncStorage.getItem(OFFLINE_SONGS_KEY);
        return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
        console.error('Error reading offline songs:', e);
        return [];
    }
};

// Get one offline song
export const getOfflineSong = async (songId) => {
    try {
        const songs = await getOfflineSongs();
        return songs.find(song => song.id === songId) || null;
    } catch (e) {
        console.error('Error finding offline song:', e);
        return null;
    }
};

// Robust offline file URI finder (checks localUri, sanitized name, encoded name, and legacy ID)
export const findOfflineAudioUri = async (song) => {
    if (!song) return null;
    if (Platform.OS === 'web') return null;

    try {
        const songId = typeof song === 'string' ? song : song.id;
        const songs = await getOfflineSongs();
        const found = songs.find(s => 
            (songId && s.id === songId) || 
            (song.title && s.title && s.title.toLowerCase().trim() === song.title.toLowerCase().trim())
        );

        if (found && found.localUri) {
            const info = await FileSystem.getInfoAsync(found.localUri);
            if (info.exists) return found.localUri;
        }

        if (typeof song === 'object' && song.localUri) {
            const info = await FileSystem.getInfoAsync(song.localUri);
            if (info.exists) return song.localUri;
        }

        if (typeof song === 'object' && song.title) {
            const cleanName = sanitizeFileName(song.title, song.author);
            const directUri = `${FileSystem.documentDirectory}${cleanName}`;
            const info1 = await FileSystem.getInfoAsync(directUri);
            if (info1.exists) return directUri;

            const encUri = `${FileSystem.documentDirectory}${encodeURIComponent(cleanName)}`;
            const info2 = await FileSystem.getInfoAsync(encUri);
            if (info2.exists) return encUri;
        }

        if (songId) {
            const legacyUri = `${FileSystem.documentDirectory}${songId}.mp3`;
            const infoLegacy = await FileSystem.getInfoAsync(legacyUri);
            if (infoLegacy.exists) return legacyUri;
        }
    } catch (e) {
        console.warn('Error checking offline audio uri:', e);
    }
    return null;
};

// Check whether a song is actually downloaded
export const isSongDownloaded = async (songId) => {
    try {
        const songs = await getOfflineSongs();
        const song = songs.find(s => s.id === songId);

        if (!song) {
            return false;
        }

        // On web there is no real local MP3 download
        if (Platform.OS === 'web') {
            return true;
        }

        const fileUri = song.localUri || getFileUri(song);
        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (!fileInfo.exists) {
            // Check legacy id.mp3 fallback
            const legacyUri = `${FileSystem.documentDirectory}${songId}.mp3`;
            const legacyInfo = await FileSystem.getInfoAsync(legacyUri);
            if (legacyInfo.exists) {
                return true;
            }

            // Remove stale metadata if the actual file no longer exists
            const updatedSongs = songs.filter(s => s.id !== songId);

            await AsyncStorage.setItem(
                OFFLINE_SONGS_KEY,
                JSON.stringify(updatedSongs)
            );

            return false;
        }

        return true;
    } catch (e) {
        console.error('Error checking downloaded song:', e);
        return false;
    }
};

// Download a song to the phone for offline playback with actual song title
export const downloadSong = async (song, backendUrl) => {
    try {
        if (!song || !song.id) {
            throw new Error('Invalid song');
        }

        if (!backendUrl) {
            throw new Error('Backend URL is missing');
        }

        // Offline file downloads are supported on Android/iOS
        if (Platform.OS === 'web') {
            throw new Error('Offline downloads are not supported on web');
        }

        const actualFileName = sanitizeFileName(song.title, song.author);
        const fileUri = `${FileSystem.documentDirectory}${encodeURIComponent(actualFileName)}`;

        // If file already exists, just make sure metadata is saved
        const existingFile = await FileSystem.getInfoAsync(fileUri);

        if (existingFile.exists) {
            const currentSongs = await getOfflineSongs();

            const offlineSong = {
                ...song,
                localUri: fileUri,
                fileName: actualFileName,
                isOffline: true,
            };

            const existingIndex = currentSongs.findIndex(
                s => s.id === song.id
            );

            if (existingIndex >= 0) {
                currentSongs[existingIndex] = offlineSong;
            } else {
                currentSongs.push(offlineSong);
            }

            await AsyncStorage.setItem(
                OFFLINE_SONGS_KEY,
                JSON.stringify(currentSongs)
            );

            console.log('Song already downloaded with actual name:', fileUri);

            return fileUri;
        }

        const cleanBackendUrl = backendUrl.replace(/\/$/, '');

        // backendUrl is expected to end with /api
        const streamUrl =
            `${cleanBackendUrl}/stream/${encodeURIComponent(song.id)}`;

        console.log('Downloading song from:', streamUrl);
        console.log('Saving song to:', fileUri);

        const downloadResumable = FileSystem.createDownloadResumable(
            streamUrl,
            fileUri,
            {},
            (progress) => {
                if (
                    progress.totalBytesExpectedToWrite &&
                    progress.totalBytesExpectedToWrite > 0
                ) {
                    const percent =
                        (
                            progress.totalBytesWritten /
                            progress.totalBytesExpectedToWrite
                        ) * 100;

                    console.log(
                        `Download progress: ${percent.toFixed(0)}%`
                    );
                }
            }
        );

        const result = await downloadResumable.downloadAsync();

        if (!result || !result.uri) {
            throw new Error(
                'Download completed but no local file URI was returned'
            );
        }

        const localUri = result.uri;

        // Save song metadata
        const currentSongs = await getOfflineSongs();

        const offlineSong = {
            ...song,
            localUri,
            isOffline: true,
        };

        const existingIndex = currentSongs.findIndex(
            s => s.id === song.id
        );

        if (existingIndex >= 0) {
            currentSongs[existingIndex] = offlineSong;
        } else {
            currentSongs.push(offlineSong);
        }

        await AsyncStorage.setItem(
            OFFLINE_SONGS_KEY,
            JSON.stringify(currentSongs)
        );

        console.log('Song downloaded successfully:', localUri);

        return localUri;

    } catch (e) {
        console.error('Download failed:', e);

        // Delete partially downloaded file if one exists
        try {
            if (song?.id && Platform.OS !== 'web') {
                const fileUri = getFileUri(song.id);

                await FileSystem.deleteAsync(fileUri, {
                    idempotent: true,
                });
            }
        } catch (cleanupError) {
            console.error(
                'Failed to clean up incomplete download:',
                cleanupError
            );
        }

        throw e;
    }
};

// Remove a song from phone storage
export const removeOfflineSong = async (songId) => {
    try {
        if (!songId) {
            return;
        }

        if (Platform.OS !== 'web') {
            const fileUri = getFileUri(songId);

            await FileSystem.deleteAsync(fileUri, {
                idempotent: true,
            });
        }

        const currentSongs = await getOfflineSongs();

        const updatedSongs = currentSongs.filter(
            song => song.id !== songId
        );

        await AsyncStorage.setItem(
            OFFLINE_SONGS_KEY,
            JSON.stringify(updatedSongs)
        );

        console.log('Offline song removed:', songId);

    } catch (e) {
        console.error('Error removing offline song:', e);
    }
};

// Export / Save downloaded MP3 directly to device's public storage / Files
export const exportSongToDevice = async (song) => {
    try {
        if (!song || !song.id) {
            throw new Error('Invalid song');
        }

        const offlineSong = await getOfflineSong(song.id);
        const fileUri = offlineSong?.localUri || getFileUri(song.id);
        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (!fileInfo.exists) {
            throw new Error('Song is not downloaded yet');
        }

        // Dynamically require expo-sharing
        const Sharing = require('expo-sharing');
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'audio/mpeg',
                dialogTitle: `Save "${song.title}" to Files / Device`,
                UTI: 'public.mp3'
            });
            return true;
        } else {
            throw new Error('Sharing is not supported on this device');
        }
    } catch (e) {
        console.error('Error exporting song:', e);
        throw e;
    }
};