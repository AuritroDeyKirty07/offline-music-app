import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@chord_favorites';
const FavoritesContext = createContext({});

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider = ({ children }) => {
    const [favorites, setFavorites] = useState([]);

    const loadFavorites = async () => {
        try {
            const data = await AsyncStorage.getItem(FAVORITES_KEY);
            if (data) setFavorites(JSON.parse(data));
        } catch (_) {}
    };

    useEffect(() => { loadFavorites(); }, []);

    const isFavorite = (song) => {
        if (!song) return false;
        const songId = typeof song === 'string' ? song : song.id;
        const songTitle = typeof song === 'object' ? (song.title || '').toLowerCase().trim() : null;
        return favorites.some(s => (songId && s.id === songId) || (songTitle && (s.title || '').toLowerCase().trim() === songTitle));
    };

    const toggleFavorite = async (song) => {
        if (!song) return false;
        try {
            const songId = song.id;
            const songTitle = (song.title || '').toLowerCase().trim();
            const exists = favorites.some(s => (songId && s.id === songId) || (songTitle && (s.title || '').toLowerCase().trim() === songTitle));
            let updated;
            if (exists) {
                updated = favorites.filter(s => !(songId && s.id === songId) && !(songTitle && (s.title || '').toLowerCase().trim() === songTitle));
            } else {
                updated = [song, ...favorites];
            }
            setFavorites(updated);
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
            return !exists;
        } catch (_) {
            return false;
        }
    };

    return (
        <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, refreshFavorites: loadFavorites }}>
            {children}
        </FavoritesContext.Provider>
    );
};
