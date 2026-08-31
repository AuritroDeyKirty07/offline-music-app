import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Play, GripVertical, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QueueView({ queue, setQueue, queueIndex, setQueueIndex, executePlay, currentSong }) {
  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // If we dragged the currently playing song, we need to update queueIndex!
    // Or if we dragged something from below it to above it.
    let newIndex = queueIndex;
    
    // The index of the currently playing song in the old array
    const oldCurrentIndex = queueIndex;
    
    // Where did the currently playing song go?
    if (result.source.index === oldCurrentIndex) {
      newIndex = result.destination.index;
    } else if (result.source.index < oldCurrentIndex && result.destination.index >= oldCurrentIndex) {
      // Something above moved below the current song
      newIndex--;
    } else if (result.source.index > oldCurrentIndex && result.destination.index <= oldCurrentIndex) {
      // Something below moved above the current song
      newIndex++;
    }

    setQueue(items);
    setQueueIndex(newIndex);
  };
  
  const removeFromQueue = (index) => {
      const items = Array.from(queue);
      items.splice(index, 1);
      
      let newIndex = queueIndex;
      if (index < queueIndex) {
          newIndex--;
      } else if (index === queueIndex) {
          // If we removed the currently playing song, just play the next one that slid into its place
          if (items.length > 0) {
              executePlay(items[Math.min(newIndex, items.length - 1)]);
          } else {
              executePlay(null);
          }
      }
      
      setQueue(items);
      setQueueIndex(newIndex);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Up Next</h1>
        <p className="text-zinc-400">Reorder your queue or remove songs you don't want to hear.</p>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-white/5">
            Your queue is completely empty. Play a song to start a queue.
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="queue-droppable">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-2 bg-zinc-900/30 p-4 rounded-2xl border border-white/5"
              >
                {queue.map((song, index) => {
                  const isPlaying = index === queueIndex;
                  return (
                    <Draggable key={`${song.id}-${index}`} draggableId={`${song.id}-${index}`} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center space-x-4 p-3 rounded-xl group transition-colors ${
                            snapshot.isDragging ? 'bg-zinc-800 shadow-2xl scale-[1.02]' : 
                            isPlaying ? 'bg-zinc-800/80 border border-zinc-700' : 'hover:bg-zinc-800/50'
                          }`}
                          style={{
                              ...provided.draggableProps.style,
                          }}
                        >
                          <div {...provided.dragHandleProps} className="text-zinc-500 hover:text-white px-2 py-4">
                            <GripVertical size={20} />
                          </div>
                          
                          <img src={song.thumbnail} alt={song.title} className="w-14 h-14 rounded-lg object-cover shadow-md" />
                          
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold truncate ${isPlaying ? 'text-[#1ed760]' : 'text-white'}`}>
                              {song.title}
                            </p>
                            <p className="text-sm text-zinc-400 truncate">{song.author}</p>
                          </div>
                          
                          {isPlaying ? (
                              <div className="px-4 text-xs font-bold text-[#1ed760] uppercase tracking-wider">Playing</div>
                          ) : (
                              <button 
                                onClick={() => {
                                  setQueueIndex(index);
                                  executePlay(song);
                                }}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-[#1ed760] hover:text-black transition-all"
                              >
                                <Play size={18} className="ml-1" fill="currentColor" />
                              </button>
                          )}
                          
                          <button 
                              onClick={() => removeFromQueue(index)}
                              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove from queue"
                          >
                              <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
