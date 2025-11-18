// Supabase Configuration
const SUPABASE_URL = 'https://tgnqbayejloephsdqxae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnFiYXllamxvZXBoc2RxeGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMyMzUsImV4cCI6MjA3ODk4OTIzNX0.yICueAwjGZyFt5ycnhxOEx8MHgFhRBi9Zd4Drhj89IQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let currentUser = null;
let allContent = [];
let currentFilter = 'all';
let selectedFile = null;
let fileToUpload = null; // New variable for the compressed file
const MAX_UPLOAD_SIZE_MB = 10; // New limit for client-side check

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
            overflow: hidden; /* Ensure image doesn't overflow */
            position: relative;
        }
        .card-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover; /* Correct scaling for card previews */
        }
        .view-modal .modal-content {
            background: #000;
            border: 2px solid #00ff00;
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .view-content-wrapper {
            flex-grow: 1;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .view-content-wrapper video, .view-content-wrapper img {
            max-width: 100%; /* Fix scaling */
            max-height: 80vh; /* Fix scaling */
            object-fit: contain; /* Preserve aspect ratio without cropping */
        }
    `;
    document.head.appendChild(style);
}

// Auth (Unchanged for brevity, but included for completeness)
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
// Event Listeners (Unchanged for brevity, but included for completeness)
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
// Modal Management (Modified to reset fileToUpload)
function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = 'auto';

    if (modalId === 'uploadModal') {
        document.getElementById('uploadForm').reset();
        document.getElementById('uploadError').classList.remove('active');
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('uploadProgress').style.display = 'none';
        selectedFile = null;
        fileToUpload = null; // IMPORTANT: Reset the compressed file
        document.querySelector('.file-label').classList.remove('has-file');
        document.getElementById('fileInput').value = '';
        // Re-enable form
        document.querySelectorAll('#uploadForm button, #uploadForm input, #uploadForm textarea').forEach(el => {
            el.disabled = false;
        });
    } else if (modalId === 'viewModal') {
        const media = document.querySelector('#viewContent video, #viewContent audio');
        if (media) {
            media.pause();
            media.currentTime = 0;
        }
        document.getElementById('viewContent').innerHTML = '';
    }
    // Other modal resets...
}
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    element.textContent = '[ERROR] ' + message;
    element.classList.add('active');
}
function hideError(elementId) {
    document.getElementById(elementId).classList.remove('active');
}
// Login/Signup/Logout (Unchanged for brevity)
async function handleLogin(e) { /* ... login logic ... */ }
async function handleSignup(e) { /* ... signup logic ... */ }
function logout() { /* ... logout logic ... */ }

// --- FILE SIZE AND COMPRESSION FIXES ---

/**
 * Searches for the best way to preserve file size by attempting to compress images.
 * Other file types (video, audio, etc.) will use the original file.
 * @param {File} file The original file selected by the user.
 * @returns {Promise<File|null>} The compressed file (for image) or the original file.
 */
async function compressImageBeforeUpload(file) {
    if (!file.type.startsWith('image/')) {
        // Only compress images. Videos, audio, and docs should be handled by Supabase limits.
        return file;
    }

    // Check if the file is already under a smaller threshold (e.g., 5MB) to skip heavy compression
    if (file.size <= 5 * 1024 * 1024) {
        // Skip aggressive compression if already small, but still check overall limit later
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;
                let width = img.width;
                let height = img.height;

                // Scale image down if it's too large (maintains aspect ratio)
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert canvas back to a Blob, using a lower quality (0.7) to reduce file size significantly
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Create a new File object from the blob
                        const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                        resolve(compressedFile);
                    } else {
                        // Fallback to original file if compression fails
                        resolve(file);
                    }
                }, 'image/jpeg', 0.7); // Quality 0.7 for strong file size reduction
            };
            img.src = event.target.result;
        };
        reader.onerror = () => resolve(file); // Fallback
        reader.readAsDataURL(file);
    });
}

// File Selection (Updated to include compression)
async function handleFileSelect(e) {
    selectedFile = e.target.files[0];
    fileToUpload = null; // Reset file for upload
    hideError('uploadError');

    if (selectedFile) {
        document.getElementById('uploadTitle').value = selectedFile.name.replace(/\.[^/.]+$/, '');

        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `<p><strong>${selectedFile.name}</strong></p><small>STATUS: [PROCESSING FILE...]</small>`;
        fileInfo.style.display = 'block';

        // Attempt compression/optimization
        const optimizedFile = await compressImageBeforeUpload(selectedFile);
        fileToUpload = optimizedFile;

        const originalSizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
        const uploadSizeMB = (fileToUpload.size / 1024 / 1024).toFixed(2);
        const fileType = detectFileType(selectedFile);

        let statusText = `SIZE: ${uploadSizeMB}MB :: TYPE: ${fileType.toUpperCase()}`;
        if (selectedFile.size !== fileToUpload.size) {
            statusText += ` (Original: ${originalSizeMB}MB, Compressed: ${uploadSizeMB}MB)`;
        }

        if (fileToUpload.size > MAX_UPLOAD_SIZE_MB * 1024 * 1024) {
             showError('uploadError', `File size (${uploadSizeMB}MB) exceeds client limit of ${MAX_UPLOAD_SIZE_MB}MB.`);
             fileToUpload = null; // Prevent upload
        } else {
            hideError('uploadError');
        }

        document.querySelector('.file-label').classList.add('has-file');
        document.getElementById('fileLabel').textContent = '[FILE_LOADED]';
        fileInfo.innerHTML = `<p><strong>${selectedFile.name}</strong></p><small>${statusText}</small>`;

    } else {
        hideModal('uploadModal'); // Resets everything
    }
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

// Upload (Updated to use fileToUpload and record original size)
async function handleUpload(e) {
    e.preventDefault();
    hideError('uploadError');

    if (!currentUser) {
        showError('uploadError', 'You must be logged in to upload');
        return;
    }

    if (!fileToUpload) {
        showError('uploadError', 'Please select a file or address size limit error');
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
        // Upload fileToUpload (which may be the compressed version)
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/files/${fileName}`;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
        xhr.setRequestHeader('Content-Type', fileToUpload.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = (event.loaded / event.total) * 100;
                progressFill.style.width = `${percent}%`;
                progressText.textContent = `[UPLOADING...] ${Math.floor(percent)}%`;
            }
        };

        const uploadPromise = new Promise((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    // Check for Supabase size limit error (often 413 Payload Too Large)
                    let errorMessage = `Upload failed with status ${xhr.status}`;
                    if (xhr.status === 413) {
                         errorMessage = 'Upload failed: File is too large. Supabase default limit is typically 50MB.';
                    }
                    reject(new Error(errorMessage));
                }
            };
            xhr.onerror = () => reject(new Error('Upload error (network issue or CORS)'));
            xhr.send(fileToUpload); // Use fileToUpload
        });

        await uploadPromise;

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
                file_type: detectFileType(fileToUpload),
                // Record the size of the file actually uploaded (could be compressed size)
                file_size: fileToUpload.size,
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
// Load Content / Filter Content (Unchanged for brevity)
async function loadContent() { /* ... */ }
function filterContent() { /* ... */ }

