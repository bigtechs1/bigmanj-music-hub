// js/app.js

import { initSplash } from './splash.js';
import { searchMusic } from './api.js';
import { playSong, togglePlay, nextSong, prevSong, seekTo } from './player.js';
import { 
    getLikedSongs, 
    toggleLike, 
    isSongLiked, 
    getDownloadedSongs, 
    isSongDownloaded, 
    downloadSong, 
    getAllPlaylists, 
    getCurrentUser, 
    logoutUser 
} from './library.js';
import { 
    isLoggedIn, 
    createAccount, 
    login, 
    logout, 
    getCurrentUser as getAuthUser, 
    handleAvatarUpload, 
    generateDefaultAvatar 
} from './auth.js';
import { initWhatMusic } from './whatmusic.js';
import { formatViews, showToast, debounce, escapeHtml } from './utils.js';

/* ========================================== */
/* APP STATE                                  */
/* ========================================== */
let currentUser = null;
let currentPlaylist = [];
let tempAvatarBase64 = null;
let deferredPrompt = null;

/* ========================================== */
/* INITIALIZATION                             */
/* ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    initSplash();
    checkAuth();
    setupNavigation();
    setupTheme();
    setupPWA();
    setupSearch();
    setupLibrary();
    setupProfile();
    setupPlayerControls();
    setupLoginForm();
    initWhatMusic();
    registerServiceWorker();

    // Listen for song changes from player.js
    document.addEventListener('songLoaded', (e) => {
        const { song } = e.detail;
        updatePlayerUI(song);
    });

    // Listen for time updates from player.js
    document.addEventListener('timeUpdate', (e) => {
        updateProgressBar(e.detail.currentTime, e.detail.duration);
    });
});

/* ========================================== */
/* 1. AUTHENTICATION                          */
/* ========================================== */
function checkAuth() {
    if (isLoggedIn()) {
        currentUser = getAuthUser();
        document.getElementById('screen-login').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        renderProfile();
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
    
    // Handle avatar upload preview
    avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                tempAvatarBase64 = await handleAvatarUpload(file);
                avatarLabel.textContent = 'Photo Selected';
                avatarLabel.style.color = 'var(--accent-color)';
            } catch (error) {
                showToast(error);
            }
        }
    });

    // Handle Create Account / Login
    createBtn.addEventListener('click', () => {
        const name = document.getElementById('signup-name').value.trim();
        const username = document.getElementById('signup-username').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;

        if (createBtn.dataset.mode === 'login') {
            // LOGIN MODE
            const result = login(username, password);
            if (result.success) {
                showToast('Welcome back!');
                checkAuth();
            } else {
                showToast(result.message);
            }
        } else {
            // SIGNUP MODE
            const result = createAccount(name, username, email, password, tempAvatarBase64);
            if (result.success) {
                showToast('Account created!');
                checkAuth();
            } else {
                showToast(result.message);
            }
        }
    });

    // Toggle between Login and Signup
    toggleBtn.addEventListener('click', () => {
        const isLoginMode = createBtn.dataset.mode === 'login';
        const nameInput = document.getElementById('signup-name');
        const emailInput = document.getElementById('signup-email');
        const avatarContainer = document.querySelector('.avatar-upload-label');

        if (isLoginMode) {
            // Switch to Signup
            createBtn.textContent = 'Create Account';
            createBtn.dataset.mode = 'signup';
            toggleBtn.textContent = 'Already have an account? Login';
            nameInput.classList.remove('hidden');
            emailInput.classList.remove('hidden');
            avatarContainer.classList.remove('hidden');
        } else {
            // Switch to Login
            createBtn.textContent = 'Login';
            createBtn.dataset.mode = 'login';
            toggleBtn.textContent = 'Need an account? Sign Up';
            nameInput.classList.add('hidden');
            emailInput.classList.add('hidden');
            avatarContainer.classList.add('hidden');
        }
    });
}

/* ========================================== */
/* 2. NAVIGATION                              */
/* ========================================== */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            screens.forEach(screen => screen.classList.remove('active'));
            
            const targetId = 'screen-' + item.dataset.target;
            const targetScreen = document.getElementById(targetId);
            if (targetScreen) targetScreen.classList.add('active');
        });
    });
}

/* ========================================== */
/* 3. THEME SWITCHING                         */
/* ========================================== */
function setupTheme() {
    const themeSelect = document.getElementById('theme-select');
    
    // Load saved theme
    const savedTheme = localStorage.getItem('bigmanj-theme') || 'system';
    applyTheme(savedTheme);
    themeSelect.value = savedTheme;

    themeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });
}

function applyTheme(theme) {
    if (theme === 'system') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem('bigmanj-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('bigmanj-theme', theme);
    }
}

/* ========================================== */
/* 4. PWA INSTALL                             */
/* ========================================== */
function setupPWA() {
    const installBtn = document.getElementById('install-app-btn');
    const installContainer = document.getElementById('install-app-container');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installContainer.classList.remove('hidden');
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                showToast('App installed successfully!');
                installContainer.classList.add('hidden');
            }
            deferredPrompt = null;
        }
    });

    window.addEventListener('appinstalled', () => {
        installContainer.classList.add('hidden');
        showToast('App installed!');
    });
}

