<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>ᑲіgmᥲᥒȷ mᥙsі᥊ һᥙᑲ</title>
    
    <!-- Links to our CSS files -->
    <link rel="stylesheet" href="css/theme.css">
    <link rel="stylesheet" href="css/splash.css">
    <link rel="stylesheet" href="css/style.css">
    
    <!-- Link to the manifest for the "Install App" feature -->
    <link rel="manifest" href="manifest.json">
    
    <!-- Theme color for Android browsers -->
    <meta name="theme-color" content="#000000">
</head>
<body>

    <!-- ========================================== -->
    <!-- SPLASH SCREEN                              -->
    <!-- This shows first, then fades out.          -->
    <!-- ========================================== -->
    <div id="splash-screen">
        <div class="splash-content">
            <!-- A clean SVG music note placeholder. We will replace this with your real logo later. -->
            <div class="splash-logo">
                <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18V5l12-2v13"></path>
                    <circle cx="6" cy="18" r="3"></circle>
                    <circle cx="18" cy="16" r="3"></circle>
                </svg>
            </div>
            <div class="splash-text">
                <!-- Updated with the stylized name in small letters -->
                <span class="splash-title">ᑲіgmᥲᥒȷ mᥙsі᥊ һᥙᑲ</span>
            </div>
        </div>
    </div>

    <!-- ========================================== -->
    <!-- MAIN APP CONTAINER                         -->
    <!-- Hidden until the splash screen fades out.  -->
    <!-- ========================================== -->
    <div id="app-container" class="hidden">
        
        <!-- Top Header -->
        <header class="app-header">
            <!-- Updated with the stylized name in small letters -->
            <h2>ᑲіgmᥲᥒȷ mᥙsі᥊ һᥙᑲ</h2>
        </header>

        <!-- Main Content Area (Screens will be swapped here) -->
        <main class="app-content">
            <!-- Home Screen -->
            <div id="screen-home" class="screen active">
                <div class="search-bar">
                    <input type="text" placeholder="Search for songs, artists, or lyrics...">
                </div>
                <h3 class="section-title">Trending Now</h3>
                <!-- Song cards will be injected here by JavaScript -->
                <div id="song-list" class="song-list"></div>
            </div>
            
            <!-- Library Screen (Hidden by default) -->
            <div id="screen-library" class="screen">
                <h3 class="section-title">Your Library</h3>
            </div>

            <!-- Profile Screen (Hidden by default) -->
            <div id="screen-profile" class="screen">
                <h3 class="section-title">Profile</h3>
            </div>
        </main>

        <!-- Bottom Navigation Bar (Spotify style) -->
        <nav class="bottom-nav">
            <button class="nav-item active" data-target="home">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span>Home</span>
            </button>
            <button class="nav-item" data-target="library">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m16 6 4 14"></path>
                    <path d="M12 6v14"></path>
                    <path d="M8 8v12"></path>
                    <path d="M4 4v16"></path>
                </svg>
                <span>Library</span>
            </button>
            <button class="nav-item" data-target="profile">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Profile</span>
            </button>
        </nav>

    </div>

    <!-- Link to our JavaScript files -->
    <script src="js/app.js"></script>
</body>
</html>