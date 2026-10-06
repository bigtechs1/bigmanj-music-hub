// js/app.js
import { initSplash } from './splash.js';
import { searchMusic, getLyrics } from './api2.js';
import { playSong, togglePlay, nextSong, prevSong, seekTo } from './player.js';
import { getLikedSongs, toggleLike, isSongLiked, getDownloadedSongs, isSongDownloaded, downloadSong, getAllPlaylists, logoutUser } from './library.js';
import { isLoggedIn, createAccount, login, logout, getCurrentUser as getAuthUser, handleAvatarUpload, generateDefaultAvatar } from './auth.js';
import { initWhatMusic } from './whatmusic.js';
import { showToast, debounce, escapeHtml, generatePlaylistCollage } from './utils.js';

let currentUser = null;
let currentPlaylistContext = [];
let tempAvatarBase64 = null;
let deferredPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
    initSplash(); checkAuth(); setupNavigation(); setupTheme(); setupPWA();
    setupSearch(); setupLibrary(); setupProfile(); setupPlayerControls(); setupLoginForm(); initWhatMusic();
});

function checkAuth() {
    if (isLoggedIn()) {
        currentUser = getAuthUser();
        document.getElementById('screen-login').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        renderProfile(); loadHomeFeed();
    } else {
        document.getElementById('screen-login').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    }
}

function setupLoginForm() {
    const avatarInput = document.getElementById('signup-avatar');
    const avatarLabel = document.getElementById('avatar-label-text');
    const createBtn = document.getElementById('create-account-btn');
    const toggleBtn = document.getElementById('login-toggle-btn');
    if (!avatarInput || !createBtn) return;
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) { try { tempAvatarBase64 = await handleAvatarUpload(file); avatarLabel.textContent = 'Photo Selected'; avatarLabel.style.color = 'var(--accent-color)'; } catch (error) { showToast(error); } }
    });
    createBtn.addEventListener('click', () => {
        const name = document.getElementById('signup-name').value.trim();
        const username = document.getElementById('signup-username').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        if (createBtn.dataset.mode === 'login') {
            const result = login(username, password);
            if (result.success) { showToast('Welcome back!'); checkAuth(); } else { showToast(result.message); }
        } else {
            const result = createAccount(name, username, email, password, tempAvatarBase64);
            if (result.success) { showToast('Account created!'); checkAuth(); } else { showToast(result.message); }
        }
    });
    toggleBtn.addEventListener('click', () => {
        const isLoginMode = createBtn.dataset.mode === 'login';
        const nameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');
        const avatarContainer = document.querySelector('.avatar-upload-label');
        if (isLoginMode) {
            createBtn.textContent = 'Create Account'; createBtn.dataset.mode = 'signup';
            toggleBtn.textContent = 'Already have an account? Login';
            nameInput.classList.remove('hidden'); emailInput.classList.remove('hidden'); avatarContainer.classList.remove('hidden');
        } else {
            createBtn.textContent = 'Login'; createBtn.dataset.mode = 'login';
            toggleBtn.textContent = 'Need an account? Sign Up';
            nameInput.classList.add('hidden'); emailInput.classList.add('hidden'); avatarContainer.classList.add('hidden');
        }
    });
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active')); item.classList.add('active');
            screens.forEach(screen => screen.classList.remove('active'));
            const targetId = 'screen-' + item.dataset.target;
            const targetScreen = document.getElementById(targetId);
            if (targetScreen) targetScreen.classList.add('active');
            if (item.dataset.target === 'library') {
                const activeTab = document.querySelector('.library-tab.active');
                if (activeTab) { const type = activeTab.dataset.tab; const content = document.getElementById('library-content'); if (type === 'liked') renderLikedSongs(content); if (type === 'downloaded') renderDownloadedSongs(content); if (type === 'playlists') renderPlaylists(content); }
            }
        });
    });
}

function setupTheme() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;
    const savedTheme = localStorage.getItem('bigmanj-theme') || 'system';
    applyTheme(savedTheme); themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', (e) => { applyTheme(e.target.value); });
}
function applyTheme(theme) {
    if (theme === 'system') { document.documentElement.removeAttribute('data-theme'); localStorage.removeItem('bigmanj-theme'); }
    else { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('bigmanj-theme', theme); }
}

function setupPWA() {
    const installBtn = document.getElementById('install-app-btn');
    const installContainer = document.getElementById('install-app-container');
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (installContainer) installContainer.classList.remove('hidden'); });
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') { showToast('App installed successfully!'); if (installContainer) installContainer.classList.add('hidden'); } deferredPrompt = null; }
        });
    }
    window.addEventListener('appinstalled', () => { if (installContainer) installContainer.classList.add('hidden'); showToast('App installed!'); });
}

