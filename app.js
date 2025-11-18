<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GCA - Global Content Archive</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Courier New', monospace;
            background-color: #000;
            color: #00ff00;
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* Header Styles */
        header {
            background-color: #000;
            border-bottom: 1px solid #00ff00;
            padding: 1rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            text-shadow: 0 0 5px #00ff00;
        }

        .nav-buttons {
            display: flex;
            gap: 1rem;
        }

        .btn {
            background: transparent;
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 0.5rem 1rem;
            font-family: 'Courier New', monospace;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
        }

        .btn:hover {
            background-color: #00ff00;
            color: #000;
            box-shadow: 0 0 10px #00ff00;
        }

        /* Main Content */
        main {
            padding: 2rem;
            max-width: 1400px;
            margin: 0 auto;
        }

        .controls {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2rem;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .search-container {
            flex: 1;
            min-width: 300px;
        }

        .search-input {
            width: 100%;
            padding: 0.5rem;
            background: transparent;
            border: 1px solid #00ff00;
            color: #00ff00;
            font-family: 'Courier New', monospace;
        }

        .filters {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }

        .filter-btn {
            background: transparent;
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 0.5rem 1rem;
            font-family: 'Courier New', monospace;
            cursor: pointer;
            transition: all 0.3s;
        }

        .filter-btn.active {
            background-color: #00ff00;
            color: #000;
        }

        .filter-btn:hover:not(.active) {
            background-color: rgba(0, 255, 0, 0.2);
        }

        /* Content Grid */
        .content-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }

        .content-card {
            border: 1px solid #00ff00;
            padding: 1rem;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 400px;
            overflow: hidden;
        }

        .card-preview {
            height: 200px;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            margin-bottom: 1rem;
            overflow: hidden;
            background-color: rgba(0, 0, 0, 0.5);
        }

        .card-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .card-type-badge {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: rgba(0, 0, 0, 0.7);
            padding: 0.25rem 0.5rem;
            border: 1px solid #00ff00;
            font-size: 0.8rem;
        }

        .card-owner-badge {
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
            background: rgba(0, 255, 0, 0.2);
            padding: 0.25rem 0.5rem;
            border: 1px solid #00ff00;
            font-size: 0.8rem;
        }

        .card-content {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .card-title {
            font-size: 1.1rem;
            margin-bottom: 0.5rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .card-description {
            margin-bottom: 1rem;
            flex: 1;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
        }

        .card-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .tag {
            background: rgba(0, 255, 0, 0.1);
            padding: 0.25rem 0.5rem;
            border: 1px solid rgba(0, 255, 0, 0.5);
            font-size: 0.8rem;
        }

        .card-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-bottom: 1rem;
            font-size: 0.8rem;
        }

        .meta-item {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .card-actions {
            display: flex;
            gap: 0.5rem;
            margin-top: auto;
        }

        .card-btn {
            flex: 1;
            background: transparent;
            border: 1px solid #00ff00;
            color: #00ff00;
            padding: 0.5rem;
            font-family: 'Courier New', monospace;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.8rem;
        }

        .card-btn:hover {
            background-color: #00ff00;
            color: #000;
        }

        .card-btn.delete {
            border-color: #ff0000;
            color: #ff0000;
        }

        .card-btn.delete:hover {
            background-color: #ff0000;
            color: #000;
        }

        /* Loading and Empty States */
        #loading, #emptyState {
            text-align: center;
            padding: 2rem;
            grid-column: 1 / -1;
        }

        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background-color: #000;
            border: 2px solid #00ff00;
            padding: 2rem;
            width: 90%;
            max-width: 500px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
            position: relative;
        }

        .view-modal .modal-content {
            max-width: 90vw;
            max-height: 90vh;
            width: auto;
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            border-bottom: 1px solid #00ff00;
            padding-bottom: 0.5rem;
        }

        .modal-title {
            font-size: 1.2rem;
        }

        .close-btn {
            background: none;
            border: none;
            color: #00ff00;
            font-size: 1.5rem;
            cursor: pointer;
            line-height: 1;
        }

        .form-group {
            margin-bottom: 1rem;
        }

        .form-label {
            display: block;
            margin-bottom: 0.5rem;
        }

        .form-input, .form-textarea {
            width: 100%;
            padding: 0.5rem;
            background: transparent;
            border: 1px solid #00ff00;
            color: #00ff00;
            font-family: 'Courier New', monospace;
        }

        .form-textarea {
            min-height: 100px;
            resize: vertical;
        }

        .file-upload {
            margin-bottom: 1rem;
        }

        .file-label {
            display: block;
            padding: 1rem;
            border: 2px dashed #00ff00;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }

        .file-label.has-file {
            border-color: #00ff00;
            background-color: rgba(0, 255, 0, 0.1);
        }

        .file-label:hover {
            background-color: rgba(0, 255, 0, 0.1);
        }

        .file-input {
            display: none;
        }

        .file-info {
            margin-top: 0.5rem;
            padding: 0.5rem;
            background: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            display: none;
        }

        .progress-container {
            margin-top: 1rem;
            display: none;
        }

        .progress-bar {
            height: 20px;
            background-color: rgba(0, 255, 0, 0.1);
            border: 1px solid #00ff00;
            position: relative;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background-color: #00ff00;
            width: 0%;
            transition: width 0.3s;
        }

        .progress-text {
            text-align: center;
            margin-top: 0.5rem;
            font-size: 0.8rem;
        }

        .error-message {
            color: #ff0000;
            margin-top: 0.5rem;
            display: none;
            font-size: 0.9rem;
        }

        .error-message.active {
            display: block;
        }

        .modal-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.5rem;
            margin-top: 1.5rem;
        }

        .view-content {
            max-height: 80vh;
            overflow: auto;
            margin-bottom: 1rem;
        }

        .view-content img, .view-content video {
            max-width: 100%;
            max-height: 70vh;
            display: block;
            margin: 0 auto;
        }

        .view-meta {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            font-size: 0.9rem;
        }

        /* Scrollbar Styling */
        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #000;
        }

        ::-webkit-scrollbar-thumb {
            background: #00ff00;
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #00cc00;
        }

        /* Responsive */
        @media (max-width: 768px) {
            header {
                flex-direction: column;
                gap: 1rem;
                padding: 1rem;
            }

            .controls {
                flex-direction: column;
            }

            .search-container {
                min-width: 100%;
            }

            .content-grid {
                grid-template-columns: 1fr;
            }

            .modal-content {
                width: 95%;
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <header>
        <div class="logo">GCA - GLOBAL CONTENT ARCHIVE</div>
        <div class="nav-buttons">
            <button id="loginBtn" class="btn">[LOGIN]</button>
            <button id="uploadBtn" class="btn" style="display: none;">[UPLOAD]</button>
            <button id="logoutBtn" class="btn" style="display: none;">[LOGOUT]</button>
        </div>
    </header>

    <main>
        <div class="controls">
            <div class="search-container">
                <input type="text" id="searchInput" class="search-input" placeholder="[SEARCH_CONTENT...]">
            </div>
            <div class="filters">
                <button class="filter-btn active" data-type="all">[ALL]</button>
                <button class="filter-btn" data-type="video">[VID]</button>
                <button class="filter-btn" data-type="image">[IMAGES]</button>
                <button class="filter-btn" data-type="audio">[AUDIO]</button>
                <button class="filter-btn" data-type="document">[DOCUMENTS]</button>
            </div>
        </div>

        <div id="loading">[LOADING_CONTENT...]</div>
        <div id="emptyState" style="display: none;">[NO_CONTENT_FOUND]</div>
        <div id="contentGrid" class="content-grid"></div>
    </main>

    <!-- Login Modal -->
    <div id="loginModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">[LOGIN]</h2>
                <button class="close-btn">&times;</button>
            </div>
            <form id="loginForm">
                <div class="form-group">
                    <label class="form-label" for="loginUsername">USERNAME:</label>
                    <input type="text" id="loginUsername" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="loginPassword">PASSWORD:</label>
                    <input type="password" id="loginPassword" class="form-input" required>
                </div>
                <div id="loginError" class="error-message"></div>
                <div class="modal-actions">
                    <button type="submit" class="btn">[LOGIN]</button>
                    <button type="button" class="btn cancel-btn">[CANCEL]</button>
                </div>
            </form>
            <p style="margin-top: 1rem; text-align: center;">
                [NO_ACCOUNT?] <button id="showSignupBtn" class="btn" style="background: none; border: none; color: #00ff00; text-decoration: underline; cursor: pointer;">[SIGN_UP]</button>
            </p>
        </div>
    </div>

    <!-- Signup Modal -->
    <div id="signupModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">[SIGN_UP]</h2>
                <button class="close-btn">&times;</button>
            </div>
            <form id="signupForm">
                <div class="form-group">
                    <label class="form-label" for="signupUsername">USERNAME:</label>
                    <input type="text" id="signupUsername" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="signupDisplayName">DISPLAY_NAME:</label>
                    <input type="text" id="signupDisplayName" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label" for="signupPassword">PASSWORD:</label>
                    <input type="password" id="signupPassword" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="signupConfirmPassword">CONFIRM_PASSWORD:</label>
                    <input type="password" id="signupConfirmPassword" class="form-input" required>
                </div>
                <div id="signupError" class="error-message"></div>
                <div class="modal-actions">
                    <button type="submit" class="btn">[SIGN_UP]</button>
                    <button type="button" class="btn cancel-btn">[CANCEL]</button>
                </div>
            </form>
            <p style="margin-top: 1rem; text-align: center;">
                [HAVE_ACCOUNT?] <button id="showLoginBtn" class="btn" style="background: none; border: none; color: #00ff00; text-decoration: underline; cursor: pointer;">[LOGIN]</button>
            </p>
        </div>
    </div>

    <!-- Upload Modal -->
    <div id="uploadModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title">[UPLOAD_CONTENT]</h2>
                <button class="close-btn">&times;</button>
            </div>
            <form id="uploadForm">
                <div class="form-group">
                    <label class="form-label" for="uploadTitle">TITLE:</label>
                    <input type="text" id="uploadTitle" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="uploadDescription">DESCRIPTION:</label>
                    <textarea id="uploadDescription" class="form-textarea"></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="uploadTags">TAGS (comma-separated):</label>
                    <input type="text" id="uploadTags" class="form-input">
                </div>
                <div class="file-upload">
                    <label for="fileInput" class="file-label" id="fileLabel">
                        [DROP_FILE_HERE] OR [CLICK_TO_SELECT]
                    </label>
                    <input type="file" id="fileInput" class="file-input">
                    <div id="fileInfo" class="file-info"></div>
                </div>
                <div id="uploadProgress" class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="progress-text">[UPLOADING...] 0%</div>
                </div>
                <div id="uploadError" class="error-message"></div>
                <div class="modal-actions">
                    <button type="submit" class="btn">[UPLOAD]</button>
                    <button type="button" class="btn cancel-btn">[CANCEL]</button>
                </div>
            </form>
        </div>
    </div>

    <!-- View Modal -->
    <div id="viewModal" class="modal view-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title" id="viewTitle">[VIEW_CONTENT]</h2>
                <button class="close-btn">&times;</button>
            </div>
            <div id="viewContent" class="view-content"></div>
            <div id="viewDescription" style="margin-bottom: 1rem;"></div>
            <div class="view-meta" id="viewMeta"></div>
            <div class="modal-actions">
                <button id="downloadBtn" class="btn" style="display: none;">[DOWNLOAD]</button>
                <button class="btn cancel-btn">[CLOSE]</button>
            </div>
        </div>
    </div>

    <script>
        // Supabase Configuration
        const SUPABASE_URL = 'https://tgnqbayejloephsdqxae.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnFiYXllamxvZXBoc2RxeGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMyMzUsImV4cCI6MjA3ODk4OTIzNX0.yICueAwjGZyFt5ycnhxOEx8MHgFhRBi9Zd4Drhj89IQ';
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // State
        let currentUser = null;
        let allContent = [];
        let currentFilter = 'all';
        let selectedFile = null;

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            initAuth();
            loadContent();
            setupEventListeners();
        });

        // Auth
        function initAuth() {
            const session = localStorage.getItem('gca_session');
            if (session) {
                try {
                    currentUser = JSON.parse(session);
                    updateAuthUI();
                } catch (e) {
                    localStorage.removeItem('gca_session');
                }
            }
        }

        function updateAuthUI() {
            const loginBtn = document.getElementById('loginBtn');
            const uploadBtn = document.getElementById('uploadBtn');
            const logoutBtn = document.getElementById('logoutBtn');
          
            if (currentUser) {
                loginBtn.style.display = 'none';
                uploadBtn.style.display = 'block';
                logoutBtn.style.display = 'block';
            } else {
                loginBtn.style.display = 'block';
                uploadBtn.style.display = 'none';
                logoutBtn.style.display = 'none';
            }
        }

        // Event Listeners
        function setupEventListeners() {
            // Auth buttons
            document.getElementById('loginBtn').addEventListener('click', () => showModal('loginModal'));
            document.getElementById('uploadBtn').addEventListener('click', () => showModal('uploadModal'));
            document.getElementById('logoutBtn').addEventListener('click', logout);
          
            // Modal toggles
            document.getElementById('showSignupBtn').addEventListener('click', () => {
                hideModal('loginModal');
                showModal('signupModal');
            });
            document.getElementById('showLoginBtn').addEventListener('click', () => {
                hideModal('signupModal');
                showModal('loginModal');
            });
          
            // Close buttons
            document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const modal = e.target.closest('.modal');
                    if (modal) hideModal(modal.id);
                });
            });
          
            // Forms
            document.getElementById('loginForm').addEventListener('submit', handleLogin);
            document.getElementById('signupForm').addEventListener('submit', handleSignup);
            document.getElementById('uploadForm').addEventListener('submit', handleUpload);
          
            // Search and filters
            document.getElementById('searchInput').addEventListener('input', filterContent);
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    currentFilter = e.target.dataset.type;
                    filterContent();
                });
            });
          
            // File input - Fixed: Reset file input when modal opens
            document.getElementById('fileInput').addEventListener('change', handleFileSelect);
            document.getElementById('uploadModal').addEventListener('click', (e) => {
                if (e.target === document.getElementById('uploadModal')) {
                    // Reset file input when clicking outside the modal
                    document.getElementById('fileInput').value = '';
                }
            });
          
            // Click outside modal to close
            document.querySelectorAll('.modal').forEach(modal => {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) hideModal(modal.id);
                });
            });
        }

        // Modal Management
        function showModal(modalId) {
            document.getElementById(modalId).classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Reset file input when upload modal is opened
            if (modalId === 'uploadModal') {
                document.getElementById('fileInput').value = '';
                selectedFile = null;
                document.querySelector('.file-label').classList.remove('has-file');
                document.getElementById('fileLabel').textContent = '[DROP_FILE_HERE] OR [CLICK_TO_SELECT]';
                document.getElementById('fileInfo').style.display = 'none';
            }
        }

        function hideModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
            document.body.style.overflow = 'auto';
          
            // Reset forms
            if (modalId === 'loginModal') {
                document.getElementById('loginForm').reset();
                document.getElementById('loginError').classList.remove('active');
            } else if (modalId === 'signupModal') {
                document.getElementById('signupForm').reset();
                document.getElementById('signupError').classList.remove('active');
            } else if (modalId === 'uploadModal') {
                document.getElementById('uploadForm').reset();
                document.getElementById('uploadError').classList.remove('active');
                document.getElementById('uploadProgress').style.display = 'none';
                selectedFile = null;
                document.querySelector('.file-label').classList.remove('has-file');
                document.getElementById('fileInput').value = '';
            } else if (modalId === 'viewModal') {
                const media = document.querySelector('#viewContent video, #viewContent audio');
                if (media) {
                    media.pause();
                    media.currentTime = 0;
                }
                document.getElementById('viewContent').innerHTML = '';
            }
        }

        function showError(elementId, message) {
            const element = document.getElementById(elementId);
            element.textContent = '[ERROR] ' + message;
            element.classList.add('active');
        }

        function hideError(elementId) {
            document.getElementById(elementId).classList.remove('active');
        }

        // Login
        async function handleLogin(e) {
            e.preventDefault();
            hideError('loginError');
          
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
          
            try {
                const { data, error } = await supabase
                    .from('accounts')
                    .select('*')
                    .eq('username', username)
                    .maybeSingle();
              
                if (error) {
                    console.error('Login query error:', error);
                    showError('loginError', 'Login failed. Please try again.');
                    return;
                }
              
                if (!data) {
                    showError('loginError', 'Username not found');
                    return;
                }
              
                if (data.password !== password) {
                    showError('loginError', 'Invalid password');
                    return;
                }
              
                currentUser = {
                    id: data.id,
                    username: data.username,
                    display_name: data.display_name
                };
              
                localStorage.setItem('gca_session', JSON.stringify(currentUser));
                updateAuthUI();
                hideModal('loginModal');
                loadContent();
            } catch (err) {
                console.error('Login error:', err);
                showError('loginError', 'Login failed. Please try again.');
            }
        }

        // Signup
        async function handleSignup(e) {
            e.preventDefault();
            hideError('signupError');
          
            const username = document.getElementById('signupUsername').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            const displayName = document.getElementById('signupDisplayName').value.trim() || username;
          
            if (username.length < 3) {
                showError('signupError', 'Username must be at least 3 characters');
                return;
            }
          
            if (password.length < 6) {
                showError('signupError', 'Password must be at least 6 characters');
                return;
            }
          
            if (password !== confirmPassword) {
                showError('signupError', 'Passwords do not match');
                return;
            }
          
            try {
                // Create account - let database handle duplicate username via unique constraint
                console.log('Attempting to create account for:', username);
              
                const { data, error } = await supabase
                    .from('accounts')
                    .insert([{
                        username,
                        password,
                        display_name: displayName
                    }])
                    .select()
                    .single();
              
                console.log('Insert result:', { data, error });
              
                if (error) {
                    console.error('Account creation error:', error);
                    console.error('Error code:', error.code);
                    console.error('Error message:', error.message);
                    console.error('Error details:', error.details);
                  
                    // Check if it's a duplicate username error
                    if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
                        showError('signupError', 'Username already taken');
                    } else if (error.message.includes('policy') || error.message.includes('permission')) {
                        showError('signupError', 'Database permission error. Please enable RLS policies for the accounts table.');
                    } else {
                        showError('signupError', 'Account creation failed: ' + error.message);
                    }
                    return;
                }
              
                currentUser = {
                    id: data.id,
                    username: data.username,
                    display_name: data.display_name
                };
              
                localStorage.setItem('gca_session', JSON.stringify(currentUser));
                updateAuthUI();
                hideModal('signupModal');
                loadContent();
            } catch (err) {
                console.error('Signup error:', err);
                showError('signupError', 'Account creation failed. Please try again.');
            }
        }

        // Logout
        function logout() {
            localStorage.removeItem('gca_session');
            currentUser = null;
            updateAuthUI();
            loadContent();
        }

        // File Selection
        function handleFileSelect(e) {
            selectedFile = e.target.files[0];
            if (selectedFile) {
                const fileLabel = document.querySelector('.file-label');
                fileLabel.classList.add('has-file');
                document.getElementById('fileLabel').textContent = '[FILE_LOADED]';
              
                const fileInfo = document.getElementById('fileInfo');
                fileInfo.innerHTML = `
                    <p><strong>${selectedFile.name}</strong></p>
                    <small>SIZE: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB :: TYPE: ${detectFileType(selectedFile).toUpperCase()}</small>
                `;
                fileInfo.style.display = 'block';
              
                // Auto-fill title
                if (!document.getElementById('uploadTitle').value) {
                    document.getElementById('uploadTitle').value = selectedFile.name.replace(/\.[^/.]+$/, '');
                }
            }
        }

        function detectFileType(file) {
            const type = file.type;
            const name = file.name.toLowerCase();
          
            if (type.startsWith('image/')) return 'image';
            if (type.startsWith('video/')) return 'video';
            if (type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/)) return 'audio';
            if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'document';
            return 'other';
        }

        // Upload - Fixed: Using Supabase JS client for better upload performance
        async function handleUpload(e) {
            e.preventDefault();
            hideError('uploadError');
          
            if (!currentUser) {
                showError('uploadError', 'You must be logged in to upload');
                return;
            }
          
            if (!selectedFile) {
                showError('uploadError', 'Please select a file');
                return;
            }
          
            const title = document.getElementById('uploadTitle').value.trim();
            const description = document.getElementById('uploadDescription').value.trim();
            const tagsInput = document.getElementById('uploadTags').value.trim();
            const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
          
            // Show progress
            const progressContainer = document.getElementById('uploadProgress');
            const progressFill = document.querySelector('.progress-fill');
            const progressText = document.querySelector('.progress-text');
            progressContainer.style.display = 'block';
            progressFill.style.width = '0%';
            progressText.textContent = '[UPLOADING...] 0%';
          
            // Disable form
            document.querySelectorAll('#uploadForm button, #uploadForm input, #uploadForm textarea').forEach(el => {
                el.disabled = true;
            });
          
            try {
                // Upload file to Supabase Storage using the JS client for better performance
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('files')
                    .upload(fileName, selectedFile, {
                        onUploadProgress: (progress) => {
                            const percent = (progress.loaded / progress.total) * 100;
                            progressFill.style.width = `${percent}%`;
                            progressText.textContent = `[UPLOADING...] ${Math.floor(percent)}%`;
                        }
                    });
                
                if (uploadError) throw uploadError;
              
                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('files')
                    .getPublicUrl(fileName);
              
                progressFill.style.width = '95%';
                progressText.textContent = '[UPLOADING...] 95%';
              
                // Create database entry
                const { error: dbError } = await supabase
                    .from('content')
                    .insert([{
                        title,
                        description,
                        file_url: urlData.publicUrl,
                        file_type: detectFileType(selectedFile),
                        file_size: selectedFile.size,
                        uploader_name: currentUser.display_name || currentUser.username,
                        uploader_id: currentUser.id,
                        view_count: 0,
                        tags
                    }]);
              
                if (dbError) throw dbError;
              
                // Complete
                progressFill.style.width = '100%';
                progressText.textContent = '[UPLOAD_COMPLETE] 100%';
              
                setTimeout(() => {
                    hideModal('uploadModal');
                    loadContent();
                }, 500);
              
            } catch (err) {
                console.error('Upload error:', err);
                showError('uploadError', 'Upload failed: ' + err.message);
                progressContainer.style.display = 'none';
              
                // Re-enable form
                document.querySelectorAll('#uploadForm button, #uploadForm input, #uploadForm textarea').forEach(el => {
                    el.disabled = false;
                });
            }
        }

        // Load Content
        async function loadContent() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('contentGrid').innerHTML = '';
            document.getElementById('emptyState').style.display = 'none';
          
            try {
                const { data, error } = await supabase
                    .from('content')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(200);
              
                if (error) throw error;
              
                allContent = data || [];
                filterContent();
            } catch (err) {
                console.error('Load error:', err);
                document.getElementById('loading').style.display = 'none';
                document.getElementById('emptyState').style.display = 'block';
            }
        }

        // Filter Content
        function filterContent() {
            const searchQuery = document.getElementById('searchInput').value.toLowerCase();
          
            let filtered = allContent.filter(content => {
                const matchesSearch = !searchQuery ||
                    content.title?.toLowerCase().includes(searchQuery) ||
                    content.description?.toLowerCase().includes(searchQuery) ||
                    content.uploader_name?.toLowerCase().includes(searchQuery) ||
                    content.tags?.some(tag => tag.toLowerCase().includes(searchQuery));
              
                const matchesType = currentFilter === 'all' || content.file_type === currentFilter;
              
                return matchesSearch && matchesType;
            });
          
            displayContent(filtered);
        }

        // Display Content
        function displayContent(content) {
            document.getElementById('loading').style.display = 'none';
            const grid = document.getElementById('contentGrid');
            const emptyState = document.getElementById('emptyState');
          
            if (content.length === 0) {
                grid.innerHTML = '';
                emptyState.style.display = 'block';
                return;
            }
          
            emptyState.style.display = 'none';
            grid.innerHTML = content.map(item => createContentCard(item)).join('');
          
            // Add event listeners
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', () => viewContent(btn.dataset.id));
            });
          
            document.querySelectorAll('.download-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const url = btn.dataset.url;
                    const fileName = url.split('/').pop();
                    await downloadFile(url, fileName);
                });
            });
          
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteContent(btn.dataset.id));
            });
        }

        // Create Content Card - Fixed: Better layout to prevent overflow
        function createContentCard(content) {
            const isOwner = currentUser && (
                currentUser.username === 'Zaid' ||
                content.uploader_name === currentUser.display_name ||
                content.uploader_name === currentUser.username ||
                content.uploader_id === currentUser.id
            );
          
            const preview = getPreviewHTML(content);
            const typeLabel = getTypeLabel(content.file_type);
            const tags = content.tags?.slice(0, 3).map(tag => `<span class="tag">#${tag}</span>`).join('') || '';
            const moreTagsLabel = content.tags?.length > 3 ? `<span class="tag">+${content.tags.length - 3}</span>` : '';
            const formattedDate = new Date(content.created_at).toLocaleDateString();
            const fileSize = formatFileSize(content.file_size);
          
            return `
                <div class="content-card">
                    ${preview}
                    <div class="card-content">
                        <h3 class="card-title">> ${escapeHtml(content.title)}</h3>
                        ${content.description ? `<p class="card-description">${escapeHtml(content.description)}</p>` : ''}
                        ${tags || moreTagsLabel ? `<div class="card-tags">${tags}${moreTagsLabel}</div>` : ''}
                        <div class="card-meta">
                            <div class="meta-item">USER: ${escapeHtml(content.uploader_name)}</div>
                            <div class="meta-item">VIEWS: ${content.view_count || 0}</div>
                            <div class="meta-item">DATE: ${formattedDate}</div>
                            <div class="meta-item">SIZE: ${fileSize}</div>
                        </div>
                        <div class="card-actions">
                            <button class="card-btn view-btn" data-id="${content.id}">[VIEW]</button>
                            <button class="card-btn download-btn" data-url="${content.file_url}">[DOWNLOAD]</button>
                            ${isOwner ? `<button class="card-btn delete delete-btn" data-id="${content.id}">[DELETE]</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }

        function getPreviewHTML(content) {
            const typeLabel = getTypeLabel(content.file_type);
            const ownerBadge = currentUser && (
                currentUser.username === 'Zaid' ||
                content.uploader_name === currentUser.display_name ||
                content.uploader_name === currentUser.username ||
                content.uploader_id === currentUser.id
            ) ? '<div class="card-owner-badge">[YOUR_FILE]</div>' : '';
          
            if (content.file_type === 'image') {
                return `
                    <div class="card-preview">
                        <img src="${content.file_url}" alt="${escapeHtml(content.title)}" onerror="this.style.display='none'">
                        <div class="card-type-badge">${typeLabel}</div>
                        ${ownerBadge}
                    </div>
                `;
            }
          
            return `
                <div class="card-preview">
                    <div style="font-size:3rem;color:rgba(0,255,65,0.6);">${getFileIcon(content.file_type)}</div>
                    <div class="card-type-badge">${typeLabel}</div>
                    ${ownerBadge}
                </div>
            `;
        }

        function getFileIcon(type) {
            switch(type) {
                case 'video': return '[VID]';
                case 'audio': return '[AUDIO]';
                case 'image': return '[IMAGES]';
                case 'document': return '[DOCUMENTS]';
                default: return '[FILE]';
            }
        }

        function getTypeLabel(type) {
            const labels = {
                'video': '[VID]',
                'audio': '[AUDIO]',
                'image': '[IMAGES]',
                'document': '[DOCUMENTS]',
                'other': '[FILE]'
            };
            return labels[type] || '[FILE]';
        }

        function formatFileSize(bytes) {
            if (!bytes) return 'UNKNOWN';
            const sizes = ['B', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0B';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + sizes[i];
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // View Content - Fixed: Removed extra download button
        async function viewContent(id) {
            const content = allContent.find(c => c.id === id);
            if (!content) return;
          
            // Increment view count
            const newViewCount = (content.view_count || 0) + 1;
            await supabase
                .from('content')
                .update({ view_count: newViewCount })
                .eq('id', id);
          
            content.view_count = newViewCount;
          
            // Show modal
            document.getElementById('viewTitle').textContent = '> ' + content.title;
          
            const viewContent = document.getElementById('viewContent');
            if (content.file_type === 'video') {
                viewContent.innerHTML = `<video controls autoplay src="${content.file_url}" style="width:100%;max-height:70vh;background:#000;"></video>`;
            } else if (content.file_type === 'image') {
                viewContent.innerHTML = `<img src="${content.file_url}" alt="${escapeHtml(content.title)}" style="width:100%;max-height:70vh;object-fit:contain;background:#000;">`;
            } else if (content.file_type === 'audio') {
                viewContent.innerHTML = `
                    <div style="padding:2rem;background:#000;border:2px solid rgba(0,255,65,0.3);text-align:center;height:70vh;display:flex;flex-direction:column;justify-content:center;">
                        <div style="font-size:4rem;margin-bottom:1rem;">[AUDIO]</div>
                        <audio controls autoplay src="${content.file_url}" style="width:100%;filter:invert(1) hue-rotate(180deg);"></audio>
                    </div>
                `;
            } else {
                viewContent.innerHTML = `
                    <div style="padding:3rem;text-align:center;background:#000;border:2px solid rgba(0,255,65,0.3);height:70vh;display:flex;flex-direction:column;justify-content:center;">
                        <p style="margin-bottom:1.5rem;">[LOADING...]</p>
                    </div>
                `;
                fetch(content.file_url)
                    .then(res => {
                        if (res.ok) {
                            const contentType = res.headers.get('content-type');
                            if (contentType && (contentType.startsWith('text/') || contentType === 'application/javascript' || contentType === 'application/json')) {
                                return res.text().then(text => {
                                    viewContent.innerHTML = `<pre style="white-space: pre-wrap; word-break: break-word; max-height:70vh;overflow:auto;background:#000;color:#00ff00;">${escapeHtml(text)}</pre>`;
                                });
                            } else {
                                viewContent.innerHTML = `
                                    <div style="padding:3rem;text-align:center;background:#000;border:2px solid rgba(0,255,65,0.3);height:70vh;display:flex;flex-direction:column;justify-content:center;">
                                        <p style="margin-bottom:1.5rem;">[FILE_PREVIEW_UNAVAILABLE]</p>
                                    </div>
                                `;
                            }
                        } else {
                            throw new Error('Fetch failed');
                        }
                    })
                    .catch(err => {
                        console.error(err);
                        viewContent.innerHTML = `
                            <div style="padding:3rem;text-align:center;background:#000;border:2px solid rgba(0,255,65,0.3);height:70vh;display:flex;flex-direction:column;justify-content:center;">
                                <p style="margin-bottom:1.5rem;">[FILE_PREVIEW_UNAVAILABLE]</p>
                            </div>
                        `;
                    });
            }
          
            const viewDescription = document.getElementById('viewDescription');
            if (content.description) {
                viewDescription.innerHTML = `<p>> ${escapeHtml(content.description)}</p>`;
                viewDescription.style.display = 'block';
            } else {
                viewDescription.style.display = 'none';
            }
          
            document.getElementById('viewMeta').innerHTML = `
                <span>UPLOADER: ${escapeHtml(content.uploader_name)}</span>
                <span>|</span>
                <span>VIEWS: ${content.view_count}</span>
            `;
          
            // Hide the download button in view modal as requested
            document.getElementById('downloadBtn').style.display = 'none';
          
            showModal('viewModal');
            filterContent(); // Refresh to show updated view count
        }

        // Delete Content
        async function deleteContent(id) {
            if (!window.confirm('[CONFIRM_DELETE?] This action cannot be undone.')) return;
          
            const content = allContent.find(c => c.id === id);
            if (!content) return;
          
            try {
                // Delete from database
                const { error: dbError } = await supabase
                    .from('content')
                    .delete()
                    .eq('id', id);
              
                if (dbError) throw dbError;
              
                // Try to delete from storage (optional, may fail if file doesn't exist)
                const fileName = content.file_url.split('/').pop();
                await supabase.storage.from('files').remove([fileName]);
              
                // Refresh content
                loadContent();
            } catch (err) {
                console.error('Delete error:', err);
                window.alert('[ERROR] Failed to delete file');
            }
        }

        // Force Download
        async function downloadFile(url, fileName) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error('Network response was not ok');
                const blob = await response.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
            } catch (err) {
                console.error('Download error:', err);
                window.alert('[ERROR] Failed to download file');
            }
        }
    </script>
</body>
</html>
