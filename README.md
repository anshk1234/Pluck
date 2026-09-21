# Pluck ⚡

A high-speed, local-first media downloader for **YouTube**, **Instagram**, **Pinterest**, **X (Twitter)**, and **TikTok**. Built with a thoughtfully crafted Claude-inspired aesthetic, intelligent platform routing, real-time download controls, and seamless Windows Explorer integration.

---

## ✨ Features

### 🌐 Universal Multi-Platform Support
- **YouTube & YouTube Shorts**: Standard videos, Shorts, and playlists in up to 4K (2160p), 2K (1440p), Full HD (1080p), HD (720p), SD (480p), and 360p.
- **Instagram Reels & Videos**: Clean video extraction with original audio.
- **Pinterest (Photos & Videos)**:
  - Smart shortlink resolver (`pin.it` and standard pin URLs).
  - Dedicated extractor fetching uncompressed original photos (`/originals/` in up to 4K) without `yt-dlp` failures.
  - Full support for Pinterest video pins.
- **X / Twitter (Videos & Photos)**:
  - Full-resolution video extraction across multiple bitrates.
  - Multi-photo post support: retrieves all images in uncompressed original quality (`?name=orig`).
- **TikTok**: High-speed video downloads.

---

### 🎛️ Dual Download Modes
- **Single Link Mode**:
  - Paste any URL or click the **Paste** button for 1-click clipboard insertion.
  - Automatically fetches available video resolutions, audio-only streams, and original HD/4K photos.
  - Smart tab auto-switching: automatically activates the **Photo (HD)** tab for photo-only posts.
- **Batch Queue Mode**:
  - Paste multiple links (one per line) across different platforms.
  - Choose global output format: **Best Video (MP4)**, **Audio Only (MP3)**, or **Photos Only (HD)**.
  - Sequential processing with individual and overall queue progress tracking.
  - Stop queue or dismiss completed items at any time.

---

### ⏯️ Complete Download & Progress Controls
- **Pause & Resume**: Pause active downloads on the fly and resume without corrupting files.
- **Cancel**: Instantly terminate in-progress tasks.
- **Real-Time Telemetry**:
  - Live progress bar with percentage.
  - Live transfer speed (MB/s or KB/s).
  - Estimated time remaining (ETA).
  - Downloaded vs. total file size.

---

### 🖼️ Interactive Preview & Photo Lightbox
- **Inline Video Player**: Preview videos directly within the card before downloading (supports both YouTube embeds and direct MP4 streams).
- **Photo Lightbox**: View full-resolution images in an interactive modal with a 1-click **Download Photo** action.

---

### 📜 Download History Slide-over Drawer
- Persistent local history of downloaded items (title, platform badge, thumbnail, timestamp, file path).
- **1-Click Open**: Launch the downloaded file in your default media player or photo viewer.
- **1-Click Show in Folder**: Opens Windows Explorer and highlights the exact downloaded file.
- History management: Remove individual items or clear all history.

---

### 📂 Native Windows Explorer Integration
- Automatically defaults to your Windows Downloads folder (`C:\Users\<User>\Downloads`).
- **Browse**: Opens native Windows directory picker modal (`tkinter`) to select any destination folder.
- **Open**: 1-click button to open the active destination directory in Windows Explorer.
- Automatic filename sanitization and file collision handling (prevents accidental overwriting).

---

### 🎨 Thoughtful Claude-Inspired Interface
- Clean, distraction-free aesthetic with warm peach accents (`#CC785C`).
- Editorial typography pairing: **Newsreader** serif for titles and **Plus Jakarta Sans** for interface elements.
- Monospaced tabular numerals (**JetBrains Mono**) for speeds, ETAs, and sizes.

---

## 🚀 Quick Start

### Method 1: Double-Click Launcher (Windows)
Double-click [`start.bat`](start.bat). It will verify Python, install dependencies, and launch Pluck in your default browser.

### Method 2: Manual Start
1. **Clone or navigate to the project directory**:
   ```bash
   cd D:\antigravity\Pluck
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Launch the server**:
   ```bash
   python run.py
   ```
   *The app will automatically open at `http://127.0.0.1:8000` in your default browser.*

---

## 📁 Project Structure

```
Pluck/
├── downloader.py          # Intelligent platform router, yt-dlp engine, Pinterest & Twitter extractors, download tasks
├── main.py                # FastAPI application, REST endpoints, Windows Explorer integration
├── requirements.txt       # Python dependencies (FastAPI, Uvicorn, yt-dlp, imageio-ffmpeg)
├── run.py                 # Application launcher with automatic browser opening
├── start.bat              # 1-click Windows batch launcher
├── static/
│   ├── index.html         # Modern Claude-inspired responsive UI
│   └── app.js             # Client logic: polling, batch queue, history drawer, lightbox, preview player
└── README.md              # Project documentation
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the main web UI |
| `GET` | `/api/default-dir` | Returns the system's default Downloads folder |
| `GET` | `/api/system-status` | Checks FFmpeg availability and resolved binary path |
| `POST` | `/api/info` | Extracts media metadata, thumbnails, and available quality formats |
| `POST` | `/api/download` | Initiates a background download task (video, audio, or image) |
| `GET` | `/api/progress/{task_id}` | Polls real-time progress, speed, ETA, and file path for an active task |
| `POST` | `/api/download/pause` | Pauses an active download task |
| `POST` | `/api/download/resume` | Resumes a paused download task |
| `POST` | `/api/download/cancel` | Cancels an active download task |
| `POST` | `/api/select-folder` | Opens native Windows folder selection dialog |
| `POST` | `/api/open-folder` | Opens a folder in Windows Explorer |
| `POST` | `/api/open-file` | Launches downloaded file in default Windows application |
| `POST` | `/api/show-in-folder` | Selects and highlights a downloaded file in Windows Explorer |

---

## ⚙️ Requirements

- **Python**: 3.8 or higher
- **FFmpeg**: Handled automatically via `imageio-ffmpeg` or system PATH (used for 1080p/4K audio muxing and MP3 conversion).