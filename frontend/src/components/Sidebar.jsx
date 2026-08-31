import { Home, Search, Library, Heart, Music2, Mic2, ListMusic, ListOrdered } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'library', icon: Library, label: 'Your Library' },
    { id: 'playlists', icon: ListMusic, label: 'Playlists' },
    { id: 'taste', icon: Heart, label: 'Your Taste' },
    { id: 'lyrics', icon: Mic2, label: 'Lyrics' },
    { id: 'queue', icon: ListOrdered, label: 'Queue' }
  ];

  return (
    <div className="w-64 bg-[#09090b] p-6 flex flex-col hidden md:flex border-r border-white/5">
      <div className="flex items-center space-x-3 mb-10 pl-2">
        <div className="bg-white text-black p-1.5 rounded-lg">
          <Music2 size={24} strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Chord</h1>
      </div>
      
      <nav className="space-y-1 flex-1">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={18} className="relative z-10" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
