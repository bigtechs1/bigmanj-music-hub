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
import { formatViews, showToast, debounce, escapeHtml, generatePlaylistCollage, formatTime } from './utils.js';

/* ========================================== */
/* APP STATE                                  */
/* ========================================== */
let currentUser = null;
let currentPlaylistContext = [];
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
});

/* ========================================== */
/* 1. AUTHENTICATION                          */
/* ========================================== */
function checkAuth() {
    if (isLoggedIn()) {
        currentUser = getAuthUser(); // Correctly using getAuthUser from auth.js
        document.getElementById('screen-login').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        renderProfile();
        loadHomeFeed();
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
            const result = login(username, password);
            if (result.success) {
                showToast('Welcome back!');
                checkAuth();
            } else {
                showToast(result.message);
            }
        } else {
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
            createBtn.textContent = 'Create Account';
            createBtn.dataset.mode = 'signup';
            toggleBtn.textContent = 'Already have an account? Login';
            nameInput.classList.remove('hidden');
            emailInput.classList.remove('hidden');
            avatarContainer.classList.remove('hidden');
        } else {
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

            // Refresh library when opening it
            if (item.dataset.target === 'library') {
                const activeTab = document.querySelector('.library-tab.active');
                if (activeTab) {
                    const type = activeTab.dataset.tab;
                    const content = document.getElementById('library-content');
                    if (type === 'liked') renderLikedSongs(content);
                    if (type === 'downloaded') renderDownloadedSongs(content);
                    if (type === 'playlists') renderPlaylists(content);
                }
            }
        });
    });
}

/* ========================================== */
/* 3. THEME SWITCHING                         */
/* ========================================== */
function setupTheme() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

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
        if (installContainer) installContainer.classList.remove('hidden');
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    showToast('App installed successfully!');
                    if (installContainer) installContainer.classList.add('hidden');
                }
                deferredPrompt = null;
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installContainer) installContainer.classList.add('hidden');
        showToast('App installed!');
    });
}

/* ========================================== */
/* 5. SEARCH & HOME FEED                      */
/* ========================================== */
function loadHomeFeed() {
    performSearch('Montagem Rabeta');
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    const performSearchDebounced = debounce(async (query) => {
        performSearch(query);
    }, 600);

    searchInput.addEventListener('input', (e) => performSearchDebounced(e.target.value));
}

async function performSearch(query) {
    const songList = document.getElementById('song-list');
    if (!songList) return;

    if (!query.trim()) return;

    songList.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">Searching...</p>';
    const results = await searchMusic(query);
    currentPlaylistContext = results;

    if (results.length === 0) {
        songList.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No results found.</p>';
        return;
    }
    renderSongCards(results, songList, currentPlaylistContext);
}

function renderSongCards(songs, container, playlistContext) {
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
            playSong(song, playlistContext);
        });
        container.appendChild(card);
    });
}

/* ========================================== */
/* 6. PLAYER CONTROLS (Links to player.js)    */
/* ========================================== */
function setupPlayerControls() {
    const closeBtn = document.getElementById('close-player-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('player-screen').classList.remove('open');
        });
    }

    const playPauseBtn = document.getElementById('play-pause-btn');
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            togglePlay();
            const playIcon = document.getElementById('play-icon');
            const pauseIcon = document.getElementById('pause-icon');
            playIcon.classList.toggle('hidden');
            pauseIcon.classList.toggle('hidden');
        });
    }

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.addEventListener('click', nextSong);

    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', prevSong);

    const progressTrack = document.getElementById('progress-track');
    if (progressTrack) {
        progressTrack.addEventListener('click', (e) => {
            const track = e.currentTarget;
            const clickX = e.clientX - track.getBoundingClientRect().left;
            const percentage = (clickX / track.offsetWidth) * 100;
            seekTo(percentage);
        });
    }

    const copyBtn = document.getElementById('copy-lyrics-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const lyricsContent = document.getElementById('lyrics-content').innerText;
            if (lyricsContent) {
                navigator.clipboard.writeText(lyricsContent);
                showToast('Lyrics copied!');
            }
        });
    }
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
}

function renderLikedSongs(container) {
    const liked = getLikedSongs();
    if (liked.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No liked songs yet.</p>';
        return;
    }
    renderSongCards(liked, container, liked);
}

function renderDownloadedSongs(container) {
    const downloads = getDownloadedSongs();
    if (downloads.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No downloaded songs yet.</p>';
        return;
    }
    renderSongCards(downloads, container, downloads);
}

async function renderPlaylists(container) {
    const playlists = getAllPlaylists();
    if (playlists.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); padding: 10px;">No playlists yet.</p>';
        return;
    }

    container.innerHTML = '';

    for (const pl of playlists) {
        const div = document.createElement('div');
        div.className = 'song-card';

        let coverUrl = 'assets/images/default-playlist.png';

        if (pl.cover && pl.cover.type === 'collage') {
            coverUrl = await generatePlaylistCollage(pl.cover.images);
        } else if (pl.cover && pl.cover.type === 'single') {
            coverUrl = pl.cover.images[0];
        } else if (typeof pl.cover === 'string') {
            coverUrl = pl.cover;
        }

        div.innerHTML = `
            <img src="${coverUrl}" alt="${escapeHtml(pl.name)}">
            <h4>${escapeHtml(pl.name)}</h4>
            <p>${pl.songs.length} songs</p>
        `;
        container.appendChild(div);
    }
}

/* ========================================== */
/* 8. PROFILE                                 */
/* ========================================== */
function setupProfile() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
            window.location.reload();
        });
    }
}

function renderProfile() {
    if (!currentUser) return;
    const avatarImg = document.getElementById('profile-avatar');
    if (avatarImg) avatarImg.src = currentUser.avatar || generateDefaultAvatar(currentUser.name);

    const nameEl = document.getElementById('profile-name');
    if (nameEl) nameEl.textContent = currentUser.name;

    const userEl = document.getElementById('profile-username');
    if (userEl) userEl.textContent = '@' + currentUser.username;

    const emailEl = document.getElementById('profile-email');
    if (emailEl) emailEl.textContent = currentUser.email;
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