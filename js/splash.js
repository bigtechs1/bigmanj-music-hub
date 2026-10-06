// js/splash.js

export function initSplash() {
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app-container');

    if (!splashScreen || !appContainer) return;

    // Wait for 2.5 seconds, then fade out the splash screen
    setTimeout(() => {
        splashScreen.classList.add('fade-out');
        appContainer.classList.remove('hidden');

        // Remove the splash from the DOM after the fade-out is complete
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 600);
    }, 2500);
}