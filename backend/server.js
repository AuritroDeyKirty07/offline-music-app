require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
    GoogleGenerativeAI
} = require('@google/generative-ai');

const {
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
} = require('./musicService');

const youtubedl =
    require('youtube-dl-exec');

const playdl = require('play-dl');

const {
    getAiArtists,
    getAiAutoplayRecommendations,
    getAiHomeRecommendations
} = require('./geminiService');

const {
    Readable
} = require('stream');

// ============================================================
// APP
// ============================================================

const app =
    express();

const PORT =
    process.env.PORT || 5000;

function getBaseUrl(req) {
    if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL;
    if (req) {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.get('host') || `localhost:${PORT}`;
        return `${protocol}://${host}`;
    }
    return `http://localhost:${PORT}`;
}

function getLocalIpAddresses() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push({ name, address: iface.address });
            }
        }
    }
    return addresses;
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Auto Network Discovery endpoints for Mobile & Web clients
app.get('/api/ping', (req, res) => {
    res.json({ ok: true, server: 'Chord-PC-Server', timestamp: Date.now() });
});

app.get('/api/server-info', (req, res) => {
    res.json({
        ok: true,
        server: 'Chord-PC-Server',
        hostname: os.hostname(),
        port: PORT,
        interfaces: getLocalIpAddresses(),
        baseUrl: getBaseUrl(req)
    });
});

app.use(
    express.json({
        limit: '2mb'
    })
);

// ============================================================
// GEMINI
// ============================================================

const genAI =
    new GoogleGenerativeAI(
        process.env.GEMINI_API_KEY ||
        'dummy_key'
    );

// ============================================================
// DIRECTORIES
// ============================================================

const DOWNLOAD_DIR =
    process.env.DOWNLOAD_DIR ||
    path.join(
        __dirname,
        'downloads'
    );

if (
    !fs.existsSync(
        DOWNLOAD_DIR
    )
) {
    fs.mkdirSync(
        DOWNLOAD_DIR,
        {
            recursive: true
        }
    );
}

// ============================================================
// STATIC DOWNLOAD FILES
// ============================================================

app.use(
    '/downloads',
    express.static(
        DOWNLOAD_DIR
    )
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
    '/',
    (req, res) => {
        res.json({
            status: 'ok',
            service: 'Offline Music API'
        });
    }
);

app.get(
    '/health',
    (req, res) => {
        res.json({
            status: 'healthy'
        });
    }
);

app.get(
    '/healthz',
    (req, res) => {
        res.json({
            status: 'healthy'
        });
    }
);

app.get(
    '/api/health',
    (req, res) => {
        res.json({
            status: 'healthy',
            service: 'Offline Music API'
        });
    }
);

// ============================================================
// SEARCH
// ============================================================

app.get(
    '/api/search',
    async (req, res) => {
        try {
            const query =
                req.query.q;

            const officialOnly =
                req.query.officialOnly ===
                'true';

            if (!query) {
                return res
                    .status(400)
                    .json({
                        error:
                            'Query is required'
                    });
            }

            const results =
                await searchMusic(
                    query,
                    10,
                    officialOnly
                );

            res.json(
                results
            );

        } catch (error) {
            console.error(
                'Search error:',
                error
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to search music'
                });
        }
    }
);

// ============================================================
// RECOMMENDATIONS
// ============================================================

app.get(
    '/api/recommendations',
    async (req, res) => {
        try {
            const prefs =
                JSON.parse(
                    req.query.prefs ||
                    '{}'
                );

            const recommendations =
                await getRecommendations(
                    prefs
                );

            res.json(
                recommendations
            );

        } catch (error) {
            console.error(
                'Recommendations error:',
                error.stack ||
                error
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to fetch recommendations',
                    details:
                        error.message
                });
        }
    }
);

// ============================================================
// LIBRARY
// ============================================================

app.get(
    '/api/library',
    async (req, res) => {
        try {
            const library =
                await getDB();

            res.json(
                library
            );

        } catch (error) {
            console.error(
                'Library error:',
                error
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to fetch library'
                });
        }
    }
);

