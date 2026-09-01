import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import { getPreferences, savePreferences } from '../../services/preferences';
import { getServerUrl, setServerUrl, testConnection, DEFAULT_API_URL } from '../../services/api';
import { artistsList, genresList, languagesList } from '../../constants/artists';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Search, Sparkles } from 'lucide-react-native';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const [crossfade, setCrossfade] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);
    const [autoDownload, setAutoDownload] = useState(true);
    const [highQuality, setHighQuality] = useState(true);
    const [officialOnly, setOfficialOnly] = useState(true);
    const [userName, setUserName] = useState('');

    const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['Hindi', 'Punjabi', 'English']);
    const [artistFilter, setArtistFilter] = useState('');

    const [serverUrl, setCustomServerUrl] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

    useEffect(() => {
        getPreferences().then((prefs: any) => {
            if (prefs.name) setUserName(prefs.name);
            if (prefs.officialOnly !== undefined) setOfficialOnly(prefs.officialOnly);
            if (prefs.autoDownload !== undefined) setAutoDownload(prefs.autoDownload);
            if (prefs.autoPlay !== undefined) setAutoPlay(prefs.autoPlay);
            if (Array.isArray(prefs.artists)) setSelectedArtists(prefs.artists);
            if (Array.isArray(prefs.genres)) setSelectedGenres(prefs.genres);
            if (Array.isArray(prefs.languages)) setSelectedLanguages(prefs.languages);
        });
        getServerUrl().then((url: string) => {
            setCustomServerUrl(url);
        });
    }, []);

    const toggleArtist = (artist: string) => {
        const next = selectedArtists.includes(artist)
            ? selectedArtists.filter(a => a !== artist)
            : [...selectedArtists, artist];
        setSelectedArtists(next);
        getPreferences().then((prefs: any) => {
            savePreferences({ ...prefs, artists: next });
        });
    };

    const toggleGenre = (genre: string) => {
        const next = selectedGenres.includes(genre)
            ? selectedGenres.filter(g => g !== genre)
            : [...selectedGenres, genre];
        setSelectedGenres(next);
        getPreferences().then((prefs: any) => {
            savePreferences({ ...prefs, genres: next });
        });
    };

    const toggleLanguage = (lang: string) => {
        const next = selectedLanguages.includes(lang)
            ? selectedLanguages.filter(l => l !== lang)
            : [...selectedLanguages, lang];
        setSelectedLanguages(next);
        getPreferences().then((prefs: any) => {
            savePreferences({ ...prefs, languages: next });
        });
    };

    const toggleAutoDownload = (val: boolean) => {
        setAutoDownload(val);
        getPreferences().then((prefs: any) => {
            savePreferences({ ...prefs, autoDownload: val });
        });
    };

    const handleSaveName = (text: string) => {
        setUserName(text);
        getPreferences().then((prefs: any) => {
            savePreferences({ ...prefs, name: text });
        });
    };

    const toggleOfficialOnly = (val: boolean) => {
        setOfficialOnly(val);
        getPreferences().then((prefs: any) => {
            savePreferences({ ...prefs, officialOnly: val });
        });
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        const res = await testConnection(serverUrl);
        setIsTesting(false);
        if (res.success) {
            setTestResult({ success: true, msg: 'Connected successfully! (200 OK)' });
        } else {
            setTestResult({ success: false, msg: `Failed: ${res.error}` });
        }
    };

    const handleSaveServerUrl = async () => {
        try {
            const saved = await setServerUrl(serverUrl);
            setCustomServerUrl(saved);
            Alert.alert('Success', 'Server URL saved successfully!');
            handleTestConnection();
        } catch (e) {
            Alert.alert('Error', 'Failed to save server URL');
        }
    };

    const handleResetServerUrl = async () => {
        try {
            const reset = await setServerUrl(DEFAULT_API_URL);
            setCustomServerUrl(reset);
            setTestResult(null);
            Alert.alert('Reset', 'Server URL reset to default!');
        } catch (e) {
            Alert.alert('Error', 'Failed to reset server URL');
        }
    };

    const filteredArtists = artistsList.filter(a =>
        a.toLowerCase().includes(artistFilter.toLowerCase())
    );

    return (
        <KeyboardAvoidingView 
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
        >
            <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 14, 44) }]}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.header}>Settings</Text>

            {/* Profile */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Profile</Text>
                <View style={styles.settingRow}>
                    <View style={{flex: 1}}>
                        <Text style={styles.settingLabel}>Display Name</Text>
                        <TextInput 
                            style={styles.nameInput}
                            value={userName}
                            onChangeText={handleSaveName}
                            placeholder="Enter your name"
                            placeholderTextColor="#555"
                        />
                    </View>
                </View>
            </View>

            {/* Your Taste & AI Recommendations */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Sparkles color="#1ed760" size={20} style={{ marginRight: 8 }} />
                    <Text style={styles.sectionTitle}>Your Taste & AI Customization</Text>
                </View>
                <Text style={styles.settingSub}>Select your preferred languages, genres, and favorite artists to customize AI recommendations:</Text>

                {/* Languages */}
                <Text style={[styles.subHeading, { marginTop: 14 }]}>Languages</Text>
                <View style={styles.chipRow}>
                    {languagesList.map(lang => {
                        const active = selectedLanguages.includes(lang);
                        return (
                            <TouchableOpacity
                                key={lang}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => toggleLanguage(lang)}
                            >
                                {active && <Check color="#000" size={14} style={{ marginRight: 4 }} />}
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{lang}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Genres */}
                <Text style={[styles.subHeading, { marginTop: 16 }]}>Genres</Text>
                <View style={styles.chipRow}>
                    {genresList.map(g => {
                        const active = selectedGenres.includes(g.name);
                        return (
                            <TouchableOpacity
                                key={g.name}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => toggleGenre(g.name)}
                            >
                                {active && <Check color="#000" size={14} style={{ marginRight: 4 }} />}
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Favorite Artists (80+ Roster with Live Filter) */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
                    <Text style={styles.subHeading}>Favorite Artists ({selectedArtists.length} selected)</Text>
                </View>

                <View style={styles.artistSearchBox}>
                    <Search color="#71717a" size={16} style={{ marginRight: 8 }} />
                    <TextInput
                        style={styles.artistSearchInput}
                        value={artistFilter}
                        onChangeText={setArtistFilter}
                        placeholder="Search 80+ artists (Karan Aujla, Weeknd, Diljit...)"
                        placeholderTextColor="#52525b"
                    />
                </View>

                <View style={styles.artistGrid}>
                    {filteredArtists.slice(0, 30).map(artist => {
                        const active = selectedArtists.includes(artist);
                        return (
                            <TouchableOpacity
                                key={artist}
                                style={[styles.artistPill, active && styles.artistPillActive]}
                                onPress={() => toggleArtist(artist)}
                            >
                                {active && <Check color="#000" size={13} style={{ marginRight: 4 }} />}
                                <Text style={[styles.artistPillText, active && styles.artistPillTextActive]}>
                                    {artist}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Offline Storage & Auto Download */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Data Saver & Offline Downloads</Text>
                
                <View style={styles.settingRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.settingLabel}>Auto Download Played Songs</Text>
                        <Text style={styles.settingSub}>Saves full high-res MP3 directly to phone storage for 100% offline playback</Text>
                    </View>
                    <Switch
                        value={autoDownload}
                        onValueChange={toggleAutoDownload}
                        trackColor={{ false: '#3f3f46', true: '#1ed760' }}
                        thumbColor="#fff"
                    />
                </View>

                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Download in High Quality (320kbps)</Text>
                        <Text style={styles.settingSub}>Lossless audio format</Text>
                    </View>
                    <Switch
                        value={highQuality}
                        onValueChange={setHighQuality}
                        trackColor={{ false: '#3f3f46', true: '#1ed760' }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {/* Playback & Audio Controls */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Playback Customization</Text>
                
                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Autoplay Continuous Queue</Text>
                        <Text style={styles.settingSub}>Dynamically load similar songs in background</Text>
                    </View>
                    <Switch
                        value={autoPlay}
                        onValueChange={(val) => {
                            setAutoPlay(val);
                            getPreferences().then(prefs => savePreferences({ ...prefs, autoPlay: val }));
                        }}
                        trackColor={{ false: '#3f3f46', true: '#1ed760' }}
                        thumbColor="#fff"
                    />
                </View>

                <View style={styles.settingRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.settingLabel}>Official Audio Only</Text>
                        <Text style={styles.settingSub}>Strictly filter out lyric videos, re-uploads, and unplugged tracks</Text>
                    </View>
                    <Switch
                        value={officialOnly}
                        onValueChange={toggleOfficialOnly}
                        trackColor={{ false: '#3f3f46', true: '#1ed760' }}
                        thumbColor="#fff"
                    />
                </View>

                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Crossfade</Text>
                        <Text style={styles.settingSub}>{crossfade}s</Text>
                    </View>
                    <Slider
                        style={{ width: 150, height: 40 }}
                        minimumValue={0}
                        maximumValue={12}
                        step={1}
                        value={crossfade}
                        onValueChange={setCrossfade}
                        minimumTrackTintColor="#1ed760"
                        maximumTrackTintColor="#555"
                        thumbTintColor="#1ed760"
                    />
                </View>
            </View>

            {/* Server & Connection */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Server & Connection</Text>
                <Text style={styles.settingSub}>Backend PC Server API URL (Auto-discovers on Wi-Fi/LAN):</Text>
                <TextInput 
                    style={styles.serverInput}
                    value={serverUrl}
                    onChangeText={setCustomServerUrl}
                    placeholder="http://192.168.29.68:5000/api"
                    placeholderTextColor="#555"
                    autoCapitalize="none"
                    autoCorrect={false}
                />

                {testResult && (
                    <View style={[styles.testResultBox, testResult.success ? styles.testSuccess : styles.testError]}>
                        <Text style={[styles.testResultText, testResult.success ? styles.testSuccessText : styles.testErrorText]}>
                            {testResult.msg}
                        </Text>
                    </View>
                )}

                <View style={styles.serverButtonRow}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.testBtn]} 
                        onPress={handleTestConnection} 
                        disabled={isTesting}
                    >
                        {isTesting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.actionBtnText}>Test</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.saveBtn]} 
                        onPress={handleSaveServerUrl}
                    >
                        <Text style={[styles.actionBtnText, { color: '#000' }]}>Save</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.actionBtn, styles.resetBtn]} 
                        onPress={handleResetServerUrl}
                    >
                        <Text style={styles.actionBtnText}>Reset</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.serverHelpBox}>
                    <Text style={styles.serverHelpHeader}>Connection Modes:</Text>
                    <Text style={styles.serverHelpItem}>• Wi-Fi / Ethernet LAN: Auto-detected by Chord Server</Text>
                    <Text style={styles.serverHelpItem}>• USB Cable (ADB): http://localhost:5000/api</Text>
                    <Text style={styles.serverHelpItem}>• Local Hotspot / IP: http://192.168.X.X:5000/api</Text>
                </View>
            </View>
        </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        backgroundColor: '#09090b',
    },
    scrollContent: {
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingBottom: 160,
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: -0.5,
        marginBottom: 24,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    settingLabel: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    settingSub: {
        color: '#a1a1aa',
        fontSize: 13,
        marginTop: 4,
    },
    nameInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: 'white',
        fontSize: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 8,
    },
    serverInput: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: '#1ed760',
        fontFamily: 'monospace',
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    serverButtonRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    testBtn: {
        backgroundColor: '#3f3f46',
    },
    saveBtn: {
        backgroundColor: '#1ed760',
    },
    resetBtn: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    actionBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    testResultBox: {
        marginTop: 10,
        padding: 10,
        borderRadius: 8,
    },
    testSuccess: {
        backgroundColor: 'rgba(30, 215, 96, 0.15)',
        borderColor: 'rgba(30, 215, 96, 0.4)',
        borderWidth: 1,
    },
    testError: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        borderWidth: 1,
    },
    testResultText: {
        fontSize: 13,
        fontWeight: '500',
    },
    testSuccessText: {
        color: '#1ed760',
    },
    testErrorText: {
        color: '#f87171',
    },
    serverHelpBox: {
        marginTop: 14,
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    serverHelpHeader: {
        color: '#d4d4d8',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    serverHelpItem: {
        color: '#71717a',
        fontSize: 11,
        marginTop: 2,
    },
    button: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    subHeading: {
        color: '#d4d4d8',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    chipActive: {
        backgroundColor: '#1ed760',
        borderColor: '#1ed760',
    },
    chipText: {
        color: '#e4e4e7',
        fontSize: 13,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#000',
        fontWeight: 'bold',
    },
    artistSearchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    artistSearchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 13,
        padding: 0,
    },
    artistGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    artistPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    artistPillActive: {
        backgroundColor: '#1ed760',
        borderColor: '#1ed760',
    },
    artistPillText: {
        color: '#d4d4d8',
        fontSize: 12,
        fontWeight: '500',
    },
    artistPillTextActive: {
        color: '#000',
        fontWeight: 'bold',
    },
});
