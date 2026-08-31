import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SERVER_URL_KEY = '@server_url';
export const DEFAULT_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.29.68:5000/api';

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

import { Platform } from 'react-native';

export const isServerSide = typeof window === 'undefined' && Platform.OS === 'web';

// Initialize base URL from AsyncStorage
export const initApiUrl = async () => {
    if (isServerSide) {
        return DEFAULT_API_URL;
    }
    try {
        const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
        if (savedUrl) {
            const sanitized = sanitizeApiUrl(savedUrl);
            api.defaults.baseURL = sanitized;
            return sanitized;
        }
    } catch (e) {
        // Safe fallback
    }
    api.defaults.baseURL = DEFAULT_API_URL;
    return DEFAULT_API_URL;
};

// Automatically run init on client
if (!isServerSide) {
    initApiUrl().catch(() => {});
}

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
    const rootUrl = targetUrl.replace(/\/api$/, '');
    try {
        const testClient = axios.create({ 
            timeout: 10000,
            headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        
        // Fast health check ping
        try {
            const healthRes = await testClient.get(`${rootUrl}/health`);
            if (healthRes.status === 200) {
                return { success: true, status: 200 };
            }
        } catch (_) {
            // fallback to api route
        }

        const res = await testClient.get(`${targetUrl}/health`);
        return { success: true, status: res.status };
    } catch (err) {
        return { 
            success: false, 
            error: err.response?.data?.message || err.message || 'Could not reach server (Timeout / Error)'
        };
    }
};

export const getImageUrl = (url) => url;

