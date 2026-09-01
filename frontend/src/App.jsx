import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Play, Shuffle, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { API_BASE, defaultPrefs, artistsList, genresList, interestsList, languagesList } from './constants';
import Sidebar from './components/Sidebar';
import SongCard from './components/SongCard';
import MusicPlayer from './components/MusicPlayer';
import LyricsView from './components/LyricsView';
import PlaylistsView from './components/PlaylistsView';
import QueueView from './components/QueueView';

const getColorForName = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

function App() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [library, setLibrary] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [playingSongId, setPlayingSongId] = useState(null);
  const [visibleArtistsCount, setVisibleArtistsCount] = useState(15);
  const [isOfflineMode, setIsOfflineMode] = useState(true);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Queue & Autoplay
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const [pendingAiTitles, setPendingAiTitles] = useState([]);
  const [isQueueVisible, setIsQueueVisible] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // home, library, taste, queue, lyrics, playlists

  const [preferences, setPreferences] = useState({
    artists: [],
    genres: [],
    interests: [],
    languages: []
  });

  const [playlists, setPlaylists] = useState([]);
  const [playlistModalSong, setPlaylistModalSong] = useState(null);
  
  const [volume, setVolume] = useState(1);
  const [bass, setBass] = useState(0); // dB
  const [treble, setTreble] = useState(0); // dB
  
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const bassFilterRef = useRef(null);
  const trebleFilterRef = useRef(null);
  
  const [prefs, setPrefs] = useState(() => {
    const saved = localStorage.getItem('musicPrefs');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.artists === 'string') parsed.artists = [];
        if (typeof parsed.genre === 'string') parsed.genres = [parsed.genre];
        if (typeof parsed.interest === 'string') parsed.interests = [parsed.interest];
        return { ...defaultPrefs, ...parsed };
    }
    return defaultPrefs;
  });

  const audioRef = useRef(new Audio());

  useEffect(() => {
    const init = async () => {
      try {
        const res = await axios.get(`${API_BASE}/library`);
        setLibrary(res.data);
        fetchRecommendations(prefs, res.data);
        fetchPlaylists();
      } catch (e) {
        console.error(e);
        fetchRecommendations(prefs, []);
      }
    };
    init();
    
    // Poll library to automatically show songs as they finish background downloading
    const libraryInterval = setInterval(() => {
      fetchLibrary();
    }, 5000);
    
    const audio = audioRef.current;
    audio.volume = volume;
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      clearInterval(libraryInterval);
      audio.pause();
      audio.src = '';
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);
  
  useEffect(() => {
    const audio = audioRef.current;
    audio.onended = () => {
      setIsPlaying(false);
      handlePlayNext();
    };
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
  }, [queue, queueIndex, isAutoplay, currentSong]);

  const handlePrefsChange = (newPrefs) => {
    setPrefs(newPrefs);
    localStorage.setItem('musicPrefs', JSON.stringify(newPrefs));
    fetchRecommendations(newPrefs);
  };

  const toggleArrayItem = (key, item) => {
    const list = prefs[key] || [];
    const newList = list.includes(item) ? list.filter(i => i !== item) : [...list, item];
    handlePrefsChange({ ...prefs, [key]: newList });
  };

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.trim()) {
        setActiveTab('search');
        handleSearch();
      } else {
        setResults([]);
        if (activeTab === 'search') setActiveTab('home');
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [query]);

  const fetchRecommendations = async (currentPrefs, currentLib = library) => {
    try {
      setRecommendations([]); // Show loading spinner
      const res = await axios.post(`${API_BASE}/ai-home-recommendations`, {
        ...currentPrefs,
        library: currentLib,
        refreshTimestamp: Date.now()
      }, { timeout: 90000 });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setRecommendations(res.data);
        return;
      }
    } catch (err) {
      console.error('Failed to load AI recommendations:', err.message);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const fetchPlaylists = async () => {
    try {
      const res = await axios.get(`${API_BASE}/playlists`);
      setPlaylists(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLibrary = async () => {
    try {
      const res = await axios.get(`${API_BASE}/library`);
      setLibrary(res.data);
    } catch (err) {
      console.error('Failed to fetch library', err);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
      const libIds = new Set((library || []).map(s => s.id));
      const mapped = (res.data || []).map(s => ({
        ...s,
        isDownloaded: libIds.has(s.id) || s.isDownloaded === true
      }));
      setResults(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const latestPlayId = useRef(null);

  const handleManualDownload = async () => {
    if (!currentSong) return;
    try {
      // Just hit /play with download=true. It will spawn the background download
      // without interrupting the currently playing audio stream.
      axios.post(`${API_BASE}/play`, { song: currentSong, download: true });
      alert('Background download started! It will appear in Your Library soon.');
    } catch (e) {
      console.error(e);
      alert('Failed to start download.');
    }
  };

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;
      
      const bassNode = ctx.createBiquadFilter();
      bassNode.type = 'lowshelf';
      bassNode.frequency.value = 250;
      bassNode.gain.value = bass;
      bassFilterRef.current = bassNode;
      
      const trebleNode = ctx.createBiquadFilter();
      trebleNode.type = 'highshelf';
      trebleNode.frequency.value = 6000;
      trebleNode.gain.value = treble;
      trebleFilterRef.current = trebleNode;
      
      source.connect(bassNode);
      bassNode.connect(trebleNode);
      trebleNode.connect(ctx.destination);
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  useEffect(() => {
    if (bassFilterRef.current) bassFilterRef.current.gain.value = bass;
  }, [bass]);

  useEffect(() => {
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = treble;
  }, [treble]);

  const executePlay = async (song) => {
    const currentPlayId = Date.now();
    latestPlayId.current = currentPlayId;
    
    setPlayingSongId(song.id);
    setCurrentSong(song); 
    
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      // Fast path: Immediately set stream or download URL without waiting
      const isDownloaded = song.isDownloaded || (library || []).some(s => s.id === song.id);
      const matchedLibSong = (library || []).find(s => s.id === song.id);
      let audioUrl = `${API_BASE}/stream/${encodeURIComponent(song.id)}`;
      if (isDownloaded && matchedLibSong && (matchedLibSong.fileExt || matchedLibSong.filename)) {
        audioUrl = `${API_BASE}/downloads/${encodeURIComponent(matchedLibSong.fileExt || matchedLibSong.filename)}`;
      } else if (song.url) {
        audioUrl = song.url;
      }
      
      audio.src = audioUrl;
      initAudioContext();
      audio.crossOrigin = 'anonymous';
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') console.error('Audio playback error:', e);
        });
      }
    }
    
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
    setPlayingSongId(null);

    // Non-blocking background call for auto-download if enabled
    axios.post(`${API_BASE}/play`, { song, download: isOfflineMode }).then(() => {
      fetchLibrary();
    }).catch(err => {
      console.warn('Background play sync:', err?.message || err);
    });
  };

  const playSong = (song) => {
    if (activeTab === 'library') {
      const idx = (library || []).findIndex(s => s.id === song.id);
      setQueue(library);
      setQueueIndex(idx !== -1 ? idx : 0);
      executePlay(song);
      return;
    }

    // 1. For any song clicked from Home, Search, or Taste:
    // Initialize queue with ONLY this song and play immediately!
    setQueue([song]);
    setQueueIndex(0);
    executePlay(song);

    // 2. Asynchronously fetch AI personalized recommendations in background
    if (isAutoplay) {
      const prefLang = (prefs.languages && prefs.languages.length > 0) ? prefs.languages[0] : 'Hindi';
      axios.post(`${API_BASE}/ai-recommend`, {
        title: song.title,
        author: song.author,
        language: prefLang,
        artists: prefs.artists || [],
        genres: prefs.genres || []
      }, { timeout: 30000 }).then(res => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setQueue(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const newTracks = res.data.filter(s => !existingIds.has(s.id));
            return [...prev, ...newTracks];
          });
        }
      }).catch(err => {
        console.warn('Background AI queue generation error:', err?.message || err);
      });
    }
  };
  
  const handlePlayNext = async () => {
    if (queueIndex < queue.length - 1) {
      const nextIdx = queueIndex + 1;
      setQueueIndex(nextIdx);
      executePlay(queue[nextIdx]);
    } else if (isAutoplay && currentSong) {
      setPlayingSongId('loading-ai'); // Show spinner globally
      if (audioRef.current) audioRef.current.pause(); // Stop current music instantly
      
      try {
        const prefLang = prefs.languages && prefs.languages.length > 0 ? prefs.languages[0] : 'Hindi';
        const res = await axios.post(`${API_BASE}/ai-recommend`, {
            title: currentSong.title,
            author: currentSong.author,
            language: prefLang
        }, { timeout: 45000 }); // Increased timeout for Gemini API + Parallel YouTube Searches
        
        let fetchedSongs = res.data || [];
        
        // Filter out excessively long videos (e.g. 1 hour mixes) and songs already in the queue
        fetchedSongs = fetchedSongs.filter(s => {
            if (s.duration && (s.duration.split(':').length > 2 || parseInt(s.duration.split(':')[0]) > 10)) return false;
            if (queue.find(q => q.id === s.id)) return false;
            return true;
        });
        
        let nextSong = null;
        if (fetchedSongs.length > 0) {
            nextSong = fetchedSongs[0];
            const newQueue = [...queue, ...fetchedSongs];
            setQueue(newQueue);
            setQueueIndex(queue.length);
        } else {
            // Fallback if AI fails to return valid songs
            let availableRecs = recommendations.filter(s => !queue.find(q => q.id === s.id));
            if (availableRecs.length === 0) availableRecs = recommendations;
            if (availableRecs.length === 0) availableRecs = library;
            
            if (availableRecs.length > 0) {
                nextSong = availableRecs[Math.floor(Math.random() * availableRecs.length)];
                const newQueue = [...queue, nextSong];
                setQueue(newQueue);
                setQueueIndex(queue.length);
            }
        }

        if (nextSong) {
          executePlay(nextSong);
        } else {
          setPlayingSongId(null);
          alert("Could not load any songs! Check your internet connection.");
        }
      } catch (e) {
        console.error("AI Autoplay Error:", e);
        
        // SAFETY NET: Fallback to local recommendations or library if AI network call fails!
        let availableRecs = recommendations.filter(s => !queue.find(q => q.id === s.id));
        if (availableRecs.length === 0) availableRecs = recommendations; // Allow repeats
        if (availableRecs.length === 0) availableRecs = library; // Fallback to offline library
        
        if (availableRecs.length > 0) {
            const fallbackSong = availableRecs[Math.floor(Math.random() * availableRecs.length)];
            setQueue(q => [...q, fallbackSong]);
            setQueueIndex(idx => idx + 1);
            executePlay(fallbackSong);
        } else {
            setPlayingSongId(null);
            alert("Network timeout. Check your internet connection.");
        }
      }
    } else {
      if (audioRef.current) audioRef.current.pause();
    }
  };

  const handlePlayPrevious = () => {
    if (queueIndex > 0) {
      const prevIdx = queueIndex - 1;
      setQueueIndex(prevIdx);
      executePlay(queue[prevIdx]);
    } else {
      // Just restart current song
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  const togglePlay = () => {
    if (!currentSong) return;
    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatDuration = (seconds) => {
    if (typeof seconds === 'string') return seconds;
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  
  const playAllLibrary = () => {
    if (library.length === 0) return;
    setQueue(library);
    setQueueIndex(0);
    executePlay(library[0]);
  };

  const shuffleLibrary = () => {
    if (library.length === 0) return;
    const shuffled = [...library].sort(() => Math.random() - 0.5);
    setQueue(shuffled);
    setQueueIndex(0);
    executePlay(shuffled[0]);
  };

  const handleDeleteSong = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this song from your library?")) return;
    try {
      await axios.delete(`${API_BASE}/library/${id}`);
      fetchLibrary();
    } catch (err) {
      console.error("Failed to delete song", err);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-50 overflow-hidden font-sans selection:bg-white/20">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col relative bg-[#121212] overflow-hidden md:m-2 md:rounded-2xl md:border md:border-white/5">
        <header className="h-16 flex items-center px-6 sticky top-0 bg-[#121212]/80 backdrop-blur-xl z-20 justify-between gap-4 border-b border-white/5">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="What do you want to listen to?"
              className="w-full bg-[#1e1e1e] hover:bg-[#252525] focus:bg-[#252525] text-white placeholder-zinc-500 rounded-full py-2 pl-10 pr-4 outline-none border border-transparent focus:border-white/10 transition-all text-sm font-medium"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-zinc-400 hidden sm:inline">Auto Download</span>
            <button 
              onClick={() => setIsOfflineMode(!isOfflineMode)}
              className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${isOfflineMode ? 'bg-white' : 'bg-[#2a2a2a]'}`}
            >
              <div className={`w-4 h-4 bg-[#09090b] rounded-full absolute top-1 transition-transform duration-300 shadow-sm ${isOfflineMode ? 'left-6 bg-black' : 'left-1 bg-zinc-400'}`}></div>
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6 pb-28">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
              {activeTab === 'lyrics' && (
                <LyricsView currentSong={currentSong} currentTime={currentTime} />
              )}
              {activeTab === 'playlists' && (
                <PlaylistsView 
                  playlists={playlists} 
                  fetchPlaylists={fetchPlaylists} 
                  setQueue={setQueue} 
                  setQueueIndex={setQueueIndex} 
                  executePlay={executePlay}
                  formatDuration={formatDuration}
                  playingSongId={playingSongId}
                />
              )}
              {activeTab === 'queue' && (
                <QueueView 
                  queue={queue}
                  setQueue={setQueue}
                  queueIndex={queueIndex}
                  setQueueIndex={setQueueIndex}
                  executePlay={executePlay}
                  currentSong={currentSong}
                />
              )}
              {activeTab === 'taste' && (
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-4xl font-bold tracking-tight mb-2 text-white">Your Taste</h2>
                  <p className="text-zinc-400 mb-10 text-sm font-medium">Select your preferences to customize your Home recommendations.</p>
                  
                  <div className="space-y-12">
                    {/* Artists */}
                    <div>
                      <h3 className="text-lg font-bold mb-5 tracking-tight">Favourite Artists</h3>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-6">
                        {artistsList.slice(0, visibleArtistsCount).map(a => (
                          <motion.div 
                            key={a}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleArrayItem('artists', a)}
                            className={`cursor-pointer rounded-xl p-4 text-center transition-all ${prefs.artists.includes(a) ? 'bg-white text-black' : 'hover:bg-white/5 text-zinc-400 hover:text-white'}`}
                          >
                            <img 
                              src={`${API_BASE}/artist-image/${encodeURIComponent(a)}`}
                              alt={a} 
                              className="w-24 h-24 mx-auto mb-4 shadow-xl rounded-full object-cover bg-zinc-800" 
                              onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(a)}&background=random`; }}
                            />
                            <span className="text-sm font-semibold tracking-tight">{a}</span>
                          </motion.div>
                        ))}
                      </div>
                      {visibleArtistsCount < artistsList.length && (
                        <button 
                          onClick={() => setVisibleArtistsCount(prev => prev + 20)}
                          className="mt-8 px-6 py-2.5 bg-[#1e1e1e] hover:bg-[#252525] border border-white/5 rounded-full transition-colors block mx-auto text-sm font-semibold text-zinc-300 hover:text-white"
                        >
                          Load More Artists
                        </button>
                      )}
                    </div>
                    
                    {/* Genres */}
                    <div>
                      <h3 className="text-lg font-bold mb-5 tracking-tight">Favourite Genres</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {genresList.map(g => (
                          <motion.div
                            key={g.name}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleArrayItem('genres', g.name)}
                            className={`cursor-pointer h-28 rounded-xl p-4 flex flex-col justify-end transition-all ${prefs.genres.includes(g.name) ? 'ring-2 ring-white ring-offset-2 ring-offset-[#121212] opacity-100' : 'opacity-70 hover:opacity-100'}`}
                            style={{ backgroundColor: g.color }}
                          >
                            <span className="font-bold text-lg text-white drop-shadow-md tracking-tight">{g.name}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Interests */}
                    <div>
                      <h3 className="text-lg font-bold mb-5 tracking-tight">Music Interests</h3>
                      <div className="flex flex-wrap gap-3">
                        {interestsList.map(interest => (
                          <button 
                            key={interest}
                            onClick={() => toggleArrayItem('interests', interest)}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${prefs.interests.includes(interest) ? 'bg-white text-black shadow-lg scale-105' : 'bg-[#1e1e1e] text-zinc-300 hover:bg-[#2a2a2a] hover:text-white'}`}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <h3 className="text-lg font-bold mb-5 tracking-tight">Languages</h3>
                      <div className="flex flex-wrap gap-3">
                        {languagesList.map(lang => (
                          <button 
                            key={lang}
                            onClick={() => toggleArrayItem('languages', lang)}
                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${prefs.languages.includes(lang) ? 'bg-white text-black shadow-lg scale-105' : 'bg-[#1e1e1e] text-zinc-300 hover:bg-[#2a2a2a] hover:text-white'}`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {activeTab !== 'taste' && activeTab !== 'lyrics' && activeTab !== 'playlists' && activeTab !== 'queue' && (
                <div className="max-w-7xl mx-auto">
                  {activeTab === 'library' ? (
                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <h2 className="text-4xl font-bold tracking-tight text-white mb-1">Your Offline Library</h2>
                        <p className="text-zinc-400 text-sm font-medium">{library.length} downloaded songs</p>
                      </div>
                      {library.length > 0 && (
                        <div className="flex space-x-3">
                          <button onClick={playAllLibrary} className="flex items-center space-x-2 bg-white text-black px-5 py-2.5 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform text-sm shadow-lg">
                            <Play size={16} fill="currentColor" /> <span>Play All</span>
                          </button>
                          <button onClick={shuffleLibrary} className="flex items-center space-x-2 bg-[#1e1e1e] text-white px-5 py-2.5 rounded-full font-bold hover:bg-[#2a2a2a] hover:scale-105 active:scale-95 transition-all text-sm border border-white/5">
                            <Shuffle size={16} /> <span>Shuffle</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between items-end mb-8">
                      <h2 className="text-3xl font-bold tracking-tight text-white">
                        {activeTab === 'home' ? 'Recommended For You' : 
                         (query ? `Search Results for "${query}"` : 'Search Music')}
                      </h2>
                      {activeTab === 'home' && (
                        <button 
                          onClick={() => fetchRecommendations(prefs, library)}
                          disabled={recommendations.length === 0}
                          className="px-5 py-2.5 bg-white text-black hover:scale-105 active:scale-95 shadow-lg rounded-full text-sm font-bold transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center space-x-2"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                          <span>Refresh</span>
                        </button>
                      )}
                    </div>
                  )}
                  
                  {isSearching && activeTab === 'search' && (
                    <div className="text-zinc-400 mb-6 flex items-center space-x-3 justify-center py-20">
                      <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium">Searching...</span>
                    </div>
                  )}
                  
                  {!isSearching && activeTab === 'home' && recommendations.length === 0 && (
                    <div className="text-zinc-400 mb-6 flex items-center space-x-3 justify-center py-20">
                      <div className="w-5 h-5 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium">Fetching personalized recommendations...</span>
                    </div>
                  )}

                  <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    <AnimatePresence mode="popLayout">
                      {(activeTab === 'home' ? recommendations : activeTab === 'search' ? results : library).map((song, i) => (
                        <SongCard
                          key={song.id}
                          song={song}
                          activeTab={activeTab}
                          playingSongId={playingSongId}
                          playSong={playSong}
                          handleDeleteSong={handleDeleteSong}
                          formatDuration={formatDuration}
                          setPlaylistModalSong={setPlaylistModalSong}
                        />
                      ))}
                    </AnimatePresence>
                    
                    {activeTab === 'library' && library.length === 0 && (
                      <div className="text-zinc-500 col-span-full py-20 text-center flex flex-col items-center">
                        <Library size={48} className="mb-4 opacity-20" />
                        <h3 className="text-xl font-bold text-zinc-300 mb-2">No offline songs yet</h3>
                        <p className="text-sm">Start searching and playing to download automatically.</p>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Right Sidebar - Queue / Suggestions (Desktop) */}
        <AnimatePresence>
        {isQueueVisible && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden lg:block bg-[#09090b] border-l border-zinc-900 overflow-y-auto pb-28"
          >
            <div className="p-4 w-80">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Up Next</h2>
                <button onClick={() => setIsQueueVisible(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              
              {queue.length > 0 ? (
                <div className="space-y-3">
                  {queue.slice(queueIndex, queueIndex + 20).map((s, idx) => (
                    <div key={s.id + idx} className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-zinc-900 ${idx === 0 ? 'bg-zinc-900' : ''}`} onClick={() => {
                      setQueueIndex(queueIndex + idx);
                      executePlay(s);
                    }}>
                      <img 
                        src={s.thumbnail} 
                        alt={s.title} 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                        }}
                        className="w-12 h-12 rounded object-cover" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${idx === 0 ? 'text-[#1ed760]' : 'text-white'}`}>{s.title}</p>
                        <p className="text-xs text-zinc-400 truncate">{s.author}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">Queue is empty</p>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
        </div>
      </div>

      {/* Playlist Modal */}
      {playlistModalSong && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6"
              >
                  <h2 className="text-xl font-bold text-white mb-4">Add to Playlist</h2>
                  <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                      {playlists.length === 0 ? (
                          <p className="text-zinc-500 text-sm">No playlists created yet.</p>
                      ) : playlists.map(p => (
                          <button
                              key={p.id}
                              onClick={async () => {
                                  try {
                                      await axios.post(`${API_BASE}/playlists/${p.id}/songs`, { song: playlistModalSong });
                                      fetchPlaylists();
                                      setPlaylistModalSong(null);
                                  } catch(e) { console.error(e); }
                              }}
                              className="w-full text-left px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium transition-colors"
                          >
                              {p.name}
                          </button>
                      ))}
                  </div>
                  <button 
                      onClick={() => setPlaylistModalSong(null)}
                      className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200"
                  >
                      Cancel
                  </button>
              </motion.div>
          </div>
      )}

      <MusicPlayer
        currentSong={currentSong}
        isPlaying={isPlaying}
        playingSongId={playingSongId}
        isAutoplay={isAutoplay}
        setIsAutoplay={setIsAutoplay}
        handlePlayPrevious={handlePlayPrevious}
        togglePlay={togglePlay}
        handlePlayNext={handlePlayNext}
        currentTime={currentTime}
        duration={duration}
        handleSeek={handleSeek}
        formatDuration={formatDuration}
        handleManualDownload={handleManualDownload}
        volume={volume}
        handleVolumeChange={handleVolumeChange}
        bass={bass}
        setBass={setBass}
        treble={treble}
        setTreble={setTreble}
        isQueueVisible={isQueueVisible}
        setIsQueueVisible={setIsQueueVisible}
      />
    </div>
  );
}

export default App;
