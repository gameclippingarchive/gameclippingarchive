// Supabase Configuration
const SUPABASE_URL = 'https://tgnqbayejloephsdqxae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnFiYXllamxvZXBoc2RxeGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMyMzUsImV4cCI6MjA3ODk4OTIzNX0.yICueAwjGZyFt5ycnhxOEx8MHgFhRBi9Zd4Drhj89IQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Enhanced Compression Settings
const COMPRESSION_CONFIG = {
    image: {
        maxWidth: 2560,
        maxHeight: 2560,
        quality: 0.82,
        targetSizeMB: Infinity,
        minQuality: 0.6
    },
    video: {
        maxWidth: 1920,
        maxHeight: 1080,
        targetBitrate: 3000000, // Balanced bitrate for good quality
        maxBitrate: 5000000,
        minBitrate: 1000000,
        targetFPS: 30, // Maintain frame rate
        targetSizeMB: Infinity
    },
    audio: {
        targetBitrate: 128000, // Good quality audio
        targetSizeMB: Infinity
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
        .compression-progress {
            width: 100%;
            height: 4px;
            background: rgba(0,255,0,0.2);
            margin: 8px 0;
            border-radius: 2px;
            overflow: hidden;
        }
        .compression-progress-bar {
            height: 100%;
            background: #00ff00;
            transition: width 0.3s ease;
            box-shadow: 0 0 10px #00ff00;
        }
        .upload-progress-container {
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: #000;
            border: 1px solid #00ff00;
            padding: 10px;
            box-shadow: 0 0 10px #00ff00;
            z-index: 1000;
        }
        .file-preview-container {
            position: relative;
            width: 100%;
            max-height: 300px;
            overflow: hidden;
            border: 1px solid #00ff00;
            margin: 10px 0;
            background: #001100;
        }
        .file-preview-container img,
        .file-preview-container video {
            width: 100%;
            height: auto;
            display: block;
            max-height: 250px;
            object-fit: contain;
        }
        .preview-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(0,0,0,0.8);
            padding: 8px;
            border-top: 1px solid #00ff00;
        }
        .file-icon-preview {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 150px;
            background: #001100;
            border: 1px solid #00ff00;
            margin: 10px 0;
            font-size: 3rem;
            color: rgba(0,255,65,0.6);
        }
        .upload-processing-card {
            border: 2px solid #00ff00;
            padding: 15px;
            margin: 10px 0;
            background: rgba(0, 255, 0, 0.05);
            border-radius: 5px;
        }
        .upload-processing-card.completed {
            border-color: #00ffff;
            background: rgba(0, 255, 255, 0.05);
        }
        .processing-header {
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(0, 255, 0, 0.3);
        }
        .processing-frame {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 2px solid #00ff00;
        }
        .processing-frame.completed {
            border-color: #00ffff;
            background: rgba(0, 255, 255, 0.1);
        }
        .processing-text {
            color: #00ff00;
            font-size: 1.1em;
            margin-bottom: 10px;
            text-shadow: 0 0 10px #00ff00;
        }
        .upload-processing-frame {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 320px;
            background: #000;
            border: 3px solid #00ff00;
            padding: 20px;
            z-index: 10000;
            box-shadow: 0 0 30px #00ff00;
            font-family: 'Courier New', monospace;
        }
        .upload-card-header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #00ff00;
        }
        .upload-card-title {
            color: #00ff00;
            font-size: 1.2em;
            margin-bottom: 5px;
            text-shadow: 0 0 10px #00ff00;
        }
        .upload-card-filename {
            color: #00ffff;
            font-size: 0.9em;
            word-break: break-all;
        }
        .upload-card-preview {
            height: 120px;
            margin: 15px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid rgba(0, 255, 0, 0.5);
            background: rgba(0, 255, 0, 0.05);
            position: relative;
        }
        .upload-preview-image,
        .upload-preview-video,
        .upload-preview-audio,
        .upload-preview-file {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2em;
            color: rgba(0, 255, 0, 0.7);
        }
        .file-type-badge {
            position: absolute;
            top: 5px;
            right: 5px;
            background: rgba(0, 0, 0, 0.8);
            padding: 2px 8px;
            border: 1px solid #00ff00;
            font-size: 0.8em;
        }
        .upload-card-status {
            text-align: center;
        }
        .upload-status-text {
            color: #00ff00;
            margin-bottom: 10px;
            font-size: 0.9em;
            min-height: 1.2em;
        }
        .upload-progress-container {
            width: 100%;
            height: 6px;
            background: rgba(0, 255, 0, 0.2);
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        .upload-progress-bar {
            height: 100%;
            background: #00ff00;
            transition: width 0.3s ease;
            box-shadow: 0 0 10px #00ff00;
        }
        .upload-percentage {
            color: #00ffff;
            font-size: 0.9em;
        }
        .upload-success {
            border-color: #00ff00;
            box-shadow: 0 0 40px #00ff00;
        }
        .upload-success .upload-status-text {
            color: #00ff00;
        }
        .upload-error {
            border-color: #ff0000;
            box-shadow: 0 0 40px #ff0000;
        }
        .upload-error .upload-status-text {
            color: #ff0000;
        }
    `;
    document.head.appendChild(style);
}

// Advanced Image Compression with Aggressive Settings
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

                // ALWAYS scale down to max dimensions for compression
                const ratio = Math.min(config.maxWidth / width, config.maxHeight / height, 1);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d', { alpha: false });

                // Multi-pass downscaling for better quality
                if (ratio < 0.5) {
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d', { alpha: false });
                    let currentWidth = img.width;
                    let currentHeight = img.height;
                    tempCanvas.width = currentWidth;
                    tempCanvas.height = currentHeight;
                    tempCtx.drawImage(img, 0, 0);

                    // Progressively scale down
                    while (currentWidth > width * 2 || currentHeight > height * 2) {
                        currentWidth = Math.max(Math.floor(currentWidth / 2), width);
                        currentHeight = Math.max(Math.floor(currentHeight / 2), height);
                        const nextCanvas = document.createElement('canvas');
                        const nextCtx = nextCanvas.getContext('2d', { alpha: false });
                        nextCanvas.width = currentWidth;
                        nextCanvas.height = currentHeight;
                        nextCtx.imageSmoothingEnabled = true;
                        nextCtx.imageSmoothingQuality = 'high';
                        nextCtx.drawImage(tempCanvas, 0, 0, currentWidth, currentHeight);
                        tempCanvas.width = currentWidth;
                        tempCanvas.height = currentHeight;
                        tempCtx.clearRect(0, 0, currentWidth, currentHeight);
                        tempCtx.drawImage(nextCanvas, 0, 0);
                    }
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(tempCanvas, 0, 0, width, height);
                } else {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                }

                // Compress with quality setting
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Canvas compression failed'));
                            return;
                        }

                        // Create compressed file - keep original extension in metadata
                        const compressedFile = new File(
                            [blob],
                            file.name.split('.')[0] + '_compressed.jpg',
                            {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            }
                        );

                        const originalMB = file.size / 1024 / 1024;
                        const compressedMB = blob.size / 1024 / 1024;
                        const savedPercent = ((1 - blob.size / file.size) * 100).toFixed(1);

                        resolve({
                            file: compressedFile,
                            originalSize: file.size,
                            compressedSize: blob.size,
                            compressionRatio: savedPercent,
                            dimensions: `${width}x${height}`,
                            originalDimensions: `${img.width}x${img.height}`
                        });
                    },
                    'image/jpeg',
                    config.quality
                );
            };
            img.onerror = () => reject(new Error('Image loading failed'));
        };
        reader.onerror = () => reject(new Error('File reading failed'));
    });
}

// Function to get best video mime type
function getBestVideoMime() {
    const candidates = [
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/mp4',
        'video/webm'
    ];
    for (const mime of candidates) {
        if (MediaRecorder.isTypeSupported(mime)) {
            console.log('Using video mime type:', mime);
            return mime;
        }
    }
    return 'video/webm';
}

// Function to get best audio mime type
function getBestAudioMime() {
    const candidates = [
        'audio/mp4;codecs=mp4a.40.2',
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4'
    ];
    for (const mime of candidates) {
        if (MediaRecorder.isTypeSupported(mime)) {
            console.log('Using audio mime type:', mime);
            return mime;
        }
    }
    return 'audio/webm';
}

// Improved Video Compression that maintains quality
async function compressVideo(file, config = COMPRESSION_CONFIG.video) {
    try {
        console.log('[Starting video compression...]');
        
        // For very small files, skip compression
        if (file.size < 5 * 1024 * 1024) { // 5MB
            console.log('[Video is small, skipping compression]');
            return {
                file: file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
                note: 'Video is already small, using original.'
            };
        }

        const url = URL.createObjectURL(file);
        const video = document.createElement('video');
        video.src = url;
        video.muted = true;
        video.playsInline = true;
        video.style.display = 'none';
        document.body.appendChild(video);

        await new Promise((resolve, reject) => {
            video.onloadedmetadata = resolve;
            video.onerror = reject;
            setTimeout(() => reject(new Error('Video metadata loading timeout')), 10000);
        });

        let width = video.videoWidth;
        let height = video.videoHeight;
        const originalAspectRatio = width / height;
        
        // Calculate optimal dimensions while maintaining aspect ratio
        const ratio = Math.min(config.maxWidth / width, config.maxHeight / height, 1);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);

        console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight} -> ${width}x${height}`);

        // Calculate adaptive bitrate based on resolution and content
        const pixelCount = width * height;
        let targetBitrate = config.targetBitrate;
        
        // Adjust bitrate based on resolution
        if (pixelCount > 1920 * 1080) {
            targetBitrate = config.maxBitrate;
        } else if (pixelCount < 640 * 480) {
            targetBitrate = config.minBitrate;
        }
        
        // Adjust bitrate based on original file size (higher quality for larger files)
        const originalMB = file.size / (1024 * 1024);
        if (originalMB > 100) {
            targetBitrate = Math.min(targetBitrate * 1.5, config.maxBitrate);
        }

        console.log(`Using bitrate: ${targetBitrate}bps`);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.display = 'none';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const canvasStream = canvas.captureStream(config.targetFPS);
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        
        let audioTrack;
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioTrack = audioStream.getAudioTracks()[0];
        } catch (e) {
            console.log('No audio track available');
        }

        const combinedStream = new MediaStream();
        combinedStream.addTrack(canvasStream.getVideoTracks()[0]);
        if (audioTrack) {
            combinedStream.addTrack(audioTrack);
        }

        const mimeType = getBestVideoMime();
        const options = {
            mimeType: mimeType,
            videoBitsPerSecond: targetBitrate,
            audioBitsPerSecond: config.audio.targetBitrate
        };

        // Fallback if preferred mime type not supported
        if (!MediaRecorder.isTypeSupported(mimeType)) {
            options.mimeType = 'video/webm';
            console.log('Falling back to default webm');
        }

        const mediaRecorder = new MediaRecorder(combinedStream, options);
        const chunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        const compressed = new Promise((resolve, reject) => {
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
                resolve(blob);
            };
            mediaRecorder.onerror = (e) => {
                console.error('MediaRecorder error:', e);
                reject(new Error('Media recording failed'));
            };
        });

        // Start recording
        mediaRecorder.start(1000); // Collect data every second for better performance

        let drawing = true;
        let startTime = Date.now();
        
        function drawFrame() {
            if (!drawing || video.ended || video.paused) return;
            
            try {
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(video, 0, 0, width, height);
                
                // Update progress
                const progressBar = document.getElementById('compressionProgress');
                if (progressBar && video.duration > 0) {
                    const percent = (video.currentTime / video.duration) * 100;
                    progressBar.style.width = `${percent}%`;
                }
                
                requestAnimationFrame(drawFrame);
            } catch (e) {
                console.error('Drawing error:', e);
                drawing = false;
            }
        }

        // Wait for video to be ready
        await new Promise(resolve => {
            video.oncanplay = resolve;
        });

        video.play().then(() => {
            drawFrame();
        }).catch(e => {
            console.error('Video play failed:', e);
            drawing = false;
            mediaRecorder.stop();
        });

        // Stop when video ends
        video.onended = () => {
            drawing = false;
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 1000);
        };

        // Safety timeout
        const safetyTimeout = setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
                console.log('Safety timeout reached, stopping recording');
                mediaRecorder.stop();
            }
        }, 300000); // 5 minute timeout

        const blob = await compressed;
        clearTimeout(safetyTimeout);

        // Cleanup
        document.body.removeChild(video);
        document.body.removeChild(canvas);
        URL.revokeObjectURL(url);
        if (audioContext) audioContext.close();

        const compressedMB = blob.size / (1024 * 1024);
        const compressionRatio = ((1 - blob.size / file.size) * 100).toFixed(1);

        console.log(`[✓ Video compressed: ${(file.size/1024/1024).toFixed(2)}MB → ${compressedMB.toFixed(2)}MB, ratio: ${compressionRatio}%]`);

        // If compression didn't help much or made it larger, return original
        if (blob.size >= file.size * 0.95) { // Less than 5% savings
            console.log('[Compression not effective, using original]');
            return {
                file: file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
                note: 'Compression not effective, using original.'
            };
        }

        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const compressedFile = new File([blob], 
            file.name.replace(/\.[^.]+$/, `_compressed.${ext}`), {
            type: mimeType.split(';')[0]
        });

        return {
            file: compressedFile,
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio: compressionRatio,
            dimensions: `${width}x${height}`,
            originalDimensions: `${video.videoWidth}x${video.videoHeight}`,
            note: `Quality maintained at ${width}x${height} ${config.targetFPS}fps`
        };
    } catch (error) {
        console.error('[✗ Video compression error:]', error);
        // Cleanup on error
        document.querySelectorAll('video, canvas').forEach(el => {
            if (el.parentNode === document.body) el.remove();
        });
        return {
            file: file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
            error: true,
            note: `Video compression failed: ${error.message}. Uploading original.`
        };
    }
}

