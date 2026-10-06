// js/auth.js

import { getUserProfile, saveUserProfile, isUserLoggedIn, logoutUser } from './library.js';

/* ========================================== */
/* 1. ADMIN CONFIGURATION                     */
/* ========================================== */
// The special admin account. Any user who logs in with this username
// and password gets access to the admin panel (a local-only feature for now).
const ADMIN_CONFIG = {
    username: 'bigmanj',
    password: 'bigmanj-admin-2024' // Change this to your own secret password
};

/* ========================================== */
/* 2. CHECK IF ADMIN                          */
/* ========================================== */
export function isAdmin() {
    const profile = getUserProfile();
    if (!profile) return false;
    return profile.username === ADMIN_CONFIG.username && profile.isAdmin === true;
}

/* ========================================== */
/* 3. CREATE ACCOUNT (First Time Setup)       */
/* ========================================== */
export function createAccount(name, username, email, password, avatarDataUrl = null) {
    // Basic validation
    if (!name || !username || !email || !password) {
        return { success: false, message: 'All fields are required.' };
    }

    if (username.length < 3) {
        return { success: false, message: 'Username must be at least 3 characters.' };
    }

    if (password.length < 4) {
        return { success: false, message: 'Password must be at least 4 characters.' };
    }

    // Check if this is the admin account
    const isAdminAccount = username === ADMIN_CONFIG.username && password === ADMIN_CONFIG.password;

    // Build the user profile object
    const profile = {
        name: name,
        username: username,
        email: email,
        password: password, // NOTE: This is local storage only. Not secure for real servers.
        avatar: avatarDataUrl, // Base64 image data or null
        isAdmin: isAdminAccount,
        createdAt: Date.now()
    };

    const saved = saveUserProfile(profile);
    
    if (saved) {
        return { success: true, message: 'Account created successfully.', profile: profile };
    } else {
        return { success: false, message: 'Failed to save account. Please try again.' };
    }
}

/* ========================================== */
/* 4. LOGIN (Returning User)                  */
/* ========================================== */
export function login(username, password) {
    if (!username || !password) {
        return { success: false, message: 'Please enter username and password.' };
    }

    const profile = getUserProfile();

    if (!profile) {
        return { success: false, message: 'No account found on this device.' };
    }

    if (profile.username !== username || profile.password !== password) {
        return { success: false, message: 'Incorrect username or password.' };
    }

    return { success: true, message: 'Login successful.', profile: profile };
}

/* ========================================== */
/* 5. LOGOUT                                  */
/* ========================================== */
export function logout() {
    logoutUser();
    return true;
}

/* ========================================== */
/* 6. UPDATE PROFILE                          */
/* ========================================== */
export function updateProfile(updates) {
    const profile = getUserProfile();
    if (!profile) return { success: false, message: 'No profile found.' };

    // Merge in the new values
    const updated = { ...profile, ...updates };
    
    // Re-check admin status in case the username was changed
    updated.isAdmin = (updated.username === ADMIN_CONFIG.username);

    const saved = saveUserProfile(updated);
    return saved 
        ? { success: true, message: 'Profile updated.', profile: updated }
        : { success: false, message: 'Failed to update profile.' };
}

/* ========================================== */
/* 7. AVATAR UPLOAD HANDLER                   */
/* ========================================== */
// Converts an uploaded file (from an <input type="file">) to a base64 string
// so it can be stored in localStorage and displayed as the user's avatar.
export function handleAvatarUpload(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject('No file selected.');
            return;
        }

        // Check file size (max 2MB to keep localStorage light)
        if (file.size > 2 * 1024 * 1024) {
            reject('Image is too large. Please use an image under 2MB.');
            return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            reject('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            resolve(event.target.result); // Base64 data URL
        };
        reader.onerror = () => {
            reject('Failed to read the image file.');
        };
        reader.readAsDataURL(file);
    });
}

/* ========================================== */
/* 8. GET CURRENT USER                        */
/* ========================================== */
export function getCurrentUser() {
    return getUserProfile();
}

export function isLoggedIn() {
    return isUserLoggedIn();
}

/* ========================================== */
/* 9. GENERATE AVATAR FALLBACK                */
/* ========================================== */
// If the user does not upload an avatar, we generate a colorful letter avatar
// using their first initial. This is the same approach Spotify uses.
export function generateDefaultAvatar(name) {
    const initial = name ? name.charAt(0).toUpperCase() : 'B';
    
    // Generate a deterministic color based on the letter
    const colors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
    const colorIndex = initial.charCodeAt(0) % colors.length;
    const bgColor = colors[colorIndex];

    // Return an inline SVG as a data URL
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
            <rect width="200" height="200" fill="${bgColor}" />
            <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
                  font-family="Arial, sans-serif" font-size="100" font-weight="bold" fill="#ffffff">
                ${initial}
            </text>
        </svg>
    `;
    
    return 'data:image/svg+xml;base64,' + btoa(svg);
}