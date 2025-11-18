// Supabase Configuration
const SUPABASE_URL = 'https://tgnqbayejloephsdqxae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnFiYXllamxvZXBoc2RxeGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMyMzUsImV4cCI6MjA3ODk4OTIzNX0.yICueAwjGZyFt5ycnhxOEx8MHgFhRBi9Zd4Drhj89IQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Upload Configuration
const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB max file size
const CONCURRENT_UPLOADS = 3; // Number of simultaneous chunk uploads

// State
let currentUser = null;
let allContent = [];
let currentFilter = 'all';
let selectedFile = null;
let uploadController = null; // For handling upload cancellation

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
            max-width: 90vw;
            max-height: 90vh;
            overflow: hidden;
        }
        .upload-optimization {
            margin: 10px 0;
            padding: 10px;
            border: 1px solid #00ff00;
            background: rgba(0, 255, 0, 0.1);
        }
        .optimization-option {
            margin: 5px 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .chunk-progress {
            margin-top: 5px;
            font-size: 0.8em;
            color: #00ff00;
        }
        .cancel-upload {
            background: #ff0000 !important;
            color: #000 !important;
            border: 1px solid #ff0000 !important;
        }
    `;
    document.head.appendChild(style);
}

// Enhanced File Selection with Size Validation
function handleFileSelect(e) {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        // File size validation
        if (selectedFile.size > MAX_FILE_SIZE) {
            showError('uploadError', `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
            selectedFile = null;
            document.getElementById('fileInput').value = '';
            return;
        }

        const fileLabel = document.querySelector('.file-label');
        fileLabel.classList.add('has-file');
        document.getElementById('fileLabel').textContent = '[FILE_LOADED]';
     
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.innerHTML = `
            <p><strong>${selectedFile.name}</strong></p>
            <small>SIZE: ${formatFileSize(selectedFile.size)} :: TYPE: ${detectFileType(selectedFile).toUpperCase()}</small>
            <div class="upload-optimization">
                <p><strong>[UPLOAD_OPTIMIZATION]</strong></p>
                <div class="optimization-option">
                    <input type="checkbox" id="chunkUpload" checked>
                    <label for="chunkUpload">Enable Chunked Upload (${Math.ceil(selectedFile.size / CHUNK_SIZE)} chunks)</label>
                </div>
                <div class="optimization-option">
                    <input type="checkbox" id="compressImage" ${selectedFile.type.startsWith('image/') ? '' : 'disabled'}>
                    <label for="compressImage">Compress Images (Preserve Quality)</label>
                </div>
            </div>
        `;
        fileInfo.style.display = 'block';
     
        // Auto-fill title
        if (!document.getElementById('uploadTitle').value) {
            document.getElementById('uploadTitle').value = selectedFile.name.replace(/\.[^/.]+$/, '');
        }
    }
}

