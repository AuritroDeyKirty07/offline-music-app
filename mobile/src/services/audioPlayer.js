import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef
} from 'react';

import { Audio } from 'expo-av';

import { api } from './api';

import { getOfflineSong } from './offlineStorage';

import { getPreferences } from './preferences';

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
    const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
    const [isShuffle, setIsShuffle] = useState(false);

    const currentSongRef = useRef(null);
    const isPlayingRef = useRef(isPlaying);
    const playbackIdRef = useRef(0);
    const queueRef = useRef([]);
    const queueIndexRef = useRef(0);
    const repeatModeRef = useRef('off');
    const isShuffleRef = useRef(false);
    const isLibraryQueueRef = useRef(false);
    const finishingRef = useRef(false);

    useEffect(() => {
        currentSongRef.current = currentSong;
    }, [currentSong]);

    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    useEffect(() => {
        queueRef.current = queue;
    }, [queue]);

    useEffect(() => {
        queueIndexRef.current = queueIndex;
    }, [queueIndex]);

    useEffect(() => {
        repeatModeRef.current = repeatMode;
    }, [repeatMode]);

    useEffect(() => {
        isShuffleRef.current = isShuffle;
    }, [isShuffle]);

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync().catch(() => {});
            }
            : undefined;
    }, [sound]);

    const toggleRepeat = () => {
        setRepeatMode(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
        });
    };

    const toggleShuffle = () => {
        setIsShuffle(prev => {
            const nextVal = !prev;
            if (nextVal) {
                // Shuffle the remaining queue items while keeping the currently playing song in place
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

    const playSong = async (
        song,
        newQueue = null,
        newIndex = 0,
        options = {}
    ) => {
        const playId = ++playbackIdRef.current;

        finishingRef.current = false;

        if (options && options.isLibrary !== undefined) {
            isLibraryQueueRef.current = options.isLibrary;
        }

        try {
            if (!song || !song.id) {
                throw new Error('Invalid song');
            }

            // Stop currently playing sound
            if (sound) {
                await sound.unloadAsync().catch(() => {});
                setSound(null);
            }

            // Update queue
            if (newQueue) {
                setQueue(newQueue);
                setQueueIndex(newIndex);

                queueRef.current = newQueue;
                queueIndexRef.current = newIndex;

            } else if (queueRef.current.length === 0) {
                const initialQueue = [song];

                setQueue(initialQueue);
                setQueueIndex(0);

                queueRef.current = initialQueue;
                queueIndexRef.current = 0;
            }

            setCurrentSong(song);
            currentSongRef.current = song;
            setIsPlaying(false);
            setIsBuffering(true);
            setPosition(0);
            setDuration((Number(song.duration) || 0) * 1000);

            await Audio.setAudioModeAsync({
                staysActiveInBackground: true,
                playsInSilentModeIOS: true,
                shouldRouteThroughEarpiece: false,
            });

            if (playId !== playbackIdRef.current) {
                return;
            }

            /*
             * FAST OFFLINE DETECTION:
             * If song exists locally on phone, play offline file immediately!
             */
            let offlineSong = await getOfflineSong(song.id);

            if (playId !== playbackIdRef.current) {
                return;
            }

            let uri;

            if (offlineSong && offlineSong.localUri) {
                uri = offlineSong.localUri;
                console.log('🎵 Playing instantly from local offline storage:', uri);
            } else if (song.localUri) {
                uri = song.localUri;
                console.log('🎵 Playing from song localUri:', uri);
            } else {
                try {
                    const playRes = await api.post('/play', { song, download: false }, { timeout: 15000 });
                    if (playRes && playRes.data && playRes.data.url) {
                        uri = playRes.data.url;
                    } else {
                        uri = `${api.defaults.baseURL}/stream/${encodeURIComponent(song.id)}`;
                    }
                } catch (err) {
                    uri = `${api.defaults.baseURL}/stream/${encodeURIComponent(song.id)}`;
                }
                console.log('🌐 Streaming online:', uri);
            }

            if (playId !== playbackIdRef.current) {
                return;
            }

            const { sound: newSound } =
                await Audio.Sound.createAsync(
                    { uri },
                    {
                        shouldPlay: true,
                        progressUpdateIntervalMillis: 500,
                    }
                );

            if (playId !== playbackIdRef.current) {
                await newSound.unloadAsync().catch(() => {});
                return;
            }

            setSound(newSound);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPosition(status.positionMillis || 0);

                    let dur = status.durationMillis;
                    if (!dur) {
                        dur = (Number(song.duration) || 0) * 1000;
                    }
                    setDuration(dur || 1);

                    setIsPlaying(status.isPlaying);

                    if (status.isPlaying) {
                        setIsBuffering(false);
                    } else {
                        setIsBuffering(
                            status.isBuffering ||
                            (status.shouldPlay && !status.isPlaying)
                        );
                    }

                    if (
                        status.didJustFinish &&
                        !status.isLooping &&
                        !finishingRef.current
                    ) {
                        finishingRef.current = true;
                        if (repeatModeRef.current === 'one') {
                            newSound.setPositionAsync(0)
                                .then(() => newSound.playAsync())
                                .then(() => { finishingRef.current = false; })
                                .catch(() => { finishingRef.current = false; });
                        } else {
                            playNextRef();
                        }
                    }

                } else if (status.error) {
                    console.error('Audio Playback Error:', status.error);
                }
            });

        } catch (e) {
            console.error('Error playing song:', e);

            if (playId === playbackIdRef.current) {
                setIsBuffering(false);
                setIsPlaying(false);
            }
        }
    };

    const normalizeTitleForDedup = (title = '') => {
        return title
            .toLowerCase()
            .replace(/\[.*?\]/g, '')
            .replace(/\(.*?\)/g, '')
            .replace(/\{.*?\}/g, '')
            .replace(/official\s*(music)?\s*(video|audio|lyric\s*video)?/gi, '')
            .replace(/lyric(s|al)?\s*(video)?/gi, '')
            .replace(/8k|4k|hd|remastered|full\s*song/gi, '')
            .replace(/feat\.?|ft\.?|with|prod\.?/gi, '')
            .replace(/[^a-z0-9]/gi, '')
            .trim();
    };

    const appendToQueue = (newSongs) => {
        if (!newSongs || newSongs.length === 0) {
            return;
        }

        setQueue(prev => {
            const existingKeys = new Set();
            if (currentSongRef.current) {
                existingKeys.add(currentSongRef.current.id);
                existingKeys.add(normalizeTitleForDedup(currentSongRef.current.title));
            }
            prev.forEach(s => {
                existingKeys.add(s.id);
                existingKeys.add(normalizeTitleForDedup(s.title));
            });

            const deduplicated = [];
            for (const s of newSongs) {
                const norm = normalizeTitleForDedup(s.title);
                if (s.id && !existingKeys.has(s.id) && norm && !existingKeys.has(norm)) {
                    existingKeys.add(s.id);
                    existingKeys.add(norm);
                    deduplicated.push(s);
                }
            }

            const nextQ = [
                ...prev,
                ...deduplicated
            ];

            queueRef.current = nextQ;
            return nextQ;
        });
    };

    const togglePlayPause = async () => {
        if (!sound) {
            return;
        }

        try {
            if (isPlaying) {
                await sound.pauseAsync();
            } else {
                await sound.playAsync();
            }
        } catch (e) {
            console.error('Play/pause error:', e);
        }
    };

    const seekTo = async (millis) => {
        if (!sound) {
            return;
        }

        try {
            await sound.setPositionAsync(millis);
            setPosition(millis);
        } catch (e) {
            console.error('Seek error:', e);
        }
    };

    const playNextRef = async () => {
        const q = queueRef.current;
        const idx = queueIndexRef.current;

        // 1. If more songs in current queue, play next song
        if (idx < q.length - 1) {
            const nextIdx = idx + 1;
            playSong(
                q[nextIdx],
                q,
                nextIdx,
                { isLibrary: isLibraryQueueRef.current }
            );
            return;
        }

        // 2. If queue reached the end and it's a Library/Downloads queue OR Repeat All is enabled:
        if (q.length > 0 && (isLibraryQueueRef.current || repeatModeRef.current === 'all')) {
            console.log('🔄 Loop queue back to start');
            playSong(
                q[0],
                q,
                0,
                { isLibrary: isLibraryQueueRef.current }
            );
            return;
        }

        // 3. Online Autoplay queue finished: fetch AI recommendations
        if (q.length > 0) {
            try {
                const prefs = await getPreferences();

                if (prefs.autoPlay !== false) {
                    setIsBuffering(true);
                    const lastSong = q[idx];

                    const res = await api.post(
                        '/ai-recommend',
                        {
                            title: lastSong.title,
                            author: lastSong.author,
                            language: (prefs.languages && prefs.languages[0]) || 'English',
                            artists: prefs.artists || [],
                            genres: prefs.genres || []
                        }
                    );

                    if (res.data && res.data.length > 0) {
                        const existingKeys = new Set();
                        q.forEach(s => {
                            existingKeys.add(s.id);
                            existingKeys.add(normalizeTitleForDedup(s.title));
                        });
                        if (currentSongRef.current) {
                            existingKeys.add(currentSongRef.current.id);
                            existingKeys.add(normalizeTitleForDedup(currentSongRef.current.title));
                        }

                        const newRecommendations = [];
                        for (const s of res.data) {
                            const norm = normalizeTitleForDedup(s.title);
                            if (s.id && !existingKeys.has(s.id) && norm && !existingKeys.has(norm)) {
                                existingKeys.add(s.id);
                                existingKeys.add(norm);
                                newRecommendations.push(s);
                            }
                        }

                        if (newRecommendations.length > 0) {
                            const nextQ = [
                                ...q,
                                ...newRecommendations
                            ];

                            setQueue(nextQ);
                            queueRef.current = nextQ;

                            const nextIdx = idx + 1;
                            playSong(
                                nextQ[nextIdx],
                                nextQ,
                                nextIdx
                            );
                            return;
                        }

                    } else {
                        setIsBuffering(false);
                    }

                } else {
                    setIsBuffering(false);
                }

            } catch (e) {
                setIsBuffering(false);
                console.error('Autoplay failed:', e);
            }
        }
    };

    const playNext = async () => {
        await playNextRef();
    };

    const playPrev = async () => {
        const q = queueRef.current;
        const idx = queueIndexRef.current;

        if (idx > 0) {
            const prevIdx = idx - 1;
            playSong(
                q[prevIdx],
                q,
                prevIdx,
                { isLibrary: isLibraryQueueRef.current }
            );
        } else if (repeatModeRef.current === 'all' && q.length > 0) {
            const lastIdx = q.length - 1;
            playSong(
                q[lastIdx],
                q,
                lastIdx,
                { isLibrary: isLibraryQueueRef.current }
            );
        }
    };

    return (
        <AudioContext.Provider
            value={{
                currentSong,
                isPlaying,
                isBuffering,
                position,
                duration,
                queue,
                queueIndex,
                repeatMode,
                isShuffle,

                playSong,
                togglePlayPause,
                seekTo,
                toggleRepeat,
                toggleShuffle,

                playNext,
                playPrev,
                appendToQueue
            }}
        >
            {children}
        </AudioContext.Provider>
    );
};