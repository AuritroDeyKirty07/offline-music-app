const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const CANDIDATE_MODELS = [
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash'
];

function getApiKeys() {
    const rawKeys = [];

    if (process.env.GEMINI_API_KEYS) {
        rawKeys.push(...process.env.GEMINI_API_KEYS.split(','));
    }

    if (process.env.GEMINI_API_KEY) {
        rawKeys.push(process.env.GEMINI_API_KEY);
    }

    for (let i = 1; i <= 50; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key) rawKeys.push(key);
    }

    // Direct fallback parse from .env to guarantee all pasted keys are recognized
    try {
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('AQ.') || (trimmed.startsWith('AIza') && !trimmed.includes('='))) {
                    rawKeys.push(trimmed);
                }
            }
        }
    } catch (_) {}

    // Clean, trim, and deduplicate
    const uniqueKeys = Array.from(new Set(
        rawKeys
            .map(k => (k || '').trim())
            .filter(k => k && k !== 'dummy_key' && !k.startsWith('#'))
    ));

    return uniqueKeys.length > 0 ? uniqueKeys : ['dummy_key'];
}

let apiKeys = getApiKeys();
let currentKeyIndex = 0;
const keyCooldowns = new Map(); // apiKey -> cooldown expiry timestamp (ms)
const COOLDOWN_DURATION_MS = 90 * 1000; // 90 seconds cooldown on 429/quota error
const responseCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

console.log(`[GeminiService] Initialized with ${apiKeys.length} API keys and sequential single-call failover pool.`);

// ============================================================
// CORE SEQUENTIAL ROTATION & RETRY ENGINE (ZERO REDUNDANCY)
// ============================================================

