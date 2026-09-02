import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Animated,
    Platform,
    ActivityIndicator
} from 'react-native';
import { useAudioPlayer } from '../services/audioPlayer';
import { Play, Pause, Disc3, ChevronUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DynamicIslandProps {
    onPressExpand?: () => void;
}

export default function DynamicIslandPill({ onPressExpand }: DynamicIslandProps) {
    const { currentSong, isPlaying, isBuffering, togglePlayPause }: any = useAudioPlayer();
    const insets = useSafeAreaInsets();

    const scaleAnim = useRef(new Animated.Value(0)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;

    // Equalizer bar heights
    const bar1Anim = useRef(new Animated.Value(4)).current;
    const bar2Anim = useRef(new Animated.Value(10)).current;
    const bar3Anim = useRef(new Animated.Value(6)).current;

    useEffect(() => {
        if (currentSong) {
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 60,
                friction: 8,
            }).start();
        } else {
            Animated.timing(scaleAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [currentSong]);

    useEffect(() => {
        let spinLoop: Animated.CompositeAnimation | null = null;
        let eqLoop: Animated.CompositeAnimation | null = null;

        if (isPlaying) {
            // Disc rotation
            spinLoop = Animated.loop(
                Animated.timing(spinAnim, {
                    toValue: 1,
                    duration: 6000,
                    useNativeDriver: true,
                })
            );
            spinLoop.start();

            // Equalizer bounce
            eqLoop = Animated.loop(
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(bar1Anim, { toValue: 14, duration: 300, useNativeDriver: false }),
                        Animated.timing(bar1Anim, { toValue: 4, duration: 300, useNativeDriver: false }),
                    ]),
                    Animated.sequence([
                        Animated.timing(bar2Anim, { toValue: 5, duration: 250, useNativeDriver: false }),
                        Animated.timing(bar2Anim, { toValue: 16, duration: 250, useNativeDriver: false }),
                    ]),
                    Animated.sequence([
                        Animated.timing(bar3Anim, { toValue: 12, duration: 350, useNativeDriver: false }),
                        Animated.timing(bar3Anim, { toValue: 3, duration: 350, useNativeDriver: false }),
                    ]),
                ])
            );
            eqLoop.start();
        } else {
            spinAnim.setValue(0);
            bar1Anim.setValue(4);
            bar2Anim.setValue(6);
            bar3Anim.setValue(4);
        }

        return () => {
            if (spinLoop) spinLoop.stop();
            if (eqLoop) eqLoop.stop();
        };
    }, [isPlaying]);

    if (!currentSong) return null;

    const spin = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const topOffset = Math.max(insets.top, Platform.OS === 'ios' ? 12 : 8);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    top: topOffset,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                style={styles.pill}
                onPress={onPressExpand}
                activeOpacity={0.88}
            >
                {/* Left: Animated spinning artwork / disc */}
                <View style={styles.artContainer}>
                    {currentSong.thumbnail ? (
                        <Animated.Image
                            source={{ uri: currentSong.thumbnail }}
                            style={[
                                styles.art,
                                isPlaying && { transform: [{ rotate: spin }] },
                            ]}
                        />
                    ) : (
                        <Disc3 color="#1ed760" size={20} />
                    )}
                </View>

                {/* Center: Track title & Equalizer */}
                <View style={styles.trackInfo}>
                    <Text style={styles.title} numberOfLines={1}>
                        {currentSong.title}
                    </Text>
                    <View style={styles.subRow}>
                        <Text style={styles.artist} numberOfLines={1}>
                            {currentSong.author || 'Playing'}
                        </Text>
                        {isPlaying && (
                            <View style={styles.eqContainer}>
                                <Animated.View style={[styles.eqBar, { height: bar1Anim }]} />
                                <Animated.View style={[styles.eqBar, { height: bar2Anim }]} />
                                <Animated.View style={[styles.eqBar, { height: bar3Anim }]} />
                            </View>
                        )}
                    </View>
                </View>

                {/* Right: Play/Pause/Buffering button */}
                <TouchableOpacity
                    style={styles.playBtn}
                    onPress={(e) => {
                        e.stopPropagation();
                        togglePlayPause();
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    {isBuffering ? (
                        <ActivityIndicator size="small" color="#1ed760" />
                    ) : isPlaying ? (
                        <Pause color="#1ed760" size={16} fill="#1ed760" />
                    ) : (
                        <Play color="#1ed760" size={16} fill="#1ed760" />
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        elevation: 10,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121216',
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 7,
        maxWidth: 340,
        width: '92%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    artContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        overflow: 'hidden',
        backgroundColor: '#27272a',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    art: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
    trackInfo: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    subRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    artist: {
        color: '#a1a1aa',
        fontSize: 10,
        flexShrink: 1,
    },
    eqContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 2,
        marginLeft: 6,
        height: 12,
    },
    eqBar: {
        width: 2,
        backgroundColor: '#1ed760',
        borderRadius: 1,
    },
    playBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
