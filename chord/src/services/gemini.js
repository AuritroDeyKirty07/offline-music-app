// Standalone In-App Gemini AI Engine (15 Keys Round-Robin + 90s Cooldown + Real Track Enrichment)
import { GEMINI_API_KEYS } from './geminiKeys';
import { searchMusic } from './youtube';

let currentKeyIndex = 0;
const keyCooldowns = new Map();
const responseCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash', 'gemini-2.0-flash'];

async function callGeminiRest(apiKey, modelName, prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }), signal: ctrl.signal });
    clearTimeout(tid);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

export async function generateWithFailover(prompt, cacheKey = null) {
    if (cacheKey && responseCache.has(cacheKey)) {
        const c = responseCache.get(cacheKey);
        if (Date.now() - c.timestamp < CACHE_TTL_MS) return c.data;
    }
    const allKeys = GEMINI_API_KEYS;
    if (allKeys.length === 0) throw new Error('No API keys configured');

    const now = Date.now();
    let avail = allKeys.filter(k => !keyCooldowns.has(k) || keyCooldowns.get(k) <= now);
    if (avail.length === 0) { keyCooldowns.clear(); avail = allKeys; }

    let lastErr = null;
    for (let i = 0; i < avail.length; i++) {
        const k = avail[(currentKeyIndex + i) % avail.length];
        for (const m of CANDIDATE_MODELS) {
            try {
                const txt = await callGeminiRest(k, m, prompt);
                if (txt) {
                    currentKeyIndex = (currentKeyIndex + i + 1) % avail.length;
                    if (cacheKey) responseCache.set(cacheKey, { timestamp: Date.now(), data: txt });
                    return txt;
                }
            } catch (err) {
                lastErr = err;
                const msg = err.message || '';
                if (msg.includes('429') || msg.includes('Quota') || msg.includes('403')) {
                    keyCooldowns.set(k, Date.now() + 90000);
                    break;
                } else if (msg.includes('404')) {
                    continue;
                } else {
                    break;
                }
            }
        }
    }
    throw lastErr || new Error('All Gemini keys failed');
}

function extractJsonArray(text) {
    if (!text) return null;
    try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
    } catch (_) {}
    return null;
}

const CURATED_TOP_HITS = [
    { title: 'Winning Speech', author: 'Karan Aujla' },
    { title: 'Tauba Tauba', author: 'Karan Aujla' },
    { title: 'Millionaire', author: 'Yo Yo Honey Singh' },
    { title: 'With You', author: 'AP Dhillon' },
    { title: 'Husn', author: 'Anuv Jain' },
    { title: 'Tu Hai Kahan', author: 'AUR' },
    { title: 'California Love', author: 'Cheema Y, Gur Sidhu' },
    { title: 'Same Beef', author: 'Sidhu Moose Wala, Bohemia' },
    { title: 'Softly', author: 'Karan Aujla' },
    { title: 'Kesariya', author: 'Arijit Singh' },
    { title: 'Starboy', author: 'The Weeknd' },
    { title: 'Blinding Lights', author: 'The Weeknd' },
    { title: 'Cheques', author: 'Shubh' },
    { title: 'God Damn', author: 'Karan Aujla, Badshah' },
    { title: 'Antidote', author: 'Karan Aujla' },
    { title: 'Sajni', author: 'Arijit Singh' },
    { title: 'Perfect', author: 'Ed Sheeran' },
    { title: 'Espresso', author: 'Sabrina Carpenter' },
    { title: 'Diler', author: 'Cheema Y' },
    { title: 'Born to Shine', author: 'Diljit Dosanjh' }
];

async function enrichSongsWithRealData(songList) {
    const promises = songList.map(async (item) => {
        try {
            const query = typeof item === 'string' ? item : `${item.title} ${item.author || ''}`;
            const results = await searchMusic(query, 1);
            if (results && results.length > 0) {
                return results[0];
            }
        } catch (_) {}
        if (typeof item === 'object' && item.title) return item;
        const parts = String(item).split(' - ');
        return {
            id: String(Math.random().toString(36).substring(7)),
            title: (parts[0] || 'Unknown').trim(),
            author: (parts[1] || 'Unknown Artist').trim(),
            duration: 210,
            thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
            audioUrl: null
        };
    });

    const settled = await Promise.allSettled(promises);
    return settled.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
}

export async function getAiHomeRecommendations(taste = {}) {
    const artists = (taste.artists || []).join(', ') || 'Karan Aujla, Arijit Singh, Sidhu Moose Wala, AP Dhillon';
    const langs = (taste.languages || []).join(', ') || 'Punjabi, Hindi';
    const genres = (taste.genres || []).join(', ') || 'Pop, Hip-Hop';
    const prompt = `Return a JSON array of 15 trending songs matching: Languages: ${langs}, Genres: ${genres}, Artists: ${artists}. Format: ["Song Title - Artist Name"]`;

    try {
        const txt = await generateWithFailover(prompt, `home_${langs}_${genres}`);
        const parsed = extractJsonArray(txt);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const enriched = await enrichSongsWithRealData(parsed);
            if (enriched.length > 0) return enriched;
        }
    } catch (_) {}

    // Fallback: Enrich the 20 Curated Top Hits with real live metadata from Saavn
    const fallbackEnriched = await enrichSongsWithRealData(CURATED_TOP_HITS);
    return fallbackEnriched;
}

export async function getAiQueueRecommendations(currentSong) {
    if (!currentSong) return [];
    const prompt = `Based on current song "${currentSong.title}" by "${currentSong.author}", return 6 matching songs as JSON array: ["Song Title - Artist Name"]`;
    try {
        const txt = await generateWithFailover(prompt);
        const parsed = extractJsonArray(txt);
        if (Array.isArray(parsed) && parsed.length > 0) {
            const enriched = await enrichSongsWithRealData(parsed);
            return enriched;
        }
    } catch (_) {}
    return [];
}