/* ========================================== */
/* 5. SEARCH                                  */
/* ========================================== */
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const songList = document.getElementById('song-list');

    const performSearch = debounce(async (query) => {
        if (!query.trim()) return;
        
        songList.innerHTML = '<p style="color: var(--text-secondary);">Searching...</p>';
        const results = await searchMusic(query);
        currentPlaylist = results;
        
        if (results.length === 0) {
            songList.innerHTML = '<p style="color: var(--text-secondary);">No results found.</p>';
            return;
        }
        renderSongCards(results, songList);
    }, 600);

    searchInput.addEventListener('input', (e) => performSearch(e.target.value));
}

function renderSongCards(songs, container) {
    container.innerHTML = '';
    songs.forEach(song => {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.innerHTML = `
            <img src="${song.thumbnail}" alt="${escapeHtml(song.title)}">
            <h4>${escapeHtml(song.title)}</h4>
            <p>${escapeHtml(song.channel || 'Unknown')}</p>
        `;
        card.addEventListener('click', () => {
            playSong(song, currentPlaylist);
        });
        container.appendChild(card);
    });
}

/* ========================================== */
/* 6. PLAYER UI                              */
/* ========================================== */
function setupPlayerControls() {
    document.getElementById('close-player-btn').addEventListener('click', () => {
        document.getElementById('player-screen').classList.remove('open');
    });

    document.getElementById('play-pause-btn').addEventListener('click', () => {
        togglePlay();
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        playIcon.classList.toggle('hidden');
        pauseIcon.classList.toggle('hidden');
    });

    document.getElementById('next-btn').addEventListener('click', nextSong);
    document.getElementById('prev-btn').addEventListener('click', prevSong);

    document.getElementById('progress-track').addEventListener('click', (e) => {
        const track = e.currentTarget;
        const clickX = e.clientX - track.getBoundingClientRect().left;
        const percentage = (clickX / track.offsetWidth) * 100;
        seekTo(percentage);
    });

    document.getElementById('copy-lyrics-btn').addEventListener('click', () => {
        const lyricsContent = document.getElementById('lyrics-content').innerText;
        if (lyricsContent) {
            navigator.clipboard.writeText(lyricsContent);
            showToast('Lyrics copied!');
        }
    });
}

function updatePlayerUI(song) {
    document.getElementById('player-art').src = song.thumbnail;
    document.getElementById('player-title').textContent = song.title;
    document.getElementById('player-artist').textContent = song.channel || 'Unknown';
    document.getElementById('player-screen').classList.add('open');
    document.getElementById('play-icon').classList.add('hidden');
    document.getElementById('pause-icon').classList.remove('hidden');
}

function updateProgressBar(currentTime, duration) {
    if (!duration) return;
    const progress = (currentTime / duration) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('current-time').textContent = formatTime(currentTime);
    document.getElementById('total-time').textContent = formatTime(duration);
}

/* ========================================== */
/* 7. LIBRARY                                 */
/* ========================================== */
function setupLibrary() {
    const tabs = document.querySelectorAll('.library-tab');
    const content = document.getElementById('library-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const type = tab.dataset.tab;
            if (type === 'liked') renderLikedSongs(content);
            if (type === 'downloaded') renderDownloadedSongs(content);
            if (type === 'playlists') renderPlaylists(content);
        });
    });

    // Render liked songs by default
    renderLikedSongs(content);
}

function renderLikedSongs(container) {
    const liked = getLikedSongs();
    if (liked.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No liked songs yet.</p>';
        return;
    }
    renderSongCards(liked, container);
}

function renderDownloadedSongs(container) {
    const downloads = getDownloadedSongs();
    if (downloads.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No downloaded songs yet.</p>';
        return;
    }
    renderSongCards(downloads, container);
}

function renderPlaylists(container) {
    const playlists = getAllPlaylists();
    if (playlists.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No playlists yet.</p>';
        return;
    }
    container.innerHTML = '';
    playlists.forEach(pl => {
        const div = document.createElement('div');
        div.className = 'song-card';
        div.innerHTML = `
            <img src="${pl.cover || 'assets/images/default-playlist.png'}" alt="${escapeHtml(pl.name)}">
            <h4>${escapeHtml(pl.name)}</h4>
            <p>${pl.songs.length} songs</p>
        `;
        container.appendChild(div);
    });
}

/* ========================================== */
/* 8. PROFILE                                 */
/* ========================================== */
function setupProfile() {
    document.getElementById('logout-btn').addEventListener('click', () => {
        logout();
        window.location.reload();
    });
}

function renderProfile() {
    if (!currentUser) return;
    document.getElementById('profile-avatar').src = currentUser.avatar || generateDefaultAvatar(currentUser.name);
    document.getElementById('profile-name').textContent = currentUser.name;
    document.getElementById('profile-username').textContent = '@' + currentUser.username;
    document.getElementById('profile-email').textContent = currentUser.email;
}

/* ========================================== */
/* 9. SERVICE WORKER                          */
/* ========================================== */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(() => console.log('ServiceWorker registered'))
                .catch(err => console.log('ServiceWorker registration failed:', err));
        });
    }
}