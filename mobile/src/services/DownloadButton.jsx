import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { Download, Check } from 'lucide-react-native';
import { downloadSong, isSongDownloaded } from './offlineStorage';
import { api } from './api';

export default function DownloadButton({ song, size = 20, style }) {
    const [status, setStatus] = useState('idle'); // idle, downloading, downloaded

    useEffect(() => {
        checkStatus();
    }, [song.id]);

    const checkStatus = async () => {
        const isOffline = await isSongDownloaded(song.id);
        if (isOffline) {
            setStatus('downloaded');
        }
    };

    const handleDownload = async () => {
        if (status === 'downloaded' || status === 'downloading') return;
        
        setStatus('downloading');
        try {
            await downloadSong(song, api.defaults.baseURL);
            setStatus('downloaded');
        } catch (e) {
            console.error(e);
            setStatus('idle');
        }
    };

    return (
        <TouchableOpacity onPress={handleDownload} style={style} disabled={status !== 'idle'}>
            {status === 'downloading' ? (
                <ActivityIndicator size="small" color="#1ed760" />
            ) : status === 'downloaded' ? (
                <Check color="#1ed760" size={size} />
            ) : (
                <Download color="#a1a1aa" size={size} />
            )}
        </TouchableOpacity>
    );
}
