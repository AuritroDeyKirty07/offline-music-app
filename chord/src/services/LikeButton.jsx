import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Heart } from 'lucide-react-native';
import { useFavorites } from './favoritesContext';

export default function LikeButton({ song, size = 24, color = '#1ed760', style = {} }) {
    const { isFavorite, toggleFavorite } = useFavorites();
    const liked = isFavorite(song);

    const handlePress = async () => {
        if (!song) return;
        await toggleFavorite(song);
    };

    return (
        <TouchableOpacity onPress={handlePress} style={style} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Heart size={size} color={liked ? color : '#a1a1aa'} fill={liked ? color : 'transparent'} />
        </TouchableOpacity>
    );
}
