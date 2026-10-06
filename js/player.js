// js/player.js

import { getAudioUrl, getLyrics } from './api.js';

/* ========================================== */
/* 1. PLAYER STATE & VARIABLES                */
/* ========================================== */
let audio = new Audio();
let currentSong = null;
let currentPlaylist = [];
let currentIndex = 0;
let lyricsData = []; // Array of { time, text } for synced lyrics
let isLyricsVisible = false;

/* ========================================== */
/* 2. INITIALIZE AUDIO EVENTS                 */
/* ========================================== */
audio.addEventListener('timeupdate', () => {
    updateProgressBar();
    syncLyrics(audio.currentTime);
});

audio.addEventListener('ended', () => {
    nextSong();
});

audio.addEventListener('loadedmetadata', () => {
    updateProgressBar();
});

/* ========================================== */
/* 3. PLAY A SONG                             */
/* ========================================== */
export async function playSong(song, playlist = []) {
    currentSong = song;
    currentPlaylist = playlist;
    currentIndex = playlist.findIndex(s => s.videoId === song.videoId);
    
    // Show loading state in UI (we will wire this up later)
    console.log(`Loading: ${song.title}`);

    // Fetch the MP3 URL from our API
    const audioData = await getAudioUrl(song.videoId);
    
    if (!audioData) {
        console.error('Could not load audio for this song.');
        return;
    }

    audio.src = audioData.audioUrl;
    audio.play();

    // Update the UI with the new song info
    updatePlayerUI(song, audioData.audioUrl);

    // Extract colors from the thumbnail for the dynamic background
    extractColors(song.thumbnail);

    // Fetch and display lyrics
    loadLyrics(song.title, song.channel);
}

/* ========================================== */
/* 4. PLAYBACK CONTROLS                       */
/* ========================================== */
export function togglePlay() {
    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
}

export function nextSong() {
    if (currentPlaylist.length > 0) {
        currentIndex = (currentIndex + 1) % currentPlaylist.length;
        playSong(currentPlaylist[currentIndex], currentPlaylist);
    }
}

export function prevSong() {
    if (currentPlaylist.length > 0) {
        currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        playSong(currentPlaylist[currentIndex], currentPlaylist);
    }
}

export function seekTo(percentage) {
    if (audio.duration) {
        audio.currentTime = (percentage / 100) * audio.duration;
    }
}

/* ========================================== */
/* 5. PROGRESS BAR & UI UPDATES               */
/* ========================================== */
function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('total-time');

    if (!progressBar || !audio.duration) return;

    const progress = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = `${progress}%`;

    if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(audio.currentTime);
    }
    if (durationEl) {
        durationEl.textContent = formatTime(audio.duration);
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/* ========================================== */
/* 6. DYNAMIC COLOR EXTRACTION                */
/* ========================================== */
function extractColors(imageUrl) {
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Required for external thumbnails
    img.src = imageUrl;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 1;

        // Draw the image onto a 1x1 canvas to get the average color
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

        // Convert to a CSS gradient color
        const dynamicColor = `rgb(${r}, ${g}, ${b})`;
        
        // Apply the color to the player card background
        const playerCard = document.getElementById('player-card');
        if (playerCard) {
            playerCard.style.background = `linear-gradient(180deg, ${dynamicColor} 0%, var(--bg-primary) 100%)`;
        }
    };
    
    img.onerror = () => {
        console.warn('Could not extract colors from thumbnail.');
    };
}

/* ========================================== */
/* 7. LYRICS LOADING & PARSING                */
/* ========================================== */
async function loadLyrics(songTitle, artistName) {
    // Combine title and artist for a better search query
    const query = `${songTitle} ${artistName || ''}`.trim();
    const lyrics = await getLyrics(query);

    const lyricsCard = document.getElementById('lyrics-card');
    const lyricsContainer = document.getElementById('lyrics-content');

    if (!lyrics || (!lyrics.plain && !lyrics.synced)) {
        // HIDE THE LYRICS CARD IF NO LYRICS FOUND
        if (lyricsCard) lyricsCard.style.display = 'none';
        lyricsData = [];
        return;
    }

    // SHOW THE LYRICS CARD
    if (lyricsCard) lyricsCard.style.display = 'block';

    if (lyrics.synced) {
        lyricsData = parseLRC(lyrics.synced);
        renderSyncedLyrics(lyricsData, lyricsContainer);
    } else {
        // If only plain text is available, just display it without syncing
        lyricsData = [];
        if (lyricsContainer) {
            lyricsContainer.innerHTML = lyrics.plain.replace(/\n/g, '<br>');
        }
    }
}

function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const result = [];
    
    for (const line of lines) {
        // Match standard LRC format: [00:07.32] Lyrics here
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
            const time = parseInt(match[1]) * 60 + parseInt(match[2]) + parseInt(match[3]) / 1000;
            const text = match[4].trim();
            if (text) {
                result.push({ time, text });
            }
        }
    }
    return result.sort((a, b) => a.time - b.time);
}

function renderSyncedLyrics(lyrics, container) {
    if (!container) return;
    container.innerHTML = '';
    
    lyrics.forEach((line, index) => {
        const p = document.createElement('p');
        p.className = 'lyric-line';
        p.dataset.index = index;
        p.textContent = line.text;
        container.appendChild(p);
    });
}

function syncLyrics(currentTime) {
    if (!lyricsData.length) return;

    const lines = document.querySelectorAll('.lyric-line');
    let activeIndex = -1;

    // Find the current line based on time
    for (let i = 0; i < lyricsData.length; i++) {
        if (currentTime >= lyricsData[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }

    if (activeIndex >= 0) {
        lines.forEach((line, index) => {
            line.classList.toggle('active', index === activeIndex);
        });

        // Auto-scroll to the active line
        const activeLine = document.querySelector('.lyric-line.active');
        if (activeLine) {
            activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}