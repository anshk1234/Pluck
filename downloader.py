import os
import re
import uuid
import threading
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
import yt_dlp

def get_ffmpeg_path() -> Optional[str]:
    """Finds ffmpeg from system PATH, imageio_ffmpeg, or local bin."""
    # 1. System PATH
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    
    # 2. imageio_ffmpeg
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.exists(exe):
            return exe
    except Exception:
        pass

    # 3. Local bin directory
    local_bin = Path(__file__).parent / "bin" / "ffmpeg.exe"
    if local_bin.exists():
        return str(local_bin)

    return None

# Active download tasks dictionary
# task_id -> {status, percent, speed, eta, filename, error, total_bytes, downloaded_bytes}
active_tasks: Dict[str, Dict[str, Any]] = {}


def get_default_download_dir() -> str:
    """Returns the default Windows Downloads directory."""
    downloads_path = Path.home() / "Downloads"
    return str(downloads_path)

def format_bytes(size: Optional[Any]) -> str:
    if not size:
        return "Unknown size"
    try:
        size_f = float(size)
    except (ValueError, TypeError):
        return "Unknown size"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_f < 1024.0:
            return f"{size_f:.1f} {unit}"
        size_f /= 1024.0
    return f"{size_f:.1f} TB"

def format_duration(seconds: Optional[Any]) -> str:
    if not seconds:
        return "00:00"
    try:
        sec = int(round(float(seconds)))
    except (ValueError, TypeError):
        return "00:00"
    m, s = divmod(sec, 60)
    h, m = divmod(m, 60)
    if h > 0:
        return f"{h:02d}:{m:02d}:{s:02d}"
    return f"{m:02d}:{s:02d}"


import urllib.request
import urllib.parse
import json

class QuietLogger:
    """Silences yt-dlp stderr logs for clean server output."""
    def debug(self, msg): pass
    def info(self, msg): pass
    def warning(self, msg): pass
    def error(self, msg): pass

def get_pinterest_original_image(url: str) -> str:
    """Upgrades a Pinterest image URL to original full resolution."""
    if not url:
        return url
    return re.sub(r'/(?:[0-9]+x|originals)/', '/originals/', url)

def resolve_pinterest_pin(url: str) -> tuple[Optional[str], str]:
    """
    Resolves shortlinks (e.g. pin.it) and returns (pin_id, resolved_url).
    """
    real_url = url
    if 'pin.it' in url.lower():
        try:
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                real_url = resp.geturl()
        except Exception as e:
            print(f"Failed to resolve pin.it shortlink: {e}")

    pin_id_match = re.search(r'/pin/(\d+)', real_url)
    pin_id = pin_id_match.group(1) if pin_id_match else None
    return pin_id, real_url

