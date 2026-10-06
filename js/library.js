// js/library.js

/* ========================================== */
/* 1. LOCAL STORAGE KEYS                      */
/* ========================================== */
const STORAGE_KEYS = {
    LIKED: 'bigmanj-liked-songs',
    PLAYLISTS: 'bigmanj-playlists',
    DOWNLOADS: 'bigmanj-downloads',
    PROFILE: 'bigmanj-user-profile'
};

/* ========================================== */
/* 2. HELPER FUNCTIONS                        */
/* ========================================== */
function getStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error(`Error reading ${key} from storage:`, error);
        return [];
    }
}

function setStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error saving ${key} to storage:`, error);
    }
}

/* ========================================== */
/* 3. LIKED SONGS                             */
/* ========================================== */
export function getLikedSongs() {
    return getStorage(STORAGE_KEYS.LIKED);
}

export function isSongLiked(videoId) {
    const liked = getLikedSongs();
    return liked.some(song => song.videoId === videoId);
}

export function toggleLike(song) {
    let liked = getLikedSongs();
    const exists = liked.some(s => s.videoId === song.videoId);

    if (exists) {
        liked = liked.filter(s => s.videoId !== song.videoId);
    } else {
        liked.push({
            videoId: song.videoId,
            title: song.title,
            channel: song.channel || 'Unknown',
            thumbnail: song.thumbnail,
            duration: song.duration,
            likedAt: Date.now()
        });
    }

    setStorage(STORAGE_KEYS.LIKED, liked);
    return !exists; // Returns true if the song is now liked, false if unliked
}

/* ========================================== */
/* 4. PLAYLISTS                               */
/* ========================================== */
export function getAllPlaylists() {
    return getStorage(STORAGE_KEYS.PLAYLISTS);
}

export function createPlaylist(name, customCover = null) {
    const playlists = getAllPlaylists();
    const newPlaylist = {
        id: 'pl_' + Date.now(),
        name: name,
        cover: customCover, // Will be null if user did not upload a photo
        songs: [],
        createdAt: Date.now()
    };
    playlists.push(newPlaylist);
    setStorage(STORAGE_KEYS.PLAYLISTS, playlists);
    return newPlaylist;
}

export function deletePlaylist(playlistId) {
    let playlists = getAllPlaylists();
    playlists = playlists.filter(p => p.id !== playlistId);
    setStorage(STORAGE_KEYS.PLAYLISTS, playlists);
}

export function addSongToPlaylist(playlistId, song) {
    const playlists = getAllPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) return false;
    
    // Avoid adding duplicates
    const alreadyExists = playlist.songs.some(s => s.videoId === song.videoId);
    if (alreadyExists) return false;

    playlist.songs.push({
        videoId: song.videoId,
        title: song.title,
        channel: song.channel || 'Unknown',
        thumbnail: song.thumbnail,
        duration: song.duration,
        addedAt: Date.now()
    });

    // If the playlist has no custom cover, generate a 2x2 collage cover from the first 4 songs
    if (!playlist.cover && playlist.songs.length > 0) {
        playlist.cover = generatePlaylistCover(playlist.songs);
    }

    setStorage(STORAGE_KEYS.PLAYLISTS, playlists);
    return true;
}

export function removeSongFromPlaylist(playlistId, videoId) {
    const playlists = getAllPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    
    if (!playlist) return false;

    playlist.songs = playlist.songs.filter(s => s.videoId !== videoId);
    
    // Regenerate the cover based on the new first 4 songs
    if (playlist.songs.length > 0) {
        playlist.cover = generatePlaylistCover(playlist.songs);
    } else {
        playlist.cover = null;
    }

    setStorage(STORAGE_KEYS.PLAYLISTS, playlists);
    return true;
}

// Generates a 2x2 grid of thumbnails for the playlist cover
function generatePlaylistCover(songs) {
    const thumbnails = songs.slice(0, 4).map(s => s.thumbnail);
    
    // If there is only 1 song, just use that thumbnail
    if (thumbnails.length === 1) {
        return { type: 'single', images: thumbnails };
    }
    
    // Otherwise return the collage data
    return { type: 'collage', images: thumbnails };
}

/* ========================================== */
/* 5. DOWNLOADS                               */
/* ========================================== */
export function getDownloadedSongs() {
    return getStorage(STORAGE_KEYS.DOWNLOADS);
}

export function isSongDownloaded(videoId) {
    const downloads = getDownloadedSongs();
    return downloads.some(song => song.videoId === videoId);
}

// This function triggers a browser download of the MP3 file.
// For the APK version, we will later upgrade this to use Capacitor's Filesystem plugin
// so it saves directly into the "BIGMANJ MUSIC HUB" folder on the phone.
export async function downloadSong(song, audioUrl) {
    if (isSongDownloaded(song.videoId)) {
        console.log('Song already downloaded.');
        return false;
    }

    try {
        // Trigger the browser download
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `${song.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
        link.click();

        // Save the metadata to local storage
        const downloads = getDownloadedSongs();
        downloads.push({
            videoId: song.videoId,
            title: song.title,
            channel: song.channel || 'Unknown',
            thumbnail: song.thumbnail,
            duration: song.duration,
            downloadedAt: Date.now()
        });
        setStorage(STORAGE_KEYS.DOWNLOADS, downloads);

        return true;
    } catch (error) {
        console.error('Download failed:', error);
        return false;
    }
}

export function removeDownload(videoId) {
    let downloads = getDownloadedSongs();
    downloads = downloads.filter(s => s.videoId !== videoId);
    setStorage(STORAGE_KEYS.DOWNLOADS, downloads);
}

/* ========================================== */
/* 6. USER PROFILE                            */
/* ========================================== */
export function getUserProfile() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        return null;
    }
}

export function saveUserProfile(profile) {
    // profile object: { name, username, email, avatar }
    try {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
        return true;
    } catch (error) {
        console.error('Error saving profile:', error);
        return false;
    }
}

export function isUserLoggedIn() {
    return getUserProfile() !== null;
}

export function logoutUser() {
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
}