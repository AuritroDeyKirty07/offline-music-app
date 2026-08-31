const youtubedl = require('youtube-dl-exec');
const ytSearch = require('yt-search');
const playdl = require('play-dl');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// ============================================================
// DIRECTORIES
// ============================================================

const DOWNLOAD_DIR =
    process.env.DOWNLOAD_DIR ||
    path.join(__dirname, 'downloads');

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

const DATA_DIR =
    process.env.DATA_DIR ||
    __dirname;

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE =
    process.env.DB_FILE ||
    path.join(DATA_DIR, 'db.json');

const PLAYLISTS_FILE =
    process.env.PLAYLISTS_FILE ||
    path.join(DATA_DIR, 'playlists.json');

// ============================================================
// MONGODB
// ============================================================

const songSchema = new mongoose.Schema({
    id: String,
    title: String,
    thumbnail: String,
    duration: String,
    author: String,
    fileExt: String
});

const playlistSchema = new mongoose.Schema({
    id: String,
    name: String,
    songs: [songSchema]
});

let Song;
let Playlist;

if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('MongoDB connected');
        })
        .catch((err) => {
            console.error(
                'MongoDB connection error:',
                err
            );
        });

    Song = mongoose.model('Song', songSchema);
    Playlist = mongoose.model(
        'Playlist',
        playlistSchema
    );
}

// ============================================================
// DATABASE
// ============================================================

async function getDB() {
    if (process.env.MONGO_URI && Song) {
        return await Song.find().lean();
    }

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(
            DB_FILE,
            JSON.stringify([]),
            'utf8'
        );

        return [];
    }

    try {
        const data = fs.readFileSync(
            DB_FILE,
            'utf8'
        );

        return data
            ? JSON.parse(data)
            : [];
    } catch (e) {
        console.error(
            'Failed to read local database:',
            e.message
        );

        return [];
    }
}

async function saveToDB(song, ext) {
    if (process.env.MONGO_URI && Song) {
        const existing =
            await Song.findOne({
                id: song.id
            });

        if (!existing) {
            await Song.create({
                ...song,
                fileExt: ext
            });
        }

        return;
    }

    const db = await getDB();

    if (!db.find(s => s.id === song.id)) {
        const songToSave = {
            ...song,
            fileExt: ext
        };

        db.unshift(songToSave);

        fs.writeFileSync(
            DB_FILE,
            JSON.stringify(
                db,
                null,
                2
            ),
            'utf8'
        );
    }
}

// ============================================================
// RANDOM ITEMS
// ============================================================

function getRandomItems(arr, n) {
    if (!arr || !arr.length) {
        return [];
    }

    const shuffled = [...arr]
        .sort(() => 0.5 - Math.random());

    return shuffled.slice(0, n);
}

// ============================================================
// RECOMMENDATIONS
// ============================================================

