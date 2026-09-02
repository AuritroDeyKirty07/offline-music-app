import AsyncStorage from '@react-native-async-storage/async-storage';
const PREFERENCES_KEY = '@chord_preferences';

export const getPreferences = async () => {
    try {
        const d = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (d) return JSON.parse(d);
    } catch (_) {}
    return { autoDownload: false, theme: 'dark', languages: ['Punjabi', 'Hindi'], genres: ['Pop', 'Hip-Hop'], artists: ['Karan Aujla', 'Arijit Singh', 'Sidhu Moose Wala', 'AP Dhillon', 'Diljit Dosanjh'] };
};

export const savePreferences = async (newPrefs) => {
    try {
        const curr = await getPreferences();
        const merged = { ...curr, ...newPrefs };
        await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(merged));
        return merged;
    } catch (_) { return newPrefs; }
};