function loadHomeFeed() { performSearch('Montagem Rabeta'); }
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const searchTabs = document.querySelectorAll('.search-tab');
    if (!searchInput) return;
    
    let currentSearchMode = 'songs';

    searchTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            searchTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentSearchMode = tab.dataset.search;
            const query = searchInput.value.trim();
            if (query) performSearch(query, currentSearchMode);
        });
    });

    const performSearchDebounced = debounce(async (query) => { performSearch(query, currentSearchMode); }, 600);
    searchInput.addEventListener('input', (e) => performSearchDebounced(e.target.value));
}

async function performSearch(query, mode = 'songs') {
    const resultsContainer = document.getElementById('search-results');
    const homeContainer = document.getElementById('home-song-list');
    const targetContainer = mode === 'songs' ? resultsContainer : homeContainer; // Logic handles both
    if (!targetContainer) return;
    if (!query.trim()) return;
    
    targetContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">Searching...</p>';
    
    if (mode === 'lyrics') {
        const lyricsResult = await getLyrics(query);
        if (!lyricsResult || (!lyricsResult.plain && !lyricsResult.synced)) {
            targetContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No lyrics found.</p>';
            return;
        }
        const lyricsText = lyricsResult.plain || lyricsResult.synced;
        targetContainer.innerHTML = `
            <div style="padding: 16px; background: var(--bg-card); border-radius: 8px;">
                <h3 style="margin-bottom: 8px; font-size: 1.1rem;">${escapeHtml(lyricsResult.title)}</h3>
                <p style="color: var(--accent-color); margin-bottom: 16px; font-size: 0.9rem;">${escapeHtml(lyricsResult.artist)}</p>
                <div style="white-space: pre-wrap; line-height: 1.6; color: var(--text-primary); font-size: 0.9rem;">${escapeHtml(lyricsText)}</div>
            </div>
        `;
        return;
    }

    const results = await searchMusic(query);
    currentPlaylistContext = results;
    
    if (results.length === 0) {
        targetContainer.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No results found.</p>';
        return;
    }
    renderSongList(results, targetContainer, currentPlaylistContext);
}

function renderSongList(songs, container, playlistContext) {
    container.innerHTML = '';
    songs.forEach(song => {
        const item = document.createElement('div');
        item.className = 'song-item';
        
        const isLiked = isSongLiked(song.videoId);
        const isDownloaded = isSongDownloaded(song.videoId);
        
        item.innerHTML = `
            <img src="${song.thumbnail}" alt="${escapeHtml(song.title)}">
            <div class="song-item-info">
                <h4>${escapeHtml(song.title)}</h4>
                <p>${escapeHtml(song.channel || 'Unknown')}</p>
            </div>
            <div class="song-item-actions">
                <button class="like-btn ${isLiked ? 'liked' : ''}" data-id="${song.videoId}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
                <button class="download-btn ${isDownloaded ? 'downloaded' : ''}" data-id="${song.videoId}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                </button>
            </div>
        `;
        
        item.addEventListener('click', (e) => {
            if (e.target.closest('.like-btn') || e.target.closest('.download-btn')) return;
            playSong(song, playlistContext);
        });
        
        item.querySelector('.like-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const liked = toggleLike(song);
            const btn = e.currentTarget;
            btn.classList.toggle('liked', liked);
            btn.querySelector('svg').setAttribute('fill', liked ? 'currentColor' : 'none');
            showToast(liked ? 'Added to Liked' : 'Removed from Liked');
        });
        
        item.querySelector('.download-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (isSongDownloaded(song.videoId)) { showToast('Already downloaded'); return; }
            showToast('Downloading...');
            const audioData = await getAudioUrl(song.videoId);
            if (audioData) {
                await downloadSong(song, audioData.audioUrl);
                const btn = e.currentTarget;
                btn.classList.add('downloaded');
                showToast('Download complete!');
            } else {
                showToast('Download failed.');
            }
        });
        
        container.appendChild(item);
    });
}

