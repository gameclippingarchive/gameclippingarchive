<script src="https://cdn.jsdelivr.net/npm/compressorjs@1.2.1/dist/compressor.min.js"></script>
<script>
// Supabase Config
const SUPABASE_URL = 'https://tgnqbayejloephsdqxae.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnbnFiYXllamxvZXBoc2RxeGFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MTMyMzUsImV4cCI6MjA3ODk4OTIzNX0.yICueAwjGZyFt5ycnhxOEx8MHgFhRBi9Zd4Drhj89IQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let currentUser = null;
let allContent = [];
let currentFilter = 'all';
let selectedFile = null;
let compressedFile = null;

// Init
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    loadContent();
    setupEventListeners();
    polishUI();
});

function polishUI() {
    const style = document.createElement('style');
    style.textContent = `
        body, .modal, .content-card {font-family:'Courier New',monospace;color:#00ff00;background:#000;}
        ::-webkit-scrollbar {width:0;background:transparent;}
        .content-card {border:1px solid #00ff00;padding:10px;margin:10px;box-shadow:0 0 10px #00ff00;min-width:300px;max-width:350px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;}
        .card-actions {display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}
        .card-btn {flex:1;min-width:80px;padding:8px 12px;white-space:nowrap;}
        .card-preview {height:200px;width:100%;object-fit:cover;background:#001100;position:relative;}
        .card-preview img {width:100%;height:100%;object-fit:cover;}
        .card-type-badge {position:absolute;top:8px;left:8px;background:rgba(0,255,0,0.2);padding:4px 8px;font-size:0.7em;border:1px solid #00ff00;}
        .card-owner-badge {position:absolute;bottom:8px;right:8px;background:#00ff00;color:#000;padding:4px 8px;font-size:0.7em;}
        .view-modal .modal-content {background:#000;border:2px solid #00ff00;max-width:90vw;max-height:90vh;overflow:hidden;}
        .compression-info {color:#00ff00;font-size:0.85em;margin-top:5px;padding:5px;border:1px solid rgba(0,255,0,0.3);background:rgba(0,50,0,0.5);}
        .progress-fill {height:100%;background:#00ff00;transition:width 0.3s ease;}
        .progress-fill.fail {background:#ff0066;}
    `;
    document.head.appendChild(style);
}

// GOD-TIER COMPRESSION (WebP)
async function compressImage(file) {
    return new Promise((resolve, reject) => {
        new Compressor(file, {
            quality: 0.75,
            maxWidth: 1920,
            maxHeight: 1920,
            mimeType: 'image/webp',
            convertSize: 3000000,
            success(result) {
                const name = file.name.replace(/\.[^/.]+$/, '') + '.webp';
                const compressed = new File([result], name, { type: 'image/webp' });
                resolve({
                    file: compressed,
                    originalSize: file.size,
                    compressedSize: result.size,
                    compressionRatio: ((1 - result.size / file.size) * 100).toFixed(1)
                });
            },
            error: reject
        });
    });
}

// Auth
function initAuth() {
    const session = localStorage.getItem('gca_session');
    if (session) {
        try { currentUser = JSON.parse(session); updateAuthUI(); }
        catch { localStorage.removeItem('gca_session'); }
    }
}

function updateAuthUI() {
    document.getElementById('loginBtn').style.display = currentUser ? 'none' : 'block';
    document.getElementById('uploadBtn').style.display = currentUser ? 'block' : 'none';
    document.getElementById('logoutBtn').style.display = currentUser ? 'block' : 'none';
}

function setupEventListeners() {
    document.getElementById('loginBtn').onclick = () => showModal('loginModal');
    document.getElementById('uploadBtn').onclick = () => showModal('uploadModal');
    document.getElementById('logoutBtn').onclick = logout;

    document.getElementById('showSignupBtn').onclick = () => { hideModal('loginModal'); showModal('signupModal'); };
    document.getElementById('showLoginBtn').onclick = () => { hideModal('signupModal'); showModal('loginModal'); };

    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
        btn.onclick = e => { const m = e.target.closest('.modal'); if (m) hideModal(m.id); };
    });

    document.getElementById('loginForm').onsubmit = handleLogin;
    document.getElementById('signupForm').onsubmit = handleSignup;
    document.getElementById('uploadForm').onsubmit = handleUpload;
    document.getElementById('fileInput').onchange = handleFileSelect;
    document.getElementById('searchInput').oninput = filterContent;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = e => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.type;
            filterContent();
        };
    });

    document.querySelectorAll('.modal').forEach(m => m.onclick = e => { if (e.target === m) hideModal(m.id); });
}

function showModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = 'auto';

    if (id === 'loginModal') { document.getElementById('loginForm').reset(); document.getElementById('loginError').classList.remove('active'); }
    if (id === 'signupModal') { document.getElementById('signupForm').reset(); document.getElementById('signupError').classList.remove('active'); }
    if (id === 'uploadModal') {
        document.getElementById('uploadForm').reset();
        document.getElementById('fileInfo').style.display = 'none';
        document.getElementById('uploadProgress').style.display = 'none';
        selectedFile = compressedFile = null;
        document.querySelector('.file-label').classList.remove('has-file');
        document.getElementById('fileInput').value = '';
    }
    if (id === 'viewModal') {
        document.getElementById('viewContent').innerHTML = '';
        const media = document.querySelector('#viewContent video, #viewContent audio');
        if (media) media.pause();
    }
}

function showError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = '[ERROR] ' + msg;
    el.classList.add('active');
}

function hideError(id) { document.getElementById(id).classList.remove('active'); }

// Login
async function handleLogin(e) {
    e.preventDefault(); hideError('loginError');
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    const { data, error } = await supabase.from('accounts').select('*').eq('username', username).maybeSingle();
    const res = await data || { error };

    if (res.error || !res.data) return showError('loginError', 'User not found');
    if (res.data.password !== password) return showError('loginError', 'Wrong password');

    currentUser = { id: res.data.id, username: res.data.username, display_name: res.data.display_name };
    localStorage.setItem('gca_session', JSON.stringify(currentUser));
    updateAuthUI();
    hideModal('loginModal');
    loadContent();
}

// Signup
async function handleSignup(e) {
    e.preventDefault(); hideError('signupError');
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirmPassword').value;
    const display = document.getElementById('signupDisplayName').value.trim() || username;

    if (username.length < 3) return showError('signupError', 'Username too short');
    if (password.length < 6) return showError('signupError', 'Password too weak');
    if (password !== confirm) return showError('signupError', 'Passwords do not match');

    const { data, error } = await supabase.from('accounts').insert([{ username, password, display_name: display }]).select().single();

    if (error) {
        if (error.code === '23505') showError('signupError', 'Username taken');
        else showError('signupError', error.message);
        return;
    }

    currentUser = { id: data.id, username: data.username, display_name: data.display_name };
    localStorage.setItem('gca_session', JSON.stringify(currentUser));
    updateAuthUI();
    hideModal('signupModal');
    loadContent();
}

function logout() {
    localStorage.removeItem('gca_session');
    currentUser = null;
    updateAuthUI();
    loadContent();
}

