const { GoogleGenerativeAI } = require('@google/generative-ai');

// ============================================================
// CONFIGURATION & KEY POOL
// ============================================================

const CANDIDATE_MODELS = [
    'gemini-3.6-flash',
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview'
];

function getApiKeys() {
    const rawKeys = [];

    if (process.env.GEMINI_API_KEYS) {
        rawKeys.push(...process.env.GEMINI_API_KEYS.split(','));
    }

    if (process.env.GEMINI_API_KEY) {
        rawKeys.push(process.env.GEMINI_API_KEY);
    }

    for (let i = 1; i <= 10; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key) rawKeys.push(key);
    }

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
let currentModelIndex = 0;
const responseCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

console.log(`[GeminiService] Initialized with ${apiKeys.length} API keys and ${CANDIDATE_MODELS.length} fallback models.`);

// ============================================================
// CORE ROTATION & RETRY ENGINE
// ============================================================

async function generateWithFailover(prompt, cacheKey = null) {
    if (cacheKey && responseCache.has(cacheKey)) {
        const cached = responseCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            console.log(`[GeminiService] Returning cached response for: ${cacheKey}`);
            return cached.data;
        }
    }

    apiKeys = getApiKeys();
    const validKeys = apiKeys.filter(k => k && k !== 'dummy_key');
    const modelName = 'gemini-3.6-flash';

    if (validKeys.length === 0) {
        throw new Error('No valid Gemini API keys configured');
    }

    try {
        // Race all valid keys concurrently for instant sub-3s response!
        const racePromises = validKeys.map(async (apiKey, idx) => {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            const callPromise = model.generateContent(prompt);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Key ${idx + 1} timed out (18s)`)), 18000)
            );
            const result = await Promise.race([callPromise, timeoutPromise]);
            const text = result.response.text().trim();
            return { text, idx };
        });

        const winner = await Promise.any(racePromises);
        console.log(`[GeminiService] Key ${winner.idx + 1}/${validKeys.length} won race!`);

        if (cacheKey) {
            responseCache.set(cacheKey, { timestamp: Date.now(), data: winner.text });
        }

        return winner.text;
    } catch (err) {
        console.warn(`[GeminiService] All parallel key calls failed:`, err.message);
        throw err;
    }
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
        'Tum Hi Ho - Arijit Singh',
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
    
    // Check Punjabi
    const isPunjabi = (CURATED_ARTISTS.Punjabi || []).some(a => text.includes(a.toLowerCase())) ||
        text.includes('punjabi') || text.includes('speed records') || text.includes('apna punjab') || text.includes('sidhu') || text.includes('aujla');
    if (isPunjabi) return 'Punjabi';

    // Check English
    const isEnglish = (CURATED_ARTISTS.English || []).some(a => text.includes(a.toLowerCase())) ||
        text.includes('charlie puth') || text.includes('weeknd') || text.includes('taylor swift') || text.includes('ed sheeran') || text.includes('bieber') || text.includes('vevo');
    if (isEnglish) return 'English';

    // Check Hindi
    const isHindi = (CURATED_ARTISTS.Hindi || []).some(a => text.includes(a.toLowerCase())) ||
        text.includes('arijit') || text.includes('anuv jain') || text.includes('pritam') || text.includes('t-series') || text.includes('tips official') || text.includes('saregama');
    if (isHindi) return 'Hindi';

    return hintLang || 'English';
}

async function getAiAutoplayRecommendations(title, author, language = 'English', prefs = {}) {
    const { artists = [], genres = [] } = prefs;
    const detectedLang = detectSongLanguage(title, author, language);
    const cacheKey = `autoplay_${title}_${author}_${detectedLang}_${(artists || []).slice(0, 3).join('_')}`;

    let prompt = `I am currently listening to the track "${title}" by artist "${author}".
The language and genre context of this track is STRICTLY "${detectedLang}".
STRICT RULES:
1. All recommended songs MUST be distinct, single tracks in the SAME LANGUAGE ("${detectedLang}") with matching style/vibe.
2. DO NOT return any songs from other languages (e.g. if the song is English, DO NOT return Hindi or Punjabi songs).
3. DO NOT return alternate versions, lyrics videos, covers, or remixes of "${title}".
4. DO NOT return any compilations, album collections, or jukeboxes.
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
    const fallbackList = FALLBACK_BY_LANGUAGE[detectedLang] || FALLBACK_BY_LANGUAGE['English'];
    return fallbackList;
}

async function getAiHomeRecommendations(prefs = {}) {
    const { artists = [], genres = [], interests = [], languages = [], library = [] } = prefs;
    const cacheKey = `home_${JSON.stringify(prefs)}`;

    let prompt = `I need exactly 20 diverse individual music single recommendations tailored to these preferences:\n`;
    if (artists.length) prompt += `- Favorite Artists: ${artists.join(', ')}\n`;
    if (genres.length) prompt += `- Genres: ${genres.join(', ')}\n`;
    if (interests.length) prompt += `- Moods/Interests: ${interests.join(', ')}\n`;
    if (languages.length) prompt += `- Languages: ${languages.join(', ')}\n`;
    if (library.length) {
        const libraryTitles = library.map(s => `${s.title} by ${s.author}`).slice(0, 10);
        prompt += `- Recently listened: ${libraryTitles.join(', ')}\n`;
    }

    prompt += `\nSTRICT RULES:
- ONLY recommend individual single tracks. DO NOT include compilations, albums, or jukeboxes.
- Return EXACTLY 20 song titles.
- The response should STRICTLY be a plain JSON array of strings containing ONLY the song titles along with their primary artist, e.g., ["Song Name - Artist Name", "Another Song - Artist"].
- Do not wrap it in markdown code blocks. Just valid JSON array.`;

    try {
        const rawText = await generateWithFailover(prompt, cacheKey);
        const parsed = extractJsonArray(rawText);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, 20);
        }
    } catch (err) {
        console.warn('[GeminiService] Using smart fallback for home recommendations');
    }

    // Dynamic curated home mix based on languages
    const primaryLang = (languages && languages[0]) || 'English';
    const langTracks = FALLBACK_BY_LANGUAGE[primaryLang] || FALLBACK_BY_LANGUAGE['English'];
    return langTracks;
}

module.exports = {
    getAiArtists,
    getAiAutoplayRecommendations,
    getAiHomeRecommendations,
    generateWithFailover
};