async function generateWithFailover(prompt, cacheKey = null) {
    if (cacheKey && responseCache.has(cacheKey)) {
        const cached = responseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log(`[GeminiService] Returning cached response for: ${cacheKey}`);
            return cached.data;
        }
    }

    const allKeys = getApiKeys().filter(k => k && k !== 'dummy_key');
    if (allKeys.length === 0) {
        throw new Error('No valid Gemini API keys configured');
    }

    const now = Date.now();
    // Filter healthy keys not currently in cooldown
    let availableKeys = allKeys.filter(k => {
        const expiry = keyCooldowns.get(k);
        return !expiry || expiry <= now;
    });

    // If all keys are currently cooling down, clear the oldest cooldowns
    if (availableKeys.length === 0) {
        console.warn(`[GeminiService] All keys in cooldown, resetting cooldown timers.`);
        keyCooldowns.clear();
        availableKeys = allKeys;
    }

    const totalAttempts = availableKeys.length;
    let lastError = null;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
        // Pick exactly ONE key sequentially (round-robin distribution)
        const keyIdx = (currentKeyIndex + attempt) % availableKeys.length;
        const apiKey = availableKeys[keyIdx];
        const keyDisplay = apiKey.substring(0, 8) + '...';

        for (const modelName of CANDIDATE_MODELS) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: modelName });

                // Responsive 10s timeout per single key call
                const callPromise = model.generateContent(prompt);
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Timeout (10s)`)), 10000)
                );

                const result = await Promise.race([callPromise, timeoutPromise]);
                const text = result.response.text().trim();

                if (text) {
                    // Update currentKeyIndex to next key for the next incoming request
                    currentKeyIndex = (currentKeyIndex + attempt + 1) % availableKeys.length;
                    console.log(`[GeminiService] Key [${keyDisplay}] succeeded on ${modelName}`);

                    if (cacheKey) {
                        responseCache.set(cacheKey, { timestamp: Date.now(), data: text });
                    }
                    return text;
                }
            } catch (err) {
                lastError = err;
                const msg = err.message || '';

                // If rate limited or quota exceeded, put this key on cooldown
                if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('403')) {
                    keyCooldowns.set(apiKey, Date.now() + COOLDOWN_DURATION_MS);
                    console.warn(`[GeminiService] Key [${keyDisplay}] rate limited/exhausted. Cooldown for 90s.`);
                    break; // Move immediately to the next API key in the pool
                } else if (msg.includes('404') || msg.includes('not found') || msg.includes('unsupported')) {
                    // Model issue, try next candidate model
                    continue;
                } else {
                    console.warn(`[GeminiService] Key [${keyDisplay}] attempt failed (${msg}). Trying next key.`);
                    break; // Try next API key
                }
            }
        }
    }

    console.warn(`[GeminiService] All attempted keys failed:`, lastError?.message);
    throw lastError || new Error('All Gemini API keys failed');
}

// ============================================================
// PARSE JSON HELPER
// ============================================================

function extractJsonArray(text) {
    if (!text) return null;
    try {
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]);
        }
        const cleaned = text
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.warn('[GeminiService] JSON parse error:', e.message);
        return null;
    }
}

// ============================================================
// CURATED HIGH-QUALITY TRENDING ARTISTS
// ============================================================

const CURATED_ARTISTS = {
    'Punjabi': [
        'Karan Aujla', 'Shubh', 'Cheema Y', 'Sidhu Moose Wala', 'Diljit Dosanjh',
        'AP Dhillon', 'Gurinder Gill', 'Arjan Dhillon', 'Jordan Sandhu', 'Prem Dhillon',
        'Wazir Patar', 'Tegi Pannu', 'Jerry', 'Raf Saperra', 'Chani Nattan',
        'Nirvair Pannu', 'Hustinder', 'Tarsem Jassar', 'Ammy Virk', 'B Praak',
        'Guru Randhawa', 'Jassi Gill', 'Mankirt Aulakh', 'Sharry Mann', 'Garry Sandhu',
        'Babbu Maan', 'Bohemia', 'Imran Khan', 'The PropheC', 'Jasmine Sandlas',
        'Sunanda Sharma', 'Amrinder Gill', 'Gurdas Maan', 'Gurnam Bhullar', 'Nimrat Khaira'
    ],
    'English': [
        'Charlie Puth', 'The Weeknd', 'Taylor Swift', 'Drake', 'Ed Sheeran',
        'Bruno Mars', 'Dua Lipa', 'Justin Bieber', 'Billie Eilish', 'Harry Styles',
        'Eminem', 'Post Malone', 'Imagine Dragons', 'Shawn Mendes', 'Ariana Grande',
        'Travis Scott', 'Kendrick Lamar', 'ZAYN', 'Maroon 5', 'Coldplay',
        'Olivia Rodrigo', 'Sam Smith', 'Alan Walker', 'The Chainsmokers', 'David Guetta',
        'Marshmello', 'Selena Gomez', 'Katy Perry', 'Rihanna', 'Adele',
        'Lady Gaga', 'Sia', 'Khalid', 'Camila Cabello', '21 Savage'
    ],
    'Hindi': [
        'Arijit Singh', 'Shreya Ghoshal', 'Atif Aslam', 'Sonu Nigam', 'Pritam',
        'Mohit Chauhan', 'Sunidhi Chauhan', 'Jubin Nautiyal', 'Vishal Mishra', 'Darshan Raval',
        'Anuv Jain', 'Prateek Kuhad', 'Jasleen Royal', 'KK', 'Lucky Ali',
        'B Praak', 'Badshah', 'Yo Yo Honey Singh', 'Raftaar', 'King',
        'Seedhe Maut', 'KR$NA', 'DIVINE', 'MC Stan', 'Talha Anjum',
        'Talhah Yunus', 'Umair', 'Hassan Raheem', 'Kishore Kumar', 'Lata Mangeshkar',
        'Mohammed Rafi', 'Mukesh', 'Kumar Sanu', 'Udit Narayan', 'Alka Yagnik'
    ],
    'Haryanvi': [
        'Masoom Sharma', 'Gulzaar Chhaniwala', 'Diler Kharkiya', 'Khasa Aala Chahar',
        'Renuka Panwar', 'Raju Punjabi', 'Amit Saini Rohtakiya', 'Sumit Goswami', 'Ajay Hooda'
    ],
    'Spanish': [
        'Bad Bunny', 'J Balvin', 'Rosalía', 'Daddy Yankee', 'Shakira',
        'Maluma', 'Ozuna', 'Rauw Alejandro', 'Karol G', 'Enrique Iglesias'
    ],
    'Korean': [
        'BTS', 'BLACKPINK', 'NewJeans', 'TWICE', 'Stray Kids',
        'IU', 'SEVENTEEN', 'EXO', 'TOMORROW X TOGETHER', 'LE SSERAFIM'
    ]
};

const DEFAULT_GLOBAL_ARTISTS = [
    'Karan Aujla', 'Charlie Puth', 'Arijit Singh', 'Shubh', 'Cheema Y',
    'Taylor Swift', 'The Weeknd', 'Diljit Dosanjh', 'Ed Sheeran', 'Sidhu Moose Wala',
    'Shreya Ghoshal', 'Drake', 'Badshah', 'Dua Lipa', 'Justin Bieber',
    'Billie Eilish', 'AP Dhillon', 'Harry Styles', 'Pritam', 'Bruno Mars',
    'Sonu Nigam', 'Coldplay', 'Jubin Nautiyal', 'Seedhe Maut', 'KR$NA', 'Anuv Jain'
];

// ============================================================
// PUBLIC SERVICES
// ============================================================

async function getAiArtists(languages = []) {
    const langList = Array.isArray(languages) && languages.length > 0 ? languages : ['Punjabi', 'Hindi', 'English'];
    const langStr = langList.join(', ');
    const cacheKey = `artists_${langStr}`;

    const prompt = `You are a music expert. I need a list of the top 45 most popular, trendy and iconic music artists for these languages/genres: ${langStr}.