def extract_pinterest_pin(url: str) -> Dict[str, Any]:
    """
    Dedicated Pinterest extractor that supports both Photos and Videos from Pins & pin.it shortlinks.
    Completely bypasses yt-dlp for photo pins to prevent 'No video formats found!' errors.
    """
    pin_id, real_url = resolve_pinterest_pin(url)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
    }
    
    html = ""
    try:
        req = urllib.request.Request(real_url, headers=headers)
        with urllib.request.urlopen(req, timeout=12) as resp:
            real_url = resp.geturl()
            html = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Failed to fetch Pinterest pin page: {e}")

    # 1. Extract High-Resolution Image URL
    image_url = ""
    for meta in re.findall(r'<meta\s+[^>]+>', html, re.I):
        if re.search(r'(?:property|name)=["\'](?:og:image|twitter:image(?::src)?)["\']', meta, re.I):
            c_match = re.search(r'content=["\']([^"\']+)["\']', meta, re.I)
            if c_match:
                candidate = c_match.group(1)
                if 'pinimg.com' in candidate:
                    image_url = candidate
                    break

    if not image_url:
        all_pinimg = re.findall(r'https://i\.pinimg\.com/(?:originals|[0-9]+x)/[^"\'\s<>]+\.(?:jpg|png|webp)', html)
        if all_pinimg:
            image_url = all_pinimg[0]

    if image_url:
        image_url = get_pinterest_original_image(image_url)

    # 2. Extract Title
    title = ""
    for meta in re.findall(r'<meta\s+[^>]+>', html, re.I):
        if re.search(r'(?:property|name)=["\'](?:og:title|twitter:title)["\']', meta, re.I):
            c_match = re.search(r'content=["\']([^"\']+)["\']', meta, re.I)
            if c_match:
                title = c_match.group(1).strip()
                break

    if not title:
        t_match = re.search(r'<title>([^<]+)</title>', html, re.I)
        if t_match:
            title = t_match.group(1).strip()

    title = re.sub(r'\s*\|\s*Pinterest.*$', '', title).strip()
    if not title or title.lower() in ('pinterest', 'pin'):
        title = "Pinterest Pin"
    if len(title) > 80:
        title = title[:80] + '...'

    # 3. Extract Channel / Creator
    channel = "Pinterest"
    for meta in re.findall(r'<meta\s+[^>]+>', html, re.I):
        if re.search(r'(?:property|name)=["\'](?:og:site_name|author)["\']', meta, re.I):
            c_match = re.search(r'content=["\']([^"\']+)["\']', meta, re.I)
            if c_match:
                channel = c_match.group(1).strip()
                break

    # 4. Check for Video Streams
    video_options = []
    audio_options = []
    
    has_video = False
    try:
        ydl_opts = {'quiet': True, 'no_warnings': True, 'logger': QuietLogger(), 'skip_download': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            yinfo = ydl.extract_info(real_url, download=False)
            if yinfo and 'formats' in yinfo:
                raw_formats = yinfo.get('formats', [])
                has_video = any(f.get('vcodec') != 'none' for f in raw_formats)
    except Exception:
        has_video = False

    # Also check if HTML contains direct mp4 URLs
    video_urls = set(re.findall(r'https?://v\.pinimg\.com/[^"\'\s<>]+\.mp4', html))
    if video_urls:
        has_video = True

    if has_video:
        video_options.append({
            "type": "video",
            "label": "Original Quality (MP4)",
            "height": 1080,
            "format_id": "bestvideo+bestaudio/best",
            "approx_size": "Best"
        })
        audio_options = [
            {
                "type": "audio",
                "label": "Audio Only (MP3)",
                "ext": "mp3",
                "format_id": "bestaudio/best",
                "approx_size": "High Quality"
            }
        ]

    # 5. High-Resolution Image Option (Always available for Pins)
    image_options = []
    if image_url:
        image_options.append({
            "type": "image",
            "label": "Original Photo (Full HD / 4K)",
            "format_id": "image_original",
            "url": image_url,
            "ext": "jpg",
            "approx_size": "Original Quality"
        })

    # Determine preview URL for video if available
    preview_url = list(video_urls)[0] if video_urls else ""

    return {
        "platform": "pinterest",
        "title": title,
        "thumbnail": image_url,
        "preview_url": preview_url,
        "duration": "00:00",
        "duration_seconds": 0,
        "channel": channel,
        "url": real_url,
        "video_options": video_options,
        "image_options": image_options,
        "audio_options": audio_options
    }

def resolve_twitter_tweet(url: str) -> tuple[Optional[str], str]:
    """
    Resolves shortlinks (e.g. t.co) and extracts tweet ID.
    Returns (tweet_id, resolved_url).
    """
    real_url = url
    if 't.co' in url.lower():
        try:
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                real_url = resp.geturl()
        except Exception as e:
            print(f"Failed to resolve t.co shortlink: {e}")

    match = re.search(r'(?:status|statuses)/(\d+)', real_url)
    tweet_id = match.group(1) if match else None
    return tweet_id, real_url

def extract_twitter_media(url: str) -> Dict[str, Any]:
    """
    Dedicated Twitter / X extractor for photo posts and fallback when yt-dlp finds no video.
    Fetches full-resolution original photos via fxtwitter API.
    """
    tweet_id, real_url = resolve_twitter_tweet(url)
    if not tweet_id:
        raise ValueError(f"Could not extract Tweet ID from URL: {url}")

    api_url = f"https://api.fxtwitter.com/status/{tweet_id}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json'
    }

    req = urllib.request.Request(api_url, headers=headers)
    with urllib.request.urlopen(req, timeout=12) as resp:
        data = json.loads(resp.read().decode('utf-8', errors='ignore'))

    tweet = data.get('tweet')
    if not tweet:
        raise ValueError("No tweet data returned from Twitter API")

    raw_text = tweet.get('text') or ''
    first_line = raw_text.strip().split('\n')[0].strip() if raw_text else ''
    author = tweet.get('author') or {}
    screen_name = author.get('screen_name') or 'user'

    if first_line:
        title = (first_line[:80] + '...') if len(first_line) > 80 else first_line
    else:
        title = f"Post on X by @{screen_name}"

    channel = f"@{screen_name}"

    media = tweet.get('media') or {}
    photos = media.get('photos') or []
    if not photos and 'all' in media:
        photos = [m for m in media.get('all', []) if m.get('type') == 'photo']

    image_options = []
    for idx, p in enumerate(photos):
        photo_url = p.get('url')
        if not photo_url:
            continue
        # Upgrade to original full resolution (?name=orig)
        if 'pbs.twimg.com' in photo_url:
            if '?name=' in photo_url:
                photo_url = re.sub(r'\?name=[a-zA-Z0-9]+', '?name=orig', photo_url)
            else:
                photo_url = f"{photo_url}?name=orig"

        w = p.get('width')
        h = p.get('height')
        res_str = f"{w}x{h}" if w and h else "Original Quality"
        label = f"Photo {idx + 1} ({res_str})" if len(photos) > 1 else f"Original Photo ({res_str})"

        image_options.append({
            "type": "image",
            "label": label,
            "format_id": "image_original",
            "url": photo_url,
            "ext": "jpg",
            "approx_size": res_str
        })

    # Check for videos if any
    video_options = []
    audio_options = []
    preview_url = ""
    videos = media.get('videos') or []
    if not videos and 'all' in media:
        videos = [m for m in media.get('all', []) if m.get('type') == 'video']

    for v in videos:
        v_url = v.get('url')
        if v_url:
            if not preview_url:
                preview_url = v_url
            w = v.get('width')
            h = v.get('height')
            res_label = f"{h}p" if h else "HD"
            video_options.append({
                "type": "video",
                "label": f"Original Quality ({res_label})",
                "height": h or 1080,
                "format_id": "bestvideo+bestaudio/best",
                "url": v_url,
                "approx_size": f"{w}x{h}" if w and h else "Original Quality"
            })

    thumbnail = ""
    if photos:
        thumbnail = photos[0].get('url', '')
    elif videos:
        thumbnail = videos[0].get('thumbnail_url', '')

    return {
        "platform": "twitter",
        "title": title,
        "thumbnail": thumbnail,
        "preview_url": preview_url,
        "duration": "00:00",
        "duration_seconds": 0,
        "channel": channel,
        "url": real_url,
        "video_options": video_options,
        "image_options": image_options,
        "audio_options": audio_options
    }