// Enhanced Upload with Chunking and Compression
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
    const useChunking = document.getElementById('chunkUpload')?.checked ?? true;
    const compressImages = document.getElementById('compressImage')?.checked ?? false;

    // Show progress
    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '[PREPARING_UPLOAD...] 0%';

    // Add cancel button
    if (!document.querySelector('.cancel-upload')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'card-btn cancel-upload';
        cancelBtn.textContent = '[CANCEL_UPLOAD]';
        cancelBtn.onclick = cancelUpload;
        progressContainer.appendChild(cancelBtn);
    }

    // Disable form
    document.querySelectorAll('#uploadForm button, #uploadForm input, #uploadForm textarea').forEach(el => {
        el.disabled = true;
    });

    uploadController = new AbortController();

    try {
        let processedFile = selectedFile;
        let finalFileName = '';

        // Step 1: Process file (compress if needed)
        if (compressImages && processedFile.type.startsWith('image/')) {
            progressText.textContent = '[COMPRESSING_IMAGE...]';
            processedFile = await compressImageFile(processedFile);
        }

        // Step 2: Upload file
        const fileExt = processedFile.name.split('.').pop();
        finalFileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        let fileUrl;
        if (useChunking && processedFile.size > CHUNK_SIZE) {
            fileUrl = await uploadFileInChunks(processedFile, finalFileName, progressFill, progressText);
        } else {
            fileUrl = await uploadFileSingle(processedFile, finalFileName, progressFill, progressText);
        }

        if (uploadController.signal.aborted) {
            throw new Error('Upload cancelled');
        }

        // Step 3: Create database entry
        progressFill.style.width = '95%';
        progressText.textContent = '[CREATING_RECORD...] 95%';

        const { error: dbError } = await supabase
            .from('content')
            .insert([{
                title,
                description,
                file_url: fileUrl,
                file_type: detectFileType(processedFile),
                file_size: processedFile.size,
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
        if (err.name !== 'AbortError') {
            console.error('Upload error:', err);
            showError('uploadError', 'Upload failed: ' + err.message);
        }
        progressContainer.style.display = 'none';
    } finally {
        // Re-enable form
        document.querySelectorAll('#uploadForm button, #uploadForm input, #uploadForm textarea').forEach(el => {
            el.disabled = false;
        });
        uploadController = null;
    }
}

// Single file upload (for small files)
async function uploadFileSingle(file, fileName, progressFill, progressText) {
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/files/${fileName}`;
        
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percent = (event.loaded / event.total) * 100;
                progressFill.style.width = `${percent}%`;
                progressText.textContent = `[UPLOADING...] ${Math.floor(percent)}%`;
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const { data: urlData } = supabase.storage
                    .from('files')
                    .getPublicUrl(fileName);
                resolve(urlData.publicUrl);
            } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error('Upload error'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));

        if (uploadController) {
            uploadController.signal.addEventListener('abort', () => {
                xhr.abort();
            });
        }

        xhr.send(file);
    });
}

// Chunked file upload (for large files)
async function uploadFileInChunks(file, fileName, progressFill, progressText) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const chunkProgress = Array(totalChunks).fill(0);
    let uploadedChunks = 0;

    // Create progress display for chunks
    const chunkProgressDiv = document.createElement('div');
    chunkProgressDiv.className = 'chunk-progress';
    chunkProgressDiv.innerHTML = `Chunks: 0/${totalChunks}`;
    progressFill.parentNode.appendChild(chunkProgressDiv);

    try {
        // Upload chunks in concurrent batches
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += CONCURRENT_UPLOADS) {
            if (uploadController.signal.aborted) {
                throw new Error('Upload cancelled');
            }

            const chunkBatch = [];
            for (let i = 0; i < CONCURRENT_UPLOADS && (chunkIndex + i) < totalChunks; i++) {
                const currentChunkIndex = chunkIndex + i;
                const start = currentChunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);
                
                chunkBatch.push(uploadChunk(chunk, fileName, currentChunkIndex, totalChunks, chunkProgress));
            }

            await Promise.all(chunkBatch);
            uploadedChunks += chunkBatch.length;

            // Update overall progress
            const overallProgress = (uploadedChunks / totalChunks) * 100;
            progressFill.style.width = `${overallProgress}%`;
            progressText.textContent = `[UPLOADING_CHUNKS...] ${Math.floor(overallProgress)}%`;
            chunkProgressDiv.textContent = `Chunks: ${uploadedChunks}/${totalChunks}`;
        }

        // Combine chunks on server side (Supabase handles this automatically for multipart uploads)
        const { data: urlData } = supabase.storage
            .from('files')
            .getPublicUrl(fileName);

        chunkProgressDiv.remove();
        return urlData.publicUrl;

    } catch (error) {
        chunkProgressDiv.remove();
        throw error;
    }
}

// Upload individual chunk
async function uploadChunk(chunk, fileName, chunkIndex, totalChunks, chunkProgress) {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    formData.append('fileName', fileName);

    const response = await fetch(`${SUPABASE_URL}/storage/v1/object/files/${fileName}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: formData,
        signal: uploadController?.signal
    });

    if (!response.ok) {
        throw new Error(`Chunk ${chunkIndex} upload failed`);
    }

    chunkProgress[chunkIndex] = 1;
    return chunkIndex;
}

// Image compression function
async function compressImageFile(file, quality = 0.8) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Calculate new dimensions while maintaining aspect ratio
                let width = img.width;
                let height = img.height;
                
                // Limit maximum dimensions to 1920px while preserving aspect ratio
                const MAX_DIMENSION = 1920;
                if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                    if (width > height) {
                        height = (height * MAX_DIMENSION) / width;
                        width = MAX_DIMENSION;
                    } else {
                        width = (width * MAX_DIMENSION) / height;
                        height = MAX_DIMENSION;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Cancel upload function
function cancelUpload() {
    if (uploadController) {
        uploadController.abort();
        const progressContainer = document.getElementById('uploadProgress');
        progressContainer.style.display = 'none';
        document.querySelectorAll('#uploadForm button, #uploadForm input, #uploadForm textarea').forEach(el => {
            el.disabled = false;
        });
    }
}

// Enhanced file size formatting
function formatFileSize(bytes) {
    if (!bytes) return 'UNKNOWN';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = Math.round(bytes / Math.pow(1024, i) * 100) / 100;
    return `${size}${sizes[i]}`;
}

// Enhanced file type detection
function detectFileType(file) {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a|flac|aac)$/)) return 'audio';
    if (type.includes('pdf') || type.includes('document') || type.includes('text') || name.match(/\.(txt|doc|docx|pdf)$/)) return 'document';
    if (name.match(/\.(zip|rar|7z|tar|gz)$/)) return 'archive';
    return 'other';
}

// Update the modal hide function to handle upload cancellation
function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = 'auto';

    // Cancel any ongoing upload
    if (uploadController) {
        uploadController.abort();
        uploadController = null;
    }

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
        document.querySelector('.file-label').classList.remove('has-file');
        document.getElementById('fileInput').value = '';
        
        // Remove cancel button
        const cancelBtn = document.querySelector('.cancel-upload');
        if (cancelBtn) cancelBtn.remove();
    } else if (modalId === 'viewModal') {
        const media = document.querySelector('#viewContent video, #viewContent audio');
        if (media) {
            media.pause();
            media.currentTime = 0;
        }
        document.getElementById('viewContent').innerHTML = '';
    }
}
