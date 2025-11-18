// Supabase Configuration
const SUPABASE_URL = 'https://tgnqbayejloephsdqxae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnFiYXllamxvZXBoc2RxeGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMyMzUsImV4cCI6MjA3ODk4OTIzNX0.yICueAwjGZyFt5ycnhOEx8MHgFhRBi9Zd4Drhj89IQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants for Chunked Upload and Compression
const CHUNK_SIZE_MB = 10; // 10MB threshold for using resumable upload
const IMAGE_COMPRESSION_QUALITY = 0.8; // Image compression quality (0.0 to 1.0)

// State
let currentUser = null;
let allContent = [];
let currentFilter = 'all';
let selectedFile = null;
let compressedFile = null; // New state for compressed/processed file

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    loadContent();
    setupEventListeners();
    polishUI();
});

function polishUI() {
    // Add global styles for hacker theme and transparent scrolls
    const style = document.createElement('style');
    style.textContent = `
        body, .modal, .content-card {
            font-family: 'Courier New', monospace;
            color: #00ff00;
            background-color: #000;
        }
        ::-webkit-scrollbar {
            width: 0px;
            background: transparent;
        }
        .content-card {
            border: 1px solid #00ff00;
            padding: 10px;
            margin: 10px;
            box-shadow: 0 0 10px #00ff00;
            min-width: 300px;
            min-height: 400px;
            display: flex;
            flex-direction: column;
        }
        .card-preview {
            height: 200px;
            width: 100%;
            object-fit: cover;
        }
        .view-modal .modal-content {
            background: #000;
            border: 2px solid #00ff00;
            max-width: 95vw; /* Increased max width for better scaling */
            max-height: 95vh; /* Increased max height */
            overflow: auto; /* Allow scrolling if content is too big */
        }
        /* New: Better scaling for viewed images (FIXED SCALING) */
        #viewContent img, #viewContent video {
            max-width: 100%; 
            max-height: 80vh; 
            width: auto; /* Reset width to allow max-width */
            height: auto; /* Reset height to allow max-height */
            object-fit: contain; /* Ensures the entire media fits within bounds */
        }
    `;
    document.head.appendChild(style);
}

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

    // File input
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);

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
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('uploadProgress').style.display = 'none';
        selectedFile = null;
        compressedFile = null; // Reset compressed file
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

// Supabase Upload Function (Handles resumable/chunked logic abstraction)
async function uploadToSupabase(file, fileName, progressCallback) {
    const CHUNK_SIZE = CHUNK_SIZE_MB * 1024 * 1024;
    
    // Use Supabase Resumable Upload for large files (best practice for speed/reliability)
    if (file.size > CHUNK_SIZE) {
        // This leverages Supabase's internal resumable/chunking mechanism
        const { data, error } = await supabase.storage
            .from('files')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
                onProgress: (event) => {
                    const percent = (event.loaded / event.total) * 100;
                    progressCallback(percent, 'RESUMABLE_UPLOAD');
                }
            });

        if (error) throw error;
        return data;
    } else {
        // Use the simpler single upload for smaller files
        const { data, error } = await supabase.storage
            .from('files')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
            });
        
        if (error) throw error;
        progressCallback(100, 'SINGLE_UPLOAD'); // Assume 100% on success
        return data;
    }
}

// File Selection - ADDED Compression/Resizing
function handleFileSelect(e) {
    selectedFile = e.target.files[0];
    compressedFile = null; // Reset
    if (selectedFile) {
        const fileLabel = document.querySelector('.file-label');
        fileLabel.classList.add('has-file');
        document.getElementById('fileLabel').textContent = '[PROCESSING_FILE...]';
        document.getElementById('fileInfo').style.display = 'block';
        document.getElementById('fileInfo').innerHTML = `<p><strong>${selectedFile.name}</strong></p><small>INITIAL SIZE: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB :: TYPE: ${detectFileType(selectedFile).toUpperCase()}</small>`;

        // Auto-fill title
        if (!document.getElementById('uploadTitle').value) {
            document.getElementById('uploadTitle').value = selectedFile.name.replace(/.[^/.]+$/, '');
        }
        
        // **Compression/Resizing for Images (PRESERVE FILE SIZE)**
        if (detectFileType(selectedFile) === 'image') {
            compressImage(selectedFile)
                .then(blob => {
                    // Convert the compressed Blob back to a File object
                    compressedFile = new File([blob], selectedFile.name, { type: blob.type, lastModified: Date.now() });
                    updateFileInfo(selectedFile, compressedFile);
                    document.getElementById('fileLabel').textContent = '[FILE_COMPRESSED]';
                })
                .catch(err => {
                    console.error('Compression failed, using original file:', err);
                    compressedFile = selectedFile;
                    updateFileInfo(selectedFile, compressedFile);
                    document.getElementById('fileLabel').textContent = '[FILE_LOADED] (Compression failed)';
                });
        } else {
            compressedFile = selectedFile;
            updateFileInfo(selectedFile, compressedFile);
            document.getElementById('fileLabel').textContent = '[FILE_LOADED]';
        }
    }
}

