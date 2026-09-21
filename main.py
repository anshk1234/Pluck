import os
import subprocess
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional

from downloader import (
    extract_video_info,
    start_download,
    active_tasks,
    get_default_download_dir,
    get_ffmpeg_path,
    pause_download,
    resume_download,
    cancel_download
)



app = FastAPI(title="Pluck - YouTube & Shorts Downloader")

# Mount static folder
static_path = Path(__file__).parent / "static"
static_path.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

class InfoRequest(BaseModel):
    url: str

class DownloadRequest(BaseModel):
    url: str
    format_id: str
    download_type: str = "video"  # "video", "audio", or "image"
    output_dir: Optional[str] = None
    image_url: Optional[str] = None


class OpenFolderRequest(BaseModel):
    folder_path: str

class TaskActionRequest(BaseModel):
    task_id: str

@app.get("/")

async def root():
    index_file = static_path / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "Pluck API is running. UI not found."}

@app.get("/api/default-dir")
async def get_default_dir():
    default_dir = get_default_download_dir()
    return {"default_dir": default_dir}

@app.get("/api/system-status")
async def get_system_status():
    ffmpeg_path = get_ffmpeg_path()
    return {
        "ffmpeg_available": ffmpeg_path is not None,
        "ffmpeg_path": ffmpeg_path
    }


@app.post("/api/info")
async def fetch_info(req: InfoRequest):
    if not req.url or not req.url.strip():
        raise HTTPException(status_code=400, detail="URL cannot be empty.")
    try:
        info = extract_video_info(req.url.strip())
        return info
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch video: {str(e)}")

@app.post("/api/download")
async def trigger_download(req: DownloadRequest):
    if not req.url or not req.url.strip():
        raise HTTPException(status_code=400, detail="URL is required.")
    
    target_dir = req.output_dir if req.output_dir and req.output_dir.strip() else get_default_download_dir()
    
    try:
        task_id = start_download(
            url=req.url.strip(),
            format_id=req.format_id,
            download_type=req.download_type,
            output_dir=target_dir,
            image_url=req.image_url
        )
        return {"task_id": task_id, "output_dir": target_dir}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not initiate download: {str(e)}")

class OpenFileRequest(BaseModel):
    file_path: str

@app.get("/api/progress/{task_id}")
async def get_progress(task_id: str):
    task = active_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Return serializable dict without non-serializable objects
    return {
        "status": task.get("status"),
        "percent": task.get("percent", 0.0),
        "speed": task.get("speed", "--"),
        "eta": task.get("eta", "--"),
        "filename": task.get("filename", ""),
        "file_path": task.get("file_path", ""),
        "downloaded_bytes": task.get("downloaded_bytes", 0),
        "total_bytes": task.get("total_bytes", 0),
        "error": task.get("error")
    }

@app.post("/api/download/pause")
async def pause_task(req: TaskActionRequest):
    success = pause_download(req.task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or cannot be paused")
    return {"status": "paused"}

@app.post("/api/download/resume")
async def resume_task(req: TaskActionRequest):
    success = resume_download(req.task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or cannot be resumed")
    return {"status": "resumed"}

@app.post("/api/download/cancel")
async def cancel_task(req: TaskActionRequest):
    success = cancel_download(req.task_id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found or already ended")
    return {"status": "cancelled"}


@app.post("/api/open-folder")
async def open_folder(req: OpenFolderRequest):
    path = Path(req.folder_path)
    if not path.exists():
        path.mkdir(parents=True, exist_ok=True)
    try:
        # Windows explorer open
        if os.name == 'nt':
            os.startfile(str(path))
        else:
            subprocess.run(["xdg-open", str(path)])
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open folder: {str(e)}")

@app.post("/api/open-file")
async def open_file(req: OpenFileRequest):
    path = Path(req.file_path).resolve()
    if not path.exists():
        raise HTTPException(status_code=404, detail="File does not exist")
    try:
        if os.name == 'nt':
            os.startfile(str(path))
        else:
            subprocess.run(["xdg-open", str(path)])
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to open file: {str(e)}")

@app.post("/api/show-in-folder")
async def show_in_folder(req: OpenFileRequest):
    path = Path(req.file_path).resolve()
    if not path.exists():
        raise HTTPException(status_code=404, detail="File does not exist")
    try:
        if os.name == 'nt':
            subprocess.run(f'explorer /select,"{path}"')
        else:
            subprocess.run(["xdg-open", str(path.parent)])
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to show in folder: {str(e)}")

def _pick_directory_sync(initial_dir: str = "") -> Optional[str]:
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes('-topmost', 1)
        folder = filedialog.askdirectory(
            initialdir=initial_dir if initial_dir and Path(initial_dir).exists() else None,
            title="Select Download Folder"
        )
        root.destroy()
        return folder if folder else None
    except Exception as e:
        print(f"Error picking directory: {e}")
        return None

@app.post("/api/select-folder")
async def select_folder(req: Optional[dict] = None):
    import asyncio
    initial = ""
    if req and isinstance(req, dict):
        initial = req.get("initial_dir", "")
    folder = await asyncio.to_thread(_pick_directory_sync, initial)
    return {"selected_folder": folder}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