app.delete(
    '/api/library/:id',
    async (req, res) => {
        try {
            const deleted =
                await deleteSong(
                    req.params.id
                );

            if (deleted) {
                return res.json({
                    success: true
                });
            }

            res
                .status(404)
                .json({
                    error:
                        'Song not found in library'
                });

        } catch (error) {
            console.error(
                'Delete song error:',
                error
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to delete song'
                });
        }
    }
);

// ============================================================
// PLAYLISTS
// ============================================================

app.get(
    '/api/playlists',
    async (req, res) => {
        try {
            res.json(
                await getPlaylists()
            );

        } catch (error) {
            console.error(
                'Get playlists error:',
                error
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to fetch playlists'
                });
        }
    }
);

app.post(
    '/api/playlists',
    async (req, res) => {
        try {
            const {
                name
            } = req.body;

            if (!name) {
                return res
                    .status(400)
                    .json({
                        error:
                            'Name is required'
                    });
            }

            const newPlaylist =
                await createPlaylist(
                    name
                );

            res.json(
                newPlaylist
            );

        } catch (error) {
            console.error(
                'Create playlist error:',
                error
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to create playlist'
                });
        }
    }
);

app.delete(
    '/api/playlists/:id',
    async (req, res) => {
        try {
            await deletePlaylist(
                req.params.id
            );

            res.json({
                success: true
            });

        } catch (error) {
            console.error(
                'Delete playlist error:',
                error
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to delete playlist'
                });
        }
    }
);

app.post(
    '/api/playlists/:id/songs',
    async (req, res) => {
        try {
            const {
                song
            } = req.body;

            if (
                !song ||
                !song.id
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            'Valid song object is required'
                    });
            }

            await addSongToPlaylist(
                req.params.id,
                song
            );

            res.json({
                success: true
            });

        } catch (error) {
            console.error(
                'Add playlist song error:',
                error
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to add song to playlist'
                });
        }
    }
);

app.delete(
    '/api/playlists/:id/songs/:songId',
    async (req, res) => {
        try {
            await removeSongFromPlaylist(
                req.params.id,
                req.params.songId
            );

            res.json({
                success: true
            });

        } catch (error) {
            console.error(
                'Remove playlist song error:',
                error
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to remove song from playlist'
                });
        }
    }
);

// ============================================================
// ARTIST IMAGES
// ============================================================

let artistImages = {};

try {
    artistImages =
        require(
            './artistImages.json'
        );
} catch (e) {
    console.log(
        'No artist images cache found'
    );
}

app.get(
    '/api/artist-image/:name',
    (req, res) => {
        const name =
            req.params.name;

        const url =
            artistImages[name];

        if (url) {
            return res.redirect(
                url
            );
        }

        res.redirect(
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                name
            )}&background=random`
        );
    }
);

// ============================================================
// STREAM URL CACHE & FAST EXTRACTOR
// ============================================================

const streamUrlCache =
    new Map();

function getCachedStreamUrl(
    id
) {
    const item = streamUrlCache.get(id);
    if (!item) return null;
    if (Date.now() - item.timestamp > 4 * 60 * 60 * 1000) {
        streamUrlCache.delete(id);
        return null;
    }
    return item.url;
}

function setCachedStreamUrl(
    id,
    url
) {
    streamUrlCache.set(id, {
        url,
        timestamp: Date.now()
    });
}

const ffmpegPath = require('ffmpeg-static');

async function extractStreamUrl(id) {
    const cached = getCachedStreamUrl(id);
    if (cached) return cached;

    let realId = id;
    if (id.startsWith('ai_')) {
        try {
            const rawHex = id.replace('ai_', '');
            const rawQuery = Buffer.from(rawHex, 'hex').toString('utf8');
            const searchResults = await searchMusic(rawQuery, 1, false);
            if (searchResults && searchResults.length > 0) {
                realId = searchResults[0].id;
            }
        } catch (e) {}
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${realId}`;

    // 1. Ultra-fast playdl extractor (sub-150ms in Node.js)
    try {
        const streamInfo = await playdl.stream(youtubeUrl, { quality: 2 });
        if (streamInfo && streamInfo.url) {
            setCachedStreamUrl(id, streamInfo.url);
            setCachedStreamUrl(realId, streamInfo.url);
            return streamInfo.url;
        }
    } catch (e) {
        // Fallback to youtube-dl-exec
    }

    // 2. Fallback: youtube-dl-exec direct stream URL
    try {
        const directUrl = await youtubedl(youtubeUrl, {
            getUrl: true,
            format: 'bestaudio',
            noWarnings: true
        });

        if (directUrl && typeof directUrl === 'string' && directUrl.startsWith('http')) {
            const cleanUrl = directUrl.trim().split('\n')[0];
            setCachedStreamUrl(id, cleanUrl);
            setCachedStreamUrl(realId, cleanUrl);
            return cleanUrl;
        }
    } catch (e) {
        console.error('Stream extraction getUrl failed for:', realId, e.message);
    }
        // play-dl fallback
    }

    return null;
}

