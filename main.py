from fastapi import FastAPI, HTTPException, Response, Body
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware
from webdav3.client import Client
import os
import ffmpeg
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# 允许跨域请求
middleware = [Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])]
app = FastAPI(middleware=middleware)

metadata_store = {}

@app.post("/api/metadata")
async def save_metadata(payload: dict = Body(...)):
    filename = payload.get('filename')
    metadata = payload.get('metadata')
    
    if not filename or not metadata:
        raise HTTPException(status_code=400, detail="Missing filename or metadata")
        
    metadata_store[filename] = metadata
    return {"status": "success", "filename": filename}

@app.get("/api/metadata/{filename}")
async def get_metadata(filename: str):
    return metadata_store.get(filename, {})

# 模拟WebDAV/FTP文件列表
@app.get("/api/files")
async def get_files():
    webdav = Client({
        'webdav_hostname': os.getenv('WEBDAV_SERVER'),
        'webdav_login': os.getenv('WEBDAV_USERNAME'),
        'webdav_password': os.getenv('WEBDAV_PASSWORD')
    })
    return {"files": webdav.list(os.getenv('MEDIA_ROOT'))}

# 客户端解码路由
@app.get("/api/stream/{filename}")
async def stream_file(filename: str):
    file_path = f"{os.getenv('MEDIA_ROOT')}/{filename}"
    probe = ffmpeg.probe(file_path)
    return {
        "file": filename,
        "url": f"/static/files/{filename}",
        "metadata": probe['format'],
        "codecs": [s['codec_name'] for s in probe['streams']]
    }