Include major trending artists (e.g. for Punjabi include Karan Aujla, Shubh, Cheema Y, Diljit Dosanjh, Sidhu Moose Wala; for English include Charlie Puth, The Weeknd, Taylor Swift, Drake, Bruno Mars; for Hindi include Arijit Singh, Anuv Jain, Pritam, Seedhe Maut, KR$NA).
Return ONLY a plain valid JSON array of strings containing the artist names. Example: ["Artist 1", "Artist 2"]. No markdown, no commentary.`;

    try {
        const rawText = await generateWithFailover(prompt, cacheKey);
        const parsed = extractJsonArray(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, 45);
        }
    } catch (err) {
        console.warn(`[GeminiService] Using curated fallback artists for ${langStr}`);
    }

    // Build curated fallback list based on requested languages
    const result = new Set();
    langList.forEach(lang => {
        const matchingKey = Object.keys(CURATED_ARTISTS).find(k => k.toLowerCase() === lang.toLowerCase());
        if (matchingKey && CURATED_ARTISTS[matchingKey]) {
            CURATED_ARTISTS[matchingKey].forEach(a => result.add(a));
        }
    });

    if (result.size < 15) {
        DEFAULT_GLOBAL_ARTISTS.forEach(a => result.add(a));
    }

    return Array.from(result).slice(0, 50);
}

const FALLBACK_BY_LANGUAGE = {
    'English': [
        'Save Your Tears - The Weeknd',
        'Levitating - Dua Lipa',
        'As It Was - Harry Styles',
        'Shape of You - Ed Sheeran',
        'Peaches - Justin Bieber',
        'Stay - The Kid LAROI, Justin Bieber',
        'Watermelon Sugar - Harry Styles',
        'Heat Waves - Glass Animals',
        'Flowers - Miley Cyrus',
        'Believer - Imagine Dragons',
        'Blinding Lights - The Weeknd',
        'Starboy - The Weeknd',
        'Treat You Better - Shawn Mendes',
        'Locked Out of Heaven - Bruno Mars',
        'We Don\'t Talk Anymore - Charlie Puth',
        'Light Switch - Charlie Puth',
        'Counting Stars - OneRepublic',
        'Bad Habits - Ed Sheeran'
    ],
    'Punjabi': [
        'Softly - Karan Aujla',
        'Winning Speech - Karan Aujla',
        'Tauba Tauba - Karan Aujla',
        'Cheques - Shubh',
        'King Shit - Shubh',
        'Baller - Shubh',
        'G.O.A.T. - Diljit Dosanjh',
        'Lover - Diljit Dosanjh',
        'Born To Shine - Diljit Dosanjh',
        '295 - Sidhu Moose Wala',
        'So High - Sidhu Moose Wala',
        'Same Beef - Sidhu Moose Wala, Bohemia',
        'Excuses - AP Dhillon',
        'Brown Munde - AP Dhillon',
        'With You - AP Dhillon',
        'California Love - Cheema Y',
        'Daku - Chani Nattan, Inderpal Moga',
        'White Brown Black - Avvy Sra, Karan Aujla'
    ],
    'Hindi': [
        'Kesariya - Arijit Singh',
        'Apna Bana Le - Arijit Singh',
        'Tum Hi Ho Aashiqui 2 - Arijit Singh',
        'Chaleya - Arijit Singh, Shilpa Rao',
        'Husn - Anuv Jain',
        'Baarishein - Anuv Jain',
        'Faasle - Aditya Rikhari',
        'Kahani Suno 2.0 - Kaifi Khalil',
        'Pehle Bhi Main - Vishal Mishra',
        'Heeriye - Jasleen Royal, Arijit Singh',
        'Maan Meri Jaan - King',
        'Tu Hai Kahan - AUR',
        'Kasoor - Prateek Kuhad',
        'Ilahi - Arijit Singh',
        'Kabira - Tochi Raina, Rekha Bhardwaj'
    ]
};

function detectSongLanguage(title = '', author = '', hintLang = '') {
    const text = `${title} ${author}`.toLowerCase();
    
    // Check Punjabi artists & keywords
    const isPunjabi = (CURATED_ARTISTS.Punjabi || []).some(a => text.includes(a.toLowerCase())) ||
        text.includes('punjabi') || text.includes('speed records') || text.includes('apna punjab') || text.includes('sidhu') || text.includes('aujla') || text.includes('dhillon') || text.includes('cheema') || text.includes('shubh') || text.includes('diljit') || text.includes('jordan sandhu') || text.includes('wazir patar');
    if (isPunjabi) return 'Punjabi';

    // Check Hindi artists & keywords
    const isHindi = (CURATED_ARTISTS.Hindi || []).some(a => text.includes(a.toLowerCase())) ||
        text.includes('arijit') || text.includes('anuv jain') || text.includes('pritam') || text.includes('t-series') || text.includes('tips official') || text.includes('saregama') || text.includes('badshah') || text.includes('king') || text.includes('honey singh') || text.includes('seedhe maut');
    if (isHindi) return 'Hindi';

    // Check English
    const isEnglish = (CURATED_ARTISTS.English || []).some(a => text.includes(a.toLowerCase())) ||
        text.includes('charlie puth') || text.includes('weeknd') || text.includes('taylor swift') || text.includes('ed sheeran') || text.includes('bieber') || text.includes('dua lipa') || text.includes('drake') || text.includes('vevo');
    if (isEnglish) return 'English';

    return hintLang || 'Punjabi';
}

async function getAiAutoplayRecommendations(title, author, language = 'English', prefs = {}) {
    const { artists = [], genres = [] } = prefs;
    const detectedLang = detectSongLanguage(title, author, language);
    const cacheKey = `autoplay_${title}_${author}_${detectedLang}_${(artists || []).slice(0, 3).join('_')}`;

    let prompt = `You are a music playlist curator.
