import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

const BAR_COUNT = 24;
const BASE_HEIGHTS = [
    12, 24, 38, 48, 28, 42, 54, 36,
    44, 58, 40, 26, 46, 52, 34, 48,
    30, 42, 50, 36, 28, 40, 22, 14
];

export default function WaveformVisualizer({ isPlaying = false, barColor = '#1ed760' }) {
    const animatedValues = useRef(
        Array.from({ length: BAR_COUNT }, () => new Animated.Value(6))
    ).current;

    useEffect(() => {
        if (isPlaying) {
            const animations = animatedValues.map((anim, index) => {
                const targetHeight = BASE_HEIGHTS[index % BASE_HEIGHTS.length];
                const minHeight = 6 + (index % 4) * 2;
                const duration = 350 + (index % 5) * 80;

                return Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: targetHeight,
                            duration: duration,
                            easing: Easing.inOut(Easing.quad),
                            useNativeDriver: false,
                        }),
                        Animated.timing(anim, {
                            toValue: minHeight,
                            duration: duration + 40,
                            easing: Easing.inOut(Easing.quad),
                            useNativeDriver: false,
                        }),
                    ])
                );
            });

            animations.forEach((anim, i) => {
                setTimeout(() => anim.start(), (i * 35) % 300);
            });

            return () => {
                animations.forEach(anim => anim.stop());
            };
        } else {
            // Calmly settle to resting baseline
            Animated.parallel(
                animatedValues.map((anim, index) =>
                    Animated.timing(anim, {
                        toValue: 6 + (index % 3) * 2,
                        duration: 300,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: false,
                    })
                )
            ).start();
        }
    }, [isPlaying]);

    return (
        <View style={styles.container}>
            {animatedValues.map((anim, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.bar,
                        {
                            height: anim,
                            backgroundColor: barColor,
                            opacity: isPlaying ? 0.9 : 0.4,
                        },
                    ]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        gap: 3,
        paddingHorizontal: 16,
        marginVertical: 4,
    },
    bar: {
        width: 3.5,
        borderRadius: 3,
        shadowColor: '#1ed760',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
});