function setupPlayerControls() {
    const closeBtn = document.getElementById('close-player-btn');
    if (closeBtn) { closeBtn.addEventListener('click', () => { document.getElementById('player-screen').classList.remove('open'); }); }
    
    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) { playPauseBtn.addEventListener('click', () => { togglePlay(); const playIcon = document.getElementById('play-icon'); const pauseIcon = document.getElementById('pause-icon'); playIcon.classList.toggle('hidden'); pauseIcon.classList.toggle('hidden'); }); }
    
    const nextBtn = document.getElementById('next-btn'); if (nextBtn) nextBtn.addEventListener('click', nextSong);
    const prevBtn = document.getElementById('prev-btn'); if (prevBtn) prevBtn.addEventListener('click', prevSong);
    
    const progressTrack = document.getElementById('progress-track');
    if (progressTrack) { progressTrack.addEventListener('click', (e) => { const track = e.currentTarget; const clickX = e.clientX - track.getBoundingClientRect().left; const percentage = (clickX / track.offsetWidth) * 100; seekTo(percentage); }); }
    
    const openLyricsBtn = document.getElementById('open-lyrics-btn');
    if (openLyricsBtn) {
        openLyricsBtn.addEventListener('click', () => {
            document.getElementById('lyrics-overlay').classList.remove('hidden');
        });
    }
    
    const closeLyricsBtn = document.getElementById('close-lyrics-btn');
    if (closeLyricsBtn) {
        closeLyricsBtn.addEventListener('click', () => {
            document.getElementById('lyrics-overlay').classList.add('hidden');
        });
    }
    
    const copyLyricsBtn = document.getElementById('copy-lyrics-btn');
    if (copyLyricsBtn) {
        copyLyricsBtn.addEventListener('click', () => {
            const lyricsContent = document.getElementById('lyrics-content').innerText;
            if (lyricsContent) { navigator.clipboard.writeText(lyricsContent); showToast('Lyrics copied!'); }
        });
    }

    const playerLikeBtn = document.getElementById('player-like-btn');
    if (playerLikeBtn) {
        playerLikeBtn.addEventListener('click', () => {
            // This will be updated dynamically when a song plays
            showToast('Like feature coming soon');
        });
    }
    
    const playerDownloadBtn = document.getElementById('player-download-btn');
    if (playerDownloadBtn) {
        playerDownloadBtn.addEventListener('click', () => {
            showToast('Download feature coming soon');
        });
    }
}

function setupLibrary() {
    const tabs = document.querySelectorAll('.library-tab');
    const content = document.getElementById('library-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active')); tab.classList.add('active');
            const type = tab.dataset.tab;
            if (type === 'liked') renderLikedSongs(content);
            if (type === 'downloaded') renderDownloadedSongs(content);
            if (type === 'playlists') renderPlaylists(content);
        });
    });
}
function renderLikedSongs(container) {
    const liked = getLikedSongs();
    if (liked.length === 0) { container.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No liked songs yet.</p>'; return; }
    renderSongList(liked, container, liked);
}
function renderDownloadedSongs(container) {
    const downloads = getDownloadedSongs();
    if (downloads.length === 0) { container.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No downloaded songs yet.</p>'; return; }
    renderSongList(downloads, container, downloads);
}
async function renderPlaylists(container) {
    const playlists = getAllPlaylists();
    if (playlists.length === 0) { container.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No playlists yet.</p>'; return; }
    container.innerHTML = '';
    for (const pl of playlists) {
        const div = document.createElement('div'); div.className = 'song-item';
        let coverUrl = 'assets/images/default-playlist.png';
        if (pl.cover && pl.cover.type === 'collage') { coverUrl = await generatePlaylistCollage(pl.cover.images); }
        else if (pl.cover && pl.cover.type === 'single') { coverUrl = pl.cover.images[0]; }
        else if (typeof pl.cover === 'string') { coverUrl = pl.cover; }
        div.innerHTML = `<img src="${coverUrl}" alt="${escapeHtml(pl.name)}"><div class="song-item-info"><h4>${escapeHtml(pl.name)}</h4><p>${pl.songs.length} songs</p></div>`;
        container.appendChild(div);
    }
}

function setupProfile() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) { logoutBtn.addEventListener('click', () => { logout(); window.location.reload(); }); }
}
function renderProfile() {
    if (!currentUser) return;
    const avatarImg = document.getElementById('profile-avatar');
    if (avatarImg) avatarImg.src = currentUser.avatar || generateDefaultAvatar(currentUser.name);
    const nameEl = document.getElementById('profile-name'); if (nameEl) nameEl.textContent = currentUser.name;
    const userEl = document.getElementById('profile-username'); if (userEl) userEl.textContent = '@' + currentUser.username;
    const emailEl = document.getElementById('profile-email'); if (emailEl) emailEl.textContent = currentUser.email;
}