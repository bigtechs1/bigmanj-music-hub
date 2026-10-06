// js/player.js
import { getAudioUrl, getLyrics } from './api2.js';
import { isSongLiked, toggleLike, isSongDownloaded, downloadSong } from './library.js';
import { formatTime, showToast, escapeHtml } from './utils.js';

let audio = new Audio();
let currentSong = null;
let currentPlaylist = [];
let currentIndex = 0;
let lyricsData = [];

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
/* PLAY A SONG                                */
/* ========================================== */
export async function playSong(song, playlist = []) {
    currentSong = song;
    currentPlaylist = playlist;
    currentIndex = playlist.findIndex(s => s.videoId === song.videoId);
    
    console.log(`Loading: ${song.title}`);

    const audioData = await getAudioUrl(song.videoId);
    
    if (!audioData) {
        showToast('Could not load audio for this song.');
        return;
    }

    audio.src = audioData.audioUrl;
    audio.play();

    updatePlayerUI(song);
    extractColors(song.thumbnail);
    loadLyrics(song.title, song.channel);
}

/* ========================================== */
/* PLAYBACK CONTROLS                          */
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
/* PROGRESS BAR & UI UPDATES                  */
/* ========================================== */
function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('total-time');

    if (!progressBar || !audio.duration) return;

    const progress = (audio.currentTime / audio.duration) * 100;
    progressBar.style.width = `${progress}%`;

    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
}

function updatePlayerUI(song) {
    const art = document.getElementById('player-art');
    const title = document.getElementById('player-title');
    const artist = document.getElementById('player-artist');
    
    if (art) art.src = song.thumbnail;
    if (title) title.textContent = song.title;
    if (artist) artist.textContent = song.channel || 'Unknown';
    
    const screen = document.getElementById('player-screen');
    if (screen) screen.classList.add('open');
    
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    if (playIcon) playIcon.classList.add('hidden');
    if (pauseIcon) pauseIcon.classList.remove('hidden');

    // Update Like Button
    const likeBtn = document.getElementById('player-like-btn');
    if (likeBtn) {
        const isLiked = isSongLiked(song.videoId);
        likeBtn.classList.toggle('liked', isLiked);
        likeBtn.querySelector('svg').setAttribute('fill', isLiked ? 'currentColor' : 'none');
        
        // Remove old listener by cloning the button, then add new one
        const newLikeBtn = likeBtn.cloneNode(true);
        likeBtn.parentNode.replaceChild(newLikeBtn, likeBtn);
        newLikeBtn.addEventListener('click', () => {
            const liked = toggleLike(song);
            newLikeBtn.classList.toggle('liked', liked);
            newLikeBtn.querySelector('svg').setAttribute('fill', liked ? 'currentColor' : 'none');
            showToast(liked ? 'Added to Liked' : 'Removed from Liked');
        });
    }

    // Update Download Button
    const downloadBtn = document.getElementById('player-download-btn');
    if (downloadBtn) {
        const isDownloaded = isSongDownloaded(song.videoId);
        downloadBtn.classList.toggle('downloaded', isDownloaded);
        
        // Remove old listener by cloning the button, then add new one
        const newDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
        newDownloadBtn.addEventListener('click', async () => {
            if (isSongDownloaded(song.videoId)) { 
                showToast('Already downloaded'); 
                return; 
            }
            showToast('Downloading...');
            const audioData = await getAudioUrl(song.videoId);
            if (audioData) {
                await downloadSong(song, audioData.audioUrl);
                newDownloadBtn.classList.add('downloaded');
                showToast('Download complete!');
            } else {
                showToast('Download failed.');
            }
        });
    }
}

/* ========================================== */
/* DYNAMIC COLOR EXTRACTION                   */
/* ========================================== */
function extractColors(imageUrl) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 1;

        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

        const dynamicColor = `rgb(${r}, ${g}, ${b})`;
        const playerCard = document.getElementById('player-card');
        if (playerCard) {
            playerCard.style.background = `linear-gradient(180deg, ${dynamicColor} 0%, var(--bg-primary) 100%)`;
        }
    };
}

/* ========================================== */
/* LYRICS LOADING & PARSING                   */
/* ========================================== */
async function loadLyrics(songTitle, artistName) {
    const query = `${songTitle} ${artistName || ''}`.trim();
    const lyrics = await getLyrics(query);

    const lyricsOverlay = document.getElementById('lyrics-overlay');
    const lyricsContainer = document.getElementById('lyrics-content');

    if (!lyrics || (!lyrics.plain && !lyrics.synced)) {
        // Hide the lyrics button entirely if no lyrics are found
        const openLyricsBtn = document.getElementById('open-lyrics-btn');
        if (openLyricsBtn) openLyricsBtn.style.display = 'none';
        lyricsData = [];
        return;
    }

    // Show the lyrics button
    const openLyricsBtn = document.getElementById('open-lyrics-btn');
    if (openLyricsBtn) openLyricsBtn.style.display = 'block';

    if (lyrics.synced) {
        lyricsData = parseLRC(lyrics.synced);
        renderSyncedLyrics(lyricsData, lyricsContainer);
    } else {
        lyricsData = [];
        if (lyricsContainer) {
            lyricsContainer.innerHTML = escapeHtml(lyrics.plain).replace(/\n/g, '<br>');
        }
    }
}

function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const result = [];
    
    for (const line of lines) {
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

        const activeLine = document.querySelector('.lyric-line.active');
        if (activeLine) {
            activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}