async function getRecommendations(prefs) {
    if (
        !prefs ||
        (
            !prefs.languages?.length &&
            !prefs.genres?.length &&
            !prefs.interests?.length &&
            !prefs.artists?.length
        )
    ) {
        return searchMusic(
            'latest hit songs',
            20
        );
    }

    const queries = [];

    const selectedArtists =
        getRandomItems(
            prefs.artists,
            2
        );

    selectedArtists.forEach(
        artist => {
            queries.push(
                `${artist} songs`
            );
        }
    );

    const selectedGenres =
        getRandomItems(
            prefs.genres,
            2
        );

    selectedGenres.forEach(
        genre => {
            queries.push(
                `${genre} songs`
            );
        }
    );

    const interestMap = {
        'Love olds':
            'retro old classic hits',

        'Discover new':
            'latest new trending',

        'Workout':
            'gym workout bass boosted',

        'Study & Focus':
            'lofi study focus calm',

        'Party':
            'party club dance',

        'Chill / Relax':
            'relaxing chill acoustic',

        'Travel / Drive':
            'driving road trip'
    };

    const selectedInterests =
        getRandomItems(
            prefs.interests,
            2
        );

    selectedInterests.forEach(
        interest => {
            queries.push(
                `${
                    interestMap[interest] ||
                    interest
                } songs`
            );
        }
    );

    const selectedLangs =
        getRandomItems(
            prefs.languages,
            2
        );

    selectedLangs.forEach(
        lang => {
            queries.push(
                `${lang} hit songs`
            );
        }
    );

    if (queries.length === 0) {
        queries.push(
            'latest hit songs'
        );
    }

    const db = await getDB();

    if (db.length > 0) {
        const randomSong =
            db[
                Math.floor(
                    Math.random() *
                    db.length
                )
            ];

        queries.push(
            `similar songs to ${randomSong.author} ${randomSong.title}`
        );
    }

    const promises =
        queries.map(q =>
            searchMusic(q)
        );

    const resultsArray =
        await Promise.allSettled(
            promises
        );

    let combined = [];

    resultsArray.forEach(
        result => {
            if (
                result.status ===
                    'fulfilled' &&
                result.value
            ) {
                combined =
                    combined.concat(
                        result.value
                    );
            }
        }
    );

    const uniqueMap =
        new Map();

    combined.forEach(song => {
        if (
            !uniqueMap.has(song.id)
        ) {
            uniqueMap.set(
                song.id,
                song
            );
        }
    });

    const finalResults =
        Array.from(
            uniqueMap.values()
        );

    for (
        let i =
            finalResults.length - 1;
        i > 0;
        i--
    ) {
        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            finalResults[i],
            finalResults[j]
        ] = [
            finalResults[j],
            finalResults[i]
        ];
    }

    return finalResults;
}

// ============================================================
// YOUTUBE SEARCH & SMART OFFICIAL FILTERING
// ============================================================

const searchCache = new Map();

const SPAM_CHANNELS = [
    'suno studio', 'all india remix', 'dj remix', 'whatsapp status', 'status video',
    'ringtone', 'mashup songs', 'bass boosted', 'slowed+reverb', 'slowed reverb',
    '8d audio', 'lofi flip', 'ai cover', 'fan made', 'reaction video', 'shorts'
];

const COMPILATION_KEYWORDS = [
    'jukebox', 'compilation', 'all time hit', 'all time hits', 'back to back hits', 'back to back songs',
    'full album', 'audio jukebox', 'video jukebox', 'non stop', 'non-stop',
    'sadabahar gaane', 'sadabahar gane', 'evergreen songs', 'greatest hits album',
    'hit songs collection', 'top 10', 'top 20', 'top 50', 'top 100', 'mega mix',
    '90s hits hindi', '90s romantic songs', '90s old hindi songs', '90s bollywood',
    '90s evergreen', 'best of 90s', 'best of 20'
];

const OFFICIAL_LABELS = [
    't-series', 'speed records', 'warner music', 'sony music', 'universal music',
    'single track studios', 'zee music', 'geet mp3', 'white hill music', 'sagahits',
    'desi music factory', 'mass appeal', 'saregama', 'tips official', 'yrf',
    'dm - desi melodies', 'karan aujla', 'diljit dosanjh', 'sidhu moose wala',
    'ap dhillon', 'shubh', 'the weeknd', 'charlie puth', 'taylor swift', 'drake'
];