// Audio Compression using native browser APIs (MediaRecorder)
async function compressAudio(file, config = COMPRESSION_CONFIG.audio) {
    try {
        console.log('[Starting audio compression...]');
        
        // Skip compression for small audio files
        if (file.size < 2 * 1024 * 1024) { // 2MB
            return {
                file: file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
                note: 'Audio file is small, using original.'
            };
        }

        const url = URL.createObjectURL(file);
        const audio = document.createElement('audio');
        audio.src = url;
        audio.style.display = 'none';
        document.body.appendChild(audio);

        await new Promise((resolve, reject) => {
            audio.onloadedmetadata = resolve;
            audio.onerror = reject;
            setTimeout(() => reject(new Error('Audio metadata loading timeout')), 10000);
        });

        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audio);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination); // Keep audio playing

        const mimeType = getBestAudioMime();
        const options = {
            mimeType: mimeType,
            audioBitsPerSecond: config.targetBitrate
        };

        const mediaRecorder = new MediaRecorder(destination.stream, options);
        const chunks = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                chunks.push(e.data);
            }
        };

        const compressed = new Promise((resolve, reject) => {
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
                resolve(blob);
            };
            mediaRecorder.onerror = reject;
        });

        mediaRecorder.start(1000);

        // Update progress
        const progressBar = document.getElementById('compressionProgress');
        audio.ontimeupdate = () => {
            if (progressBar && audio.duration > 0) {
                const percent = (audio.currentTime / audio.duration) * 100;
                progressBar.style.width = `${percent}%`;
            }
        };

        audio.play();

        await new Promise(resolve => {
            audio.onended = resolve;
            setTimeout(resolve, 300000); // 5 minute timeout
        });

        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }

        const blob = await compressed;

        // Cleanup
        document.body.removeChild(audio);
        URL.revokeObjectURL(url);
        audioContext.close();

        if (blob.size >= file.size * 0.95) {
            console.log('[Audio compression not effective, using original]');
            return {
                file: file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 0,
                note: 'Compression not effective, using original.'
            };
        }

        const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
        const compressedFile = new File([blob], 
            file.name.replace(/\.[^.]+$/, `_compressed.${ext}`), {
            type: mimeType.split(';')[0]
        });

        console.log(`[✓ Audio compressed: ${(file.size/1024/1024).toFixed(2)}MB → ${(blob.size/1024/1024).toFixed(2)}MB]`);

        return {
            file: compressedFile,
            originalSize: file.size,
            compressedSize: blob.size,
            compressionRatio: ((1 - blob.size / file.size) * 100).toFixed(1)
        };
    } catch (error) {
        console.error('[✗ Audio compression error:]', error);
        return {
            file: file,
            originalSize: file.size,
            compressedSize: file.size,
            compressionRatio: 0,
            error: true,
            note: `Audio compression failed: ${error.message}. Uploading original.`
        };
    }
}