The user is currently listening to "${title}" by "${author}".
The language of this track is STRICTLY "${detectedLang}".

CRITICAL RULE:
- ALL recommended songs MUST be 100% in "${detectedLang}" language.
- DO NOT mix or include songs from other languages under any circumstances! (e.g. If the song is Punjabi, EVERY recommended song MUST be a Punjabi song).
- ONLY recommend individual single tracks. DO NOT include compilations, albums, or jukeboxes.
`;
    if (artists && artists.length > 0) {
        prompt += `User preference artists: ${artists.join(', ')}.\n`;
    }
    if (genres && genres.length > 0) {
        prompt += `Preferred genres: ${genres.join(', ')}.\n`;
    }
    prompt += `Please recommend 15 DIFFERENT single songs.
The response must STRICTLY be a plain JSON array of strings formatted like ["Song Name - Artist Name", "Another Song - Artist"]. No markdown formatting.`;

    try {
        const rawText = await generateWithFailover(prompt, cacheKey);
        const parsed = extractJsonArray(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, 15);
        }
    } catch (err) {
        console.warn(`[GeminiService] Using smart language fallback for "${title}" (${detectedLang})`);
    }

    // High quality distinct tracks fallback strictly matching language
    const fallbackList = FALLBACK_BY_LANGUAGE[detectedLang] || FALLBACK_BY_LANGUAGE['Punjabi'];
    return fallbackList;
}

async function getAiHomeRecommendations(prefs = {}) {
    const { artists = [], genres = [], interests = [], languages = [], library = [], refreshTimestamp } = prefs;
    
    // Pick random subset of artists to ensure diverse mixes on every refresh
    const shuffledArtists = [...artists].sort(() => Math.random() - 0.5);
    const focusArtists = shuffledArtists.slice(0, 6);

    const selectedLangs = Array.isArray(languages) && languages.length > 0 ? languages : ['Punjabi', 'Hindi', 'English'];
    const langStr = selectedLangs.join(' and ');

    const randomSeed = refreshTimestamp || Date.now();

    let prompt = `You are an elite music curation AI.