async function searchMusic(
    query,
    limit = 10,
    officialOnly = false
) {
    if (!query || typeof query !== 'string' || !query.trim()) {
        return [];
    }

    const cleanQuery = query.trim();
    const lowerQ = cleanQuery.toLowerCase();

    // Smart query enhancement: if user searched just "wavy", add artist context to find the main hit
    let searchQuery = cleanQuery;
    if (lowerQ === 'wavy') {
        searchQuery = 'wavy karan aujla';
    } else if (officialOnly && !lowerQ.includes('official') && !lowerQ.includes('audio')) {
        searchQuery = `${cleanQuery} official audio`;
    } else if (!lowerQ.includes('audio') && !lowerQ.includes('video') && !lowerQ.includes('song')) {
        searchQuery = `${cleanQuery} song`;
    }

    const cacheKey = `${searchQuery}_${limit}_${officialOnly}`;
    if (searchCache.has(cacheKey)) {
        return searchCache.get(cacheKey);
    }

    let rawList = [];

    // 1. Try yt-search with safe string extraction & 2.5s timeout
    try {
        const searchPromise = ytSearch(searchQuery);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('ytSearch timed out (2.5s)')), 2500)
        );

        const r = await Promise.race([searchPromise, timeoutPromise]);
        if (r && Array.isArray(r.videos)) {
            rawList = r.videos.map(v => {
                const titleStr = typeof v.title === 'string' ? v.title : (v.title?.text || v.title?.runs?.[0]?.text || '');
                const authorStr = typeof v.author?.name === 'string' ? v.author.name : (v.author?.name?.text || '');
                return {
                    id: v.videoId || v.id,
                    title: titleStr,
                    thumbnail: v.thumbnail || v.image,
                    duration: v.timestamp || (v.seconds ? `${Math.floor(v.seconds / 60)}:${(v.seconds % 60).toString().padStart(2, '0')}` : '3:30'),
                    seconds: v.seconds || 0,
                    author: authorStr
                };
            }).filter(v => v.id && v.title);
        }
    } catch (e) {
        // Fallback to play-dl
    }

    // 2. Resilient fallback to play-dl if ytSearch failed or returned empty
    if (!rawList || rawList.length === 0) {
        try {
            const playdlPromise = playdl.search(searchQuery, {
                limit: Math.max(limit * 2, 20),
                source: { youtube: 'video' }
            });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('play-dl timed out (2.5s)')), 2500)
            );

            const playdlResults = await Promise.race([playdlPromise, timeoutPromise]);
            if (Array.isArray(playdlResults)) {
                rawList = playdlResults.map(v => ({
                    id: v.id,
                    title: v.title || '',
                    thumbnail: v.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
                    duration: v.durationInSec ? `${Math.floor(v.durationInSec / 60)}:${(v.durationInSec % 60).toString().padStart(2, '0')}` : '3:30',
                    seconds: v.durationInSec || 0,
                    author: v.channel?.name || ''
                })).filter(v => v.id && v.title);
            }
        } catch (playErr) {
            // Both providers handled
        }
    }

    // 3. Filter out spam, low-quality channels, and full-length jukeboxes / compilations
    let filtered = rawList.filter(v => {
        const titleLower = v.title.toLowerCase();
        const authorLower = v.author.toLowerCase();

        // Filter out long compilation jukeboxes (> 12 minutes) unless user explicitly searched for album/jukebox
        if (!lowerQ.includes('jukebox') && !lowerQ.includes('album') && !lowerQ.includes('compilation')) {
            if (v.seconds && v.seconds > 720) {
                return false;
            }
            const isCompilation = COMPILATION_KEYWORDS.some(comp => titleLower.includes(comp));
            if (isCompilation) {
                return false;
            }
        }

        // If user explicitly searched for remix/status, do not filter it out
        if (!lowerQ.includes('remix') && !lowerQ.includes('status')) {
            const isSpam = SPAM_CHANNELS.some(spam => titleLower.includes(spam) || authorLower.includes(spam));
            if (isSpam) return false;
        }

        return true;
    });

    // 4. Sort and prioritize Official channels, Topic channels, VEVO, and verified labels
    filtered.sort((a, b) => {
        const aAuthor = a.author.toLowerCase();
        const bAuthor = b.author.toLowerCase();
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();

        const aIsOfficial = aAuthor.includes('topic') || aAuthor.includes('vevo') || aAuthor.includes('official') || OFFICIAL_LABELS.some(l => aAuthor.includes(l));
        const bIsOfficial = bAuthor.includes('topic') || bAuthor.includes('vevo') || bAuthor.includes('official') || OFFICIAL_LABELS.some(l => bAuthor.includes(l));

        if (aIsOfficial && !bIsOfficial) return -1;
        if (!aIsOfficial && bIsOfficial) return 1;

        // Prioritize official audio / video tags in title
        const aHasTag = aTitle.includes('official audio') || aTitle.includes('official video') || aTitle.includes('official music video');
        const bHasTag = bTitle.includes('official audio') || bTitle.includes('official video') || bTitle.includes('official music video');
        if (aHasTag && !bHasTag) return -1;
        if (!aHasTag && bHasTag) return 1;

        return 0;
    });

    const db = await getDB();
    const downloadedIds = new Set(db.map(s => s.id));

    const finalResults = filtered.slice(0, limit).map(v => ({
        id: v.id,
        title: v.title,
        thumbnail: v.thumbnail,
        duration: v.duration,
        author: v.author,
        isDownloaded: downloadedIds.has(v.id)
    }));

    searchCache.set(cacheKey, finalResults);
    return finalResults;
}

