// Standalone Direct Multi-Source Music Search & Stream Resolver
const SAAVN_ENDPOINTS = [
    'https://jiosaavn-api-2.vercel.app/search/songs?query=',
    'https://saavn.sumit.codes/api/search/songs?query='
];

const decodeEntities = (s) => s ? s.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&') : '';

export const searchMusic = async (query) => {
    if (!query || !query.trim()) return [];
    const trimmed = query.trim();

    for (const ep of SAAVN_ENDPOINTS) {
        try {
            const ctrl = new AbortController();
            const tid = setTimeout(() => ctrl.abort(), 4500);
            const res = await fetch(ep + encodeURIComponent(trimmed), { signal: ctrl.signal });
            clearTimeout(tid);
            if (res.ok) {
                const data = await res.json();
                const results = data.data?.results || data.results || [];
                if (Array.isArray(results) && results.length > 0) {
                    return results.map(s => {
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
                    });
                }
            }
        } catch (_) {}
    }

    try {
        const body = { context: { client: { clientName: 'WEB', clientVersion: '2.20240313.01.00', hl: 'en', gl: 'IN' } }, query: trimmed };
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch('https://www.youtube.com/youtubei/v1/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
        clearTimeout(tid);
        if (res.ok) {
            const data = await res.json();
            const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
            const songs = [];
            for (const item of contents) {
                const v = item.videoRenderer;
                if (v && v.videoId) {
                    const durStr = v.lengthText?.simpleText || '3:30';
                    const parts = durStr.split(':').map(Number);
                    const durSec = parts.length === 2 ? parts[0] * 60 + parts[1] : 210;
                    songs.push({
                        id: v.videoId,
                        title: v.title?.runs?.[0]?.text || 'Unknown Title',
                        author: v.ownerText?.runs?.[0]?.text || 'Unknown Artist',
                        duration: durSec,
                        thumbnail: v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
                        audioUrl: null
                    });
                }
            }
            if (songs.length > 0) return songs;
        }
    } catch (_) {}
    return [];
};

export const getAudioStreamUrl = async (song) => {
    if (!song) return null;
    if (song.audioUrl) return song.audioUrl;
    if (song.streamUrl) return song.streamUrl;
    const res = await searchMusic(`${song.title} ${song.author}`);
    if (res && res.length > 0 && res[0].audioUrl) return res[0].audioUrl;
    return null;
};