// File Selection + Compression
async function handleFileSelect(e) {
    selectedFile = e.target.files[0];
    compressedFile = null;

    if (!selectedFile) return;

    document.querySelector('.file-label').classList.add('has-file');
    document.getElementById('fileLabel').textContent = '[FILE_LOADED]';

    const type = detectFileType(selectedFile(selectedFile);
    let html = `<p><strong>${selectedFile.name}</strong></p><small>SIZE: ${(selectedFile.size/1024/1024).toFixed(2)}MB :: TYPE: ${type.toUpperCase()}</small>`;

    if (type === 'image') {
        document.getElementById('fileInfo').innerHTML = html + '<p style="color:#ffff00">[COMPRESSING...]</p>';
        document.getElementById('fileInfo').style.display = 'block';

        try {
            const result = await compressImage(selectedFile);
            compressedFile = result.file;
            html += `
                <div class="compression-info">
                    <p>[COMPRESSION_COMPLETE]</p>
                    <p>ORIGINAL → ${(result.originalSize/1024/1024).toFixed(2)}MB</p>
                    <p>COMPRESSED → ${(result.compressedSize/1024/1024/1024).toFixed(2)}MB (WEBP)</p>
                    <p>SAVED: ${result.compressionRatio}%</p>
                </div>`;
        } catch {
            html += '<p style="color:#ff0000;">[FAILED → UPLOADING ORIGINAL]</p>';
        }
    }

    document.getElementById('fileInfo').innerHTML = html;
    document.getElementById('fileInfo').style.display = 'block';

    if (!document.getElementById('uploadTitle').value) {
        document.getElementById('uploadTitle').value = selectedFile.name.replace(/\.[^/.]+$/, '');
    }
}

function detectFileType(file) {
    const t = file.type;
    const n = file.name.toLowerCase();
    if (t.startsWith('image/')) return 'image';
    if (t.startsWith('video/')) return 'video';
    if (t.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(n)) return 'audio';
    if (t.includes('pdf') || t.includes('document') || t.includes('text')) return 'document';
    return 'other';
}

// REAL PROGRESS UPLOAD (THE ONE YOU WANTED)
async function handleUpload(e) {
    e.preventDefault();
    hideError('uploadError');

    if (!currentUser) return showError('uploadError', 'Login required');
    if (!selectedFile) return showError('uploadError', 'Select a file');

    const title = document.getElementById('uploadTitle').value.trim() || selectedFile.name;
    const description = document.getElementById('uploadDescription').value.trim();
    const tags = document.getElementById('uploadTags').value.trim().split(',').map(t => t.trim()).filter(t => t);

    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = '[UPLOADING...] 0%';
    document.querySelectorAll('#uploadForm button, #uploadForm input, #uploadForm textarea').forEach(el => el.disabled = true);

    try {
        const fileToUpload = compressedFile || selectedFile;
        const ext = fileToUpload.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('files')
            .upload(fileName, fileToUpload, {
                cacheControl: '3600',
                upsert: false,
                onUploadProgress: progress => {
                    if (progress.total) {
                        const pct = Math.round((progress.loaded / progress.total) * 100);
                        progressFill.style.width = pct + '%';
                        progressText.textContent = `[UPLOADING...] ${pct}%`;
                    }
                }
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('files').getPublicUrl(fileName);

        const { error: dbError } = await supabase.from('content').insert([{
            title,
            description,
            file_url: publicUrl,
            file_type: detectFileType(selectedFile),
            file_size: fileToUpload.size,
            uploader_name: currentUser.display_name || currentUser.username,
            uploader_id: currentUser.id,
            view_count: 0,
            tags
        }]);

        if (dbError) throw dbError;

        progressFill.style.width = '100%';
        progressText.textContent = '[UPLOAD_COMPLETE] 100%';

        setTimeout(() => {
            hideModal('uploadModal');
            loadContent();
        }, 800);

    } catch (err) {
        console.error(err);
        showError('uploadError', 'Upload failed: ' + err.message);
        progressText.textContent = '[FAILED]';
        progressFill.classList.add('fail');
        document.querySelectorAll('#uploadForm button, #uploadForm input, #uploadForm textarea').forEach(el => el.disabled = false);
    }
}

// Load & Display
async function loadContent() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('contentGrid').innerHTML = '';
    document.getElementById('emptyState').style.display = 'none';

    const { data, error } = await supabase.from('content').select('*').order('created_at', { ascending: false }).limit(200);
    if (error) { console.error(error); document.getElementById('emptyState').style.display = 'block'; return; }

    allContent = data || [];
    filterContent();
}

function filterContent() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    let filtered = allContent.filter(c => {
        const matchSearch = !query || [c.title, c.description, c.uploader_name].some(f => f?.toLowerCase().includes(query)) || c.tags?.some(t => t.toLowerCase().includes(query));
        const matchType = currentFilter === 'all' || c.file_type === currentFilter;
        return matchSearch && matchType;
    });
    displayContent(filtered);
}

function displayContent(items) {
    document.getElementById('loading').style.display = 'none';
    const grid = document.getElementById('contentGrid');
    if (items.length === 0) { grid.innerHTML = ''; document.getElementById('emptyState').style.display = 'block'; return; }
    document.getElementById('emptyState').style.display = 'none';
    grid.innerHTML = items.map(createContentCard).join('');

    document.querySelectorAll('.view-btn').forEach(b => b.onclick = () => viewContent(b.dataset.id));
    document.querySelectorAll('.download-btn').forEach(b => b.onclick = () => downloadFile(b.dataset.url, b.dataset.url.split('/').pop()));
    document.querySelectorAll('.delete-btn').forEach(b => b.onclick = () => deleteContent(b.dataset.id));
}

function createContentCard(c) {
    const isOwner = currentUser && (currentUser.username === 'Zaid' || c.uploader_id === currentUser.id || c.uploader_name === (currentUser.display_name || currentUser.username));
    const preview = c.file_type === 'image' 
        ? `<div class="card-preview"><img src="${c.file_url}" onerror="this.style.display='none'"><div class="card-type-badge">[IMG]</div>${isOwner ? '<div class="card-owner-badge">[YOURS]</div>' : ''}</div>`
        : `<div class="card-preview" style="display:flex;align-items:center;justify-content:center;"><div style="font-size:3rem;color:rgba(0,255,65,0.6);">[${c.file_type.toUpperCase().slice(0,3)}]</div><div class="card-type-badge">[${c.file_type.toUpperCase().slice(0,3)}]</div>${isOwner ? '<div class="card-owner-badge">[YOURS]</div>' : ''}</div>`;
    const tags = c.tags?.slice(0,3).map(t => `<span class="tag">#${t}</span>`).join('') || '';
    const more = c.tags?.length > 3 ? `<span class="tag">+${c.tags.length-3}</span>` : '';
    return `
        <div class="content-card">
            ${preview}
            <div class="card-content">
                <h3 class="card-title">> ${escapeHtml(c.title)}</h3>
                ${c.description ? `<p class="card-description">${escapeHtml(c.description)}</p>` : ''}
                ${tags}${more}
                <div class="card-meta">
                    <div>USER: ${escapeHtml(c.uploader_name)}</div>
                    <div>VIEWS: ${c.view_count||0}</div>
                    <div>DATE: ${new Date(c.created_at).toLocaleDateString()}</div>
                    <div>SIZE: ${formatFileSize(c.file_size)}</div>
                </div>
                <div class="card-actions">
                    <button class="card-btn view-btn" data-id="${c.id}">[VIEW]</button>
                    <button class="card-btn download-btn" data-url="${c.file_url}">[DOWNLOAD]</button>
                    ${isOwner ? `<button class="card-btn delete delete-btn" data-id="${c.id}">[DELETE]</button>` : ''}
                </div>
            </div>
        </div>`;
}

function escapeHtml(t) { const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
function formatFileSize(b) { const s=['B','KB','MB','GB']; const i=Math.floor(Math.log(b)/Math.log(1024)); return (b/Math.pow(1024,i)).toFixed(1)+s[i]; }

// View
async function viewContent(id) {
    const c = allContent.find(x => x.id == id);
    if (!c) return;

    await supabase.from('content').update({ view_count: (c.view_count||0)+1 }).eq('id', id);
    c.view_count++;

    document.getElementById('viewTitle').textContent = '> ' + c.title;
    const vc = document.getElementById('viewContent');
    if (c.file_type === 'video') vc.innerHTML = `<video controls autoplay src="${c.file_url}" style="width:100%;height:80vh;object-fit:contain;background:#000;"></video>`;
    else if (c.file_type === 'image') vc.innerHTML = `<img src="${c.file_url}" style="width:100%;height:80vh;object-fit:contain;">`;
    else if (c.file_type === 'audio') vc.innerHTML = `<div style="padding:2rem;text-align:center;"><div style="font-size:4rem;">[AUDIO]</div><audio controls autoplay src="${c.file_url}" style="width:100%;filter:invert(1) hue-rotate(180deg);"></audio></div>`;
    else vc.innerHTML = `<div style="padding:3rem;text-align:center;color:#00ff00;">[PREVIEW NOT AVAILABLE]</div>`;

    document.getElementById('viewDescription').style.display = c.description ? 'block' : 'none';
    if (c.description) document.getElementById('viewDescription').innerHTML = `<p>> ${escapeHtml(c.description)}</p>`;
    document.getElementById('viewMeta').innerHTML = `UPLOADER: ${escapeHtml(c.uploader_name)} | VIEWS: ${c.view_count}`;
    showModal('viewModal');
    filterContent();
}

// Delete
async function deleteContent(id) {
    if (!confirm('[CONFIRM_DELETE?]')) return;
    const c = allContent.find(x => x.id == id);
    if (!c) return;

    await supabase.from('content').delete().eq('id', id);
    await supabase.storage.from('files').remove([c.file_url.split('/').pop()]);
    loadContent();
}

// Download
async function downloadFile(url, name) {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
}
</script>
