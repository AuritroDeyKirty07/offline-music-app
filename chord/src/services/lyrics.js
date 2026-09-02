// Standalone Synced Lyrics Service (Direct LRCLIB API)
const cleanName = (str) => {
    if (!str) return '';
    return str.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/\{.*?\}/g, '')
        .replace(/official\s*(music)?\s*(video|audio|lyric\s*video)?/gi, '')
        .replace(/lyric(s|al)?\s*(video)?/gi, '').replace(/8k|4k|hd|remastered|full\s*song/gi, '')
        .replace(/feat\.?|ft\.?|with|prod\.?/gi, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim();
};

export const parseLrc = (lrcString) => {
    if (!lrcString) return [];
    const lines = lrcString.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/;
    for (const line of lines) {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const ms = match[3] ? parseInt(match[3].padEnd(3, '0').substring(0, 3), 10) : 0;
            const time = minutes * 60 + seconds + ms / 1000;
            const text = line.replace(timeRegex, '').trim();
            if (text) result.push({ time, text });
        }
    }
    return result.sort((a, b) => a.time - b.time);
};

export const fetchLyrics = async (title, author) => {
    try {
        const cTitle = cleanName(title);
        const cAuthor = cleanName(author);
        const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cTitle)}&artist_name=${encodeURIComponent(cAuthor)}`;
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) {
            const sRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cTitle + ' ' + cAuthor)}`);
            if (sRes.ok) {
                const sData = await sRes.json();
                if (Array.isArray(sData) && sData.length > 0) {
                    const best = sData[0];
                    return { syncedLyrics: best.syncedLyrics, plainLyrics: best.plainLyrics, parsed: parseLrc(best.syncedLyrics) };
                }
            }
            return null;
        }
        const data = await res.json();
        return { syncedLyrics: data.syncedLyrics, plainLyrics: data.plainLyrics, parsed: parseLrc(data.syncedLyrics) };
    } catch (_) { return null; }
};
