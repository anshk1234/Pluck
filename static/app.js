// Pluck Frontend Logic - Tasteful Claude & Peach Theme
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // 1. Core Elements
    const urlForm = document.getElementById('url-form');
    const urlInput = document.getElementById('url-input');
    const pasteBtn = document.getElementById('paste-btn');
    const fetchBtn = document.getElementById('fetch-btn');
    const fetchBtnText = document.getElementById('fetch-btn-text');
    const destinationInput = document.getElementById('destination-input');
    const browseFolderBtn = document.getElementById('browse-folder-btn');
    const openFolderBtn = document.getElementById('open-folder-btn');

    // Mode Switcher Elements
    const modeSingleBtn = document.getElementById('mode-single-btn');
    const modeBatchBtn = document.getElementById('mode-batch-btn');
    const singleModeContainer = document.getElementById('single-mode-container');
    const batchModeContainer = document.getElementById('batch-mode-container');
    const batchUrlsInput = document.getElementById('batch-urls-input');
    const batchCountLabel = document.getElementById('batch-count-label');
    const batchFormatSelect = document.getElementById('batch-format-select');
    const startBatchBtn = document.getElementById('start-batch-btn');
    const startBatchBtnText = document.getElementById('start-batch-btn-text');
    const batchQueueCard = document.getElementById('batch-queue-card');
    const batchOverallProgress = document.getElementById('batch-overall-progress');
    const cancelBatchBtn = document.getElementById('cancel-batch-btn');
    const closeBatchQueueBtn = document.getElementById('close-batch-queue-btn');
    const batchItemsList = document.getElementById('batch-items-list');

    // States & Cards
    const loadingState = document.getElementById('loading-state');
    const errorCard = document.getElementById('error-card');
    const errorTitle = document.getElementById('error-title');
    const errorMessage = document.getElementById('error-message');
    const closeErrorBtn = document.getElementById('close-error-btn');

    const videoCard = document.getElementById('video-card');
    const closeVideoCardBtn = document.getElementById('close-video-card-btn');
    const videoThumb = document.getElementById('video-thumb');
    const videoDuration = document.getElementById('video-duration');
    const videoChannel = document.getElementById('video-channel');
    const videoPlatformBadge = document.getElementById('video-platform-badge');
    const videoTitle = document.getElementById('video-title');
    const videoOptionsContainer = document.getElementById('video-options-container');
    const imageOptionsContainer = document.getElementById('image-options-container');
    const audioOptionsContainer = document.getElementById('audio-options-container');

    const tabVideo = document.getElementById('tab-video');
    const tabImage = document.getElementById('tab-image');
    const tabAudio = document.getElementById('tab-audio');

    // Preview Elements
    const previewPlayBtn = document.getElementById('preview-play-btn');
    const previewBtnIcon = document.getElementById('preview-btn-icon');
    const videoPreviewPlayer = document.getElementById('video-preview-player');
    const youtubePreviewFrame = document.getElementById('youtube-preview-frame');
    const closePreviewBtn = document.getElementById('close-preview-btn');
    const quickPreviewLinkBtn = document.getElementById('quick-preview-link-btn');
    const quickPreviewText = document.getElementById('quick-preview-text');

    // Lightbox Elements
    const photoLightbox = document.getElementById('photo-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    const lightboxDownloadBtn = document.getElementById('lightbox-download-btn');
    const closeLightboxBtn = document.getElementById('close-lightbox-btn');

    // Single Download Progress Card
    const downloadProgressCard = document.getElementById('download-progress-card');
    const downloadControls = document.getElementById('download-controls');
    const pauseDownloadBtn = document.getElementById('pause-download-btn');
    const pauseBtnText = document.getElementById('pause-btn-text');
    const pauseBtnIcon = document.getElementById('pause-btn-icon');
    const cancelDownloadBtn = document.getElementById('cancel-download-btn');
    const progressIndicatorDot = document.getElementById('progress-indicator-dot');
    const progressStatusText = document.getElementById('progress-status-text');
    const progressFilename = document.getElementById('progress-filename');
    const progressPercentage = document.getElementById('progress-percentage');
    const progressBar = document.getElementById('progress-bar');
    const statSpeed = document.getElementById('stat-speed');
    const statEta = document.getElementById('stat-eta');
    const statSize = document.getElementById('stat-size');
    const downloadCompletedActions = document.getElementById('download-completed-actions');
    const openFileBtn = document.getElementById('open-file-btn');
    const openFileFolderBtn = document.getElementById('open-file-folder-btn');
    const downloadAnotherBtn = document.getElementById('download-another-btn');

    // History Drawer Elements
    const openHistoryBtn = document.getElementById('open-history-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyDrawer = document.getElementById('history-drawer');
    const historyDrawerBackdrop = document.getElementById('history-drawer-backdrop');
    const historyList = document.getElementById('history-list');
    const historyCountBadge = document.getElementById('history-count-badge');

    // FFmpeg Elements
    const ffmpegIndicator = document.getElementById('ffmpeg-indicator');
    const ffmpegText = document.getElementById('ffmpeg-text');
    const ffmpegNotice = document.getElementById('ffmpeg-notice');
    const closeFfmpegNotice = document.getElementById('close-ffmpeg-notice');

    // State Variables
    let currentVideoData = null;
    let currentTaskId = null;
    let currentDownloadedFilePath = null;
    let isPaused = false;
    let pollInterval = null;

    // Batch State
    let batchQueue = [];
    let currentBatchIndex = 0;
    let isBatchRunning = false;
    let isBatchCancelled = false;

    const HISTORY_STORAGE_KEY = 'pluck_download_history';

    // ==========================================
    // 1. Download History Management
    // ==========================================
    function getHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function saveToHistory(item) {
        const history = getHistory();
        // Avoid exact duplicate file paths
        const filtered = history.filter(h => h.file_path !== item.file_path);
        filtered.unshift({
            id: Date.now().toString(),
            title: item.title || 'Untitled Media',
            thumbnail: item.thumbnail || '',
            platform: item.platform || 'video',
            ext: item.ext || 'mp4',
            file_path: item.file_path || '',
            filename: item.filename || '',
            timestamp: Date.now()
        });
        // Keep last 50
        const trimmed = filtered.slice(0, 50);
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
        renderHistory();
    }

    function renderHistory() {
        const history = getHistory();
        if (historyCountBadge) {
            if (history.length > 0) {
                historyCountBadge.textContent = history.length;
                historyCountBadge.classList.remove('hidden');
            } else {
                historyCountBadge.classList.add('hidden');
            }
        }

        if (!historyList) return;

        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="text-center py-16 space-y-3">
                    <div class="w-12 h-12 rounded-2xl bg-[#F4F1EA] text-[#A8A49C] mx-auto flex items-center justify-center">
                        <i data-lucide="inbox" class="w-6 h-6"></i>
                    </div>
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-[#272522]">No downloads yet</p>
                        <p class="text-xs text-[#9E9A90] max-w-xs mx-auto">Downloaded videos, photos, and audio will appear here for 1-click access.</p>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        historyList.innerHTML = '';
        history.forEach(item => {
            const card = document.createElement('div');
            card.className = 'claude-card rounded-xl p-3.5 space-y-2.5 hover:border-[#DFD8CC] transition';
            
            const extUpper = (item.ext || 'MP4').toUpperCase();
            const timeAgo = formatTimeAgo(item.timestamp);

            card.innerHTML = `
                <div class="flex items-start gap-3">
                    <div class="w-14 h-14 rounded-lg bg-[#F4F1EA] overflow-hidden shrink-0 border border-[#ECE7E0] relative flex items-center justify-center">
                        ${item.thumbnail ? `<img src="${item.thumbnail}" class="w-full h-full object-cover" onerror="this.style.display='none'">` : `<i data-lucide="file" class="w-5 h-5 text-[#9E9A90]"></i>`}
                        <span class="absolute bottom-1 right-1 px-1 py-0.2 bg-black/75 text-[9px] font-mono-numbers text-white rounded font-medium">${extUpper}</span>
                    </div>
                    <div class="flex-1 min-w-0 space-y-1">
                        <div class="flex items-center gap-1.5">
                            <span class="text-[9px] uppercase font-semibold text-[#CC785C] px-1.5 py-0.2 bg-[#FAF2EE] rounded border border-[#F0DDD4]">${item.platform || 'Media'}</span>
                            <span class="text-[10px] text-[#9E9A90] font-mono-numbers">${timeAgo}</span>
                        </div>
                        <h4 class="text-xs font-semibold text-[#272522] truncate leading-tight" title="${item.title}">${item.title}</h4>
                        <p class="text-[10px] text-[#706D65] font-mono-numbers truncate" title="${item.file_path}">${item.filename || item.file_path}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-[#F0ECE4] text-xs">
                    <div class="flex items-center gap-2">
                        <button class="open-file-action text-xs font-medium text-[#CC785C] hover:text-[#B8674D] flex items-center gap-1 transition cursor-pointer">
                            <i data-lucide="play" class="w-3 h-3"></i>
                            <span>Open</span>
                        </button>
                        <span class="text-[#E0DBD0]">•</span>
                        <button class="show-folder-action text-xs font-medium text-[#706D65] hover:text-[#272522] flex items-center gap-1 transition cursor-pointer">
                            <i data-lucide="folder" class="w-3 h-3"></i>
                            <span>Show in Folder</span>
                        </button>
                    </div>
                    <button class="delete-history-action text-[#9E9A90] hover:text-[#B84D4D] transition p-1 cursor-pointer" title="Remove from history">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            `;

            // Button actions
            card.querySelector('.open-file-action').addEventListener('click', () => {
                if (item.file_path) {
                    fetch('/api/open-file', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file_path: item.file_path })
                    }).catch(err => console.error(err));
                }
            });

            card.querySelector('.show-folder-action').addEventListener('click', () => {
                if (item.file_path) {
                    fetch('/api/show-in-folder', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ file_path: item.file_path })
                    }).catch(err => console.error(err));
                }
            });

            card.querySelector('.delete-history-action').addEventListener('click', () => {
                const updated = getHistory().filter(h => h.id !== item.id);
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
                renderHistory();
            });

            historyList.appendChild(card);
        });
        lucide.createIcons();
    }

    function formatTimeAgo(ts) {
        if (!ts) return '';
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    }

    // Drawer open / close
    function openHistory() {
        renderHistory();
        historyDrawerBackdrop.classList.remove('hidden');
        setTimeout(() => {
            historyDrawerBackdrop.classList.remove('opacity-0');
            historyDrawer.classList.remove('translate-x-full');
        }, 10);
    }

    function closeHistory() {
        historyDrawerBackdrop.classList.add('opacity-0');
        historyDrawer.classList.add('translate-x-full');
        setTimeout(() => {
            historyDrawerBackdrop.classList.add('hidden');
        }, 300);
    }

    openHistoryBtn.addEventListener('click', openHistory);
    closeHistoryBtn.addEventListener('click', closeHistory);
    historyDrawerBackdrop.addEventListener('click', closeHistory);

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Clear all download history?')) {
            localStorage.removeItem(HISTORY_STORAGE_KEY);
            renderHistory();
        }
    });

    renderHistory();


    // ==========================================
    // 2. Mode Switching (Single vs Batch Queue)
    // ==========================================
    modeSingleBtn.addEventListener('click', () => {
        modeSingleBtn.className = 'px-3 py-1 rounded-md bg-white text-[#272522] shadow-xs transition cursor-pointer font-medium';
        modeBatchBtn.className = 'px-3 py-1 rounded-md text-[#706D65] hover:text-[#272522] transition cursor-pointer flex items-center gap-1.5 font-medium';
        singleModeContainer.classList.remove('hidden');
        batchModeContainer.classList.add('hidden');
    });

    modeBatchBtn.addEventListener('click', () => {
        modeBatchBtn.className = 'px-3 py-1 rounded-md bg-white text-[#272522] shadow-xs transition cursor-pointer flex items-center gap-1.5 font-medium';
        modeSingleBtn.className = 'px-3 py-1 rounded-md text-[#706D65] hover:text-[#272522] transition cursor-pointer font-medium';
        batchModeContainer.classList.remove('hidden');
        singleModeContainer.classList.add('hidden');
        updateBatchCount();
    });

    batchUrlsInput.addEventListener('input', updateBatchCount);

    function updateBatchCount() {
        const text = batchUrlsInput.value.trim();
        const urls = text ? text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.startsWith('http')) : [];
        batchCountLabel.textContent = `${urls.length} link${urls.length === 1 ? '' : 's'} detected`;
    }


    // ==========================================
    // 3. System Status & Default Destination
    // ==========================================
    fetch('/api/system-status')
        .then(res => res.json())
        .then(data => {
            if (data.ffmpeg_available) {
                ffmpegIndicator.className = 'w-2 h-2 rounded-full bg-[#388E3C]';
                ffmpegText.textContent = 'FFmpeg ready';
                if (ffmpegNotice) ffmpegNotice.classList.add('hidden');
            } else {
                ffmpegIndicator.className = 'w-2 h-2 rounded-full bg-[#CC785C]';
                ffmpegText.textContent = 'FFmpeg missing';
                if (ffmpegNotice) ffmpegNotice.classList.remove('hidden');
            }
        })
        .catch(() => {
            ffmpegIndicator.className = 'w-2 h-2 rounded-full bg-[#A8A49C]';
            ffmpegText.textContent = 'Offline';
        });

    if (closeFfmpegNotice) {
        closeFfmpegNotice.addEventListener('click', () => {
            ffmpegNotice.classList.add('hidden');
        });
    }

    fetch('/api/default-dir')
        .then(res => res.json())
        .then(data => {
            if (data.default_dir) {
                destinationInput.value = data.default_dir;
            }
        })
        .catch(err => console.error('Failed to load default dir', err));

    browseFolderBtn.addEventListener('click', async () => {
        browseFolderBtn.disabled = true;
        const origText = browseFolderBtn.innerHTML;
        browseFolderBtn.innerHTML = `<span class="text-[11px]">Selecting...</span>`;

        try {
            const res = await fetch('/api/select-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initial_dir: destinationInput.value.trim() })
            });
            const data = await res.json();
            if (data.selected_folder) {
                destinationInput.value = data.selected_folder;
            }
        } catch (err) {
            console.error('Error opening folder picker:', err);
        } finally {
            browseFolderBtn.disabled = false;
            browseFolderBtn.innerHTML = origText;
            lucide.createIcons();
        }
    });

    openFolderBtn.addEventListener('click', () => {
        const folder = destinationInput.value.trim();
        if (folder) {
            fetch('/api/open-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_path: folder })
            });
        }
    });


    // ==========================================
    // 4. Single Download Form Handling
    // ==========================================
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                urlInput.value = text.trim();
                triggerFetch();
            }
        } catch (err) {
            urlInput.focus();
        }
    });

    closeErrorBtn.addEventListener('click', () => {
        errorCard.classList.add('hidden');
    });

    if (closeVideoCardBtn) {
        closeVideoCardBtn.addEventListener('click', () => {
            stopPreview();
            videoCard.classList.add('hidden');
            currentVideoData = null;
        });
    }

    if (closeBatchQueueBtn) {
        closeBatchQueueBtn.addEventListener('click', () => {
            batchQueueCard.classList.add('hidden');
        });
    }

    function showError(title, msg) {
        errorTitle.textContent = title;
        errorMessage.textContent = msg;
        errorCard.classList.remove('hidden');
        loadingState.classList.add('hidden');
    }

    function hideError() {
        errorCard.classList.add('hidden');
    }

    function setActiveTab(activeBtn, showContainer) {
        [tabVideo, tabImage, tabAudio].forEach(btn => {
            btn.className = 'px-3 py-1 rounded-lg text-[#706D65] hover:text-[#272522] transition cursor-pointer';
        });
        activeBtn.className = 'px-3 py-1 rounded-lg bg-white text-[#272522] shadow-xs transition cursor-pointer';

        [videoOptionsContainer, imageOptionsContainer, audioOptionsContainer].forEach(c => c.classList.add('hidden'));
        showContainer.classList.remove('hidden');
    }

    tabVideo.addEventListener('click', () => setActiveTab(tabVideo, videoOptionsContainer));
    tabImage.addEventListener('click', () => setActiveTab(tabImage, imageOptionsContainer));
    tabAudio.addEventListener('click', () => setActiveTab(tabAudio, audioOptionsContainer));

    urlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        triggerFetch();
    });

    function triggerFetch() {
        const url = urlInput.value.trim();
        if (!url) return;

        hideError();
        stopPreview();
        videoCard.classList.add('hidden');
        downloadProgressCard.classList.add('hidden');
        loadingState.classList.remove('hidden');

        fetchBtn.disabled = true;
        fetchBtnText.textContent = "Retrieving Formats...";

        fetch('/api/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        })
        .then(async res => {
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || 'Could not retrieve media details.');
            }
            return res.json();
        })
        .then(data => {
            currentVideoData = data;
            renderVideoCard(data);
        })
        .catch(err => {
            showError("Unable to retrieve media", err.message);
        })
        .finally(() => {
            loadingState.classList.add('hidden');
            fetchBtn.disabled = false;
            fetchBtnText.textContent = "Find Available Formats";
            lucide.createIcons();
        });
    }


    // ==========================================
    // 5. Video & Photo Preview Player
    // ==========================================
    function stopPreview() {
        if (videoPreviewPlayer) {
            videoPreviewPlayer.pause();
            videoPreviewPlayer.src = '';
            videoPreviewPlayer.classList.add('hidden');
        }
        if (youtubePreviewFrame) {
            youtubePreviewFrame.src = '';
            youtubePreviewFrame.classList.add('hidden');
        }
        if (closePreviewBtn) closePreviewBtn.classList.add('hidden');
        if (previewPlayBtn) previewPlayBtn.classList.remove('hidden');
    }

    closePreviewBtn.addEventListener('click', stopPreview);

    function triggerPreview() {
        if (!currentVideoData) return;

        const isPhotoOnly = (!currentVideoData.video_options || currentVideoData.video_options.length === 0) && currentVideoData.image_options && currentVideoData.image_options.length > 0;

        if (isPhotoOnly) {
            // Open Photo Lightbox
            const imgUrl = currentVideoData.image_options[0].url || currentVideoData.thumbnail;
            lightboxImg.src = imgUrl;
            lightboxTitle.textContent = currentVideoData.title;
            photoLightbox.classList.remove('hidden');
            return;
        }

        // Video Preview: YouTube
        if (currentVideoData.platform === 'youtube' || (currentVideoData.preview_url && currentVideoData.preview_url.includes('youtube.com/embed'))) {
            let embedUrl = currentVideoData.preview_url;
            if (!embedUrl) {
                const match = currentVideoData.url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/)([\w-]{11})/);
                if (match) embedUrl = `https://www.youtube.com/embed/${match[1]}`;
            }
            if (embedUrl) {
                youtubePreviewFrame.src = `${embedUrl}?autoplay=1`;
                youtubePreviewFrame.classList.remove('hidden');
                closePreviewBtn.classList.remove('hidden');
                previewPlayBtn.classList.add('hidden');
                return;
            }
        }

        // Video Preview: Direct MP4 (Pinterest / TikTok / Instagram / Twitter)
        if (currentVideoData.preview_url && currentVideoData.preview_url.startsWith('http')) {
            videoPreviewPlayer.src = currentVideoData.preview_url;
            videoPreviewPlayer.classList.remove('hidden');
            closePreviewBtn.classList.remove('hidden');
            previewPlayBtn.classList.add('hidden');
            videoPreviewPlayer.play().catch(e => console.log('Autoplay blocked:', e));
            return;
        }

        // Fallback: Open thumbnail in Lightbox
        if (currentVideoData.thumbnail) {
            lightboxImg.src = currentVideoData.thumbnail;
            lightboxTitle.textContent = currentVideoData.title;
            photoLightbox.classList.remove('hidden');
        }
    }

    previewPlayBtn.addEventListener('click', triggerPreview);
    quickPreviewLinkBtn.addEventListener('click', triggerPreview);

    // Lightbox close & download
    closeLightboxBtn.addEventListener('click', () => {
        photoLightbox.classList.add('hidden');
    });
    photoLightbox.addEventListener('click', (e) => {
        if (e.target === photoLightbox) photoLightbox.classList.add('hidden');
    });

    lightboxDownloadBtn.addEventListener('click', () => {
        photoLightbox.classList.add('hidden');
        if (currentVideoData && currentVideoData.image_options && currentVideoData.image_options.length > 0) {
            initiateDownload(currentVideoData.image_options[0].format_id, 'image', currentVideoData.image_options[0].url);
        }
    });


    // ==========================================
    // 6. Render Video / Media Card
    // ==========================================
    function renderVideoCard(data) {
        stopPreview();
        videoThumb.src = data.thumbnail;
        videoDuration.textContent = data.duration;
        videoChannel.textContent = data.channel;
        videoTitle.textContent = data.title;

        const isPhotoOnly = (!data.video_options || data.video_options.length === 0) && data.image_options && data.image_options.length > 0;

        if (isPhotoOnly) {
            if (quickPreviewText) quickPreviewText.textContent = "View Full Photo (4K/HD)";
            if (previewBtnIcon) previewBtnIcon.setAttribute('data-lucide', 'eye');
        } else {
            if (quickPreviewText) quickPreviewText.textContent = "Preview Video";
            if (previewBtnIcon) previewBtnIcon.setAttribute('data-lucide', 'play');
        }
        lucide.createIcons();

        if (videoPlatformBadge) {
            if (data.platform === 'pinterest') {
                videoPlatformBadge.textContent = 'Pinterest';
                videoPlatformBadge.className = 'inline-flex items-center text-[10px] font-semibold text-[#E60023] bg-[#FEF0F2] border border-[#FBD0D5] px-2 py-0.5 rounded-md';
                videoPlatformBadge.classList.remove('hidden');
            } else if (data.platform === 'instagram') {
                videoPlatformBadge.textContent = 'Instagram';
                videoPlatformBadge.className = 'inline-flex items-center text-[10px] font-semibold text-[#B84D7A] bg-[#FDF2F7] border border-[#F5D5E5] px-2 py-0.5 rounded-md';
                videoPlatformBadge.classList.remove('hidden');
            } else if (data.platform === 'youtube') {
                videoPlatformBadge.textContent = 'YouTube';
                videoPlatformBadge.className = 'inline-flex items-center text-[10px] font-semibold text-[#CC4444] bg-[#FFF2F2] border border-[#FCD5D5] px-2 py-0.5 rounded-md';
                videoPlatformBadge.classList.remove('hidden');
            } else if (data.platform === 'twitter') {
                videoPlatformBadge.textContent = 'X (Twitter)';
                videoPlatformBadge.className = 'inline-flex items-center text-[10px] font-semibold text-[#1A6EB0] bg-[#F0F7FD] border border-[#D5E8F8] px-2 py-0.5 rounded-md';
                videoPlatformBadge.classList.remove('hidden');
            } else if (data.platform === 'tiktok') {
                videoPlatformBadge.textContent = 'TikTok';
                videoPlatformBadge.className = 'inline-flex items-center text-[10px] font-semibold text-[#0B7285] bg-[#F0FBFC] border border-[#D0F4F7] px-2 py-0.5 rounded-md';
                videoPlatformBadge.classList.remove('hidden');
            } else {
                videoPlatformBadge.classList.add('hidden');
            }
        }

        // 1. Render Video Options
        videoOptionsContainer.innerHTML = '';
        if (data.video_options && data.video_options.length > 0) {
            data.video_options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-[#FAF2EE] border border-[#ECE7E0] hover:border-[#E8C9BD] transition cursor-pointer group text-left shadow-xs';
                btn.innerHTML = `
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold text-[#272522] group-hover:text-[#8B3F27] transition">${opt.label}</span>
                            <span class="text-[10px] font-mono-numbers px-1.5 py-0.5 bg-[#FAF2EE] text-[#CC785C] rounded-md border border-[#F0DDD4] font-medium">MP4</span>
                        </div>
                        <div class="text-[11px] text-[#706D65] font-mono-numbers">${opt.approx_size}</div>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-[#F4F1EA] group-hover:bg-[#CC785C] group-hover:text-white flex items-center justify-center text-[#706D65] transition shadow-xs">
                        <i data-lucide="arrow-down" class="w-3.5 h-3.5"></i>
                    </div>
                `;
                btn.addEventListener('click', () => initiateDownload(opt.format_id, 'video'));
                videoOptionsContainer.appendChild(btn);
            });
        } else {
            videoOptionsContainer.innerHTML = '<p class="text-xs text-[#706D65] col-span-2 py-2 font-mono-numbers">No video stream found for this item.</p>';
        }

        // 2. Render Image / Photo Options
        imageOptionsContainer.innerHTML = '';
        if (data.image_options && data.image_options.length > 0) {
            data.image_options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-[#FAF2EE] border border-[#ECE7E0] hover:border-[#E8C9BD] transition cursor-pointer group text-left shadow-xs';
                btn.innerHTML = `
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold text-[#272522] group-hover:text-[#8B3F27] transition">${opt.label}</span>
                            <span class="text-[10px] font-mono-numbers px-1.5 py-0.5 bg-[#FAF2EE] text-[#CC785C] rounded-md border border-[#F0DDD4] font-medium">${(opt.ext || 'JPG').toUpperCase()}</span>
                        </div>
                        <div class="text-[11px] text-[#706D65] font-mono-numbers">${opt.approx_size}</div>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-[#F4F1EA] group-hover:bg-[#CC785C] group-hover:text-white flex items-center justify-center text-[#706D65] transition shadow-xs">
                        <i data-lucide="image-down" class="w-3.5 h-3.5"></i>
                    </div>
                `;
                btn.addEventListener('click', () => initiateDownload(opt.format_id, 'image', opt.url));
                imageOptionsContainer.appendChild(btn);
            });
        } else {
            imageOptionsContainer.innerHTML = '<p class="text-xs text-[#706D65] col-span-2 py-2 font-mono-numbers">No image formats available.</p>';
        }

        // 3. Render Audio Options
        audioOptionsContainer.innerHTML = '';
        if (data.audio_options && data.audio_options.length > 0) {
            data.audio_options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'flex items-center justify-between p-3.5 rounded-xl bg-white hover:bg-[#FAF2EE] border border-[#ECE7E0] hover:border-[#E8C9BD] transition cursor-pointer group text-left shadow-xs';
                btn.innerHTML = `
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold text-[#272522] group-hover:text-[#8B3F27] transition">${opt.label}</span>
                            <span class="text-[10px] font-mono-numbers px-1.5 py-0.5 bg-[#FAF2EE] text-[#CC785C] rounded-md border border-[#F0DDD4] font-medium">${opt.ext.toUpperCase()}</span>
                        </div>
                        <div class="text-[11px] text-[#706D65] font-mono-numbers">${opt.approx_size}</div>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-[#F4F1EA] group-hover:bg-[#CC785C] group-hover:text-white flex items-center justify-center text-[#706D65] transition shadow-xs">
                        <i data-lucide="arrow-down" class="w-3.5 h-3.5"></i>
                    </div>
                `;
                btn.addEventListener('click', () => initiateDownload(opt.format_id, 'audio'));
                audioOptionsContainer.appendChild(btn);
            });
        }

        // 4. Smart Tab Auto-Switching
        const hasVideo = data.video_options && data.video_options.length > 0;
        const hasImage = data.image_options && data.image_options.length > 0;
        const hasAudio = data.audio_options && data.audio_options.length > 0;

        tabVideo.classList.toggle('hidden', !hasVideo);
        tabImage.classList.toggle('hidden', !hasImage);
        tabAudio.classList.toggle('hidden', !hasAudio);

        if (!hasVideo && hasImage) {
            setActiveTab(tabImage, imageOptionsContainer);
        } else {
            setActiveTab(tabVideo, videoOptionsContainer);
        }

        videoCard.classList.remove('hidden');
        lucide.createIcons();
    }


    // ==========================================
    // 7. Single Download Execution & Tracking
    // ==========================================
    pauseDownloadBtn.addEventListener('click', async () => {
        if (!currentTaskId) return;

        if (!isPaused) {
            try {
                const res = await fetch('/api/download/pause', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_id: currentTaskId })
                });
                if (res.ok) {
                    isPaused = true;
                    pauseBtnText.textContent = "Resume";
                    pauseBtnIcon.setAttribute('data-lucide', 'play');
                    progressStatusText.textContent = "Download Paused";
                    statSpeed.textContent = "Paused";
                    progressIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#E5A93C]';
                    lucide.createIcons();
                }
            } catch (err) {
                console.error("Failed to pause download:", err);
            }
        } else {
            try {
                const res = await fetch('/api/download/resume', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_id: currentTaskId })
                });
                if (res.ok) {
                    isPaused = false;
                    pauseBtnText.textContent = "Pause";
                    pauseBtnIcon.setAttribute('data-lucide', 'pause');
                    progressStatusText.textContent = "Downloading...";
                    progressIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#CC785C] animate-pulse';
                    lucide.createIcons();
                }
            } catch (err) {
                console.error("Failed to resume download:", err);
            }
        }
    });

    cancelDownloadBtn.addEventListener('click', async () => {
        if (!currentTaskId) return;

        try {
            await fetch('/api/download/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: currentTaskId })
            });
            if (pollInterval) clearInterval(pollInterval);
            progressStatusText.textContent = "Download cancelled";
            statSpeed.textContent = "--";
            statEta.textContent = "--";
            progressIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#9E4D4D]';
            downloadControls.classList.add('hidden');
            downloadCompletedActions.classList.remove('hidden');
            openFileBtn.classList.add('hidden');
            openFileFolderBtn.classList.add('hidden');
        } catch (err) {
            console.error("Failed to cancel download:", err);
        }
    });

    function initiateDownload(format_id, download_type, image_url = null) {
        if (!currentVideoData) return;

        const url = currentVideoData.url;
        const output_dir = destinationInput.value.trim();

        downloadProgressCard.classList.remove('hidden');
        downloadCompletedActions.classList.add('hidden');
        downloadControls.classList.remove('hidden');
        openFileBtn.classList.remove('hidden');
        openFileFolderBtn.classList.remove('hidden');

        isPaused = false;
        pauseBtnText.textContent = "Pause";
        pauseBtnIcon.setAttribute('data-lucide', 'pause');
        progressIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#CC785C] animate-pulse';

        progressStatusText.textContent = download_type === 'image' ? "Downloading Photo..." : "Downloading...";
        progressFilename.textContent = currentVideoData.title;
        progressPercentage.textContent = "0%";
        progressBar.style.width = "0%";
        statSpeed.textContent = "-- MB/s";
        statEta.textContent = "--";
        statSize.textContent = "--";

        downloadProgressCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        lucide.createIcons();

        fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                format_id,
                download_type,
                output_dir,
                image_url
            })
        })
        .then(res => {
            if (!res.ok) throw new Error('Could not start download');
            return res.json();
        })
        .then(data => {
            currentTaskId = data.task_id;
            trackProgress(data.task_id, data.output_dir, download_type);
        })
        .catch(err => {
            showError("Download Failed", err.message);
            downloadProgressCard.classList.add('hidden');
        });
    }

    function trackProgress(taskId, outputDir, downloadType) {
        if (pollInterval) clearInterval(pollInterval);

        pollInterval = setInterval(() => {
            fetch(`/api/progress/${taskId}`)
                .then(res => res.json())
                .then(task => {
                    if (task.status === 'downloading') {
                        if (isPaused) {
                            isPaused = false;
                            pauseBtnText.textContent = "Pause";
                            pauseBtnIcon.setAttribute('data-lucide', 'pause');
                            progressIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#CC785C] animate-pulse';
                            lucide.createIcons();
                        }
                        progressStatusText.textContent = "Downloading...";
                        const pct = Math.min(100, Math.max(0, task.percent));
                        progressBar.style.width = `${pct}%`;
                        progressPercentage.textContent = `${pct}%`;
                        statSpeed.textContent = task.speed || "--";
                        statEta.textContent = task.eta || "--";
                        if (task.filename) {
                            progressFilename.textContent = task.filename;
                        }
                    } else if (task.status === 'paused') {
                        if (!isPaused) {
                            isPaused = true;
                            pauseBtnText.textContent = "Resume";
                            pauseBtnIcon.setAttribute('data-lucide', 'play');
                            progressIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#E5A93C]';
                            lucide.createIcons();
                        }
                        progressStatusText.textContent = "Download Paused";
                        statSpeed.textContent = "Paused";
                    } else if (task.status === 'processing') {
                        downloadControls.classList.add('hidden');
                        progressStatusText.textContent = "Merging streams with FFmpeg...";
                        progressBar.style.width = "100%";
                        progressPercentage.textContent = "100%";
                        statSpeed.textContent = "Merging...";
                        statEta.textContent = "0s";
                    } else if (task.status === 'completed') {
                        clearInterval(pollInterval);
                        downloadControls.classList.add('hidden');
                        progressStatusText.textContent = "Download complete";
                        progressPercentage.textContent = "100%";
                        progressBar.style.width = "100%";
                        statSpeed.textContent = "Done";
                        statEta.textContent = "0s";
                        progressIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#388E3C]';
                        downloadCompletedActions.classList.remove('hidden');

                        currentDownloadedFilePath = task.file_path;

                        // Save to Download History!
                        saveToHistory({
                            title: currentVideoData?.title || task.filename || 'Downloaded Media',
                            thumbnail: currentVideoData?.thumbnail || '',
                            platform: currentVideoData?.platform || 'media',
                            ext: downloadType === 'audio' ? 'mp3' : (downloadType === 'image' ? 'jpg' : 'mp4'),
                            file_path: task.file_path,
                            filename: task.filename
                        });

                        // Button Listeners
                        openFileBtn.onclick = () => {
                            if (task.file_path) {
                                fetch('/api/open-file', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ file_path: task.file_path })
                                });
                            }
                        };

                        openFileFolderBtn.onclick = () => {
                            if (task.file_path) {
                                fetch('/api/show-in-folder', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ file_path: task.file_path })
                                });
                            } else {
                                fetch('/api/open-folder', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ folder_path: outputDir })
                                });
                            }
                        };

                        lucide.createIcons();
                    } else if (task.status === 'cancelled') {
                        clearInterval(pollInterval);
                        downloadControls.classList.add('hidden');
                        progressStatusText.textContent = "Download cancelled";
                        progressIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#9E4D4D]';
                        statSpeed.textContent = "--";
                        statEta.textContent = "--";
                        downloadCompletedActions.classList.remove('hidden');
                        openFileBtn.classList.add('hidden');
                        openFileFolderBtn.classList.add('hidden');
                        lucide.createIcons();
                    } else if (task.status === 'error') {
                        clearInterval(pollInterval);
                        downloadControls.classList.add('hidden');
                        showError("Download Error", task.error || "An error occurred during download.");
                        downloadProgressCard.classList.add('hidden');
                    }
                })
                .catch(err => {
                    console.error('Progress check failed:', err);
                });
        }, 500);
    }

    downloadAnotherBtn.addEventListener('click', () => {
        downloadProgressCard.classList.add('hidden');
        urlInput.value = '';
        urlInput.focus();
    });


    // ==========================================
    // 8. Batch / Multi-Link Queue Execution
    // ==========================================
    startBatchBtn.addEventListener('click', () => {
        if (isBatchRunning) return;

        const text = batchUrlsInput.value.trim();
        const urls = text ? text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.startsWith('http')) : [];

        if (urls.length === 0) {
            showError("No valid links found", "Please paste at least one valid link starting with http:// or https://");
            return;
        }

        const selectedFormat = batchFormatSelect.value; // 'video', 'audio', 'image'

        batchQueue = urls.map((u, i) => ({
            id: i,
            url: u,
            formatType: selectedFormat,
            status: 'queued', // 'queued', 'fetching', 'downloading', 'completed', 'failed'
            progress: 0,
            title: u,
            thumbnail: '',
            filename: '',
            filePath: '',
            error: null
        }));

        currentBatchIndex = 0;
        isBatchRunning = true;
        isBatchCancelled = false;

        if (cancelBatchBtn) {
            cancelBatchBtn.textContent = "Stop Queue";
            cancelBatchBtn.className = "px-2.5 py-1 rounded-lg text-xs font-medium text-[#9E4D4D] hover:text-[#7A2E2E] bg-[#FAF2F2] border border-[#F0D8D8] transition cursor-pointer";
        }
        const batchIndicatorDot = document.getElementById('batch-indicator-dot');
        if (batchIndicatorDot) {
            batchIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#CC785C] animate-pulse';
        }

        batchQueueCard.classList.remove('hidden');
        startBatchBtn.disabled = true;
        startBatchBtnText.textContent = "Processing Queue...";
        renderBatchQueueList();

        batchQueueCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        processNextBatchItem();
    });

    cancelBatchBtn.addEventListener('click', async () => {
        if (!isBatchRunning) {
            // When finished, clicking Dismiss hides the queue card
            batchQueueCard.classList.add('hidden');
            return;
        }
        isBatchCancelled = true;

        if (currentTaskId) {
            await fetch('/api/download/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: currentTaskId })
            }).catch(e => console.log(e));
        }

        batchQueue.forEach((item, idx) => {
            if (idx >= currentBatchIndex && item.status !== 'completed') {
                item.status = 'cancelled';
            }
        });

        finishBatchQueue("Queue stopped by user");
    });

    function renderBatchQueueList() {
        const completedCount = batchQueue.filter(i => i.status === 'completed').length;
        batchOverallProgress.textContent = `${completedCount} / ${batchQueue.length} completed`;

        batchItemsList.innerHTML = '';
        batchQueue.forEach((item, idx) => {
            const itemCard = document.createElement('div');
            itemCard.className = 'p-3 rounded-xl bg-white border border-[#ECE7E0] flex items-center justify-between gap-3 text-xs';

            let statusBadge = '';
            if (item.status === 'queued') {
                statusBadge = `<span class="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#F4F1EA] text-[#706D65]">Waiting</span>`;
            } else if (item.status === 'fetching') {
                statusBadge = `<span class="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#FAF2EE] text-[#CC785C] animate-pulse">Fetching...</span>`;
            } else if (item.status === 'downloading') {
                statusBadge = `<span class="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#FAF2EE] text-[#CC785C] font-semibold">${item.progress}%</span>`;
            } else if (item.status === 'completed') {
                statusBadge = `<span class="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#EDF7ED] text-[#2E7D32] flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i>Done</span>`;
            } else if (item.status === 'failed') {
                statusBadge = `<span class="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#FDF2F2] text-[#B84D4D]">Failed</span>`;
            } else if (item.status === 'cancelled') {
                statusBadge = `<span class="text-[10px] font-mono-numbers px-2 py-0.5 rounded bg-[#F4F1EA] text-[#9E9A90]">Cancelled</span>`;
            }

            itemCard.innerHTML = `
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-8 h-8 rounded-lg bg-[#F4F1EA] shrink-0 overflow-hidden flex items-center justify-center border border-[#EAE5DC]">
                        ${item.thumbnail ? `<img src="${item.thumbnail}" class="w-full h-full object-cover">` : `<i data-lucide="link" class="w-3.5 h-3.5 text-[#9E9A90]"></i>`}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-medium text-[#272522] truncate">${item.title}</p>
                        <p class="text-[10px] text-[#9E9A90] truncate font-mono-numbers">${item.url}</p>
                    </div>
                </div>
                <div class="shrink-0 flex items-center gap-2">
                    ${statusBadge}
                    ${item.filePath ? `
                        <button class="open-batch-item p-1.5 rounded-lg hover:bg-[#FAF2EE] text-[#CC785C] transition cursor-pointer" title="Open file">
                            <i data-lucide="play" class="w-3.5 h-3.5"></i>
                        </button>
                    ` : ''}
                </div>
            `;

            if (item.filePath) {
                const btn = itemCard.querySelector('.open-batch-item');
                if (btn) {
                    btn.addEventListener('click', () => {
                        fetch('/api/open-file', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ file_path: item.filePath })
                        });
                    });
                }
            }

            batchItemsList.appendChild(itemCard);
        });
        lucide.createIcons();
    }

    async function processNextBatchItem() {
        if (isBatchCancelled || currentBatchIndex >= batchQueue.length) {
            finishBatchQueue();
            return;
        }

        const item = batchQueue[currentBatchIndex];
        item.status = 'fetching';
        renderBatchQueueList();

        try {
            // 1. Fetch metadata
            const infoRes = await fetch('/api/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: item.url })
            });

            if (!infoRes.ok) {
                const errData = await infoRes.json();
                throw new Error(errData.detail || 'Could not fetch metadata');
            }

            const info = await infoRes.json();
            item.title = info.title || item.url;
            item.thumbnail = info.thumbnail || '';
            item.platform = info.platform || 'media';

            // Determine format
            let formatId = 'best';
            let downloadType = item.formatType;
            let imageUrl = null;

            if (item.formatType === 'audio') {
                if (info.audio_options && info.audio_options.length > 0) {
                    formatId = info.audio_options[0].format_id;
                }
                downloadType = 'audio';
            } else if (item.formatType === 'image') {
                if (info.image_options && info.image_options.length > 0) {
                    formatId = info.image_options[0].format_id;
                    imageUrl = info.image_options[0].url;
                }
                downloadType = 'image';
            } else {
                // Video: if no video options (e.g. photo pin), fall back to image
                if ((!info.video_options || info.video_options.length === 0) && info.image_options && info.image_options.length > 0) {
                    formatId = info.image_options[0].format_id;
                    imageUrl = info.image_options[0].url;
                    downloadType = 'image';
                } else if (info.video_options && info.video_options.length > 0) {
                    formatId = info.video_options[0].format_id;
                    downloadType = 'video';
                }
            }

            // 2. Trigger Download
            item.status = 'downloading';
            renderBatchQueueList();

            const targetDir = destinationInput.value.trim();
            const dlRes = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: item.url,
                    format_id: formatId,
                    download_type: downloadType,
                    output_dir: targetDir,
                    image_url: imageUrl
                })
            });

            if (!dlRes.ok) throw new Error('Download request failed');
            const dlData = await dlRes.json();
            currentTaskId = dlData.task_id;

            // Poll task until finished
            await new Promise((resolve) => {
                const bInterval = setInterval(async () => {
                    if (isBatchCancelled) {
                        clearInterval(bInterval);
                        resolve();
                        return;
                    }

                    try {
                        const pRes = await fetch(`/api/progress/${currentTaskId}`);
                        const pData = await pRes.json();

                        if (pData.status === 'downloading') {
                            item.progress = Math.round(pData.percent || 0);
                            renderBatchQueueList();
                        } else if (pData.status === 'completed') {
                            clearInterval(bInterval);
                            item.status = 'completed';
                            item.progress = 100;
                            item.filePath = pData.file_path;
                            item.filename = pData.filename;

                            // Save to History!
                            saveToHistory({
                                title: item.title,
                                thumbnail: item.thumbnail,
                                platform: item.platform,
                                ext: downloadType === 'audio' ? 'mp3' : (downloadType === 'image' ? 'jpg' : 'mp4'),
                                file_path: pData.file_path,
                                filename: pData.filename
                            });

                            resolve();
                        } else if (pData.status === 'error' || pData.status === 'cancelled') {
                            clearInterval(bInterval);
                            item.status = pData.status === 'cancelled' ? 'cancelled' : 'failed';
                            item.error = pData.error;
                            resolve();
                        }
                    } catch (err) {
                        clearInterval(bInterval);
                        item.status = 'failed';
                        resolve();
                    }
                }, 750);
            });

        } catch (err) {
            item.status = 'failed';
            item.error = err.message;
        }

        currentBatchIndex++;
        renderBatchQueueList();

        if (!isBatchCancelled) {
            setTimeout(processNextBatchItem, 500);
        }
    }

    function finishBatchQueue(msg = "Batch download finished!") {
        isBatchRunning = false;
        startBatchBtn.disabled = false;
        startBatchBtnText.textContent = "Start Batch Download";
        
        const batchIndicatorDot = document.getElementById('batch-indicator-dot');
        if (batchIndicatorDot) {
            batchIndicatorDot.className = 'w-2 h-2 rounded-full bg-[#388E3C]';
        }
        
        if (cancelBatchBtn) {
            cancelBatchBtn.textContent = "Dismiss";
            cancelBatchBtn.className = "px-2.5 py-1 rounded-lg text-xs font-medium text-[#706D65] hover:text-[#272522] bg-[#F4F1EA] hover:bg-[#EDE8DE] border border-[#E8E3DA] transition cursor-pointer";
        }
        
        renderBatchQueueList();
    }
});
