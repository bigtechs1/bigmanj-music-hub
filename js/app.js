// js/app.js

document.addEventListener('DOMContentLoaded', () => {

    /* ========================================== */
    /* 1. SPLASH SCREEN LOGIC                     */
    /* ========================================== */
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app-container');

    // Wait for 2.5 seconds, then fade out the splash screen
    setTimeout(() => {
        splashScreen.classList.add('fade-out');
        appContainer.classList.remove('hidden');

        // After the fade-out transition is completely done, remove the splash from the DOM
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 600);
    }, 2500);


    /* ========================================== */
    /* 2. BOTTOM NAVIGATION LOGIC                 */
    /* ========================================== */
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove 'active' class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add 'active' class to the clicked nav item
            item.classList.add('active');

            // Hide all screens
            screens.forEach(screen => screen.classList.remove('active'));

            // Find the target screen id based on the data-target attribute
            const targetId = 'screen-' + item.dataset.target;
            const targetScreen = document.getElementById(targetId);
            
            if (targetScreen) {
                targetScreen.classList.add('active');
            }
        });
    });


    /* ========================================== */
    /* 3. THEME SWITCHING LOGIC                   */
    /* ========================================== */
    // This function applies the theme and saves the preference
    function applyTheme(theme) {
        if (theme === 'system') {
            // Remove the data-theme attribute so the CSS media query takes over
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem('bigmanj-theme');
        } else {
            // Set the data-theme attribute to 'light' or 'dark'
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('bigmanj-theme', theme);
        }
    }

    // Check if the user has saved a theme preference previously
    const savedTheme = localStorage.getItem('bigmanj-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Default to 'system' if they haven't chosen one yet
        applyTheme('system');
    }

    // We will expose this function globally so the Settings/Profile page can call it later
    window.setAppTheme = applyTheme;


    /* ========================================== */
    /* 4. "INSTALL APP" PWA LOGIC                 */
    /* ========================================== */
    let deferredPrompt;

    // Listen for the browser's install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the default mini-infobar from appearing on mobile
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        
        // We will later use this to show the "Install App" button
        console.log('App is ready to be installed');
    });

    // Function to trigger the install prompt (we will attach this to a button later)
    window.installApp = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                deferredPrompt = null;
            });
        }
    };


    /* ========================================== */
    /* 5. SERVICE WORKER REGISTRATION             */
    /* ========================================== */
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((registration) => {
                    console.log('ServiceWorker registered successfully');
                })
                .catch((error) => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }

});