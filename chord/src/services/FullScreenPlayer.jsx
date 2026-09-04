import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { ChevronDown, Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, ListMusic, Mic2, FolderPlus, Plus, Minus } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useAudioPlayer } from './audioPlayer';
import DownloadButton from './DownloadButton';
import LikeButton from './LikeButton';
import AddToPlaylistModal from './AddToPlaylistModal';
import { fetchLyrics } from './lyrics';

const { width } = Dimensions.get('window');

export default function FullScreenPlayer({ visible, onClose }) {
    const { currentSong, isPlaying, isBuffering, togglePlayPause, playNext, playPrev, position, duration, seekTo, queue, queueIndex, playSong, repeatMode, toggleRepeat, isShuffle, toggleShuffle } = useAudioPlayer();
    const [showQueue, setShowQueue] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
    const [lyricsData, setLyricsData] = useState(null);
    const [loadingLyrics, setLoadingLyrics] = useState(false);
    const [lyricsOffset, setLyricsOffset] = useState(0);

    useEffect(() => {
        if (!currentSong) return;
        setLyricsData(null);
        setLyricsOffset(0);
        setLoadingLyrics(true);
        fetchLyrics(currentSong.title, currentSong.author).then(res => {
            setLyricsData(res);
            setLoadingLyrics(false);
        }).catch(() => {
            setLoadingLyrics(false);
        });
    }, [currentSong?.id, currentSong?.title]);

    const formatTime = (millis) => {
        if (!millis || isNaN(millis)) return '0:00';
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    if (!currentSong) return null;
    const currentSeconds = (position / 1000) + lyricsOffset;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                        <ChevronDown color="#fff" size={28} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {showQueue ? `Playing Queue (${queue.length})` : showLyrics ? 'Real-Time Lyrics' : 'Now Playing'}
                    </Text>
                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={() => { setShowLyrics(!showLyrics); setShowQueue(false); }} style={[styles.headerIconBtn, showLyrics && styles.headerIconActive]}>
                            <Mic2 color={showLyrics ? '#1ed760' : '#fff'} size={22} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setShowQueue(!showQueue); setShowLyrics(false); }} style={[styles.headerIconBtn, showQueue && styles.headerIconActive]}>
                            <ListMusic color={showQueue ? '#1ed760' : '#fff'} size={24} />
                        </TouchableOpacity>
                    </View>
                </View>

                {showQueue ? (
                    <ScrollView style={styles.queueScroll} contentContainerStyle={{ paddingBottom: 40 }}>
                        {queue.map((song, idx) => {
                            const isCurrent = currentSong?.id === song.id || idx === queueIndex;
                            return (
                                <TouchableOpacity key={song.id ? song.id + idx : idx} onPress={() => playSong(song, null, idx)} style={[styles.queueItem, isCurrent && styles.queueItemActive]}>
                                    <Image source={{ uri: song.thumbnail }} style={styles.queueThumb} />
                                    <View style={styles.queueInfo}>
                                        <Text style={[styles.queueSongTitle, isCurrent && { color: '#1ed760', fontWeight: 'bold' }]} numberOfLines={1}>{song.title}</Text>
                                        <Text style={styles.queueSongAuthor} numberOfLines={1}>{song.author}</Text>
                                    </View>
                                    {isCurrent && <Text style={styles.playingBadge}>PLAYING</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                ) : showLyrics ? (
                    <View style={styles.lyricsContainer}>
                        <View style={styles.offsetControls}>
                            <TouchableOpacity onPress={() => setLyricsOffset(prev => prev - 0.5)} style={styles.offsetBtn}>
                                <Minus color="#a1a1aa" size={16} /><Text style={styles.offsetText}>-0.5s</Text>
                            </TouchableOpacity>
                            <Text style={styles.offsetLabel}>{lyricsOffset === 0 ? 'Sync: Auto' : `Sync: ${lyricsOffset > 0 ? '+' : ''}${lyricsOffset}s`}</Text>
                            <TouchableOpacity onPress={() => setLyricsOffset(prev => prev + 0.5)} style={styles.offsetBtn}>
                                <Plus color="#a1a1aa" size={16} /><Text style={styles.offsetText}>+0.5s</Text>
                            </TouchableOpacity>
                        </View>

                        {loadingLyrics ? (
                            <View style={styles.lyricsLoadingBox}>
                                <ActivityIndicator color="#1ed760" size="large" />
                                <Text style={styles.lyricsLoadingText}>Fetching synced lyrics...</Text>
                            </View>
                        ) : (
                            <ScrollView style={styles.lyricsScroll} contentContainerStyle={{ paddingVertical: 30 }}>
                                {lyricsData?.parsed && lyricsData.parsed.length > 0 ? (
                                    lyricsData.parsed.map((line, index) => {
                                        const nextLine = lyricsData.parsed[index + 1];
                                        const isCurrent = currentSeconds >= line.time && (!nextLine || currentSeconds < nextLine.time);
                                        return <Text key={index} style={[styles.lyricLine, isCurrent && styles.lyricLineActive]}>{line.text}</Text>;
                                    })
                                ) : lyricsData?.plainLyrics ? (
                                    <Text style={styles.plainLyrics}>{lyricsData.plainLyrics}</Text>
                                ) : (
                                    <View style={{ alignItems: 'center', paddingTop: 60 }}>
                                        <Mic2 color="#3f3f46" size={48} style={{ marginBottom: 12 }} />
                                        <Text style={styles.plainLyrics}>No synced lyrics available for this track.</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                ) : (
                    <>
                        <View style={styles.artContainer}>
                            <Image source={{ uri: currentSong.thumbnail }} style={styles.albumArt} />
                        </View>
                        <View style={styles.infoContainer}>
                            <View style={styles.titleRow}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
                                    <Text style={styles.author} numberOfLines={1}>{currentSong.author}</Text>
                                </View>
                                <View style={styles.actionButtonsRow}>
                                    <TouchableOpacity onPress={() => setShowAddToPlaylist(true)} style={styles.actionIconBtn}>
                                        <FolderPlus color="#a1a1aa" size={24} />
                                    </TouchableOpacity>
                                    <LikeButton song={currentSong} size={25} style={{ marginHorizontal: 8 }} />
                                    <DownloadButton song={currentSong} size={26} />
                                </View>
                            </View>
                            <View style={styles.progressContainer}>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={0}
                                    maximumValue={duration > 0 ? duration : 1}
                                    value={position || 0}
                                    minimumTrackTintColor="#1ed760"
                                    maximumTrackTintColor="#3f3f46"
                                    thumbTintColor="#1ed760"
                                    onSlidingComplete={val => seekTo(val)}
                                />
                                <View style={styles.timeRow}>
                                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                                </View>
                            </View>
                            <View style={styles.controlsRow}>
                                <TouchableOpacity onPress={toggleShuffle} style={styles.controlIconBtn}>
                                    <Shuffle color={isShuffle ? '#1ed760' : '#71717a'} size={22} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={playPrev} style={styles.controlIconBtn}>
                                    <SkipBack color="#fff" size={28} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseBtn}>
                                    {isBuffering && !isPlaying ? (
                                        <ActivityIndicator color="#000" size="small" />
                                    ) : isPlaying ? (
                                        <Pause color="#000" size={28} fill="#000" />
                                    ) : (
                                        <Play color="#000" size={28} fill="#000" />
                                    )}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={playNext} style={styles.controlIconBtn}>
                                    <SkipForward color="#fff" size={28} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={toggleRepeat} style={styles.controlIconBtn}>
                                    {repeatMode === 'one' ? (
                                        <Repeat1 color="#1ed760" size={22} />
                                    ) : (
                                        <Repeat color={repeatMode === 'all' ? '#1ed760' : '#71717a'} size={22} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                )}
                <AddToPlaylistModal visible={showAddToPlaylist} onClose={() => setShowAddToPlaylist(false)} song={currentSong} />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#09090b', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 30 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: 10 },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    headerIconBtn: { padding: 6, marginLeft: 8 },
    headerIconActive: { backgroundColor: '#18181b', borderRadius: 20 },
    iconBtn: { padding: 6 },
    artContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
    albumArt: { width: width - 60, height: width - 60, borderRadius: 16, backgroundColor: '#27272a' },
    infoContainer: { flex: 1, justifyContent: 'flex-end', marginBottom: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    title: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
    author: { color: '#a1a1aa', fontSize: 16 },
    actionButtonsRow: { flexDirection: 'row', alignItems: 'center' },
    actionIconBtn: { padding: 6 },
    progressContainer: { marginBottom: 15 },
    slider: { width: '100%', height: 40 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -8 },
    timeText: { color: '#71717a', fontSize: 12 },
    controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
    controlIconBtn: { padding: 10 },
    playPauseBtn: { backgroundColor: '#1ed760', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    queueScroll: { flex: 1 },
    queueItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#18181b' },
    queueItemActive: { backgroundColor: '#18181b', borderRadius: 8, paddingHorizontal: 8 },
    queueThumb: { width: 44, height: 44, borderRadius: 6, backgroundColor: '#27272a', marginRight: 12 },
    queueInfo: { flex: 1 },
    queueSongTitle: { color: '#fff', fontSize: 15, fontWeight: '500', marginBottom: 2 },
    queueSongAuthor: { color: '#71717a', fontSize: 13 },
    playingBadge: { color: '#1ed760', fontSize: 10, fontWeight: 'bold', borderWidth: 1, borderColor: '#1ed760', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    lyricsContainer: { flex: 1 },
    offsetControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#18181b', padding: 8, borderRadius: 8, marginBottom: 10 },
    offsetBtn: { flexDirection: 'row', alignItems: 'center', padding: 6 },
    offsetText: { color: '#a1a1aa', fontSize: 12, marginLeft: 4 },
    offsetLabel: { color: '#71717a', fontSize: 12, fontWeight: '600' },
    lyricsScroll: { flex: 1 },
    lyricLine: { color: '#52525b', fontSize: 20, fontWeight: '600', textAlign: 'center', marginVertical: 12, lineHeight: 28 },
    lyricLineActive: { color: '#1ed760', fontSize: 24, fontWeight: 'bold' },
    plainLyrics: { color: '#d4d4d8', fontSize: 16, lineHeight: 26, textAlign: 'center' },
    lyricsLoadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    lyricsLoadingText: { color: '#71717a', fontSize: 14, marginTop: 12 }
});
