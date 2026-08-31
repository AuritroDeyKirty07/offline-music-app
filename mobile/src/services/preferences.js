import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PREFS_KEY = '@user_preferences';
const isServerSide = typeof window === 'undefined' && Platform.OS === 'web';

export const getPreferences = async () => {
    if (isServerSide) return { artists: [], genres: [], languages: [] };
    try {
        const jsonValue = await AsyncStorage.getItem(PREFS_KEY);
        if (jsonValue != null) {
            return JSON.parse(jsonValue);
        }
    } catch (e) {
        console.error("Error loading preferences", e);
    }
    return { artists: [], genres: [], languages: [] };
};

export const savePreferences = async (prefs) => {
    try {
        await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {
        console.error("Error saving preferences", e);
    }
};