// --- SCALING FIXES AND UI REFINEMENTS ---

// Display Content (Unchanged for brevity)
function displayContent(content) { /* ... */ }

// Create Content Card (Minor cleanup in HTML string)
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
                ${content.description ? `<p class="card-description">${escapeHtml(content.description)}</p>`: ''}
                ${tags || moreTagsLabel ? `<div class="card-tags">${tags}${moreTagsLabel}</div>`: ''}
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

// Get Preview HTML (Updated style for better preview scaling)
function getPreviewHTML(content) {
    const typeLabel = getTypeLabel(content.file_type);
    const ownerBadge = currentUser && (
        currentUser.username === 'Zaid' ||
        content.uploader_name === currentUser.display_name ||
        content.uploader_name === currentUser.username ||
        content.uploader_id === currentUser.id
    ) ? '<div class="card-owner-badge">[YOUR_FILE]</div>' : '';

    if (content.file_type === 'image') {
        // Use object-fit: cover via CSS in polishUI for consistent scaling on cards
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

// View Content (Updated for better modal scaling using new CSS classes)
async function viewContent(id) {
    const content = allContent.find(c => c.id === id);
    if (!content) return;

    // Increment view count (unchanged)
    const newViewCount = (content.view_count || 0) + 1;
    await supabase
        .from('content')
        .update({ view_count: newViewCount })
        .eq('id', id);

    content.view_count = newViewCount;

    document.getElementById('viewTitle').textContent = '> ' + content.title;
    const viewContent = document.getElementById('viewContent');
    let mediaHTML = '';

    if (content.file_type === 'video') {
        // Scaling fixed by CSS: max-width: 100%; max-height: 80vh; object-fit: contain;
        mediaHTML = `<video controls autoplay src="${content.file_url}" style="max-width:100%; max-height:80vh; background:#000; object-fit:contain;"></video>`;
    } else if (content.file_type === 'image') {
        // Scaling fixed by CSS
        mediaHTML = `<img src="${content.file_url}" alt="${escapeHtml(content.title)}" style="max-width:100%; max-height:80vh; object-fit:contain; background:#000;">`;
    } else if (content.file_type === 'audio') {
        mediaHTML = `
            <div style="padding:2rem;background:#000;border:2px solid rgba(0,255,65,0.3);text-align:center;height:80vh;display:flex;flex-direction:column;justify-content:center;width:100%;">
                <div style="font-size:4rem;margin-bottom:1rem;">[AUDIO]</div>
                <audio controls autoplay src="${content.file_url}" style="width:80%; margin: 0 auto; filter:invert(1) hue-rotate(180deg);"></audio>
            </div>
        `;
    } else {
        mediaHTML = `
            <div style="padding:3rem;text-align:center;background:#000;border:2px solid rgba(0,255,65,0.3);height:80vh;display:flex;flex-direction:column;justify-content:center;width:100%;">
                <p style="margin-bottom:1.5rem;">[FILE_PREVIEW_UNAVAILABLE]</p>
            </div>
        `;
    }

    // Wrap the media to control its size within the modal
    viewContent.innerHTML = `<div class="view-content-wrapper">${mediaHTML}</div>`;

    // Other modal updates (unchanged)
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
    filterContent(); // Refresh to show updated view count
}

// Utility functions (Unchanged for brevity)
function getFileIcon(type) { /* ... */ }
function getTypeLabel(type) { /* ... */ }
function formatFileSize(bytes) { /* ... */ }
function escapeHtml(text) { /* ... */ }
async function deleteContent(id) { /* ... */ }
async function downloadFile(url, fileName) { /* ... */ }
