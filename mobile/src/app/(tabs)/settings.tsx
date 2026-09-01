import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import Slider from '@react-native-community/slider';
import { getPreferences, savePreferences } from '../../services/preferences';
import { getServerUrl, setServerUrl, testConnection, DEFAULT_API_URL } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const [crossfade, setCrossfade] = useState(0);
    const [autoPlay, setAutoPlay] = useState(true);
    const [highQuality, setHighQuality] = useState(true);
    const [officialOnly, setOfficialOnly] = useState(true);
    const [userName, setUserName] = useState('');

    const [serverUrl, setCustomServerUrl] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

    useEffect(() => {
        getPreferences().then((prefs: any) => {
            if (prefs.name) setUserName(prefs.name);
            if (prefs.officialOnly !== undefined) setOfficialOnly(prefs.officialOnly);
        });
        getServerUrl().then((url: string) => {
            setCustomServerUrl(url);
        });
    }, []);

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

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Audio Playback</Text>
                
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

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Data Saver & Storage</Text>
                
                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Download in High Quality</Text>
                        <Text style={styles.settingSub}>Uses more storage</Text>
                    </View>
                    <Switch
                        value={highQuality}
                        onValueChange={setHighQuality}
                        trackColor={{ false: '#3f3f46', true: '#1ed760' }}
                        thumbColor="#fff"
                    />
                </View>
                <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>Clear Cache</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Customization</Text>
                
                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Autoplay</Text>
                        <Text style={styles.settingSub}>Enjoy non-stop music</Text>
                    </View>
                    <Switch
                        value={autoPlay}
                        onValueChange={setAutoPlay}
                        trackColor={{ false: '#3f3f46', true: '#1ed760' }}
                        thumbColor="#fff"
                    />
                </View>

                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Official Audio Only</Text>
                        <Text style={styles.settingSub}>Prioritize original/studio tracks over lyric videos</Text>
                    </View>
                    <Switch
                        value={officialOnly}
                        onValueChange={toggleOfficialOnly}
                        trackColor={{ false: '#3f3f46', true: '#1ed760' }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

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
    }
});
