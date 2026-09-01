import { Play, Pause, Download, Volume2, SkipBack, SkipForward, Repeat, SlidersHorizontal, X, ListOrdered } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function MusicPlayer({
  currentSong,
  isPlaying,
  playingSongId,
  isBuffering,
  isAutoplay,
  setIsAutoplay,
  handlePlayPrevious,
  togglePlay,
  handlePlayNext,
  currentTime,
  duration,
  handleSeek,
  formatDuration,
  handleManualDownload,
  volume,
  handleVolumeChange,
  bass,
  setBass,
  treble,
  setTreble,
  isQueueVisible,
  setIsQueueVisible
}) {
  const [showEq, setShowEq] = useState(false);
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div 
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="h-20 bg-[#09090b]/95 backdrop-blur-md border-t border-white/5 absolute bottom-0 left-0 right-0 flex items-center px-6 justify-between z-30"
    >
      {/* Left: Now Playing */}
      <div className="flex items-center w-1/3 md:w-1/4 min-w-[180px]">
        {currentSong ? (
          <div className="flex items-center group w-full min-w-0">
            <div className="relative h-12 w-12 shrink-0 rounded-md overflow-hidden mr-3 border border-white/10 shadow-sm">
              <img 
                src={currentSong.thumbnail} 
                alt="cover" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                }}
                className="w-full h-full object-cover" 
              />
              {isBuffering && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-[#1ed760] rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <p className="text-zinc-100 text-sm font-semibold truncate hover:underline cursor-pointer leading-tight" title={currentSong.title}>{currentSong.title}</p>
                {isBuffering && (
                  <span className="text-[10px] bg-[#1ed760]/20 text-[#1ed760] px-1.5 py-0.2 rounded font-bold animate-pulse shrink-0">Streaming...</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 truncate hover:underline cursor-pointer mt-0.5" title={currentSong.author}>{currentSong.author}</p>
            </div>
          </div>
        ) : (
          <div className="text-zinc-600 text-sm font-medium">Nothing playing</div>
        )}
      </div>
      
      {/* Center: Controls & Progress */}
      <div className="flex flex-col items-center justify-center flex-1 mx-4 max-w-2xl">
        <div className="flex items-center space-x-6 mb-1.5">
          <button 
            onClick={() => setIsAutoplay(!isAutoplay)} 
            className={`transition-colors p-1 ${isAutoplay ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`} 
            title="Autoplay Similar Songs"
          >
            <Repeat size={16} />
          </button>
          <button 
            className="text-zinc-400 hover:text-white transition-colors disabled:opacity-30 p-1"
            onClick={handlePlayPrevious}
            disabled={!currentSong}
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          
          <motion.button 
            whileHover={currentSong && !isBuffering ? { scale: 1.05 } : {}}
            whileTap={currentSong && !isBuffering ? { scale: 0.95 } : {}}
            className="bg-white text-black rounded-full p-2 disabled:opacity-50 flex items-center justify-center w-9 h-9 shadow-sm"
            onClick={togglePlay}
            disabled={!currentSong}
          >
            {isBuffering ? (
              <div className="w-4 h-4 border-2 border-zinc-400 border-t-black rounded-full animate-spin"></div>
            ) : isPlaying ? (
              <Pause fill="currentColor" size={16} />
            ) : (
              <Play fill="currentColor" size={16} className="ml-0.5" />
            )}
          </motion.button>
          
          <button 
            className="text-zinc-400 hover:text-white transition-colors disabled:opacity-30 p-1"
            onClick={handlePlayNext}
            disabled={!currentSong}
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
        
        <div className="w-full flex items-center space-x-3 group">
          <span className="text-[10px] font-medium text-zinc-500 w-8 text-right">{formatDuration(currentTime)}</span>
          <div className="relative flex-1 h-1 bg-zinc-800 rounded-full flex items-center cursor-pointer">
            <input 
              type="range" 
              min="0" 
              max={duration || 100} 
              step="any"
              value={currentTime} 
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={!currentSong}
            />
            {/* Progress Bar Fill */}
            <div 
              className="absolute left-0 h-full bg-white rounded-full pointer-events-none group-hover:bg-zinc-200 transition-colors"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Thumb (visible on hover) */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1/2"></div>
            </div>
          </div>
          <span className="text-[10px] font-medium text-zinc-500 w-8">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Right: Volume & Extra */}
      <div className="flex justify-end items-center w-1/4 space-x-4 text-zinc-400 pr-2 relative">
        <button 
          onClick={() => setShowEq(!showEq)}
          className={`transition-colors p-1 ${showEq ? 'text-white' : 'hover:text-white'}`}
          title="Equalizer"
        >
          <SlidersHorizontal size={16} />
        </button>

        <AnimatePresence>
          {showEq && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-16 right-0 w-64 bg-[#18181b] border border-white/10 rounded-xl p-5 shadow-2xl z-50 origin-bottom-right"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-sm font-bold">Audio Equalizer</h3>
                <button onClick={() => setShowEq(false)} className="text-zinc-400 hover:text-white"><X size={14}/></button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-zinc-300">Bass</span>
                    <span className="text-zinc-500">{bass > 0 ? `+${bass}` : bass} dB</span>
                  </div>
                  <input type="range" min="-15" max="15" value={bass} onChange={(e) => setBass(parseInt(e.target.value))} className="w-full accent-white h-1 bg-zinc-700 rounded-full appearance-none outline-none" />
                </div>
                
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span className="text-zinc-300">Treble</span>
                    <span className="text-zinc-500">{treble > 0 ? `+${treble}` : treble} dB</span>
                  </div>
                  <input type="range" min="-15" max="15" value={treble} onChange={(e) => setTreble(parseInt(e.target.value))} className="w-full accent-white h-1 bg-zinc-700 rounded-full appearance-none outline-none" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsQueueVisible(!isQueueVisible)}
          className={`hover:text-white transition-colors p-1 ${isQueueVisible ? 'text-[#1ed760]' : 'text-zinc-500'}`}
          title="Toggle Queue Sidebar"
        >
          <ListOrdered size={16} />
        </button>

        <button 
          onClick={handleManualDownload}
          className="hover:text-white transition-colors disabled:opacity-30 p-1"
          title="Download this song"
          disabled={!currentSong}
        >
          <Download size={16} />
        </button>
        
        <div className="flex items-center space-x-2 group w-28">
          <Volume2 size={16} />
          <div className="relative flex-1 h-1 bg-zinc-800 rounded-full flex items-center cursor-pointer">
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01" 
              value={volume}
              onChange={handleVolumeChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className="absolute left-0 h-full bg-white rounded-full pointer-events-none group-hover:bg-zinc-200 transition-colors"
              style={{ width: `${volume * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
