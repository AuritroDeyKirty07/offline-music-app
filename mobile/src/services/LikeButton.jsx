import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Heart } from 'lucide-react-native';
import { isSongLiked, toggleLikeSong, subscribeToLikes } from './playlistStorage';

export default function LikeButton({ song, size = 22, style = {} }) {
    const [isLiked, setIsLiked] = useState(false);
    const scaleAnim = useState(new Animated.Value(1))[0];

    useEffect(() => {
        if (!song || !song.id) {
            setIsLiked(false);
            return;
        }

        isSongLiked(song.id).then(liked => setIsLiked(liked));

        const unsubscribe = subscribeToLikes((likedSongs) => {
            const liked = likedSongs.some(s => s.id === song.id);
            setIsLiked(liked);
        });

        return () => unsubscribe();
    }, [song?.id]);

    const handlePress = async () => {
        if (!song || !song.id) return;

        // Bounce scale animation
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.3,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start();

        const newState = await toggleLikeSong(song);
        setIsLiked(newState);
    };

    if (!song) return null;

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[styles.btn, style]}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Heart
                    size={size}
                    color={isLiked ? '#ef4444' : '#a1a1aa'}
                    fill={isLiked ? '#ef4444' : 'transparent'}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
