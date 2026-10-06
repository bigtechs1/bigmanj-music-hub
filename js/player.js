// js/player.js
import { getAudioUrl, getLyrics } from './api2.js';

let audio = new Audio();
let currentSong = null;
let currentPlaylist = [];
let currentIndex = 0;
let lyricsData = [];
let isLyricsVisible = false;

audio.addEventListener('timeupdate', () => { updateProgressBar(); syncLyrics(audio.currentTime); });
audio.addEventListener('ended', () => { nextSong(); });
audio.addEventListener('loadedmetadata', () => { updateProgressBar(); });

export async function playSong(song, playlist = []) {
    currentSong = song;
    currentPlaylist = playlist;
    currentIndex = playlist.findIndex(s => s.videoId === song.videoId);
    const audioData = await getAudioUrl(song.videoId);
    if (!audioData) { console.error('Could not load audio.'); return; }
    audio.src = audioData.audioUrl;
    audio.play();
    updatePlayerUI(song, audioData.audioUrl);
    extractColors(song.thumbnail);
    loadLyrics(song.title, song.channel);
}

export function togglePlay() { if (audio.paused) audio.play(); else audio.pause(); }
export function nextSong() { if (currentPlaylist.length > 0) { currentIndex = (currentIndex + 1) % currentPlaylist.length; playSong(currentPlaylist[currentIndex], currentPlaylist); } }
export function prevSong() { if (currentPlaylist.length > 0) { currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length; playSong(currentPlaylist[currentIndex], currentPlaylist); } }
export function seekTo(percentage) { if (audio.duration) audio.currentTime = (percentage / 100) * audio.duration; }

function updateProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('total-time');
    if (!progressBar || !audio.duration) return;
    progressBar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
    if (durationEl) durationEl.textContent = formatTime(audio.duration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
}

function extractColors(imageUrl) {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1; canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const playerCard = document.getElementById('player-card');
        if (playerCard) playerCard.style.background = `linear-gradient(180deg, rgb(${r}, ${g}, ${b}) 0%, var(--bg-primary) 100%)`;
    };
}

async function loadLyrics(songTitle, artistName) {
    const query = `${songTitle} ${artistName || ''}`.trim();
    const lyrics = await getLyrics(query);
    const lyricsCard = document.getElementById('lyrics-card');
    const lyricsContainer = document.getElementById('lyrics-content');
    if (!lyrics || (!lyrics.plain && !lyrics.synced)) {
        if (lyricsCard) lyricsCard.style.display = 'none';
        lyricsData = []; return;
    }
    if (lyricsCard) lyricsCard.style.display = 'block';
    if (lyrics.synced) {
        lyricsData = parseLRC(lyrics.synced);
        renderSyncedLyrics(lyricsData, lyricsContainer);
    } else {
        lyricsData = [];
        if (lyricsContainer) lyricsContainer.innerHTML = lyrics.plain.replace(/\n/g, '<br>');
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
            if (text) result.push({ time, text });
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
        if (currentTime >= lyricsData[i].time) activeIndex = i;
        else break;
    }
    if (activeIndex >= 0) {
        lines.forEach((line, index) => line.classList.toggle('active', index === activeIndex));
        const activeLine = document.querySelector('.lyric-line.active');
        if (activeLine) activeLine.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}