// ============================================================
// PLAY / DOWNLOAD
// ============================================================

app.post(
    '/api/play',
    async (req, res) => {
        try {
            let songInfo = req.body.song;
            const shouldDownload = req.body.download;

            if (!songInfo || !songInfo.id) {
                return res.status(400).json({ error: 'Invalid song info' });
            }

            // If this is an AI placeholder track, resolve to real YouTube ID
            if (songInfo.id.startsWith('ai_')) {
                const query = `${songInfo.title} ${songInfo.author}`;
                const searchResults = await searchMusic(query, 1, false);
                if (searchResults && searchResults.length > 0) {
                    songInfo = { ...searchResults[0], ...songInfo, id: searchResults[0].id, thumbnail: searchResults[0].thumbnail || songInfo.thumbnail };
                }
            }

            // 1. If downloaded file exists, return ready
            const existingFile = await findExistingFile(songInfo.id);
            if (existingFile) {
                return res.json({
                    status: 'ready',
                    url: `${getBaseUrl(req)}/downloads/${encodeURIComponent(existingFile)}`
                });
            }

            // 2. Trigger background download if requested
            if (shouldDownload) {
                downloadSong(songInfo).catch(error => {
                    console.error('Background download error:', error.message);
                });
            }

            // 3. Pre-warm direct stream URL in cache before responding
            await extractStreamUrl(songInfo.id);

            return res.json({
                status: 'streaming',
                url: `${getBaseUrl(req)}/api/stream/${encodeURIComponent(songInfo.id)}`
            });

        } catch (error) {
            console.error('Download/Stream error:', error);
            res.status(500).json({ error: 'Failed to process song' });
        }
    }
);

// ============================================================
// STREAM
// ============================================================

app.get(
    '/api/stream/:id',
    async (req, res) => {
        try {
            const id = req.params.id;

            // CORS Headers for Web Audio API & HTML5 Audio
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');

            // 1. FAST LOCAL DISK PLAYBACK: If song exists on disk, stream directly from disk!
            const existingFile = await findExistingFile(id);
            if (existingFile) {
                const filePath = path.join(DOWNLOAD_DIR, existingFile);
                if (fs.existsSync(filePath)) {
                    const stat = fs.statSync(filePath);
                    const fileSize = stat.size;
                    const range = req.headers.range;

                    if (range) {
                        const parts = range.replace(/bytes=/, "").split("-");
                        const start = parseInt(parts[0], 10);
                        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                        const chunksize = (end - start) + 1;
                        const file = fs.createReadStream(filePath, { start, end });
                        const head = {
                            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                            'Accept-Ranges': 'bytes',
                            'Content-Length': chunksize,
                            'Content-Type': 'audio/mpeg',
                        };
                        res.writeHead(206, head);
                        return file.pipe(res);
                    } else {
                        const head = {
                            'Content-Length': fileSize,
                            'Content-Type': 'audio/mpeg',
                            'Accept-Ranges': 'bytes',
                        };
                        res.writeHead(200, head);
                        return fs.createReadStream(filePath).pipe(res);
                    }
                }
            }

            // 2. ONLINE STREAM PROXY (WITH RANGE SUPPORT & CORS)
            const targetUrl = await extractStreamUrl(id);

            if (!targetUrl) {
                return res
                    .status(404)
                    .json({ error: 'Stream not found' });
            }

            const fetchHeaders = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'identity;q=1, *;q=0',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.youtube.com/'
            };
            if (req.headers.range) {
                fetchHeaders.Range = req.headers.range;
            }

            const streamRes = await fetch(targetUrl, {
                method: 'GET',
                headers: fetchHeaders
            });

            if (!streamRes.ok && streamRes.status !== 206) {
                return res.status(streamRes.status || 500).end();
            }

            const contentType = streamRes.headers.get('content-type') || 'audio/webm';
            res.setHeader('Content-Type', contentType);

            const acceptRanges = streamRes.headers.get('accept-ranges') || 'bytes';
            res.setHeader('Accept-Ranges', acceptRanges);

            const contentLength = streamRes.headers.get('content-length');
            if (contentLength) res.setHeader('Content-Length', contentLength);

            const contentRange = streamRes.headers.get('content-range');
            if (contentRange) res.setHeader('Content-Range', contentRange);

            res.status(streamRes.status);

            if (streamRes.body) {
                Readable.fromWeb(streamRes.body).pipe(res);
            } else {
                res.end();
            }

        } catch (error) {
            console.error('Streaming error:', error.message);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Streaming failed' });
            }
        }
    }
);