// Function to create a progress container for background upload
function createUploadProgress(fileName) {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'upload-progress-container';
    progressContainer.innerHTML = `
        <p>Uploading ${fileName}</p>
        <div class="compression-progress">
            <div class="compression-progress-bar" style="width: 0%"></div>
        </div>
    `;
    document.body.appendChild(progressContainer);
    return progressContainer.querySelector('.compression-progress-bar');
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
            .insert([{ username, password, display_name: displayName }])
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

// Enhanced File Selection with Smart Compression - Now shows preview with progress
async function handleFileSelect(e) {
    selectedFile = e.target.files[0];
    compressedFile = null;
    
    if (selectedFile) {
        const fileLabel = document.querySelector('.file-label');
        fileLabel.classList.add('has-file');
        document.getElementById('fileLabel').textContent = '[FILE_LOADED]';
        
        const fileType = detectFileType(selectedFile);
        const fileSizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
        
        // Create preview with progress overlay
        let previewHTML = '';
        let mediaUrl = null;
        
        if (fileType === 'image') {
            mediaUrl = URL.createObjectURL(selectedFile);
            previewHTML = `<div class="file-preview-container">
                <img src="${mediaUrl}" alt="Preview">
                <div class="preview-overlay">
                    <div class="processing-frame">
                        <div class="processing-text">[PROCESSING]</div>
                        <div class="compression-progress">
                            <div class="compression-progress-bar" id="compressionProgress" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (fileType === 'video') {
            mediaUrl = URL.createObjectURL(selectedFile);
            previewHTML = `<div class="file-preview-container">
                <video src="${mediaUrl}" muted></video>
                <div class="preview-overlay">
                    <div class="processing-frame">
                        <div class="processing-text">[PROCESSING]</div>
                        <div class="compression-progress">
                            <div class="compression-progress-bar" id="compressionProgress" style="width: 0%"></div>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (fileType === 'audio') {
            previewHTML = `<div class="file-icon-preview">
                [AUDIO]
                <div class="processing-frame">
                    <div class="processing-text">[PROCESSING]</div>
                    <div class="compression-progress">
                        <div class="compression-progress-bar" id="compressionProgress" style="width: 0%"></div>
                    </div>
                </div>
            </div>`;
        } else {
            previewHTML = `<div class="file-icon-preview">
                [FILE]
                <div class="processing-frame">
                    <div class="processing-text">[PROCESSING]</div>
                    <div class="compression-progress">
                        <div class="compression-progress-bar" id="compressionProgress" style="width: 0%"></div>
                    </div>
                </div>
            </div>`;
        }
        
        let infoHTML = `<div class="upload-processing-card">
            <div class="processing-header">
                <p><strong>${selectedFile.name}</strong></p>
                <small>SIZE: ${fileSizeMB}MB :: TYPE: ${fileType.toUpperCase()}</small>
            </div>
            ${previewHTML}
        </div>`;
        
        document.getElementById('fileInfo').innerHTML = infoHTML;
        document.getElementById('fileInfo').style.display = 'block';

        // Smart compression based on file type
        try {
            let result;
            const progressBar = document.getElementById('compressionProgress');
            
            if (fileType === 'image') {
                progressBar.style.width = '30%';
                updateProcessingText('[OPTIMIZING_IMAGE...]');
                result = await compressImage(selectedFile);
            } else if (fileType === 'video') {
                progressBar.style.width = '30%';
                updateProcessingText('[COMPRESSING_VIDEO...]');
                result = await compressVideo(selectedFile);
            } else if (fileType === 'audio') {
                progressBar.style.width = '30%';
                updateProcessingText('[COMPRESSING_AUDIO...]');
                result = await compressAudio(selectedFile);
            } else {
                result = {
                    file: selectedFile,
                    originalSize: selectedFile.size,
                    compressedSize: selectedFile.size,
                    compressionRatio: 0
                };
            }

            progressBar.style.width = '100%';
            updateProcessingText('[COMPRESSION_COMPLETE]');

            if (result) {
                if (result.compressedSize < result.originalSize) {
                    compressedFile = result.file;
                } else {
                    result = {
                        file: selectedFile,
                        originalSize: selectedFile.size,
                        compressedSize: selectedFile.size,
                        compressionRatio: 0,
                        note: 'Compressed file was larger; using original.'
                    };
                }

                infoHTML = `<div class="upload-processing-card completed">
                    <div class="processing-header">
                        <p><strong>${selectedFile.name}</strong></p>
                        <small>TYPE: ${fileType.toUpperCase()}</small>
                    </div>
                    ${previewHTML.replace('processing-frame', 'processing-frame completed')}
                    <div class="compression-info">
                        <p>[READY_FOR_UPLOAD]</p>
                        ${result.originalDimensions ? `<p>ORIGINAL_DIM: ${result.originalDimensions}</p>` : ''}
                        ${result.dimensions ? `<p>COMPRESSED_DIM: ${result.dimensions}</p>` : ''}
                        <p>ORIGINAL_SIZE: ${(result.originalSize / 1024 / 1024).toFixed(2)}MB</p>
                        <p>COMPRESSED_SIZE: ${(result.compressedSize / 1024 / 1024).toFixed(2)}MB</p>
                        <p style="color: #00ffff;">SPACE_SAVED: ${result.compressionRatio}%</p>
                        ${result.compressedSize < result.originalSize ? 
                            '<p style="color: #00ff00;">✓ COMPRESSION_SUCCESSFUL</p>' : 
                            '<p style="color: #ffaa00;">⚠ FILE_ALREADY_OPTIMIZED</p>'
                        }
                        ${result.note ? `<p>${result.note}</p>` : ''}
                    </div>
                </div>`;
            }
        } catch (error) {
            console.error('Processing error:', error);
            updateProcessingText('[PROCESSING_FAILED - WILL_UPLOAD_ORIGINAL]', true);
        }

        document.getElementById('fileInfo').innerHTML = infoHTML;

        // Auto-fill title if empty
        if (!document.getElementById('uploadTitle').value) {
            document.getElementById('uploadTitle').value = selectedFile.name.replace(/\.[^/.]+$/, '');
        }

        // Clean up media URLs
        if (mediaUrl) {
            setTimeout(() => URL.revokeObjectURL(mediaUrl), 1000);
        }
    }
}

// Function to update processing text
function updateProcessingText(text, isError = false) {
    const processingText = document.querySelector('.processing-text');
    if (processingText) {
        processingText.textContent = text;
        if (isError) {
            processingText.style.color = '#ff0000';
        }
    }
}

// Upload with Compression - Enhanced with cool processing frame
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
    const fileType = detectFileType(selectedFile);
    const fileToUpload = compressedFile || selectedFile;

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    const originalExt = selectedFile.name.split('.').pop().toLowerCase();
    let finalExt = originalExt;

    if (compressedFile) {
        if (fileType === 'image') {
            finalExt = 'jpg';
        } else if (fileType === 'video') {
            finalExt = compressedFile.name.split('.').pop().toLowerCase();
        } else if (fileType === 'audio') {
            finalExt = compressedFile.name.split('.').pop().toLowerCase();
        }
    }

    const fileName = `${timestamp}-${randomStr}.${finalExt}`;

    console.log('Uploading file:', fileName, 'Size:', fileToUpload.size, 'Type:', fileToUpload.type);

    // Create upload processing card
    const uploadCard = createUploadProcessingCard(selectedFile, fileName);
    document.body.appendChild(uploadCard);

    // Close the modal
    hideModal('uploadModal');

    try {
        // Update status to uploading
        updateUploadStatus(uploadCard, '[UPLOADING_TO_SERVER...]', 30);

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(fileName, fileToUpload, {
                cacheControl: '3600',
                upsert: false,
                contentType: fileToUpload.type
            });

        if (uploadError) {
            console.error('Upload error details:', uploadError);
            throw uploadError;
        }

        updateUploadStatus(uploadCard, '[CREATING_DATABASE_ENTRY...]', 80);

        const { data: urlData } = supabase.storage
            .from('files')
            .getPublicUrl(fileName);

        const { error: dbError } = await supabase
            .from('content')
            .insert([{
                title,
                description,
                file_url: urlData.publicUrl,
                file_type: fileType,
                file_size: fileToUpload.size,
                uploader_name: currentUser.display_name || currentUser.username,
                uploader_id: currentUser.id,
                view_count: 0,
                tags
            }]);

        if (dbError) throw dbError;

        updateUploadStatus(uploadCard, '[UPLOAD_COMPLETE]', 100);
        
        // Add success styling
        uploadCard.classList.add('upload-success');
        
        loadContent();
        
        // Remove after 3 seconds
        setTimeout(() => {
            uploadCard.remove();
        }, 3000);
        
    } catch (err) {
        console.error('Upload error:', err);
        updateUploadStatus(uploadCard, `[UPLOAD_FAILED: ${err.message}]`, 0, true);
        
        // Keep error visible for longer
        setTimeout(() => {
            uploadCard.remove();
        }, 5000);
    }
}

// Create upload processing card
function createUploadProcessingCard(file, fileName) {
    const fileType = detectFileType(file);
    const card = document.createElement('div');
    card.className = 'upload-processing-frame';
    card.innerHTML = `
        <div class="upload-card-header">
            <div class="upload-card-title">UPLOADING_FILE</div>
            <div class="upload-card-filename">${fileName}</div>
        </div>
        <div class="upload-card-preview">
            ${fileType === 'image' ? 
                `<div class="upload-preview-image">
                    <div class="file-type-badge">[IMG]</div>
                </div>` :
            fileType === 'video' ?
                `<div class="upload-preview-video">
                    <div class="file-type-badge">[VID]</div>
                </div>` :
            fileType === 'audio' ?
                `<div class="upload-preview-audio">
                    <div class="file-type-badge">[AUDIO]</div>
                </div>` :
                `<div class="upload-preview-file">
                    <div class="file-type-badge">[FILE]</div>
                </div>`
            }
        </div>
        <div class="upload-card-status">
            <div class="upload-status-text">[INITIALIZING_UPLOAD...]</div>
            <div class="upload-progress-container">
                <div class="upload-progress-bar"></div>
            </div>
            <div class="upload-percentage">0%</div>
        </div>
    `;
    return card;
}

// Update upload status
function updateUploadStatus(uploadCard, status, progress, isError = false) {
    const statusText = uploadCard.querySelector('.upload-status-text');
    const progressBar = uploadCard.querySelector('.upload-progress-bar');
    const percentage = uploadCard.querySelector('.upload-percentage');
    
    if (statusText) statusText.textContent = status;
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (percentage) percentage.textContent = `${Math.round(progress)}%`;
    
    if (isError) {
        statusText.style.color = '#ff0000';
        uploadCard.classList.add('upload-error');
    } else if (progress === 100) {
        statusText.style.color = '#00ff00';
    }
}

function detectFileType(file) {
    const type = file.type;
    const name = file.name.toLowerCase();
    
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/') || name.match(/\.(mp3|wav|ogg|m4a|flac|aac)/)) return 'audio';
    if (type.includes('pdf') || type.includes('document') || type.includes('text')) return 'document';
    return 'other';
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
