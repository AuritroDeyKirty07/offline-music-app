import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const SERVER_URL_KEY = '@server_url';
export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.68:5000/api';

export const isServerSide = typeof window === 'undefined' && Platform.OS === 'web';

export const api = axios.create({
    baseURL: DEFAULT_API_URL,
    timeout: 35000,
    headers: {
        'Bypass-Tunnel-Reminder': 'true',
    }
});

// Helper to sanitize server url (ensures http/https and trailing /api)
export const sanitizeApiUrl = (url) => {
    if (!url) return DEFAULT_API_URL;
    let trimmed = url.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        trimmed = 'http://' + trimmed;
    }
    if (!trimmed.endsWith('/api')) {
        trimmed = trimmed + '/api';
    }
    return trimmed;
};

// ============================================================
// AUTO-DISCOVERY & SEAMLESS WI-FI / LAN AUTO-SWITCHING
// ============================================================

let isDiscovering = false;

export const pingServer = async (candidateUrl, timeoutMs = 2500) => {
    try {
        const sanitized = sanitizeApiUrl(candidateUrl);
        const testClient = axios.create({
            timeout: timeoutMs,
            headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        const res = await testClient.get(`${sanitized}/ping`);
        if (res.status === 200 && res.data && res.data.server === 'Chord-PC-Server') {
            return sanitized;
        }
    } catch (_) {}
    return null;
};

export const autoDiscoverServer = async () => {
    if (isDiscovering || isServerSide) return null;
    isDiscovering = true;

    try {
        const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
        
        // 1. Quick test on current / saved URLs
        const priorityCandidates = [
            savedUrl,
            api.defaults.baseURL,
            DEFAULT_API_URL,
            'http://192.168.29.68:5000/api',
            'http://localhost:5000/api',
            'http://127.0.0.1:5000/api',
            'http://10.0.2.2:5000/api'
        ].filter(Boolean);

        for (const url of priorityCandidates) {
            const ok = await pingServer(url, 1500);
            if (ok) {
                api.defaults.baseURL = ok;
                await AsyncStorage.setItem(SERVER_URL_KEY, ok);
                isDiscovering = false;
                console.log('✅ Connected to Chord PC Server at:', ok);
                return ok;
            }
        }

        // 2. Scan active local subnet in fast parallel batches
        const baseSubnets = ['192.168.29', '192.168.1', '192.168.0', '10.0.0'];
        for (const subnet of baseSubnets) {
            const probePromises = [];
            for (let i = 1; i <= 150; i++) {
                const testUrl = `http://${subnet}.${i}:5000/api`;
                probePromises.push(pingServer(testUrl, 1200));
            }
            const results = await Promise.allSettled(probePromises);
            for (const r of results) {
                if (r.status === 'fulfilled' && r.value) {
                    const discovered = r.value;
                    api.defaults.baseURL = discovered;
                    await AsyncStorage.setItem(SERVER_URL_KEY, discovered);
                    isDiscovering = false;
                    console.log('📡 Auto-discovered Chord PC Server on LAN/Wi-Fi:', discovered);
                    return discovered;
                }
            }
        }
    } catch (e) {
        console.warn('Auto-discovery error:', e.message);
    } finally {
        isDiscovering = false;
    }
    return null;
};

// Initialize base URL from AsyncStorage + Auto-ping
export const initApiUrl = async () => {
    if (isServerSide) {
        return DEFAULT_API_URL;
    }
    try {
        const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
        if (savedUrl) {
            const sanitized = sanitizeApiUrl(savedUrl);
            api.defaults.baseURL = sanitized;
            // Background check if valid, else auto-discover
            pingServer(sanitized, 2000).then(ok => {
                if (!ok) autoDiscoverServer();
            }).catch(() => {});
            return sanitized;
        }
    } catch (e) {}

    api.defaults.baseURL = DEFAULT_API_URL;
    autoDiscoverServer().catch(() => {});
    return DEFAULT_API_URL;
};

// Auto-recover on network error
api.interceptors.response.use(
    response => response,
    async (error) => {
        if (!error.response && error.code === 'ERR_NETWORK') {
            console.warn('⚡ Network error detected, triggering auto-discovery...');
            autoDiscoverServer();
        }
        return Promise.reject(error);
    }
);

// Save new base URL
export const setServerUrl = async (url) => {
    try {
        const sanitized = sanitizeApiUrl(url);
        if (!isServerSide) {
            await AsyncStorage.setItem(SERVER_URL_KEY, sanitized);
        }
        api.defaults.baseURL = sanitized;
        return sanitized;
    } catch (e) {
        console.error('Failed to save server URL', e);
        throw e;
    }
};

// Get current base URL
export const getServerUrl = async () => {
    if (isServerSide) {
        return DEFAULT_API_URL;
    }
    try {
        const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
        return savedUrl || api.defaults.baseURL || DEFAULT_API_URL;
    } catch (e) {
        return api.defaults.baseURL || DEFAULT_API_URL;
    }
};

// Test connection to a given server URL
export const testConnection = async (url) => {
    const targetUrl = sanitizeApiUrl(url || api.defaults.baseURL);
    try {
        const testClient = axios.create({ 
            timeout: 5000,
            headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        const res = await testClient.get(`${targetUrl}/ping`);
        if (res.status === 200) {
            return { success: true, status: 200 };
        }
        return { success: false, error: 'Unexpected server response' };
    } catch (err) {
        return { 
            success: false, 
            error: err.response?.data?.message || err.message || 'Could not reach server (Timeout / Error)'
        };
    }
};

export const getImageUrl = (url) => url;

