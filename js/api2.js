// js/api2.js

export async function searchMusic(query) {
    try {
        const res = await fetch(`https://api.azbry.com/api/search/yts?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.status && data.result && data.result.length > 0) {
            return data.result.map(item => ({
                title: item.title, videoId: item.videoId, thumbnail: item.thumbnail,
                duration: item.duration, views: item.views, channel: item.channel || 'Unknown'
            }));
        }
        throw new Error('Az bry search failed');
    } catch (error) {
        try {
            const res = await fetch(`https://zellrayy.com/search/youtube?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.status && data.result && data.result.length > 0) {
                return data.result.map(item => ({
                    title: item.title, videoId: item.videoId, thumbnail: item.thumbnail,
                    duration: item.duration, views: item.views, channel: item.channel?.name || 'Unknown'
                }));
            }
            return [];
        } catch (fallbackError) { return []; }
    }
}

export async function getAudioUrl(videoId) {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    try {
        const res = await fetch(`https://api.azbry.com/api/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`);
        const data = await res.json();
        if (data.status && data.result && data.result.download) {
            return { audioUrl: data.result.download, title: data.result.title, duration: data.result.duration, quality: data.result.format || '128kbps' };
        }
        throw new Error('Az bry download failed');
    } catch (error) {
        try {
            const res = await fetch(`https://zellrayy.com/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`);
            const data = await res.json();
            if (data.status && data.result && (data.result.download || data.result.stream)) {
                return { audioUrl: data.result.download || data.result.stream, title: data.result.title, duration: data.result.duration, quality: data.result.type || '128kbps' };
            }
            throw new Error('ZellRayy download failed');
        } catch (fallbackError) { return null; }
    }
}

export async function getLyrics(query) {
    try {
        const res = await fetch(`https://zellrayy.com/search/lirik?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.status && data.result) {
            const lyricsText = data.result.plainLyrics || data.result.lirik || '';
            const syncedText = data.result.syncedLyrics || '';
            if (lyricsText || syncedText) {
                return { title: data.result.trackName || data.result.title, artist: data.result.artistName || data.result.artist, plain: lyricsText, synced: syncedText };
            }
        }
        throw new Error('ZellRayy lyrics not found');
    } catch (error) {
        try {
            const res = await fetch(`https://apis.davidcyriltech.my.id/lyrics/genius?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.success && data.results && data.results.length > 0) {
                return { title: data.results[0].title, artist: data.results[0].artist, plain: '', synced: '', geniusUrl: data.results[0].url };
            }
            return null;
        } catch (fallbackError) { return null; }
    }
}

export async function identifyMusic(audioUrl) {
    try {
        const res = await fetch(`https://api.nexray.eu.cc/tools/whatsmusic?url=${encodeURIComponent(audioUrl)}`);
        const data = await res.json();
        if (data.status && data.result) {
            return { title: data.result.title, artist: data.result.artist, score: data.result.score, release: data.result.release, duration: data.result.duration, links: data.result.url || [] };
        }
        return null;
    } catch (error) { return null; }
}