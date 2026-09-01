import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useState } from "react";
import { useAudioPlayer } from "./audioPlayer";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronDown,
  Repeat,
  Repeat1,
  Shuffle,
  Download,
  ListMusic,
  Plus,
  Minus,
  AlignLeft,
  FolderPlus,
} from "lucide-react-native";
import Slider from "@react-native-community/slider";
import DownloadButton from "./DownloadButton";
import LikeButton from "./LikeButton";
import WaveformVisualizer from "./WaveformVisualizer";
import AddToPlaylistModal from "./AddToPlaylistModal";
import { useEffect } from "react";
import { api } from "./api";

export default function FullScreenPlayer({ visible, onClose }) {
  const {
    currentSong,
    isPlaying,
    isBuffering,
    togglePlayPause,
    playNext,
    playPrev,
    position,
    duration,
    seekTo,
    queue,
    queueIndex,
    playSong,
    repeatMode,
    toggleRepeat,
    isShuffle,
    toggleShuffle,
    playbackSpeed,
    setPlaybackSpeed,
  } = useAudioPlayer();

  const [showQueue, setShowQueue] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsData, setLyricsData] = useState(null);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [lyricsOffset, setLyricsOffset] = useState(0);

  useEffect(() => {
    if (currentSong && visible) {
      // Fetch lyrics and offset
      setLyricsData(null);
      setParsedLyrics([]);

      api
        .get(`/lyrics/offset/${currentSong.id}`)
        .then((res) => {
          if (res.data && res.data.offset !== undefined) {
            setLyricsOffset(res.data.offset);
          } else {
            setLyricsOffset(0);
          }
        })
        .catch(() => setLyricsOffset(0));

      api
        .get(
          `/lyrics?title=${encodeURIComponent(currentSong.title)}&author=${encodeURIComponent(currentSong.author)}`,
        )
        .then((res) => {
          setLyricsData(res.data);
          if (res.data.syncedLyrics) {
            const lines = res.data.syncedLyrics.split("\n");
            const parsed = [];
            lines.forEach((line) => {
              const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
              if (match) {
                const mins = parseInt(match[1]);
                const secs = parseFloat(match[2]);
                const text = match[3].trim();
                parsed.push({ time: mins * 60 + secs, text });
              }
            });
            setParsedLyrics(parsed);
          }
        })
        .catch((err) => console.log("Failed to fetch lyrics"));
    }
  }, [currentSong, visible]);

  const saveOffset = (newOffset) => {
    setLyricsOffset(newOffset);
    if (!currentSong) return;
    api
      .post("/lyrics/offset", { id: currentSong.id, offset: newOffset })
      .catch(() => {});
  };

  if (!currentSong) return null;

  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (showQueue) {
                setShowQueue(false);
              } else if (showLyrics) {
                setShowLyrics(false);
              } else {
                onClose();
              }
            }}
            style={styles.iconBtn}
          >
            <ChevronDown color="white" size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {showQueue ? "Queue" : showLyrics ? "Lyrics" : "Now Playing"}
          </Text>
          <TouchableOpacity
            onPress={() => setShowQueue(!showQueue)}
            style={styles.iconBtn}
          >
            <ListMusic color={showQueue ? "#1ed760" : "white"} size={24} />
          </TouchableOpacity>
        </View>

        {showQueue ? (
          <ScrollView style={styles.queueContainer}>
            <Text style={styles.queueHeader}>Next in Queue</Text>
            {queue.slice(queueIndex + 1).map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={styles.queueItem}
                onPress={() => {
                  playSong(item, queue, queueIndex + 1 + idx);
                  setShowQueue(false);
                }}
              >
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.queueImg}
                />
                <View style={styles.queueInfo}>
                  <Text style={styles.queueTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.queueAuthor} numberOfLines={1}>
                    {item.author}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {queue.length - 1 === queueIndex && (
              <Text
                style={{ color: "#a1a1aa", textAlign: "center", marginTop: 20 }}
              >
                Queue is empty
              </Text>
            )}
          </ScrollView>
        ) : showLyrics ? (
          <View style={styles.fullLyricsContainer}>
             <View style={styles.lyricsHeader}>
                <Text style={styles.lyricsHeaderText}>Lyrics</Text>
                
                {parsedLyrics.length > 0 && (
                  <View style={styles.syncControls}>
                    <Text style={styles.syncLabel}>
                      Sync: {(lyricsOffset > 0 ? "+" : "") + lyricsOffset}s
                    </Text>
                    <TouchableOpacity
                      onPress={() => saveOffset(lyricsOffset - 0.5)}
                      style={styles.syncBtn}
                    >
                      <Minus color="white" size={16} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => saveOffset(lyricsOffset + 0.5)}
                      style={styles.syncBtn}
                    >
                      <Plus color="white" size={16} />
                    </TouchableOpacity>
                  </View>
                )}
             </View>

             <ScrollView style={styles.fullLyricsScroll} showsVerticalScrollIndicator={false}>
                {parsedLyrics.length > 0 ? (
                  parsedLyrics.map((line, idx) => {
                    const currentSec = position / 1000 + lyricsOffset;
                    const nextTime = parsedLyrics[idx + 1] ? parsedLyrics[idx + 1].time : duration / 1000;
                    const isActive = currentSec >= line.time && currentSec < nextTime;

                    return (
                      <Text
                        key={idx}
                        style={[
                          styles.fullLyricLine,
                          isActive && styles.fullLyricLineActive,
                        ]}
                      >
                        {line.text || " "}
                      </Text>
                    );
                  })
                ) : lyricsData?.plainLyrics ? (
                  <Text style={styles.plainLyrics}>
                    {lyricsData.plainLyrics}
                  </Text>
                ) : (
                  <Text style={styles.plainLyrics}>
                    No lyrics found for this song.
                  </Text>
                )}
             </ScrollView>
          </View>
        ) : (
          <>
            <View style={styles.artContainer}>
              <Image
                source={{ uri: currentSong.thumbnail }}
                style={styles.albumArt}
              />
              <WaveformVisualizer isPlaying={isPlaying} />
            </View>

            <View style={styles.infoContainer}>
              <View style={styles.titleRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {currentSong.title}
                  </Text>
                  <Text style={styles.author} numberOfLines={1}>
                    {currentSong.author}
                  </Text>
                </View>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    onPress={() => {
                      const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
                      const currIdx = speeds.indexOf(playbackSpeed || 1.0);
                      const nextIdx = (currIdx + 1) % speeds.length;
                      setPlaybackSpeed(speeds[nextIdx]);
                    }}
                    style={styles.speedBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.speedBtnText}>{(playbackSpeed || 1.0) + 'x'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowAddToPlaylist(true)}
                    style={styles.actionIconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
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
                  minimumTrackTintColor="white"
                  maximumTrackTintColor="#3f3f46"
                  thumbTintColor="white"
                  onSlidingComplete={(val) => seekTo(val)}
                />
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{formatTime(position)}</Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>
              </View>

              {/* Controls */}
              <View style={styles.controlsRow}>
                <TouchableOpacity onPress={toggleShuffle} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Shuffle color={isShuffle ? "#1ed760" : "#a1a1aa"} size={24} />
                </TouchableOpacity>

                <TouchableOpacity onPress={playPrev} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <SkipBack color="white" size={36} fill="currentColor" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={togglePlayPause}
                  style={styles.playBtn}
                >
                  {isBuffering && !isPlaying ? (
                    <ActivityIndicator color="black" size="large" />
                  ) : isPlaying ? (
                    <Pause color="black" size={32} fill="currentColor" />
                  ) : (
                    <Play color="black" size={32} fill="currentColor" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={playNext} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <SkipForward color="white" size={36} fill="currentColor" />
                </TouchableOpacity>

                <TouchableOpacity onPress={toggleRepeat} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  {repeatMode === 'one' ? (
                    <Repeat1 color="#1ed760" size={24} />
                  ) : (
                    <Repeat color={repeatMode === 'all' ? "#1ed760" : "#a1a1aa"} size={24} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Lyrics Box (Small) */}
              <TouchableOpacity style={styles.lyricsContainer} onPress={() => setShowLyrics(true)} activeOpacity={0.8}>
                <View style={styles.lyricsHeaderSmall}>
                  <Text style={styles.lyricsHeaderTextSmall}>Lyrics</Text>
                  <View style={styles.lyricsExpandBtn}>
                      <Text style={{color: 'white', fontWeight: 'bold'}}>EXPAND</Text>
                  </View>
                </View>

                <View style={styles.lyricsScrollSmall}>
                  {parsedLyrics.length > 0 ? (
                    parsedLyrics.map((line, idx) => {
                      const currentSec = position / 1000 + lyricsOffset;
                      const nextTime = parsedLyrics[idx + 1] ? parsedLyrics[idx + 1].time : duration / 1000;
                      const isActive = currentSec >= line.time && currentSec < nextTime;

                      // Only show active or nearby lines in small view
                      if (isActive || (currentSec < line.time && currentSec > line.time - 5)) {
                          return (
                            <Text
                              key={idx}
                              style={[
                                styles.lyricLineSmall,
                                isActive && styles.lyricLineActiveSmall,
                              ]}
                            >
                              {line.text || " "}
                            </Text>
                          );
                      }
                      return null;
                    })
                  ) : lyricsData?.plainLyrics ? (
                    <Text style={styles.plainLyrics} numberOfLines={3}>
                      {lyricsData.plainLyrics}
                    </Text>
                  ) : (
                    <Text style={styles.plainLyrics}>
                      No lyrics found for this song.
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <AddToPlaylistModal
        visible={showAddToPlaylist}
        song={currentSong}
        onClose={() => setShowAddToPlaylist(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  iconBtn: {
    padding: 5,
  },
  headerTitle: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  artContainer: {
    alignItems: "center",
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  albumArt: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
  },
  infoContainer: {
    paddingHorizontal: 30,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionIconBtn: {
    padding: 6,
  },
  speedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginRight: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  speedBtnText: {
    color: "#1ed760",
    fontSize: 12,
    fontWeight: "bold",
  },
  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  author: {
    color: "#a1a1aa",
    fontSize: 16,
  },
  progressContainer: {
    marginBottom: 30,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -10,
  },
  timeText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1ed760",
    alignItems: "center",
    justifyContent: "center",
  },
  queueContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  queueHeader: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  queueImg: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  queueInfo: {
    flex: 1,
    marginLeft: 12,
  },
  queueTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 2,
  },
  queueAuthor: {
    color: "#a1a1aa",
    fontSize: 13,
  },
  fullLyricsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  lyricsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  lyricsHeaderText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 24,
  },
  syncControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  syncLabel: {
    color: "#a1a1aa",
    fontSize: 14,
    marginRight: 10,
  },
  syncBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    marginLeft: 8,
  },
  fullLyricsScroll: {
    flex: 1,
  },
  fullLyricLine: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 28,
    lineHeight: 40,
    marginBottom: 16,
    fontWeight: "bold",
  },
  fullLyricLineActive: {
    color: "white",
    fontSize: 32,
    lineHeight: 44,
  },
  
  // Small Lyrics Box
  lyricsContainer: {
    marginTop: 30,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    height: 180,
  },
  lyricsHeaderSmall: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  lyricsHeaderTextSmall: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  lyricsExpandBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lyricsScrollSmall: {
    flex: 1,
    overflow: 'hidden',
  },
  lyricLineSmall: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 6,
    fontWeight: "600",
  },
  lyricLineActiveSmall: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  plainLyrics: {
    color: "#e4e4e7",
    fontSize: 16,
    lineHeight: 24,
  },
});