def extract_video_info(url: str) -> Dict[str, Any]:
    """
    Intelligent URL Router:
    1. Pinterest (pins & pin.it) -> Routed directly to dedicated Pinterest extractor (both Photos & Videos).
    2. YouTube, Instagram, X (Twitter), TikTok -> Routed to yt-dlp with optimized format processing.
    """
    url_lower = url.lower()
    
    # 1. SMART ROUTE: Pinterest
    if 'pinterest.com' in url_lower or 'pin.it' in url_lower:
        return extract_pinterest_pin(url)

    # 2. SMART ROUTE: Twitter / X
    if 'twitter.com' in url_lower or 'x.com' in url_lower:
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception as e:
            # yt-dlp failed (e.g. photo post with no video)
            try:
                twitter_media = extract_twitter_media(url)
                if twitter_media and (twitter_media.get('image_options') or twitter_media.get('video_options')):
                    return twitter_media
            except Exception as tw_err:
                print(f"Failed to extract Twitter media fallback: {tw_err}")
            raise e
    else:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

    # In case of playlist or multi-video, pick the first
    if 'entries' in info and info['entries']:
        info = info['entries'][0]

    # Determine platform
    if 'instagram.com' in url_lower:
        platform = 'instagram'
    elif 'twitter.com' in url_lower or 'x.com' in url_lower:
        platform = 'twitter'
    elif 'tiktok.com' in url_lower:
        platform = 'tiktok'
    elif 'youtube.com' in url_lower or 'youtu.be' in url_lower:
        platform = 'youtube'
    else:
        platform = 'video'

    raw_title = info.get('title') or info.get('description') or ''
    raw_channel = info.get('uploader') or info.get('channel') or 'Creator'

    if platform in ('instagram', 'twitter', 'tiktok'):
        if raw_title:
            first_line = raw_title.strip().split('\n')[0].strip()
            title = (first_line[:80] + '...') if len(first_line) > 80 else first_line
        else:
            platform_names = {'instagram': 'Instagram Reel', 'twitter': 'Post on X', 'tiktok': 'TikTok'}
            title = f"{platform_names.get(platform, 'Media')} by @{raw_channel}"
        
        channel = f"@{raw_channel}" if not raw_channel.startswith('@') else raw_channel
    else:
        title = raw_title if raw_title else 'Untitled Video'
        channel = raw_channel

    thumbnail = info.get('thumbnail', '')
    duration = info.get('duration', 0)
    raw_formats = info.get('formats', [])

    # Process available video resolutions
    available_resolutions = set()
    video_options = []
    
    # Priority resolution targets
    target_resolutions = [2160, 1440, 1080, 720, 480, 360, 240, 144]
    resolution_labels = {
        2160: "4K (2160p)",
        1440: "2K (1440p)",
        1080: "Full HD (1080p)",
        720: "HD (720p)",
        480: "SD (480p)",
        360: "360p",
        240: "240p",
        144: "144p"
    }

    for f in raw_formats:
        height = f.get('height')
        vcodec = f.get('vcodec', 'none')
        if height and vcodec != 'none':
            available_resolutions.add(height)

    # Sort descending by resolution height
    sorted_heights = sorted(list(available_resolutions), reverse=True)
    
    for h in sorted_heights:
        matching = [f for f in raw_formats if f.get('height') == h and f.get('vcodec') != 'none']
        filesize = None
        if matching:
            sizes = [f.get('filesize') or f.get('filesize_approx') for f in matching if (f.get('filesize') or f.get('filesize_approx'))]
            if sizes:
                filesize = max(sizes)
        
        label = resolution_labels.get(h, f"{h}p")
        video_options.append({
            "type": "video",
            "label": label,
            "height": h,
            "format_id": f"bestvideo[height<={h}]+bestaudio/best[height<={h}]/best",
            "approx_size": format_bytes(filesize) if filesize else "Adaptive"
        })

    has_video = any(f.get('vcodec') != 'none' for f in raw_formats)

    if platform == 'twitter' and not has_video:
        try:
            twitter_media = extract_twitter_media(url)
            if twitter_media and twitter_media.get('image_options'):
                return twitter_media
        except Exception:
            pass

    if not video_options:
        video_options.append({
            "type": "video",
            "label": "Original Quality (MP4)",
            "height": 1080,
            "format_id": "bestvideo+bestaudio/best",
            "approx_size": "Best"
        })
    elif platform in ('instagram', 'twitter', 'tiktok') and len(video_options) > 1:
        video_options[0]["label"] = f"Original Quality ({video_options[0]['label']})"

    # Image / Photo options
    image_options = []
    if thumbnail:
        image_options.append({
            "type": "image",
            "label": "Cover / Thumbnail (HD)",
            "format_id": "image_original",
            "url": thumbnail,
            "ext": "jpg",
            "approx_size": "Original Quality"
        })

    # Audio options (extract audio from video / reel)
    audio_options = []
    if has_video:
        audio_options = [
            {
                "type": "audio",
                "label": "Audio Only (MP3)",
                "ext": "mp3",
                "format_id": "bestaudio/best",
                "approx_size": "High Quality"
            },
            {
                "type": "audio",
                "label": "Original Audio (M4A)",
                "ext": "m4a",
                "format_id": "bestaudio[ext=m4a]/bestaudio/best",
                "approx_size": "Original"
            }
        ]

    # Determine preview URL
    preview_url = ""
    if platform == 'youtube' and info.get('id'):
        preview_url = f"https://www.youtube.com/embed/{info.get('id')}"
    elif info.get('url') and info.get('url').startswith('http'):
        preview_url = info.get('url')
    else:
        for f in raw_formats:
            if f.get('vcodec') != 'none' and f.get('url') and f.get('url').startswith('http'):
                if f.get('ext') == 'mp4':
                    preview_url = f.get('url')
                    break
                elif not preview_url:
                    preview_url = f.get('url')

    return {
        "platform": platform,
        "title": title,
        "thumbnail": thumbnail,
        "preview_url": preview_url,
        "duration": format_duration(duration),
        "duration_seconds": int(round(float(duration))) if duration else 0,
        "channel": channel,
        "url": url,
        "video_options": video_options,
        "image_options": image_options,
        "audio_options": audio_options
    }




