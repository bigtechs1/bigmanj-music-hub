// sw.js

const CACHE_NAME = 'bigmanj-music-hub-v1';

// These are the core files that make up the app's "shell".
// We cache them immediately so the app opens instantly and works offline.
const APP_SHELL_FILES = [
    './',
    './index.html',
    './manifest.json',
    './css/theme.css',
    './css/splash.css',
    './css/style.css',
    './js/app.js',
    './js/api.js',
    './js/player.js',
    './js/library.js',
    './js/auth.js',
    './js/whatmusic.js',
    './js/utils.js'
];

// 1. INSTALL EVENT: This runs when the service worker is first registered.
// It opens the cache and saves the app shell files into it.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching app shell');
            return cache.addAll(APP_SHELL_FILES);
        })
    );
    self.skipWaiting(); // Forces the waiting service worker to become active
});

// 2. ACTIVATE EVENT: This runs when the service worker starts up.
// It cleans up old caches if we update the CACHE_NAME later.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Clearing old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // Takes control of all open pages immediately
});

// 3. FETCH EVENT: This runs every time the app tries to load a file.
// We use a "Cache First, Network Fallback" strategy.
self.addEventListener('fetch', (event) => {
    // Only handle GET requests. Ignore POST requests (like the WhatMusic upload).
    if (event.request.method !== 'GET') return;

    // Ignore API calls and audio streams. We want those to always hit the network directly.
    if (event.request.url.includes('api.') || event.request.url.includes('zellrayy') || event.request.url.includes('.mp3')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // If the file is in our cache, serve it.
            if (cachedResponse) {
                return cachedResponse;
            }
            // If not, fetch it from the network.
            return fetch(event.request);
        })
    );
});