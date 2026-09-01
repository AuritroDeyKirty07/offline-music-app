import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOTIFICATION_ID = 'chord_playback_notification';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
    }),
});

export const setupNotificationChannels = async () => {
    if (Platform.OS === 'android') {
        try {
            await Notifications.requestPermissionsAsync();
            await Notifications.setNotificationChannelAsync('music_playback', {
                name: 'Music Playback',
                importance: Notifications.AndroidImportance.LOW,
                vibrationPattern: [0],
                lightColor: '#1ed760',
                lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
                sound: null,
                enableVibrate: false,
                showBadge: false,
            });
        } catch (e) {
            console.warn('Failed to set notification channel:', e);
        }
    }
};

export const updateMediaNotification = async (song, isPlaying = true) => {
    if (Platform.OS === 'web' || !song) return;

    try {
        await setupNotificationChannels();

        const statusIcon = isPlaying ? '▶️' : '⏸️';
        const title = `${statusIcon} ${song.title || 'Playing Music'}`;
        const body = `${song.author || 'Chord Music'} • Chord Offline Player`;

        await Notifications.scheduleNotificationAsync({
            identifier: NOTIFICATION_ID,
            content: {
                title,
                body,
                sound: null,
                sticky: true,
                color: '#1ed760',
                priority: Notifications.AndroidNotificationPriority.LOW,
                data: { songId: song.id, isPlaying },
            },
            trigger: null, // show immediately
        });
    } catch (err) {
        // Notification permission might not be granted yet
    }
};

export const dismissMediaNotification = async () => {
    if (Platform.OS === 'web') return;
    try {
        await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
    } catch (_) {}
};
