import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Clock, Plus, Minus } from 'lucide-react';
import { API_BASE } from '../constants';

export default function LyricsView({ currentSong, currentTime }) {
  const [lyrics, setLyrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [syncOffset, setSyncOffset] = useState(0); // Offset in seconds
  
  const lyricsRef = useRef(null);
  
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Reset offset and auto scroll when song changes
  useEffect(() => {
    setSyncOffset(0);
    setActiveIndex(-1);
    setIsAutoScroll(true);
    
    // Fetch saved offset
    if (currentSong?.id) {
        fetch(`${API_BASE}/lyrics/offset/${currentSong.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.offset) setSyncOffset(data.offset);
            })
            .catch(err => console.error("Failed to load offset", err));
    }
  }, [currentSong?.id]);


  useEffect(() => {
    const handleScroll = (e) => {
      if (isProgrammaticScrollRef.current) {
        // We triggered this scroll, ignore it
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 150); // Reset after smooth scroll finishes
        return;
      }
      
      // If we reach here, it's a real user scroll (wheel, touch, scrollbar drag, spacebar, etc.)
      setIsAutoScroll(false);
    };
    
    // Listen to scroll events on the capture phase so we catch them from the main container
    window.addEventListener('scroll', handleScroll, { capture: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!currentSong) return;
    const fetchLyrics = async () => {
      setIsLoading(true);
      setError(null);
      setLyrics(null);
      try {
        const res = await fetch(`${API_BASE}/lyrics?title=${encodeURIComponent(currentSong.title)}&author=${encodeURIComponent(currentSong.author)}`);
        
        if (res.ok) {
            const data = await res.json();
            if (data && (data.syncedLyrics || data.plainLyrics)) {
                setLyrics({
                    type: data.syncedLyrics ? 'synced' : 'plain',
                    lines: parseLrc(data.syncedLyrics || data.plainLyrics)
                });
            } else {
                setError("Lyrics not found for this track.");
            }
        } else {
            setError("Could not fetch lyrics.");
        }
      } catch (err) {
        setError("Could not find lyrics. Try another song.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLyrics();
  }, [currentSong]);

  useEffect(() => {
    if (lyrics?.type === 'synced') {
      const adjustedTime = currentTime + syncOffset;
      const index = lyrics.lines.findIndex((line, i) => {
        const nextTime = lyrics.lines[i + 1]?.time || Infinity;
        return adjustedTime >= line.time && adjustedTime < nextTime;
      });
      if (index !== activeIndex && index !== -1) {
        setActiveIndex(index);
      }
    }
  }, [currentTime, lyrics, syncOffset]);

  const triggerScroll = (el) => {
      isProgrammaticScrollRef.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Fallback reset in case scroll event doesn't fire (e.g. already centered)
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false;
      }, 500); // 500ms is enough for most smooth scrolls to finish
  };

  const scrollToCurrentLine = () => {
      setIsAutoScroll(true);
      if (activeIndex !== -1) {
          const el = document.getElementById(`lyrics-line-${activeIndex}`);
          if (el) triggerScroll(el);
      }
  };

  useEffect(() => {
    if (isAutoScroll && activeIndex !== -1) {
        const el = document.getElementById(`lyrics-line-${activeIndex}`);
        if (el) triggerScroll(el);
    }
  }, [activeIndex, isAutoScroll]);

  const parseLrc = (lrcString) => {
    const lines = lrcString.split('\n');
    const parsed = [];
    lines.forEach(line => {
      const match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const text = match[3].trim();
        if (text) {
          parsed.push({ time: minutes * 60 + seconds, text });
        }
      } else if (line.trim() && !line.startsWith('[')) {
        parsed.push({ time: -1, text: line.trim() });
      }
    });
    return parsed;
  };

  const adjustOffset = (amount) => {
      setSyncOffset(prev => {
          const newOffset = parseFloat((prev + amount).toFixed(1));
          
          // Save to backend persistently
          if (currentSong?.id) {
              fetch(`${API_BASE}/lyrics/offset`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: currentSong.id, offset: newOffset })
              }).catch(err => console.error("Failed to save offset", err));
          }
          
          return newOffset;
      });
  };

  if (!currentSong) return <div className="text-zinc-500 text-center mt-20">Play a song to view lyrics</div>;
  if (isLoading) return <div className="flex justify-center mt-20"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div></div>;
  if (error) return <div className="text-zinc-500 text-center mt-20">{error}</div>;
  if (!lyrics) return null;

  return (
    <div className="max-w-2xl mx-auto py-10 relative" ref={lyricsRef}>
      <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">{currentSong.title}</h2>
            <p className="text-zinc-400">{currentSong.author}</p>
          </div>
          
          {lyrics.type === 'synced' && (
              <div className="bg-[#18181b] border border-white/5 p-3 rounded-xl flex items-center space-x-3 shadow-lg">
                  <Clock size={16} className="text-zinc-400" />
                  <div className="flex items-center space-x-2">
                      <button onClick={() => adjustOffset(-0.5)} className="w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300" title="Delay Lyrics (Video Intro)"><Minus size={12}/></button>
                      <span className="text-sm font-mono text-white w-12 text-center">{syncOffset > 0 ? `+${syncOffset}` : syncOffset}s</span>
                      <button onClick={() => adjustOffset(0.5)} className="w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300" title="Advance Lyrics"><Plus size={12}/></button>
                  </div>
              </div>
          )}
      </div>

      <div className="space-y-6 pb-40">
        {lyrics.lines.map((line, index) => {
          let isActive = false;
          if (lyrics.type === 'synced') {
            isActive = index === activeIndex;
          }
          
          return (
            <motion.p
              id={`lyrics-line-${index}`}
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.01 }}
              className={`text-2xl md:text-4xl font-bold tracking-tight transition-all duration-300 ${isActive ? 'text-white scale-105 origin-left' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              {line.text}
            </motion.p>
          );
        })}
      </div>

      {lyrics.type === 'synced' && (
        <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToCurrentLine}
            className={`fixed bottom-32 right-10 px-4 py-2 rounded-full font-bold text-sm shadow-xl flex items-center space-x-2 z-50 transition-all duration-300 ${
              !isAutoScroll 
                ? 'bg-white text-black hover:bg-zinc-200' 
                : 'bg-[#18181b] border border-white/10 text-zinc-500 hover:text-white'
            }`}
        >
            <span>{isAutoScroll ? 'Active Lyrics' : 'Resume Lyrics'}</span>
        </motion.button>
      )}
    </div>
  );
}
