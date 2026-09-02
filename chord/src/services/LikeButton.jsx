import React, { useState, useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { Heart } from 'lucide-react-native';
import { isFavorite, toggleFavorite } from './playlistStorage';

export default function LikeButton({ song, size = 24, color = '#1ed760', style = {} }) {
    const [liked, setLiked] = useState(false);
    useEffect(() => {
        let mounted = true;
        if (song && song.id) {
            isFavorite(song.id).then(res => { if (mounted) setLiked(res); });
        }
        return () => { mounted = false; };
    }, [song?.id]);

    const handlePress = async () => {
        if (!song) return;
        const next = await toggleFavorite(song);
        setLiked(next);
    };

    return (
        <TouchableOpacity onPress={handlePress} style={style} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Heart size={size} color={liked ? color : '#a1a1aa'} fill={liked ? color : 'transparent'} />
        </TouchableOpacity>
    );
}
