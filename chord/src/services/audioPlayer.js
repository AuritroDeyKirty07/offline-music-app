import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { findOfflineAudioUri, downloadSong } from './offlineStorage';
import { getAudioStreamUrl } from './youtube';
import { getPreferences } from './preferences';
import { getAiQueueRecommendations } from './gemini';
import { updateMediaNotification, dismissMediaNotification } from './notificationPlayer';

const AudioContext = createContext({});
export const useAudioPlayer = () => useContext(AudioContext);

export const AudioProvider = ({ children }) => {
    const [sound, setSound] = useState(null);
    const [currentSong, setCurrentSong] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    const [queue, setQueue] = useState([]);
    const [queueIndex, setQueueIndex] = useState(0);
    const [repeatMode, setRepeatMode] = useState('off');
    const [isShuffle, setIsShuffle] = useState(false);

    const soundRef = useRef(null);
    const currentSongRef = useRef(null);
    const isPlayingRef = useRef(isPlaying);
    const playbackIdRef = useRef(0);
    const queueRef = useRef([]);
    const queueIndexRef = useRef(0);
    const repeatModeRef = useRef('off');
    const isShuffleRef = useRef(false);
    const isLibraryQueueRef = useRef(false);
    const finishingRef = useRef(false);

    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { queueRef.current = queue; }, [queue]);
    useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
    useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
    useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);

    useEffect(() => {
        if (currentSong) {
            updateMediaNotification(currentSong, isPlaying);
        } else {
            dismissMediaNotification();
        }
    }, [currentSong, isPlaying]);

    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync().catch(() => {});
                soundRef.current = null;
            }
        };
    }, []);

    const toggleRepeat = () => {
        setRepeatMode(prev => prev === 'off' ? 'all' : (prev === 'all' ? 'one' : 'off'));
    };

    const toggleShuffle = () => {
        setIsShuffle(prev => {
            const nextVal = !prev;
            if (nextVal) {
                const currentQ = [...queueRef.current];
                const currentIdx = queueIndexRef.current;
                if (currentQ.length > 1 && currentIdx < currentQ.length) {
                    const currentItem = currentQ[currentIdx];
                    const before = currentQ.slice(0, currentIdx);
                    const after = currentQ.slice(currentIdx + 1);
                    const shuffledAfter = [...after].sort(() => Math.random() - 0.5);
                    const newQ = [...before, currentItem, ...shuffledAfter];
                    setQueue(newQ);
                    queueRef.current = newQ;
                }
            }
            return nextVal;
        });
    };

    const playSong = async (song, newQueue = null, newIndex = 0, options = {}) => {
        const playId = ++playbackIdRef.current;
        finishingRef.current = false;

        if (options && options.isLibrary !== undefined) {
            isLibraryQueueRef.current = options.isLibrary;
        }

        try {
            if (!song) throw new Error('Invalid song');
            if (soundRef.current) {
                const old = soundRef.current;
                soundRef.current = null;
                old.unloadAsync().catch(() => {});
            }
            setSound(null);

            if (newQueue) {
                setQueue(newQueue);
                setQueueIndex(newIndex);
                queueRef.current = newQueue;
                queueIndexRef.current = newIndex;
            } else if (queueRef.current.length === 0) {
                setQueue([song]);
                setQueueIndex(0);
                queueRef.current = [song];
                queueIndexRef.current = 0;
            }

            setCurrentSong(song);
            currentSongRef.current = song;
            setIsPlaying(false);
            setIsBuffering(true);
            setPosition(0);
            setDuration((Number(song.duration) || 0) * 1000);

            await Audio.setAudioModeAsync({ staysActiveInBackground: true, playsInSilentModeIOS: true, shouldRouteThroughEarpiece: false });
            if (playId !== playbackIdRef.current) return;

            let localUri = await findOfflineAudioUri(song);
            let uri = localUri ? localUri : await getAudioStreamUrl(song);
            if (!uri) throw new Error('Audio stream unavailable');

            if (!localUri) {
                getPreferences().then(prefs => {
                    if (prefs.autoDownload === true) downloadSong(song).catch(() => {});
                }).catch(() => {});
            }

            if (playId !== playbackIdRef.current) return;

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: true, progressUpdateIntervalMillis: 500, shouldCorrectPitch: true }
            );

            if (playId !== playbackIdRef.current) {
                await newSound.unloadAsync().catch(() => {});
                return;
            }

            if (soundRef.current) {
                await soundRef.current.unloadAsync().catch(() => {});
            }
            soundRef.current = newSound;
            setSound(newSound);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPosition(status.positionMillis || 0);
                    let dur = status.durationMillis || (Number(song.duration) || 0) * 1000;
                    setDuration(dur || 1);
                    setIsPlaying(status.isPlaying);
                    setIsBuffering(status.isBuffering);

                    if (status.didJustFinish && !status.isLooping && !finishingRef.current) {
                        finishingRef.current = true;
                        handleSongEnd();
                    }
                } else if (status.error) {
                    setIsBuffering(false);
                }
            });

            triggerBackgroundAiQueue(song);
        } catch (err) {
            console.warn('Playback error:', err.message);
            setIsBuffering(false);
            setIsPlaying(false);
        }
    };

    const triggerBackgroundAiQueue = async (song) => {
        if (isLibraryQueueRef.current) return;
        try {
            const currentQ = queueRef.current;
            const currentIdx = queueIndexRef.current;
            if (currentQ.length - currentIdx <= 3) {
                const recs = await getAiQueueRecommendations(song);
                if (recs && recs.length > 0) appendToQueue(recs);
            }
        } catch (_) {}
    };

    const handleSongEnd = () => {
        const mode = repeatModeRef.current;
        if (mode === 'one') {
            if (currentSongRef.current) playSong(currentSongRef.current);
            return;
        }
        const currentQ = queueRef.current;
        const currentIdx = queueIndexRef.current;
        if (currentIdx < currentQ.length - 1) {
            playSong(currentQ[currentIdx + 1], null, currentIdx + 1);
        } else if (mode === 'all' && currentQ.length > 0) {
            playSong(currentQ[0], null, 0);
        } else {
            setIsPlaying(false);
            setPosition(0);
        }
    };

    const playNext = () => {
        const currentQ = queueRef.current;
        const currentIdx = queueIndexRef.current;
        if (currentQ.length === 0) return;
        if (currentIdx < currentQ.length - 1) {
            playSong(currentQ[currentIdx + 1], null, currentIdx + 1);
        } else if (repeatModeRef.current === 'all') {
            playSong(currentQ[0], null, 0);
        }
    };

    const playPrev = () => {
        const currentQ = queueRef.current;
        const currentIdx = queueIndexRef.current;
        if (currentQ.length === 0) return;
        if (position > 4000) { seekTo(0); return; }
        if (currentIdx > 0) playSong(currentQ[currentIdx - 1], null, currentIdx - 1);
        else seekTo(0);
    };

    const appendToQueue = (newSongs) => {
        if (!newSongs || newSongs.length === 0) return;
        setQueue(prev => {
            const nextQ = [...prev, ...newSongs];
            queueRef.current = nextQ;
            return nextQ;
        });
    };

    const togglePlayPause = async () => {
        const activeSound = soundRef.current || sound;
        if (!activeSound) return;
        try {
            if (isPlaying) await activeSound.pauseAsync();
            else await activeSound.playAsync();
        } catch (_) {}
    };

    const seekTo = async (millis) => {
        const activeSound = soundRef.current || sound;
        if (!activeSound) return;
        try {
            await activeSound.setPositionAsync(millis);
            setPosition(millis);
        } catch (_) {}
    };

    return (
        <AudioContext.Provider value={{ currentSong, isPlaying, isBuffering, position, duration, queue, queueIndex, repeatMode, isShuffle, playSong, togglePlayPause, seekTo, toggleRepeat, toggleShuffle, playNext, playPrev, appendToQueue }}>
            {children}
        </AudioContext.Provider>
    );
};
