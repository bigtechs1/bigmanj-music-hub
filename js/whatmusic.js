// js/whatmusic.js

import { identifyMusic } from './api.js';

/* ========================================== */
/* 1. INITIALIZE WHATMUSIC UI                 */
/* ========================================== */
export function initWhatMusic() {
    const fileInput = document.getElementById('whatmusic-file-input');
    const uploadButton = document.getElementById('whatmusic-upload-button');
    const resultContainer = document.getElementById('whatmusic-result');
    const statusText = document.getElementById('whatmusic-status');

    if (!fileInput || !uploadButton) return;

    uploadButton.addEventListener('click', () => {
        const file = fileInput.files[0];

        if (!file) {
            statusText.textContent = 'Please select an audio file first.';
            return;
        }

        // Basic validation
        if (!file.type.startsWith('audio/')) {
            statusText.textContent = 'Please select a valid audio file (MP3, WAV, etc.).';
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            statusText.textContent = 'File is too large. Please use a file under 5MB.';
            return;
        }

        // Start the identification process
        processAudioFile(file, statusText, resultContainer);
    });
}

/* ========================================== */
/* 2. PROCESS AUDIO FILE                      */
/* ========================================== */
async function processAudioFile(file, statusText, resultContainer) {
    try {
        // Reset UI
        statusText.textContent = 'Uploading audio file...';
        resultContainer.innerHTML = '';
        resultContainer.classList.add('hidden');

        // Step 1: Upload to a temporary host to get a URL
        const tempUrl = await uploadToTempHost(file);
        
        if (!tempUrl) {
            statusText.textContent = 'Failed to upload audio. Please check your connection.';
            return;
        }

        // Step 2: Send the URL to the identification API
        statusText.textContent = 'Identifying song... This may take a few seconds.';
        const result = await identifyMusic(tempUrl);

        // Step 3: Display the result
        if (!result) {
            statusText.textContent = 'Could not identify the song. Please try again with a clearer clip.';
            return;
        }

        statusText.textContent = 'Match found!';
        renderResult(result, resultContainer);

    } catch (error) {
        console.error('WhatMusic error:', error);
        statusText.textContent = 'An unexpected error occurred. Please try again.';
    }
}

/* ========================================== */
/* 3. TEMPORARY FILE UPLOADER                 */
/* ========================================== */
// This function sends the audio file to a free temporary hosting service (Uguu.se)
// and returns the public URL of the uploaded file.
async function uploadToTempHost(file) {
    const formData = new FormData();
    formData.append('files[]', file);

    try {
        const response = await fetch('https://uguu.se/upload.php', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success && data.files && data.files.length > 0) {
            return data.files[0].url;
        }
        return null;
    } catch (error) {
        console.error('Temporary upload failed:', error);
        return null;
    }
}

/* ========================================== */
/* 4. RENDER RESULT                           */
/* ========================================== */
function renderResult(result, container) {
    container.classList.remove('hidden');

    // Build the streaming links HTML
    let linksHtml = '';
    if (result.links && result.links.length > 0) {
        linksHtml = '<div class="result-links">';
        result.links.forEach(link => {
            let platform = 'Listen';
            if (link.includes('spotify')) platform = 'Spotify';
            if (link.includes('deezer')) platform = 'Deezer';
            
            linksHtml += `<a href="${link}" target="_blank" class="platform-link">${platform}</a>`;
        });
        linksHtml += '</div>';
    }

    // Build the full result card
    container.innerHTML = `
        <div class="result-card">
            <h4>${result.title}</h4>
            <p class="result-artist">${result.artist}</p>
            ${result.release ? `<p class="result-meta">Released: ${result.release}</p>` : ''}
            ${result.score ? `<p class="result-meta">Match Score: ${result.score}%</p>` : ''}
            ${linksHtml}
        </div>
    `;
}