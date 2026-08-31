import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Play, ListMusic, MoreVertical, X, Shuffle, Check } from 'lucide-react';
import SongCard from './SongCard';

export default function PlaylistsView({ playlists, fetchPlaylists, setQueue, setQueueIndex, executePlay, formatDuration, playingSongId }) {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [suggestedSongs, setSuggestedSongs] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState(new Set());

  // Sync selectedPlaylist when playlists change
  useEffect(() => {
    if (selectedPlaylist) {
      const updated = playlists.find(p => p.id === selectedPlaylist.id);
      if (updated) setSelectedPlaylist(updated);
    }
  }, [playlists]);

  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    
    try {
        await axios.post('http://localhost:5000/api/playlists', { name: newPlaylistName });
        setNewPlaylistName('');
        fetchPlaylists();
    } catch (err) {
        console.error(err);
    }
  };

  const deletePlaylist = async (id) => {
      try {
          await axios.delete(`http://localhost:5000/api/playlists/${id}`);
          if (selectedPlaylist?.id === id) setSelectedPlaylist(null);
          fetchPlaylists();
      } catch (err) {
          console.error(err);
      }
  };
  
  const removeSong = async (songId) => {
      try {
          await axios.delete(`http://localhost:5000/api/playlists/${selectedPlaylist.id}/songs/${songId}`);
          fetchPlaylists();
          setSelectedPlaylist(prev => ({
              ...prev,
              songs: prev.songs.filter(s => s.id !== songId)
          }));
      } catch (err) {
          console.error(err);
      }
  };

  const playPlaylist = () => {
    if (!selectedPlaylist || selectedPlaylist.songs.length === 0) return;
    setQueue([...selectedPlaylist.songs]);
    setQueueIndex(0);
    executePlay(selectedPlaylist.songs[0]);
  };
  
  const shufflePlaylist = () => {
      if (!selectedPlaylist || selectedPlaylist.songs.length === 0) return;
      let shuffled = [...selectedPlaylist.songs];
      for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setQueue(shuffled);
      setQueueIndex(0);
      executePlay(shuffled[0]);
  };

  const openAddModal = async () => {
      setShowAddModal(true);
      setSelectedToAdd(new Set());
      setSuggestedSongs([]);
      setIsSuggesting(true);
      
      try {
          const res = await axios.post('http://localhost:5000/api/ai-home-recommendations', {
              library: selectedPlaylist.songs
          });
          setSuggestedSongs(res.data);
      } catch (e) {
          console.error(e);
      }
      setIsSuggesting(false);
  };
  
  const toggleSelect = (songId) => {
      const next = new Set(selectedToAdd);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      setSelectedToAdd(next);
  };
  
  const addSelectedSongs = async () => {
      const songsToAdd = suggestedSongs.filter(s => selectedToAdd.has(s.id));
      for (const song of songsToAdd) {
          try {
              await axios.post(`http://localhost:5000/api/playlists/${selectedPlaylist.id}/songs`, { song });
          } catch(e) { console.error(e); }
      }
      fetchPlaylists();
      setShowAddModal(false);
  };

  if (selectedPlaylist) {
      return (
          <div className="max-w-7xl mx-auto space-y-6 relative pb-10">
              <button 
                  onClick={() => setSelectedPlaylist(null)}
                  className="text-zinc-400 hover:text-white flex items-center space-x-2 transition-colors mb-6"
              >
                  <span>← Back to Playlists</span>
              </button>
              
              <div className="flex items-end space-x-6 mb-10">
                  <div className="w-40 h-40 bg-zinc-800 rounded-2xl flex items-center justify-center shadow-2xl flex-shrink-0">
                      <ListMusic size={64} className="text-zinc-600" />
                  </div>
                  <div>
                      <p className="text-sm font-semibold tracking-wider text-zinc-400 uppercase mb-2">Playlist</p>
                      <h1 className="text-5xl font-black tracking-tight text-white mb-2">{selectedPlaylist.name}</h1>
                      <p className="text-zinc-400 font-medium mb-6">{selectedPlaylist.songs.length} songs</p>
                      
                      <div className="flex items-center space-x-4">
                          <button onClick={playPlaylist} className="bg-white text-black w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-xl">
                              <Play size={24} className="ml-1" fill="currentColor" />
                          </button>
                          <button onClick={shufflePlaylist} className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors shadow-xl">
                              <Shuffle size={20} className="text-white" />
                          </button>
                          <button onClick={openAddModal} className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center hover:bg-zinc-700 transition-colors shadow-xl border border-white/5">
                              <Plus size={24} className="text-white" />
                          </button>
                      </div>
                  </div>
              </div>
              
              {selectedPlaylist.songs.length === 0 ? (
                  <div className="text-center py-20 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-white/5">
                      No songs in this playlist yet. Browse and add some!
                  </div>
              ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                      {selectedPlaylist.songs.map((song, idx) => (
                          <div key={song.id + idx} className="relative group">
                              <SongCard 
                                  song={song}
                                  playingSongId={playingSongId}
                                  playSong={(s) => {
                                      setQueue([...selectedPlaylist.songs]);
                                      setQueueIndex(idx);
                                      executePlay(s);
                                  }}
                                  formatDuration={formatDuration}
                              />
                              <button 
                                  onClick={(e) => { e.stopPropagation(); removeSong(song.id); }}
                                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                                  title="Remove from playlist"
                              >
                                  <Trash2 size={16} className="text-white" />
                              </button>
                          </div>
                      ))}
                  </div>
              )}
              
              <div className="pt-20 pb-10 flex justify-center">
                  <button 
                      onClick={() => { if(window.confirm("Are you sure?")) deletePlaylist(selectedPlaylist.id); }}
                      className="px-6 py-2 rounded-full border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition-colors font-medium text-sm flex items-center space-x-2"
                  >
                      <Trash2 size={16} />
                      <span>Delete Playlist</span>
                  </button>
              </div>

              {/* Add Songs Modal */}
              <AnimatePresence>
                  {showAddModal && (
                      <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                      >
                          <motion.div 
                              initial={{ scale: 0.95, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.95, opacity: 0 }}
                              className="bg-[#121212] border border-white/10 p-6 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
                          >
                              <div className="flex justify-between items-center mb-6">
                                  <div>
                                      <h3 className="text-2xl font-bold text-white">Add Songs</h3>
                                      <p className="text-zinc-400 text-sm">Recommended for {selectedPlaylist.name}</p>
                                  </div>
                                  <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                                      <X size={24} />
                                  </button>
                              </div>

                              <div className="flex-1 overflow-y-auto pr-2 space-y-2 mb-6">
                                  {isSuggesting ? (
                                      <div className="flex flex-col items-center justify-center h-40 space-y-4">
                                          <div className="w-8 h-8 border-4 border-[#1ed760] border-t-transparent rounded-full animate-spin"></div>
                                          <p className="text-zinc-400 text-sm font-medium animate-pulse">Finding similar tracks...</p>
                                      </div>
                                  ) : (
                                      suggestedSongs.map(song => {
                                          const isSelected = selectedToAdd.has(song.id);
                                          return (
                                              <div 
                                                  key={song.id} 
                                                  onClick={() => toggleSelect(song.id)}
                                                  className={`flex items-center space-x-4 p-2 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                              >
                                                  <div className={`w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-[#1ed760] border-[#1ed760]' : 'border-zinc-500'}`}>
                                                      {isSelected && <Check size={14} className="text-black font-bold" />}
                                                  </div>
                                                  <img src={song.thumbnail} alt="cover" className="w-12 h-12 rounded object-cover" />
                                                  <div className="flex-1 min-w-0">
                                                      <p className="text-white font-semibold truncate text-sm">{song.title}</p>
                                                      <p className="text-zinc-400 text-xs truncate">{song.author}</p>
                                                  </div>
                                              </div>
                                          );
                                      })
                                  )}
                                  
                                  {!isSuggesting && suggestedSongs.length === 0 && (
                                      <p className="text-center text-zinc-500 py-10">No recommendations found.</p>
                                  )}
                              </div>

                              <div className="flex justify-end pt-4 border-t border-white/10">
                                  <button 
                                      onClick={addSelectedSongs}
                                      disabled={selectedToAdd.size === 0 || isSuggesting}
                                      className="px-6 py-2.5 bg-[#1ed760] text-black font-bold rounded-full disabled:opacity-50 hover:bg-[#1db954] transition-colors shadow-lg"
                                  >
                                      Add Selected ({selectedToAdd.size})
                                  </button>
                              </div>
                          </motion.div>
                      </motion.div>
                  )}
              </AnimatePresence>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Your Playlists</h1>
        <p className="text-zinc-400">Curate your perfect offline library.</p>
      </div>

      <form onSubmit={createPlaylist} className="flex gap-4 max-w-md">
        <input
          type="text"
          value={newPlaylistName}
          onChange={(e) => setNewPlaylistName(e.target.value)}
          placeholder="New playlist name..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-zinc-700"
        />
        <button
          type="submit"
          disabled={!newPlaylistName.trim()}
          className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:hover:bg-white flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Create</span>
        </button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <AnimatePresence>
          {playlists.map(playlist => (
            <motion.div
              key={playlist.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ y: -5 }}
              onClick={() => setSelectedPlaylist(playlist)}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 cursor-pointer group hover:border-zinc-700 transition-colors relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 shadow-inner group-hover:bg-zinc-700 transition-colors">
                <ListMusic size={28} className="text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1 truncate pr-8">{playlist.name}</h3>
              <p className="text-zinc-400 text-sm">{playlist.songs?.length || 0} songs</p>
              
              <button
                onClick={(e) => deletePlaylist(playlist.id, e)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 text-zinc-400 transition-all"
                title="Delete Playlist"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {playlists.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                You haven't created any playlists yet.
            </div>
        )}
      </div>
    </div>
  );
}
