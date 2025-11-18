// Supabase Configuration
const SUPABASE_URL = 'https://tgnqbayejloephsdqxae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnFiYXllamxvZXBoc2RxeGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMyMzUsImV4cCI6MjA3ODk4OTIzNX0.yICueAwjGZyFt5ycnhxOEx8MHgFhRBi9Zd4Drhj89IQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Enhanced Compression Settings
const COMPRESSION_CONFIG = {
    image: {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.7,  // More aggressive starting quality
        minQuality: 0.3,  // Allow lower quality if needed
        targetSizeMB: 1,  // Target 1MB or less
        aggressiveMode: true
    },
    video: {
        maxWidth: 1920,
        maxHeight: 1080,
        videoBitrate: 2500000, // 2.5 Mbps
        audioBitrate: 128000   // 128 kbps
    }
};

// State
let currentUser = null;
let allContent = [];
let currentFilter = 'all';
let selectedFile = null;
let compressedFile = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    loadContent();
    setupEventListeners();
    polishUI();
});

function polishUI() {
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
            max-width: 350px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-sizing: border-box;
        }
        .card-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 8px;
        }
        .card-btn {
            flex: 1;
            min-width: 80px;
            padding: 8px 12px;
            white-space: nowrap;
        }
        .card-preview {
            height: 200px;
            width: 100%;
            object-fit: cover;
            position: relative;
            background: #001100;
        }
        .card-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .view-modal .modal-content {
            background: #000;
            border: 2px solid #00ff00;
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
        }
        .compression-info {
            color: #00ff00;
            font-size: 0.85em;
            margin-top: 5px;
            padding: 8px;
            border: 1px solid rgba(0,255,0,0.5);
            background: rgba(0,255,0,0.05);
        }
        .compression-info p {
            margin: 3px 0;
        }
        .compression-savings {
            color: #00ffff;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}

// Advanced Image Compression with Progressive Quality
async function compressImage(file, config = COMPRESSION_CONFIG.image) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calculate scaling to maintain aspect ratio
                if (width > config.maxWidth || height > config.maxHeight) {
                    const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                // Progressive compression - try multiple quality levels
                compressWithQuality(canvas, file, config.quality, config.targetSizeMB)
                    .then(resolve)
                    .catch(reject);
            };
            
            img.onerror = () => reject(new Error('Image loading failed'));
        };
        
        reader.onerror = () => reject(new Error('File reading failed'));
    });
}

async function compressWithQuality(canvas, originalFile, startQuality, targetSizeMB) {
    let quality = startQuality;
    let attempt = 0;
    const maxAttempts = 5;
    
    while (attempt < maxAttempts) {
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', quality);
        });
        
        const sizeMB = blob.size / (1024 * 1024);
        
        // If we're under target or quality is too low, use this version
        if (sizeMB <= targetSizeMB || quality <= 0.5) {
            const compressedFile = new File(
                [blob],
                originalFile.name.replace(/\.[^.]+$/, '.jpg'),
                { type: 'image/jpeg', lastModified: Date.now() }
            );
            
            return {
                file: compressedFile,
                originalSize: originalFile.size,
                compressedSize: blob.size,
                compressionRatio: ((1 - blob.size / originalFile.size) * 100).toFixed(1),
                finalQuality: quality
            };
        }
        
        // Reduce quality and try again
        quality -= 0.1;
        attempt++;
    }
    
    throw new Error('Could not achieve target compression');
}

// Video Compression (Client-side preview/metadata only - actual compression would need server-side)
async function compressVideo(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(video.src);
            
            // For client-side, we can't actually compress video efficiently
            // But we can provide metadata and recommend compression
            const estimatedCompression = estimateVideoCompression(file.size, video.duration);
            
            resolve({
                file: file, // Original file (server-side compression would be needed)
                originalSize: file.size,
                compressedSize: estimatedCompression.estimatedSize,
                compressionRatio: estimatedCompression.ratio,
                duration: video.duration,
                needsServerCompression: true
            });
        };
        
        video.onerror = () => reject(new Error('Video loading failed'));
        video.src = URL.createObjectURL(file);
    });
}