// ============================================================
// EXISTING FILE
// ============================================================

async function findExistingFile(id) {
    if (!fs.existsSync(DOWNLOAD_DIR)) {
        return null;
    }

    const files =
        await fs.promises.readdir(
            DOWNLOAD_DIR
        );

    const file =
        files.find(
            filename =>
                filename.includes(id) &&
                (
                    filename.endsWith('.webm') ||
                    filename.endsWith('.m4a') ||
                    filename.endsWith('.mp3')
                )
        );

    return file || null;
}

// ============================================================
// DOWNLOAD
// ============================================================

const currentlyDownloading =
    new Set();

function downloadSong(songInfo) {
    return new Promise(
        async (
            resolve,
            reject
        ) => {
            const {
                id
            } = songInfo;

            try {
                const existingFile =
                    await findExistingFile(
                        id
                    );

                if (existingFile) {
                    await saveToDB(
                        songInfo,
                        existingFile
                    );

                    return resolve(
                        existingFile
                    );
                }

                if (
                    currentlyDownloading.has(
                        id
                    )
                ) {
                    return resolve(
                        null
                    );
                }

                currentlyDownloading.add(
                    id
                );

                const outputPath =
                    path.join(
                        DOWNLOAD_DIR,
                        '%(title)s - %(id)s.%(ext)s'
                    );

                /*
                 * Do NOT use the old Windows-specific
                 * FFmpeg path here.
                 *
                 * youtube-dl-exec will use the
                 * executable available in the
                 * deployment environment.
                 */

                await youtubedl(
                    `https://www.youtube.com/watch?v=${id}`,
                    {
                        format: 'bestaudio',
                        output: outputPath,
                        x: true,
                        audioFormat: 'mp3',
                        noCheckCertificates: true,
                        noWarnings: true
                    }
                );

                const file =
                    await findExistingFile(
                        id
                    );

                if (file) {
                    await saveToDB(
                        songInfo,
                        file
                    );

                    currentlyDownloading.delete(
                        id
                    );

                    return resolve(
                        file
                    );
                }

                currentlyDownloading.delete(
                    id
                );

                reject(
                    new Error(
                        'File downloaded but could not be found'
                    )
                );

            } catch (error) {
                console.error(
                    'youtube-dl-exec error:',
                    error.message
                );

                currentlyDownloading.delete(
                    id
                );

                reject(error);
            }
        }
    );
}

// ============================================================
// DELETE SONG
// ============================================================

