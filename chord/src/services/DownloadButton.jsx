import React, { useState, useEffect } from 'react';
import { TouchableOpacity, ActivityIndicator } from 'react-native';
import { Download, Check } from 'lucide-react-native';
import { isSongDownloaded, downloadSong } from './offlineStorage';

export default function DownloadButton({ song, size = 24, color = '#1ed760', style = {} }) {
    const [downloaded, setDownloaded] = useState(false);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        let mounted = true;
        if (song) {
            isSongDownloaded(song.id || song).then(res => { if (mounted) setDownloaded(res); });
        }
        return () => { mounted = false; };
    }, [song?.id, song?.title]);

    const handlePress = async () => {
        if (!song || downloaded || downloading) return;
        setDownloading(true);
        try {
            const ok = await downloadSong(song);
            setDownloaded(ok);
        } catch (_) {}
        setDownloading(false);
    };

    if (downloading) return <ActivityIndicator size="small" color={color} style={style} />;

    return (
        <TouchableOpacity onPress={handlePress} style={style} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {downloaded ? <Check size={size} color={color} /> : <Download size={size} color="#a1a1aa" />}
        </TouchableOpacity>
    );
}