function estimateVideoCompression(originalSize, duration) {
    // Estimate based on target bitrate
    const targetBitrate = COMPRESSION_CONFIG.video.videoBitrate + COMPRESSION_CONFIG.video.audioBitrate;
    const estimatedSize = (targetBitrate * duration) / 8; // Convert bits to bytes
    const ratio = ((1 - estimatedSize / originalSize) * 100).toFixed(1);
    
    return {
        estimatedSize: Math.max(estimatedSize, originalSize * 0.3), // At least 30% of original
        ratio: Math.max(parseFloat(ratio), 0)
    };
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
    document.getElementById('loginBtn').addEventListener('click', () => showModal('loginModal'));
    document.getElementById('uploadBtn').addEventListener('click', () => showModal('uploadModal'));
    document.getElementById('logoutBtn').addEventListener('click', logout);
 
    document.getElementById('showSignupBtn').addEventListener('click', () => {
        hideModal('loginModal');
        showModal('signupModal');
    });
    document.getElementById('showLoginBtn').addEventListener('click', () => {
        hideModal('signupModal');
        showModal('loginModal');
    });
 
    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) hideModal(modal.id);
        });
    });
 
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);
 
    document.getElementById('searchInput').addEventListener('input', filterContent);
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.type;
            filterContent();
        });
    });
 
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
 
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
        compressedFile = null;
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
        const { data, error } = await supabase
            .from('accounts')
            .insert([{
                username,
                password,
                display_name: displayName
            }])
            .select()
            .single();
     
        if (error) {
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

// Enhanced File Selection with Smart Compression
async function handleFileSelect(e) {
    selectedFile = e.target.files[0];
    compressedFile = null;
    
    if (selectedFile) {
        const fileLabel = document.querySelector('.file-label');
        fileLabel.classList.add('has-file');
        document.getElementById('fileLabel').textContent = '[FILE_LOADED]';
     
        const fileType = detectFileType(selectedFile);
        let infoHTML = `
            <p><strong>${selectedFile.name}</strong></p>
            <small>ORIGINAL_SIZE: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB :: TYPE: ${fileType.toUpperCase()}</small>
        `;
        
        document.getElementById('fileInfo').innerHTML = infoHTML;
        document.getElementById('fileInfo').style.display = 'block';
        
        // Smart compression based on file type
        if (fileType === 'image') {
            try {
                document.getElementById('fileInfo').innerHTML = infoHTML + '<p style="color: #ffff00;">[COMPRESSING_IMAGE...]</p>';
                
                const result = await compressImage(selectedFile);
                compressedFile = result.file;
                
                infoHTML += `
                    <div class="compression-info">
                        <p>[✓] COMPRESSION_COMPLETE</p>
                        <p>ORIGINAL: ${(result.originalSize / 1024 / 1024).toFixed(2)}MB</p>
                        <p>COMPRESSED: ${(result.compressedSize / 1024 / 1024).toFixed(2)}MB</p>
                        <p class="compression-savings">SAVED: ${result.compressionRatio}% (${((result.originalSize - result.compressedSize) / 1024 / 1024).toFixed(2)}MB)</p>
                        <p>QUALITY: ${(result.finalQuality * 100).toFixed(0)}%</p>
                    </div>
                `;
            } catch (error) {
                console.error('Compression error:', error);
                infoHTML += '<p style="color: #ff0000;">[!] COMPRESSION_FAILED - USING_ORIGINAL</p>';
            }
        } else if (fileType === 'video') {
            try {
                document.getElementById('fileInfo').innerHTML = infoHTML + '<p style="color: #ffff00;">[ANALYZING_VIDEO...]</p>';
                
                const result = await compressVideo(selectedFile);
                
                infoHTML += `
                    <div class="compression-info">
                        <p>[i] VIDEO_ANALYSIS_COMPLETE</p>
                        <p>DURATION: ${result.duration.toFixed(1)}s</p>
                        <p>CURRENT_SIZE: ${(result.originalSize / 1024 / 1024).toFixed(2)}MB</p>
                        <p>ESTIMATED_COMPRESSED: ${(result.compressedSize / 1024 / 1024).toFixed(2)}MB</p>
                        <p class="compression-savings">POTENTIAL_SAVINGS: ${result.compressionRatio}%</p>
                        <p style="color: #ffaa00;">[!] NOTE: Video will be uploaded as-is.</p>
                        <p style="font-size: 0.8em;">For heavy compression, use external tools first.</p>
                    </div>
                `;
            } catch (error) {
                console.error('Video analysis error:', error);
                infoHTML += '<p style="color: #ff0000;">[!] VIDEO_ANALYSIS_FAILED</p>';
            }
        } else {
            infoHTML += `
                <div class="compression-info">
                    <p>[i] FILE_TYPE: ${fileType.toUpperCase()}</p>
                    <p>No compression available for this file type.</p>
                    <p>File will be uploaded as-is.</p>
                </div>
            `;
        }
        
        document.getElementById('fileInfo').innerHTML = infoHTML;
        document.getElementById('fileInfo').style.display = 'block';
     
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

// Upload with Smart Compression
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
 
    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '[UPLOADING...] 0%';
 
    document.querySelectorAll('#uploadForm button, #uploadForm input, #uploadForm textarea').forEach(el => {
        el.disabled = true;
    });
 
    try {
        // Use compressed file for images, original for others
        const fileToUpload = compressedFile || selectedFile;
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        progressFill.style.width = '10%';
        progressText.textContent = '[UPLOADING...] 10%';
        
        // Upload with progress
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(fileName, fileToUpload, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (uploadError) throw uploadError;
        
        progressFill.style.width = '80%';
        progressText.textContent = '[PROCESSING...] 80%';
     
        // Get public URL
        const { data: urlData } = supabase.storage
            .from('files')
            .getPublicUrl(fileName);
     
        // Create database entry
        const { error: dbError } = await supabase
            .from('content')
            .insert([{
                title,
                description,
                file_url: urlData.publicUrl,
                file_type: detectFileType(selectedFile),
                file_size: fileToUpload.size,
                uploader_name: currentUser.display_name || currentUser.username,
                uploader_id: currentUser.id,
                view_count: 0,
                tags
            }]);
     
        if (dbError) throw dbError;
     
        progressFill.style.width = '100%';
        progressText.textContent = '[✓] UPLOAD_COMPLETE';
     
        setTimeout(() => {
            hideModal('uploadModal');
            loadContent();
        }, 800);
     
    } catch (err) {
        console.error('Upload error:', err);
        showError('uploadError', 'Upload failed: ' + err.message);
        progressContainer.style.display = 'none';
     
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
        <div class="card-preview" style="display:flex;align-items:center;justify-content:center;">
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
        case 'image': return '[IMG]';
        case 'document': return '[DOC]';
        default: return '[FILE]';
    }
}

function getTypeLabel(type) {
    const labels = {
        'video': '[VID]',
        'audio': '[AUDIO]',
        'image': '[IMG]',
        'document': '[DOC]',
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

// View Content
async function viewContent(id) {
    const content = allContent.find(c => c.id === id);
    if (!content) return;
 
    const newViewCount = (content.view_count || 0) + 1;
    await supabase
        .from('content')
        .update({ view_count: newViewCount })
        .eq('id', id);
 
    content.view_count = newViewCount;
 
    document.getElementById('viewTitle').textContent = '> ' + content.title;
 
    const viewContent = document.getElementById('viewContent');
    if (content.file_type === 'video') {
        viewContent.innerHTML = `<video controls autoplay src="${content.file_url}" style="width:100%;height:80vh;background:#000;object-fit:contain;"></video>`;
    } else if (content.file_type === 'image') {
        viewContent.innerHTML = `<img src="${content.file_url}" alt="${escapeHtml(content.title)}" style="width:100%;height:80vh;object-fit:contain;background:#000;">`;
    } else if (content.file_type === 'audio') {
        viewContent.innerHTML = `
            <div style="padding:2rem;background:#000;border:2px solid rgba(0,255,65,0.3);text-align:center;height:80vh;display:flex;flex-direction:column;justify-content:center;">
                <div style="font-size:4rem;margin-bottom:1rem;">[AUDIO]</div>
                <audio controls autoplay src="${content.file_url}" style="width:100%;filter:invert(1) hue-rotate(180deg);"></audio>
            </div>
        `;
    } else {
        viewContent.innerHTML = `
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
 
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }
 
    showModal('viewModal');
    filterContent();
}

// Delete Content
async function deleteContent(id) {
    if (!window.confirm('[CONFIRM_DELETE?] This action cannot be undone.')) return;
 
    const content = allContent.find(c => c.id === id);
    if (!content) return;
 
    try {
        const { error: dbError } = await supabase
            .from('content')
            .delete()
            .eq('id', id);
     
        if (dbError) throw dbError;
     
        const fileName = content.file_url.split('/').pop();
        await supabase.storage.from('files').remove([fileName]);
     
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