// ============================================================
// METADATA RESOLVER (REAL YOUTUBE IDs & REAL COVER ART)
// ============================================================

async function resolveTrackList(titles, officialOnly = false) {
    const results = [];
    const uniqueIds = new Set();
    const chunkSize = 3;

    for (let i = 0; i < titles.length; i += chunkSize) {
        const chunk = titles.slice(i, i + chunkSize);
        const chunkPromises = chunk.map(async (rawTitle) => {
            try {
                const searchResults = await searchMusic(rawTitle, 1, officialOnly);
                if (searchResults && searchResults.length > 0) {
                    return searchResults[0];
                }
            } catch (e) {}
            return null;
        });

        const resolvedChunk = await Promise.all(chunkPromises);
        resolvedChunk.filter(Boolean).forEach(song => {
            if (!uniqueIds.has(song.id)) {
                uniqueIds.add(song.id);
                results.push(song);
            }
        });
    }

    return results;
}

// ============================================================
// AI AUTOPLAY
// ============================================================

app.post(
    '/api/ai-recommend',
    async (req, res) => {
        try {
            const {
                title,
                author,
                language,
                artists,
                genres
            } = req.body;

            const titles = await getAiAutoplayRecommendations(
                title || '',
                author || '',
                language || 'Punjabi',
                { artists, genres }
            );

            const topTitles = (titles || []).slice(0, 8);
            const resolvedSongs = await resolveTrackList(topTitles, false);

            res.json(resolvedSongs);

        } catch (error) {
            console.error('AI Autoplay Batch Error:', error.message);
            res.status(500).json({ error: 'Failed to generate AI autoplay batch' });
        }
    }
);

// ============================================================
// AI HOME RECOMMENDATIONS
// ============================================================

app.post(
    '/api/ai-home-recommendations',
    async (req, res) => {
        try {
            const titles = await getAiHomeRecommendations(req.body);
            const officialOnly = req.body.officialOnly === true;
            const topTitles = (titles || []).slice(0, 16);

            const resolvedSongs = await resolveTrackList(topTitles, officialOnly);

            res.json(resolvedSongs);

        } catch (error) {
            console.error('AI Home Recommendation Error:', error.message);
            res.status(500).json({ error: 'Failed to generate AI home recommendations' });
        }
    }
);

// ============================================================
// LYRICS
// ============================================================

