// js/utils.js

/* ========================================== */
/* 1. TIME FORMATTING                         */
/* ========================================== */
// Converts seconds (e.g. 142) into a readable time (e.g. "2:22")
export function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Converts a duration string like "2:34" into total seconds (154)
export function durationToSeconds(durationString) {
    if (!durationString || typeof durationString !== 'string') return 0;
    const parts = durationString.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}

/* ========================================== */
/* 2. VIEWS / NUMBERS FORMATTING              */
/* ========================================== */
// Converts raw view counts into short form (e.g. 8436011 becomes "8.4M")
export function formatViews(viewsString) {
    if (!viewsString) return '0';
    
    // Remove commas and non-numeric characters except digits
    const numericValue = parseInt(String(viewsString).replace(/[^0-9]/g, ''));
    if (isNaN(numericValue)) return '0';

    if (numericValue >= 1000000000) return (numericValue / 1000000000).toFixed(1) + 'B';
    if (numericValue >= 1000000) return (numericValue / 1000000).toFixed(1) + 'M';
    if (numericValue >= 1000) return (numericValue / 1000).toFixed(1) + 'K';
    return String(numericValue);
}

/* ========================================== */
/* 3. 2x2 PLAYLIST COVER GENERATOR            */
/* ========================================== */
// Draws a 2x2 grid of the first 4 thumbnails onto a canvas and returns a data URL.
export function generatePlaylistCollage(images) {
    return new Promise((resolve) => {
        const size = 400; // Final cover size in pixels
        const half = size / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Fill with dark grey so there are no blank spots
        ctx.fillStyle = '#181818';
        ctx.fillRect(0, 0, size, size);

        // If no images, return a default grey cover
        if (!images || images.length === 0) {
            resolve(canvas.toDataURL('image/png'));
            return;
        }

        // If only 1 image, fill the whole canvas
        if (images.length === 1) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                ctx.drawImage(img, 0, 0, size, size);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(canvas.toDataURL('image/png'));
            img.src = images[0];
            return;
        }

        // Load all images (max 4)
        const loadedImages = [];
        let loadedCount = 0;
        const maxImages = Math.min(images.length, 4);

        // Positions for 4 quadrants
        const positions = [
            { x: 0, y: 0 },           // Top Left
            { x: half, y: 0 },        // Top Right
            { x: 0, y: half },        // Bottom Left
            { x: half, y: half }      // Bottom Right
        ];

        for (let i = 0; i < maxImages; i++) {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                loadedImages[i] = img;
                loadedCount++;
                if (loadedCount === maxImages) drawAll();
            };
            
            img.onerror = () => {
                loadedCount++;
                if (loadedCount === maxImages) drawAll();
            };
            
            img.src = images[i];
        }

        function drawAll() {
            loadedImages.forEach((img, index) => {
                if (!img) return;
                const pos = positions[index];
                ctx.drawImage(img, pos.x, pos.y, half, half);
            });
            resolve(canvas.toDataURL('image/png'));
        }
    });
}

/* ========================================== */
/* 4. TOAST NOTIFICATIONS                     */
/* ========================================== */
// Shows a small popup message at the bottom of the screen.
export function showToast(message, duration = 2500) {
    // Remove any existing toast
    const existing = document.getElementById('toast-container');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-container';
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    // Animate out and remove
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* ========================================== */
/* 5. DEBOUNCE (For Search Bar)               */
/* ========================================== */
// Prevents the search function from firing on every single keystroke.
export function debounce(func, delay = 500) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/* ========================================== */
/* 6. HTML SANITIZER                          */
/* ========================================== */
// Prevents XSS attacks by escaping any HTML in API responses before rendering.
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/* ========================================== */
/* 7. ONLINE / OFFLINE DETECTION              */
/* ========================================== */
export function isOnline() {
    return navigator.onLine;
}

// Registers callbacks for when the internet drops or comes back.
export function watchConnection(onOnline, onOffline) {
    window.addEventListener('online', () => {
        showToast('Back online');
        if (onOnline) onOnline();
    });
    window.addEventListener('offline', () => {
        showToast('You are offline. Only downloads will play.');
        if (onOffline) onOffline();
    });
}

/* ========================================== */
/* 8. COPY TO CLIPBOARD                       */
/* ========================================== */
// Copies text to the user's clipboard and shows a toast.
export async function copyToClipboard(text, successMessage = 'Copied to clipboard') {
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        showToast(successMessage);
        return true;
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(successMessage);
            return true;
        } catch (fallbackError) {
            showToast('Failed to copy');
            return false;
        } finally {
            textArea.remove();
        }
    }
}

/* ========================================== */
/* 9. UNIQUE ID GENERATOR                     */
/* ========================================== */
export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/* ========================================== */
/* 10. TRUNCATE TEXT                          */
/* ========================================== */
export function truncate(text, maxLength = 30) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength - 3) + '...';
}