async function deleteSong(id) {
    if (
        process.env.MONGO_URI &&
        Song
    ) {
        await Song.deleteOne({
            id
        });
    } else {
        const db =
            await getDB();

        const songIndex =
            db.findIndex(
                song =>
                    song.id === id
            );

        if (
            songIndex !== -1
        ) {
            db.splice(
                songIndex,
                1
            );

            fs.writeFileSync(
                DB_FILE,
                JSON.stringify(
                    db,
                    null,
                    2
                ),
                'utf8'
            );
        } else {
            return false;
        }
    }

    const existingFile =
        await findExistingFile(
            id
        );

    if (existingFile) {
        try {
            await fs.promises.unlink(
                path.join(
                    DOWNLOAD_DIR,
                    existingFile
                )
            );
        } catch (e) {
            console.error(
                'Failed to delete file:',
                e.message
            );
        }
    }

    return true;
}

// ============================================================
// PLAYLISTS
// ============================================================

async function getPlaylists() {
    if (
        process.env.MONGO_URI &&
        Playlist
    ) {
        return await Playlist
            .find()
            .lean();
    }

    if (
        !fs.existsSync(
            PLAYLISTS_FILE
        )
    ) {
        fs.writeFileSync(
            PLAYLISTS_FILE,
            JSON.stringify([]),
            'utf8'
        );

        return [];
    }

    try {
        const data =
            fs.readFileSync(
                PLAYLISTS_FILE,
                'utf8'
            );

        return data
            ? JSON.parse(data)
            : [];

    } catch (e) {
        console.error(
            'Failed to read playlists:',
            e.message
        );

        return [];
    }
}

async function savePlaylistsJson(
    playlists
) {
    fs.writeFileSync(
        PLAYLISTS_FILE,
        JSON.stringify(
            playlists,
            null,
            2
        ),
        'utf8'
    );
}

async function createPlaylist(
    name
) {
    const newPlaylist = {
        id:
            Date.now().toString(),
        name,
        songs: []
    };

    if (
        process.env.MONGO_URI &&
        Playlist
    ) {
        await Playlist.create(
            newPlaylist
        );
    } else {
        const playlists =
            await getPlaylists();

        playlists.push(
            newPlaylist
        );

        await savePlaylistsJson(
            playlists
        );
    }

    return newPlaylist;
}

async function deletePlaylist(
    id
) {
    if (
        process.env.MONGO_URI &&
        Playlist
    ) {
        await Playlist.deleteOne({
            id
        });
    } else {
        let playlists =
            await getPlaylists();

        playlists =
            playlists.filter(
                playlist =>
                    playlist.id !== id
            );

        await savePlaylistsJson(
            playlists
        );
    }
}

async function addSongToPlaylist(
    playlistId,
    song
) {
    if (
        process.env.MONGO_URI &&
        Playlist
    ) {
        const playlist =
            await Playlist.findOne({
                id: playlistId
            });

        if (
            playlist &&
            !playlist.songs.find(
                s => s.id === song.id
            )
        ) {
            playlist.songs.push(
                song
            );

            await playlist.save();
        }

    } else {
        const playlists =
            await getPlaylists();

        const playlist =
            playlists.find(
                p =>
                    p.id === playlistId
            );

        if (
            playlist &&
            !playlist.songs.find(
                s =>
                    s.id === song.id
            )
        ) {
            playlist.songs.push(
                song
            );

            await savePlaylistsJson(
                playlists
            );
        }
    }
}

async function removeSongFromPlaylist(
    playlistId,
    songId
) {
    if (
        process.env.MONGO_URI &&
        Playlist
    ) {
        const playlist =
            await Playlist.findOne({
                id: playlistId
            });

        if (playlist) {
            playlist.songs =
                playlist.songs.filter(
                    song =>
                        song.id !== songId
                );

            await playlist.save();
        }

    } else {
        const playlists =
            await getPlaylists();

        const playlist =
            playlists.find(
                p =>
                    p.id === playlistId
            );

        if (playlist) {
            playlist.songs =
                playlist.songs.filter(
                    song =>
                        song.id !== songId
                );

            await savePlaylistsJson(
                playlists
            );
        }
    }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    searchMusic,
    downloadSong,
    getDB,
    getRecommendations,
    deleteSong,
    findExistingFile,

    getPlaylists,
    createPlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist
};