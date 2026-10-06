// js/api.js

/* ========================================== */
/* 1. SEARCH API (Primary + Fallback)         */
/* ========================================== */
export async function searchMusic(query) {
    try {
        // Primary: Az bry
        const res = await fetch(`https://api.azbry.com/api/search/yts?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data.status && data.result && data.result.length > 0) {
            // Standardize the response so our UI always gets the same format
            return data.result.map(item => ({
                title: item.title,
                videoId: item.videoId,
                thumbnail: item.thumbnail,
                duration: item.duration,
                views: item.views,
                channel: item.channel || 'Unknown'
            }));
        }
        throw new Error('Az bry search failed or returned empty');
    } catch (error) {
        console.warn('Az bry search failed, switching to ZellRayy fallback...');
        
        try {
            // Fallback: ZellRayy
            const res = await fetch(`https://zellrayy.com/search/youtube?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            
            if (data.status && data.result && data.result.length > 0) {
                return data.result.map(item => ({
                    title: item.title,
                    videoId: item.videoId,
                    thumbnail: item.thumbnail,
                    duration: item.duration,
                    views: item.views,
                    channel: item.channel?.name || 'Unknown'
                }));
            }
            return [];
        } catch (fallbackError) {
            console.error('Both search APIs failed.');
            return [];
        }
    }
}

/* ========================================== */
/* 2. AUDIO DOWNLOAD API (Primary + Fallback) */
/* ========================================== */
export async function getAudioUrl(videoId) {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        // Primary: Az bry
        const res = await fetch(`https://api.azbry.com/api/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`);
        const data = await res.json();
        
        if (data.status && data.result && data.result.download) {
            return {
                audioUrl: data.result.download,
                title: data.result.title,
                duration: data.result.duration,
                quality: data.result.format || '128kbps'
            };
        }
        throw new Error('Az bry download failed');
    } catch (error) {
        console.warn('Az bry download failed, switching to ZellRayy fallback...');
        
        try {
            // Fallback: ZellRayy
            const res = await fetch(`https://zellrayy.com/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`);
            const data = await res.json();
            
            if (data.status && data.result && (data.result.download || data.result.stream)) {
                return {
                    audioUrl: data.result.download || data.result.stream,
                    title: data.result.title,
                    duration: data.result.duration,
                    quality: data.result.type || '128kbps'
                };
            }
            throw new Error('ZellRayy download failed');
        } catch (fallbackError) {
            console.error('Both audio download APIs failed.');
            return null;
        }
    }
}

/* ========================================== */
/* 3. LYRICS API (Primary + Fallback)         */
/* ========================================== */
export async function getLyrics(query) {
    try {
        // Primary: ZellRayy Lyrics
        const res = await fetch(`https://zellrayy.com/search/lirik?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        
        if (data.status && data.result) {
            const lyricsText = data.result.plainLyrics || data.result.lirik || '';
            const syncedText = data.result.syncedLyrics || '';
            
            if (lyricsText || syncedText) {
                return {
                    title: data.result.trackName || data.result.title,
                    artist: data.result.artistName || data.result.artist,
                    plain: lyricsText,
                    synced: syncedText
                };
            }
        }
        throw new Error('ZellRayy lyrics not found');
    } catch (error) {
        console.warn('ZellRayy lyrics failed, switching to Genius fallback...');
        
        try {
            // Fallback: Genius
            const res = await fetch(`https://apis.davidcyriltech.my.id/lyrics/genius?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            
            if (data.success && data.results && data.results.length > 0) {
                // Genius returns a URL to the lyrics page, not the full text directly.
                // We will use the title and artist from Genius, but leave plain text empty for now.
                // In a later update, we can add a scraper to get the full Genius text.
                return {
                    title: data.results[0].title,
                    artist: data.results[0].artist,
                    plain: '',
                    synced: '',
                    geniusUrl: data.results[0].url
                };
            }
            return null; // Return null so the UI hides the lyrics card
        } catch (fallbackError) {
            console.error('Both lyrics APIs failed.');
            return null; // Return null so the UI hides the lyrics card
        }
    }
}

/* ========================================== */
/* 4. WHATMUSIC (Identify Song from Audio)    */
/* ========================================== */
export async function identifyMusic(audioUrl) {
    try {
        const res = await fetch(`https://api.nexray.eu.cc/tools/whatsmusic?url=${encodeURIComponent(audioUrl)}`);
        const data = await res.json();
        
        if (data.status && data.result) {
            return {
                title: data.result.title,
                artist: data.result.artist,
                score: data.result.score,
                release: data.result.release,
                duration: data.result.duration,
                links: data.result.url || []
            };
        }
        return null;
    } catch (error) {
        console.error('WhatMusic identification failed.');
        return null;
    }
}