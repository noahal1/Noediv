from fastapi import FastAPI, HTTPException, Response, Body
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from webdav3.client import Client
import os
import ffmpeg
import aiofiles
from dotenv import load_dotenv

load_dotenv()

# 允许跨域请求
middleware = [Middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])]
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

# WebDAV文件列表
@app.get("/api/files")
async def get_files():
    try:
        webdav = Client({
            'webdav_hostname': os.getenv('WEBDAV_SERVER'),
            'webdav_login': os.getenv('WEBDAV_USERNAME'),
            'webdav_password': os.getenv('WEBDAV_PASSWORD')
        })
        
        media_root = os.getenv('MEDIA_ROOT', '')
        files = webdav.list(media_root)
        
        # 过滤出媒体文件
        media_files = []
        for file in files:
            if file.endswith(('.mp4', '.mkv', '.avi', '.mov', '.mp3', '.flac')):
                media_files.append({
                    "name": file,
                    "type": "audio" if file.endswith(('.mp3', '.flac')) else "video"
                })
                
        return {"files": media_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebDAV具体实现
@app.get("/api/webdav/files")
async def webdav_files(url: str, username: str = "", password: str = ""):
    try:
        webdav = Client({
            'webdav_hostname': url,
            'webdav_login': username,
            'webdav_password': password
        })
        
        files = webdav.list('/')
        
        # 过滤出媒体文件
        media_files = []
        for file in files:
            if file.endswith(('.mp4', '.mkv', '.avi', '.mov', '.mp3', '.flac')):
                media_files.append({
                    "name": file,
                    "type": "audio" if file.endswith(('.mp3', '.flac')) else "video"
                })
                
        return {"files": media_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# FTP具体实现 (需要安装ftplib)
@app.get("/api/ftp/files")
async def ftp_files(url: str, username: str = "", password: str = ""):
    try:
        from ftplib import FTP
        
        # 解析FTP URL
        if url.startswith('ftp://'):
            url = url[6:]
            
        host = url.split('/')[0]
        path = '/' + '/'.join(url.split('/')[1:]) if '/' in url else '/'
            
        # 连接FTP
        ftp = FTP(host)
        ftp.login(username, password)
        
        if path != '/':
            ftp.cwd(path)
            
        files = ftp.nlst()
        
        # 过滤出媒体文件
        media_files = []
        for file in files:
            if file.endswith(('.mp4', '.mkv', '.avi', '.mov', '.mp3', '.flac')):
                media_files.append({
                    "name": file,
                    "type": "audio" if file.endswith(('.mp3', '.flac')) else "video"
                })
                
        ftp.quit()
        return {"files": media_files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 客户端解码路由
@app.get("/api/stream/{filename}")
async def stream_file(filename: str):
    try:
        file_path = f"{os.getenv('MEDIA_ROOT')}/{filename}"
        
        # 使用ffmpeg获取媒体元数据
        probe = ffmpeg.probe(file_path)
        
        return {
            "file": filename,
            "url": f"/api/raw/{filename}",
            "metadata": probe['format'],
            "codecs": [s['codec_name'] for s in probe['streams']]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 提供原始媒体文件流
@app.get("/api/raw/{filename}")
async def get_raw_file(filename: str):
    try:
        webdav = Client({
            'webdav_hostname': os.getenv('WEBDAV_SERVER'),
            'webdav_login': os.getenv('WEBDAV_USERNAME'),
            'webdav_password': os.getenv('WEBDAV_PASSWORD')
        })
        
        media_root = os.getenv('MEDIA_ROOT', '')
        file_path = f"{media_root}/{filename}"
        
        # 临时文件路径
        temp_file = f"/tmp/{filename}"
        
        # 从WebDAV下载到临时文件
        webdav.download(file_path, temp_file)
        
        # 读取文件内容
        async with aiofiles.open(temp_file, mode='rb') as f:
            content = await f.read()
            
        # 根据文件后缀确定媒体类型
        content_type = "video/mp4"
        if filename.endswith('.mp3'):
            content_type = "audio/mp3"
        elif filename.endswith('.mkv'):
            content_type = "video/x-matroska"
            
        # 返回文件内容
        return Response(content=content, media_type=content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 如果存在本地静态文件目录，则提供静态文件服务
if os.path.exists("./static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")