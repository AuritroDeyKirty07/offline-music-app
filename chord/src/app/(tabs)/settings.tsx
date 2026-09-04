import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Sparkles, Check } from 'lucide-react-native';
import { getPreferences, savePreferences } from '../../services/preferences';
import { ALL_ARTISTS } from '../../constants/artists';

export default function SettingsScreen() {
    const [autoDownload, setAutoDownload] = useState(false);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['Punjabi', 'Hindi']);
    const [selectedGenres, setSelectedGenres] = useState<string[]>(['Pop', 'Hip-Hop']);
    const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

    const LANGUAGES = ['Punjabi', 'Hindi', 'English', 'Haryanvi', 'Bhojpuri', 'Tamil', 'Telugu'];
    const GENRES = ['Pop', 'Hip-Hop', 'Romantic', 'Rap', 'Sufi', 'Rock', 'Electronic', 'Acoustic'];

    useEffect(() => {
        getPreferences().then(p => {
            setAutoDownload(!!p.autoDownload);
            if (p.languages) setSelectedLanguages(p.languages);
            if (p.genres) setSelectedGenres(p.genres);
            if (p.artists) setSelectedArtists(p.artists);
        });
    }, []);

    const toggleLanguage = (lang: string) => {
        const next = selectedLanguages.includes(lang) ? selectedLanguages.filter(l => l !== lang) : [...selectedLanguages, lang];
        setSelectedLanguages(next);
        savePreferences({ languages: next });
    };

    const toggleGenre = (genre: string) => {
        const next = selectedGenres.includes(genre) ? selectedGenres.filter(g => g !== genre) : [...selectedGenres, genre];
        setSelectedGenres(next);
        savePreferences({ genres: next });
    };

    const toggleArtist = (artist: string) => {
        const next = selectedArtists.includes(artist) ? selectedArtists.filter(a => a !== artist) : [...selectedArtists, artist];
        setSelectedArtists(next);
        savePreferences({ artists: next });
    };

    const toggleAutoDownload = (val: boolean) => {
        setAutoDownload(val);
        savePreferences({ autoDownload: val });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Settings</Text>

            <View style={styles.card}>
                <View style={styles.cardRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.cardTitle}>Auto-Download Played Songs</Text>
                        <Text style={styles.cardSubtitle}>Automatically save every played song to phone storage for offline playback</Text>
                    </View>
                    <Switch
                        value={autoDownload}
                        onValueChange={toggleAutoDownload}
                        thumbColor={autoDownload ? '#1ed760' : '#71717a'}
                        trackColor={{ false: '#27272a', true: '#14532d' }}
                    />
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Sparkles color="#1ed760" size={20} />
                <Text style={styles.sectionTitle}>AI Taste Customizer</Text>
            </View>

            <Text style={styles.subTitle}>Preferred Languages</Text>
            <View style={styles.chipsRow}>
                {LANGUAGES.map(lang => {
                    const active = selectedLanguages.includes(lang);
                    return (
                        <TouchableOpacity key={lang} onPress={() => toggleLanguage(lang)} style={[styles.chip, active && styles.chipActive]}>
                            {active && <Check color="#000" size={14} style={{ marginRight: 4 }} />}
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{lang}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={styles.subTitle}>Preferred Genres</Text>
            <View style={styles.chipsRow}>
                {GENRES.map(genre => {
                    const active = selectedGenres.includes(genre);
                    return (
                        <TouchableOpacity key={genre} onPress={() => toggleGenre(genre)} style={[styles.chip, active && styles.chipActive]}>
                            {active && <Check color="#000" size={14} style={{ marginRight: 4 }} />}
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{genre}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={styles.subTitle}>Favorite Artists</Text>
            <View style={styles.chipsRow}>
                {ALL_ARTISTS.slice(0, 50).map(artist => {
                    const active = selectedArtists.includes(artist);
                    return (
                        <TouchableOpacity key={artist} onPress={() => toggleArtist(artist)} style={[styles.chip, active && styles.chipActive]}>
                            {active && <Check color="#000" size={14} style={{ marginRight: 4 }} />}
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>{artist}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b' },
    content: { padding: 20, paddingBottom: 100, paddingTop: 40 },
    title: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
    card: { backgroundColor: '#18181b', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#27272a' },
    cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
    cardSubtitle: { color: '#71717a', fontSize: 13 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
    subTitle: { color: '#a1a1aa', fontSize: 15, fontWeight: '600', marginTop: 14, marginBottom: 10 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#27272a' },
    chipActive: { backgroundColor: '#1ed760', borderColor: '#1ed760' },
    chipText: { color: '#d4d4d8', fontSize: 14 },
    chipTextActive: { color: '#000', fontWeight: 'bold' }
});
