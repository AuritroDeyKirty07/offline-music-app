// Standalone Direct High-Speed Music Search & 320kbps Stream Engine
import { decryptMediaUrl } from './des.js';

const decodeEntities = (s) => {
    if (!s) return '';
    return s.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
};

const isCompilationOrMix = (title, duration) => {
    if (!title) return false;
    const t = title.toLowerCase();
    if (duration && duration > 480) return true; // Songs longer than 8 mins are usually mixes/jukeboxes
    const banWords = ['jukebox', 'full album', 'non stop', 'non-stop', 'mashup', 'audio jukebox', 'compilation', 'all songs', 'top 10', 'top 20', 'top 50', 'hits collection'];
    return banWords.some(w => t.includes(w));
};

export const searchMusic = async (query, limit = 15) => {
    if (!query || !query.trim()) return [];
    const trimmed = query.trim();

    // 1. Direct JioSaavn Official API (100-200ms latency, direct CD quality)
    try {
        const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&cc=in&includeMetaTags=1&q=${encodeURIComponent(trimmed)}&p=1&n=${limit + 10}`;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
            const data = await res.json();
            const results = data.results || [];
            if (Array.isArray(results) && results.length > 0) {
                const songs = [];
                for (const s of results) {
                    const songTitle = decodeEntities(s.song || s.title || s.name);
                    const dur = parseInt(s.duration) || 210;
                    if (isCompilationOrMix(songTitle, dur)) continue;

                    let streamUrl = null;
                    if (s.encrypted_media_url) {
                        const dec = decryptMediaUrl(s.encrypted_media_url);
                        if (dec) {
                            streamUrl = dec.replace(/_96\.mp4/, '_320.mp4');
                        }
                    }

                    const rawImg = s.image || '';
                    const thumb500 = rawImg ? rawImg.replace('150x150', '500x500').replace('50x50', '500x500') : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80';

                    songs.push({
                        id: String(s.id || s.song_id || Math.random().toString(36).substring(7)),
                        title: songTitle,
                        author: decodeEntities(s.primary_artists || s.singers || s.music || 'Unknown Artist'),
                        duration: dur,
                        thumbnail: thumb500,
                        audioUrl: streamUrl,
                        streamUrl: streamUrl
                    });
                    if (songs.length >= limit) break;
                }
                if (songs.length > 0) return songs;
            }
        }
    } catch (_) {}

    // 2. Fallback to JioSaavn Mirror endpoints
    const MIRRORS = [
        'https://jiosaavn-api-privateindexer.vercel.app/search/songs?query=',
        'https://saavn.sumit.codes/api/search/songs?query='
    ];
    for (const ep of MIRRORS) {
        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 3500);
            const res = await fetch(ep + encodeURIComponent(trimmed), { signal: ctrl.signal });
            clearTimeout(tid);
            if (res.ok) {
                const data = await res.json();
                const results = data.data?.results || data.results || [];
                if (Array.isArray(results) && results.length > 0) {
                    return results.filter(s => !isCompilationOrMix(s.name || s.title, Number(s.duration))).map(s => {
                        const dl = s.downloadUrl || [];
                        const bestUrl = Array.isArray(dl)
                            ? (dl.find(d => d.quality === '320kbps')?.link || dl.find(d => d.quality === '160kbps')?.link || dl[dl.length - 1]?.link || dl[0]?.link)
                            : (s.media_url || dl);
                        const images = s.image || [];
                        const bestImg = Array.isArray(images)
                            ? (images[images.length - 1]?.link || images[images.length - 1]?.url || images[0]?.link || images[0]?.url)
                            : (typeof images === 'string' ? images : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80');

                        return {
                            id: String(s.id || s.song_id || Math.random().toString(36).substring(7)),
                            title: decodeEntities(s.name || s.title || s.song),
                            author: decodeEntities(s.primaryArtists || s.artists?.primary?.[0]?.name || s.singers || 'Unknown Artist'),
                            duration: Number(s.duration) || 210,
                            thumbnail: bestImg,
                            audioUrl: bestUrl,
                            streamUrl: bestUrl
                        };
                    }).slice(0, limit);
                }
            }
        } catch (_) {}
    }

    return [];
};

const MOOD_TERMS = {
    'Punjabi Hits': ['Karan Aujla', 'Diljit Dosanjh', 'Shubh', 'Sidhu Moose Wala', 'AP Dhillon'],
    'Bollywood Romantic': ['Arijit Singh', 'Pritam', 'Atif Aslam', 'Shreya Ghoshal', 'Vishal Mishra'],
    'Hip-Hop Vibes': ['Seedhe Maut', 'Divine', 'KR$NA', 'Badshah', 'Emiway Bantai'],
    'Chill Lofi': ['Anuv Jain', 'Prateek Kuhad', 'Jasleen Royal', 'Zaeden', 'Bayaan'],
    'Gym Workout': ['Winning Speech', 'Tauba Tauba', 'Cheques', 'Antidote', 'God Damn'],
    'All': ['Top Hits Hindi Punjabi', 'Latest Punjabi Songs', 'Arijit Singh', 'Karan Aujla']
};

export const getMoodTracks = async (mood = 'All') => {
    const terms = MOOD_TERMS[mood] || MOOD_TERMS['All'];
    try {
        const promises = terms.map(t => searchMusic(t, 4));
        const settled = await Promise.allSettled(promises);
        const allSongs = [];
        for (const s of settled) {
            if (s.status === 'fulfilled' && Array.isArray(s.value)) {
                allSongs.push(...s.value);
            }
        }
        const seen = new Set();
        const unique = [];
        for (const song of allSongs) {
            const key = (song.title || '').toLowerCase().trim();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(song);
            }
            if (unique.length >= 15) break;
        }
        if (unique.length > 0) return unique;
    } catch (_) {}
    return searchMusic(mood, 15);
};

export const getAudioStreamUrl = async (song) => {
    if (!song) return null;
    if (song.audioUrl) return song.audioUrl;
    if (song.streamUrl) return song.streamUrl;
    const res = await searchMusic(`${song.title} ${song.author}`, 3);
    if (res && res.length > 0 && res[0].audioUrl) return res[0].audioUrl;
    return null;
};