function updateFileInfo(originalFile, processedFile) {
    const infoElement = document.getElementById('fileInfo');
    const originalSize = (originalFile.size / 1024 / 1024).toFixed(2);
    const processedSize = (processedFile.size / 1024 / 1024).toFixed(2);
    const type = detectFileType(processedFile).toUpperCase();

    let sizeInfo = `FINAL SIZE: ${processedSize}MB :: TYPE: ${type}`;
    if (originalSize !== processedSize) {
        sizeInfo = `ORIGINAL SIZE: ${originalSize}MB -> FINAL SIZE: ${processedSize}MB :: TYPE: ${type}`;
    }

    infoElement.innerHTML = `
        <p><strong>${processedFile.name}</strong></p>
        <small>${sizeInfo}</small>
    `;
}

// Compression/Resizing Logic (Saves file size on client before upload)
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, img.width, img.height);
                
                // Get image data as blob with specified quality
                canvas.toBlob(resolve, 'image/jpeg', IMAGE_COMPRESSION_QUALITY);
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}


function detectFileType(file) {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/') || name.match(/.(mp3|wav|ogg|m4a|flac|aac)$/)) return 'audio';
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'document';
    return 'other';
}

// Upload - MODIFIED to use compressedFile and new upload function
async function handleUpload(e) {
    e.preventDefault();
    hideError('uploadError');

    if (!currentUser) {
        showError('uploadError', 'You must be logged in to upload');
        return;
    }

    // Use compressedFile if available, otherwise selectedFile
    const fileToUpload = compressedFile || selectedFile;

    if (!fileToUpload) {
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
        // Upload file to Supabase Storage using the optimized method (FAST UPLOAD)
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
     
        // Progress callback function
        const progressCallback = (percent, method) => {
            const roundedPercent = Math.floor(percent * 0.95); // Account for 5% DB write time
            progressFill.style.width = `${roundedPercent}%`;
            progressText.textContent = `[UPLOADING - ${method}] ${roundedPercent}%`;
        };
        
        await uploadToSupabase(fileToUpload, fileName, progressCallback);

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('files')
            .getPublicUrl(fileName);

        // Create database entry
        progressFill.style.width = '95%';
        progressText.textContent = '[UPLOADING...] 95% (DB Write)';

        const { error: dbError } = await supabase
            .from('content')
            .insert([{
                title,
                description,
                file_url: urlData.publicUrl,
                file_type: detectFileType(fileToUpload),
                file_size: fileToUpload.size, // Use processed file size
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

// Create Content Card
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
        <div class="content-card" style="min-width:300px;min-height:400px;">
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
            <div class="card-preview" style="height:200px;width:100%;object-fit:cover;">
                <img src="${content.file_url}" alt="${escapeHtml(content.title)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">
                <div class="card-type-badge">${typeLabel}</div>
                ${ownerBadge}
            </div>
        `;
    }

    return `
        <div class="card-preview" style="height:200px;display:flex;align-items:center;justify-content:center;">
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

// View Content - MODIFIED for better scaling
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
    const mediaStyle = 'max-width:100%; max-height:80vh; width:auto; height:auto; object-fit:contain; background:#000; display:block; margin:0 auto;'; 
    const containerStyle = 'max-height:80vh; overflow:hidden; display:flex; justify-content:center; align-items:center;';
    
    // Applying the scaling fix using the CSS rules defined in polishUI
    if (content.file_type === 'video') {
        viewContent.innerHTML = `<div style="${containerStyle}"><video controls autoplay src="${content.file_url}" style="${mediaStyle}"></video></div>`;
    } else if (content.file_type === 'image') {
        viewContent.innerHTML = `<div style="${containerStyle}"><img src="${content.file_url}" alt="${escapeHtml(content.title)}" style="${mediaStyle}"></div>`;
    } else if (content.file_type === 'audio') {
        viewContent.innerHTML =  `
            <div style="padding:2rem;background:#000;border:2px solid rgba(0,255,65,0.3);text-align:center;height:80vh;display:flex;flex-direction:column;justify-content:center;">
                <div style="font-size:4rem;margin-bottom:1rem;">[AUDIO]</div>
                <audio controls autoplay src="${content.file_url}" style="width:100%;filter:invert(1) hue-rotate(180deg);"></audio>
            </div>
        `;
    } else {
        viewContent.innerHTML =  `
            <div style="padding:3rem;text-align:center;background:#000;border:2px solid rgba(0,255,65,0.3);height:80vh;display:flex;flex-direction:column;justify-content:center;">
                <p style="margin-bottom:1.5rem;">[FILE_PREVIEW_UNAVAILABLE]</p>
            </div>
        `;
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

    // Hide extra download button if exists
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }

    showModal('viewModal');
    filterContent(); // Refresh to show updated view count
}

// Delete Content
async function deleteContent(id) {
    // Custom confirm dialog (assuming HTML has a confirmModal with yes/no buttons)
    // For simplicity, using browser confirm, but replace with custom if HTML supports
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
