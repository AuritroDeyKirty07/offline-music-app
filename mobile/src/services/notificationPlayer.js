import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

let Notifications = null;
try {
    Notifications = require('expo-notifications');
    if (Notifications && Notifications.setNotificationHandler) {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: false,
                shouldPlaySound: false,
                shouldSetBadge: false,
            }),
        });
    }
} catch (_) {}

const NOTIFICATION_ID = 'chord_playback_notification';
const isExpoGo = Constants?.executionEnvironment === ExecutionEnvironment?.StoreClient || Constants?.appOwnership === 'expo';

export const setupNotificationChannels = async () => {
    if (Platform.OS === 'android' && Notifications && !isExpoGo) {
        try {
            await Notifications.requestPermissionsAsync();
            await Notifications.setNotificationChannelAsync('music_playback', {
                name: 'Music Playback',
                importance: Notifications.AndroidImportance.MAX,
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
    if (Platform.OS === 'web' || !song || !Notifications || isExpoGo) return;

    try {
        await setupNotificationChannels();

        const statusIcon = isPlaying ? '▶️' : '⏸️';
        const title = `${statusIcon} ${song.title || 'Playing Music'}`;
        const body = `${song.author || 'Chord Music'} • Offline Music Player`;

        await Notifications.scheduleNotificationAsync({
            identifier: NOTIFICATION_ID,
            content: {
                title,
                body,
                sound: null,
                sticky: true,
                autoDismiss: false,
                color: '#1ed760',
                priority: Notifications.AndroidNotificationPriority.MAX,
                data: { songId: song.id, isPlaying },
            },
            trigger: null,
        });
    } catch (err) {
        // Notification permission might not be granted yet
    }
};

export const dismissMediaNotification = async () => {
    if (Platform.OS === 'web' || !Notifications || isExpoGo) return;
    try {
        await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
    } catch (_) {}
};