CRITICAL LANGUAGE REQUIREMENT: ONLY recommend songs in the following language(s): "${langStr}".
IF THE USER CHOSE PUNJABI, 100% OF THE SONGS MUST BE PUNJABI TRACKS! NEVER RETURN SONGS IN OTHER LANGUAGES UNLESS SPECIFICALLY REQUESTED.

Random Mix Seed: ${randomSeed}

User Preferences:
`;
    if (focusArtists.length) prompt += `- Focus Artists for this mix: ${focusArtists.join(', ')}\n`;
    if (genres.length) prompt += `- Genres: ${genres.join(', ')}\n`;
    if (interests.length) prompt += `- Moods/Interests: ${interests.join(', ')}\n`;
    if (languages.length) prompt += `- STRICT Language(s): ${langStr}\n`;
    if (library.length) {
        const libraryTitles = library.map(s => `${s.title} by ${s.author}`).slice(0, 5);
        prompt += `- User's Library: ${libraryTitles.join(', ')}\n`;
    }

    prompt += `\nSTRICT RULES:
1. ONLY return songs strictly in the language(s) "${langStr}". Zero exceptions!
2. ONLY recommend individual single studio tracks. DO NOT include compilations, albums, or jukeboxes.
3. Return EXACTLY 16 DIFFERENT song titles formatted as "Song Title - Artist Name".
4. Provide a FRESH and DIVERSE mix of popular and trending hits.
5. The response should STRICTLY be a plain JSON array of strings, e.g., ["Song Name - Artist Name", "Another Song - Artist"].
6. Do not wrap in markdown code blocks. Just valid JSON array.`;

    try {
        // No rigid cache lock - generate live fresh recommendations
        const rawText = await generateWithFailover(prompt, null);
        const parsed = extractJsonArray(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, 16);
        }
    } catch (err) {
        console.warn('[GeminiService] Live call failed, using dynamic shuffle fallback:', err.message);
    }

    // Dynamic curated home mix based on languages with random shuffle
    const primaryLang = (languages && languages[0]) || 'Punjabi';
    const langTracks = (FALLBACK_BY_LANGUAGE[primaryLang] || FALLBACK_BY_LANGUAGE['Punjabi']).slice();
    return langTracks.sort(() => Math.random() - 0.5);
}

module.exports = {
    getAiArtists,
    getAiAutoplayRecommendations,
    getAiHomeRecommendations,
    generateWithFailover
};