app.get(
    '/api/lyrics',
    async (req, res) => {
        try {
            const {
                title,
                author
            } = req.query;

            if (
                !title ||
                !author
            ) {
                return res.json({});
            }

            let cleanAuthor =
                author
                    .split('-')[0]
                    .split(',')[0]
                    .trim();

            if (
                cleanAuthor
                    .toLowerCase()
                    .includes('vevo')
            ) {
                cleanAuthor =
                    cleanAuthor.replace(
                        /vevo/i,
                        ''
                    ).trim();
            }

            if (
                cleanAuthor
                    .toLowerCase()
                    .includes('topic')
            ) {
                cleanAuthor =
                    cleanAuthor.replace(
                        /topic/i,
                        ''
                    ).trim();
            }

            let baseTitle =
                title
                    .replace(
                        /\[.*?\]/g,
                        ''
                    )
                    .replace(
                        /\(.*?\)/g,
                        ''
                    )
                    .replace(
                        /\{.*?\}/g,
                        ''
                    );

            baseTitle =
                baseTitle
                    .split('|')[0]
                    .replace(
                        /official/i,
                        ''
                    )
                    .replace(
                        /video/i,
                        ''
                    )
                    .replace(
                        /lyrical/i,
                        ''
                    )
                    .replace(
                        /audio/i,
                        ''
                    )
                    .trim();

            const parts =
                baseTitle.split('-');

            let finalTitle =
                baseTitle;

            if (
                parts.length >= 2
            ) {
                const part1 =
                    parts[0].trim();

                const part2 =
                    parts[1].trim();

                const normAuthor =
                    cleanAuthor.toLowerCase();

                if (
                    part1
                        .toLowerCase()
                        .includes(
                            normAuthor
                        )
                ) {
                    finalTitle =
                        part2;

                } else if (
                    part2
                        .toLowerCase()
                        .includes(
                            normAuthor
                        )
                ) {
                    finalTitle =
                        part1;

                } else {
                    finalTitle =
                        part1;
                }
            }

            finalTitle =
                finalTitle
                    .replace(
                        /[^a-zA-Z0-9 ]+$/g,
                        ''
                    )
                    .trim();

            if (cleanAuthor) {
                const authorRegex =
                    new RegExp(
                        cleanAuthor.replace(
                            /[.*+?^${}()|[\]\\]/g,
                            '\\$&'
                        ),
                        'ig'
                    );

                finalTitle =
                    finalTitle
                        .replace(
                            authorRegex,
                            ''
                        )
                        .trim();
            }

            finalTitle =
                finalTitle
                    .replace(
                        /\b(ft|feat|x)\b/ig,
                        ''
                    )
                    .replace(
                        /\s+/g,
                        ' '
                    )
                    .trim();

            let data = null;

            try {
                const exactRes =
                    await fetch(
                        `https://lrclib.net/api/get?track_name=${encodeURIComponent(
                            finalTitle
                        )}&artist_name=${encodeURIComponent(
                            cleanAuthor
                        )}`
                    );

                if (
                    exactRes.ok
                ) {
                    data =
                        await exactRes.json();
                }
            } catch (err) {}

            if (
                !data ||
                !data.syncedLyrics
            ) {
                try {
                    const searchRes =
                        await fetch(
                            `https://lrclib.net/api/search?q=${encodeURIComponent(
                                baseTitle
                            )}`
                        );

                    if (
                        searchRes.ok
                    ) {
                        const searchData =
                            await searchRes.json();

                        if (
                            searchData &&
                            searchData.length >
                                0
                        ) {
                            const syncedResult =
                                searchData.find(
                                    item =>
                                        item.syncedLyrics
                                );

                            if (
                                syncedResult
                            ) {
                                data =
                                    syncedResult;
                            } else if (
                                !data
                            ) {
                                data =
                                    searchData[0];
                            }
                        }
                    }
                } catch (err) {}
            }

            if (!data) {
                try {
                    const desperateRes =
                        await fetch(
                            `https://lrclib.net/api/search?q=${encodeURIComponent(
                                finalTitle
                            )}`
                        );

                    if (
                        desperateRes.ok
                    ) {
                        const desperateData =
                            await desperateRes.json();

                        if (
                            desperateData &&
                            desperateData.length >
                                0
                        ) {
                            data =
                                desperateData.find(
                                    item =>
                                        item.syncedLyrics
                                ) ||
                                desperateData[0];
                        }
                    }
                } catch (err) {}
            }

            res.json(
                data || {}
            );

        } catch (error) {
            console.error(
                'Lyrics API error:',
                error.message
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to fetch lyrics'
                });
        }
    }
);

// ============================================================
// AI ARTISTS
// ============================================================