def sanitize_filename(name: str) -> str:
    """Sanitizes strings for safe Windows filenames."""
    return re.sub(r'[\\/*?:"<>|]', "", name)

import time

def run_download_task(task_id: str, url: str, format_id: str, download_type: str, output_dir: str, image_url: Optional[str] = None):
    """
    Executes the download with yt-dlp or direct image downloader in a background worker thread.
    """
    pause_event = threading.Event()
    pause_event.set()  # Initially running (not paused)

    active_tasks[task_id] = {
        "status": "starting",
        "percent": 0.0,
        "speed": "0 KB/s",
        "eta": "--",
        "filename": "",
        "downloaded_bytes": 0,
        "total_bytes": 0,
        "error": None,
        "_pause_event": pause_event,
        "_is_cancelled": False,
    }

    # Handle image download directly
    if download_type == 'image':
        target_img = image_url or url
        save_path = Path(output_dir).expanduser().resolve()
        save_path.mkdir(parents=True, exist_ok=True)
        
        active_tasks[task_id]["status"] = "downloading"
        active_tasks[task_id]["speed"] = "Downloading..."
        
        try:
            req = urllib.request.Request(
                target_img,
                headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                total = int(resp.headers.get('Content-Length', 0))
                content_type = resp.headers.get('Content-Type', '')
                ext = 'jpg'
                if 'png' in content_type:
                    ext = 'png'
                elif 'webp' in content_type:
                    ext = 'webp'
                
                parsed_url = urllib.parse.urlparse(target_img)
                base = os.path.basename(parsed_url.path)
                if '.' in base:
                    filename = base
                else:
                    prefix = "twitter" if "twimg" in target_img else ("pinterest" if "pinimg" in target_img else "photo")
                    filename = f"{prefix}_photo_{task_id[:8]}.{ext}"

                stem = Path(filename).stem
                suffix = Path(filename).suffix or f".{ext}"
                filepath = save_path / f"{stem}{suffix}"
                counter = 1
                while filepath.exists():
                    filepath = save_path / f"{stem}_{counter}{suffix}"
                    counter += 1
                filename = filepath.name

                downloaded = 0
                with open(filepath, 'wb') as f:
                    while True:
                        if active_tasks[task_id].get("_is_cancelled"):
                            raise Exception("Download cancelled by user")
                        chunk = resp.read(64 * 1024)
                        if not chunk:
                            break
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total > 0:
                            active_tasks[task_id]["percent"] = round((downloaded / total) * 100, 1)
                        else:
                            active_tasks[task_id]["percent"] = 75.0

            active_tasks[task_id]["status"] = "completed"
            active_tasks[task_id]["percent"] = 100.0
            active_tasks[task_id]["speed"] = "Done"
            active_tasks[task_id]["filename"] = filename
            active_tasks[task_id]["file_path"] = str(filepath)
            return
        except Exception as e:
            if active_tasks[task_id].get("_is_cancelled") or "cancelled by user" in str(e).lower():
                active_tasks[task_id]["status"] = "cancelled"
            else:
                active_tasks[task_id]["status"] = "error"
                active_tasks[task_id]["error"] = str(e)
            return

    def progress_hook(d):

        # 1. Check if user cancelled
        if active_tasks[task_id].get("_is_cancelled"):
            raise Exception("Download cancelled by user")

        # 2. Check if user paused
        if not pause_event.is_set():
            active_tasks[task_id]["status"] = "paused"
            active_tasks[task_id]["speed"] = "Paused"
            while not pause_event.is_set():
                if active_tasks[task_id].get("_is_cancelled"):
                    raise Exception("Download cancelled by user")
                time.sleep(0.25)
            if active_tasks[task_id]["status"] == "paused":
                active_tasks[task_id]["status"] = "downloading"

        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            
            percent = 0.0
            if total > 0:
                percent = round((downloaded / total) * 100, 1)
            elif '_percent_str' in d:
                clean_pct = re.sub(r'\x1b\[[0-9;]*m', '', d['_percent_str']).strip().replace('%', '')
                try:
                    percent = float(clean_pct)
                except ValueError:
                    percent = 0.0

            speed_str = d.get('_speed_str', 'N/A')
            clean_speed = re.sub(r'\x1b\[[0-9;]*m', '', str(speed_str)).strip()

            eta_str = d.get('_eta_str', '--')
            clean_eta = re.sub(r'\x1b\[[0-9;]*m', '', str(eta_str)).strip()

            active_tasks[task_id].update({
                "status": "downloading",
                "percent": percent,
                "speed": clean_speed,
                "eta": clean_eta,
                "downloaded_bytes": downloaded,
                "total_bytes": total,
                "filename": os.path.basename(d.get('filename', ''))
            })
        elif d['status'] == 'finished':
            active_tasks[task_id].update({
                "status": "processing",
                "percent": 100.0,
                "speed": "Merging...",
                "eta": "0s",
                "filename": os.path.basename(d.get('filename', ''))
            })

    # Prepare download path
    save_path = Path(output_dir).expanduser().resolve()
    save_path.mkdir(parents=True, exist_ok=True)
    out_template = str(save_path / '%(title).100s.%(ext)s')


    ffmpeg_path = get_ffmpeg_path()

    ydl_opts: Dict[str, Any] = {
        'outtmpl': out_template,
        'progress_hooks': [progress_hook],
        'quiet': True,
        'no_warnings': True,
        'buffersize': 1024 * 64,
        'retries': 5,
        'fragment_retries': 5,
    }

    if ffmpeg_path:
        ydl_opts['ffmpeg_location'] = ffmpeg_path

    if download_type == 'audio':
        ydl_opts['format'] = 'bestaudio/best'
        if ffmpeg_path:
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
    else:
        clean_format = format_id if (format_id and not format_id.startswith('http')) else 'bestvideo+bestaudio/best'
        if ffmpeg_path:
            ydl_opts['format'] = clean_format
            ydl_opts['merge_output_format'] = 'mp4'
        else:
            ydl_opts['format'] = 'best[ext=mp4]/best'

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        
        active_tasks[task_id]["status"] = "completed"
        active_tasks[task_id]["percent"] = 100.0

        # Resolve exact downloaded file_path for opening in Windows
        fname = active_tasks[task_id].get("filename", "")
        if fname:
            cand = save_path / fname
            if cand.exists():
                active_tasks[task_id]["file_path"] = str(cand)
            else:
                stem = Path(fname).stem
                for f in save_path.glob(f"{stem}*"):
                    active_tasks[task_id]["file_path"] = str(f)
                    active_tasks[task_id]["filename"] = f.name
                    break
    except Exception as e:
        if active_tasks[task_id].get("_is_cancelled") or "cancelled by user" in str(e).lower():
            active_tasks[task_id]["status"] = "cancelled"
            active_tasks[task_id]["speed"] = "--"
        else:
            active_tasks[task_id]["status"] = "error"
            active_tasks[task_id]["error"] = str(e)

def pause_download(task_id: str) -> bool:
    """Pauses an ongoing download task."""
    task = active_tasks.get(task_id)
    if task and task.get("_pause_event"):
        task["_pause_event"].clear()
        task["status"] = "paused"
        task["speed"] = "Paused"
        return True
    return False

def resume_download(task_id: str) -> bool:
    """Resumes a paused download task."""
    task = active_tasks.get(task_id)
    if task and task.get("_pause_event"):
        task["_pause_event"].set()
        task["status"] = "downloading"
        return True
    return False

def cancel_download(task_id: str) -> bool:
    """Cancels an ongoing download task."""
    task = active_tasks.get(task_id)
    if task:
        task["_is_cancelled"] = True
        if task.get("_pause_event"):
            task["_pause_event"].set()  # Unblock if currently paused
        task["status"] = "cancelled"
        task["speed"] = "--"
        return True
    return False

def start_download(url: str, format_id: str, download_type: str, output_dir: str, image_url: Optional[str] = None) -> str:
    """Spawns download thread and returns task ID."""
    task_id = str(uuid.uuid4())
    thread = threading.Thread(
        target=run_download_task,
        args=(task_id, url, format_id, download_type, output_dir, image_url),
        daemon=True
    )
    thread.start()
    return task_id


