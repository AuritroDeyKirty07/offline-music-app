import { Play, Download, Trash2, AudioLines, ListPlus, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SongCard({ song, activeTab, playingSongId, playSong, handleDeleteSong, formatDuration, setPlaylistModalSong }) {
  const isPlaying = playingSongId === song.id;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="bg-[#121212] border border-white/5 hover:border-white/10 p-3 rounded-xl cursor-pointer group transition-colors relative"
      onClick={() => {
        if (!isPlaying) playSong(song);
      }}
    >
      <div className="relative aspect-square md:aspect-video mb-3 rounded-lg overflow-hidden shadow-md">
        <img 
          src={song.thumbnail} 
          alt={song.title} 
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
        />

        {/* Downloaded Tick Badge */}
        {song.isDownloaded && (
          <div className="absolute top-2 left-2 bg-[#1ed760] text-black text-[11px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg z-10">
            <Check size={12} strokeWidth={3.5} />
            <span>Downloaded</span>
          </div>
        )}
        
        {/* Play Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {!isPlaying && (
            <button className="w-12 h-12 bg-[#1ed760] rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
              <Play fill="black" className="ml-1 text-black" size={24} />
            </button>
          )}
          {isPlaying && (
            <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl border border-white/10">
              <AudioLines className="text-[#1ed760] animate-pulse" size={24} />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute top-2 right-2 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {setPlaylistModalSong && (
            <button 
              onClick={(e) => { e.stopPropagation(); setPlaylistModalSong(song); }}
              className="bg-black/70 backdrop-blur-md p-2 rounded-full hover:bg-white/20 transition-colors shadow-lg"
              title="Add to Playlist"
            >
              <ListPlus size={16} className="text-white" />
            </button>
          )}
          {song.isDownloaded && activeTab === 'library' && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDeleteSong(song.id); }}
              className="bg-black/70 backdrop-blur-md p-2 rounded-full hover:bg-red-500/80 transition-colors shadow-lg"
              title="Remove from library"
            >
              <Trash2 size={16} className="text-white" />
            </button>
          )}
          {!song.isDownloaded && (activeTab === 'home' || activeTab === 'search') && (
            <button 
              onClick={(e) => { e.stopPropagation(); playSong(song); }}
              className="bg-black/70 backdrop-blur-md p-2 rounded-full hover:bg-[#1ed760] transition-colors group/dl shadow-lg"
              title="Download & Play"
            >
              <Download size={16} className="text-white group-hover/dl:text-black" />
            </button>
          )}
        </div>
      </div>
      
      <div className="px-1">
        <h3 className={`font-bold text-base truncate mb-1 ${isPlaying ? 'text-[#1ed760]' : 'text-white group-hover:text-white'}`}>
          {song.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate max-w-[70%]">
            <p className="text-zinc-400 text-sm truncate">{song.author}</p>
            {song.isDownloaded && (
              <span className="bg-[#1ed760]/20 text-[#1ed760] p-0.5 rounded-full flex-shrink-0" title="Downloaded / Offline Ready">
                <Check size={11} strokeWidth={3} />
              </span>
            )}
          </div>
          <span className="text-zinc-500 text-xs font-medium bg-white/5 px-2 py-0.5 rounded-md flex-shrink-0">
            {formatDuration(song.duration)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