app.post(
    '/api/ai-artists',
    async (req, res) => {
        try {
            const {
                languages
            } = req.body;

            const artistNames = await getAiArtists(languages);

            const https =
                require('https');

            const fetchDeezerImage =
                name =>
                    new Promise(
                        resolve => {
                            https.get(
                                'https://api.deezer.com/search/artist?q=' +
                                    encodeURIComponent(
                                        name
                                    ),
                                apiRes => {
                                    let data =
                                        '';

                                    apiRes.on(
                                        'data',
                                        chunk =>
                                            data +=
                                                chunk
                                    );

                                    apiRes.on(
                                        'end',
                                        () => {
                                            try {
                                                const json =
                                                    JSON.parse(
                                                        data
                                                    );

                                                const url =
                                                    json.data &&
                                                    json.data[0]
                                                        ? json
                                                              .data[0]
                                                              .picture_medium
                                                        : '';

                                                resolve({
                                                    name,
                                                    image:
                                                        url
                                                });

                                            } catch (
                                                err
                                            ) {
                                                resolve({
                                                    name,
                                                    image:
                                                        ''
                                                });
                                            }
                                        }
                                    );
                                }
                            ).on(
                                'error',
                                () =>
                                    resolve({
                                        name,
                                        image:
                                            ''
                                    })
                            );
                        }
                    );

            const artistsData =
                await Promise.all(
                    artistNames.map(
                        fetchDeezerImage
                    )
                );

            res.json(
                artistsData
            );

        } catch (error) {
            console.error(
                'AI Artists outer error:',
                error.message
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to fetch artists'
                });
        }
    }
);

// ============================================================
// LYRICS OFFSETS
// ============================================================

const DATA_DIR =
    process.env.DATA_DIR ||
    __dirname;

if (
    !fs.existsSync(
        DATA_DIR
    )
) {
    fs.mkdirSync(
        DATA_DIR,
        {
            recursive: true
        }
    );
}

const OFFSETS_FILE =
    path.join(
        DATA_DIR,
        'offsets.json'
    );

let offsetsCache = {};

try {
    if (fs.existsSync(OFFSETS_FILE)) {
        offsetsCache = JSON.parse(fs.readFileSync(OFFSETS_FILE, 'utf8'));
    } else {
        fs.writeFileSync(OFFSETS_FILE, '{}', 'utf8');
    }
} catch (e) {
    offsetsCache = {};
}

let saveOffsetsTimer = null;

function scheduleSaveOffsets() {
    if (saveOffsetsTimer) clearTimeout(saveOffsetsTimer);
    saveOffsetsTimer = setTimeout(() => {
        try {
            fs.writeFileSync(
                OFFSETS_FILE,
                JSON.stringify(offsetsCache, null, 2),
                'utf8'
            );
        } catch (err) {
            console.error('Failed to save offsets to disk:', err.message);
        }
    }, 3000);
}

app.post(
    '/api/lyrics/offset',
    (req, res) => {
        try {
            const {
                id,
                offset
            } = req.body;

            if (!id) {
                return res
                    .status(400)
                    .json({
                        error:
                            'Missing id'
                    });
            }

            offsetsCache[id] = Number(offset) || 0;
            scheduleSaveOffsets();

            res.json({
                success: true,
                offset: offsetsCache[id]
            });

        } catch (err) {
            console.error(
                'Failed to save offset:',
                err.message
            );

            res
                .status(500)
                .json({
                    error:
                        'Failed to save offset'
                });
        }
    }
);

app.get(
    '/api/lyrics/offset/:id',
    (req, res) => {
        const id = req.params.id;
        const offset = offsetsCache[id] !== undefined ? offsetsCache[id] : 0;
        res.json({ offset });
    }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(
    PORT,
    '0.0.0.0',
    () => {
        console.log(`\n🎵 ===============================================`);
        console.log(`🚀 Chord Local PC Server running on port ${PORT}`);
        console.log(`📡 Active Local Network Endpoints (Wi-Fi & LAN):`);
        console.log(`   • Local:   http://localhost:${PORT}`);
        const addrs = getLocalIpAddresses();
        addrs.forEach(a => {
            console.log(`   • ${a.name}: http://${a.address}:${PORT}`);
        });
        console.log(`📂 Download directory: ${DOWNLOAD_DIR}`);
        console.log(`📂 Data directory:     ${DATA_DIR}`);
        console.log(`🎵 ===============================================\n`);
    }
);