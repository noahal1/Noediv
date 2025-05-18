from fastapi import FastAPI, HTTPException, Response, Body, Request
from fastapi.middleware import Middleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from webdav3.client import Client
from fastapi.responses import StreamingResponse
import os
import io
import ffmpeg
import aiofiles
import time
import logging
import tempfile
from dotenv import load_dotenv
from urllib.parse import quote, unquote
import requests
from fastapi.responses import PlainTextResponse, JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()  # Output to console
    ]
)

load_dotenv()

# 允许跨域请求 - 允许所有方法包括OPTIONS和HEAD
middleware = [
    Middleware(
        CORSMiddleware, 
        allow_origins=["*"], 
        allow_methods=["*"],  # 允许所有方法
        allow_headers=["*"],
        expose_headers=["Content-Range", "Content-Length", "Accept-Ranges", "Content-Encoding", "Content-Disposition"],
        max_age=600  # 缓存预检请求结果10分钟
    )
]
app = FastAPI(middleware=middleware)

metadata_store = {}

# 添加OPTIONS请求处理
@app.options("/{path:path}")
async def options_route(path: str):
    return PlainTextResponse("OK")

@app.post("/api/metadata")
async def save_metadata(payload: dict = Body(...)):
    filename = payload.get('filename')
    metadata = payload.get('metadata')
    
    if not filename or not metadata:
        raise HTTPException(status_code=400, detail="Missing filename or metadata")
        
    metadata_store[filename] = metadata
    return {"status": "success", "filename": filename}

@app.get("/api/metadata/{filename:path}")
async def get_metadata(filename: str):
    # URL解码文件名
    decoded_filename = unquote(filename)
    return metadata_store.get(decoded_filename, {})

# 添加HEAD请求支持
@app.head("/api/raw/{filename:path}")
async def head_raw_file(filename: str):
    # URL解码文件名
    decoded_filename = unquote(filename)
    logging.info(f"HEAD请求: {decoded_filename}")
    
    # 创建WebDAV客户端
    try:
        webdav = Client({
            'webdav_hostname': os.getenv('WEBDAV_SERVER'),
            'webdav_login': os.getenv('WEBDAV_USERNAME'),
            'webdav_password': os.getenv('WEBDAV_PASSWORD'),
            'webdav_timeout': 5
        })
        webdav.verify = False
        
        # 构建远程路径
        media_root = os.getenv('MEDIA_ROOT', '')
        remote_path = f"{media_root}/{filename}" if media_root else filename
        
        # 检查文件是否存在
        if not webdav.check(remote_path):
            logging.error(f"文件未找到: {remote_path}")
            raise HTTPException(status_code=404, detail=f"File not found: {decoded_filename}")

        # 获取文件信息
        try:
            file_info = webdav.info(remote_path)
            file_size = int(file_info.get('size', 0))
            logging.info(f"文件信息: {file_info}")
            
            # 设置内容类型
            content_type = "application/octet-stream"
            if decoded_filename.endswith('.mp4'):
                content_type = "video/mp4"
            elif decoded_filename.endswith('.mkv'):
                content_type = "video/x-matroska"
            
            # 返回HEAD响应，只包含头信息，不包含主体
            return Response(
                content=None,  # HEAD请求不需要主体
                headers={
                    "Content-Type": content_type,
                    "Content-Length": str(file_size),
                    "Accept-Ranges": "bytes",
                    "Content-Disposition": f'inline; filename="{quote(decoded_filename)}"'
                }
            )
        except Exception as e:
            logging.error(f"获取文件信息失败: {str(e)}")
            return JSONResponse(
                status_code=200,  # 返回200而不是错误，让客户端继续尝试
                content={"success": False, "message": f"File info not available, but might exist: {str(e)}"}
            )
            
    except Exception as e:
        logging.error(f"HEAD请求处理失败: {str(e)}")
        return JSONResponse(
            status_code=200,  # 返回200而不是错误，让客户端继续尝试
            content={"success": False, "message": f"Request processed, file might exist: {str(e)}"}
        )

# WebDAV文件列表
@app.get("/api/files")
async def get_files():
    max_retries = 3
    retry_delay = 1
    
    for attempt in range(max_retries):
        try:
            webdav = Client({
                'webdav_hostname': os.getenv('WEBDAV_SERVER'),
                'webdav_login': os.getenv('WEBDAV_USERNAME'),
                'webdav_password': os.getenv('WEBDAV_PASSWORD'),
                'webdav_timeout': 30,
                'disable_check': True
            })
            webdav.verify = False
            
            media_root = os.getenv('MEDIA_ROOT', '')
            files = webdav.list(media_root)
            
            # 过滤出媒体文件
            media_files = []
            for file in files:
                if file.endswith(('.mp4', '.mkv', '.avi', '.mov', '.webm', '.mp3', '.flac', '.wav', '.aac', '.m4v', '.ts', '.vob', '.mts', '.3gp')):
                    print(f"Processing file: {file}")  # 调试日志
                    media_files.append({
                        "name": os.path.basename(file),
                        "type": "audio" if file.endswith(('.mp3', '.flac', '.wav', '.aac')) else "video"
                    })
                    
            return {"files": media_files}

        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"WebDAV操作失败: {str(e)}"
            )

# WebDAV具体实现
@app.get("/api/webdav/files")
async def webdav_files(url: str, username: str = "", password: str = ""):
    try:
        webdav = Client({
            'webdav_hostname': url,
            'webdav_login': username,
            'webdav_password': password
        })
        
        try:
            # Directly use list method which is widely supported
            files = webdav.list('/')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"WebDAV operation failed: {str(e)}")
        
        # 过滤出媒体文件
        media_files = []
        for file in files:
            if file.endswith(('.mp4', '.mkv', '.avi', '.mov', '.webm', '.mp3', '.flac', '.wav', '.aac', '.m4v', '.ts', '.vob', '.mts', '.3gp')):
                print(f"Processing file: {file}")  # 调试日志
                media_files.append({
                    "name": os.path.basename(file),
                    "type": "audio" if file.endswith(('.mp3', '.flac', '.wav', '.aac')) else "video"
                })
                
        return {"files": media_files}

    except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"WebDAV操作失败: {str(e)}"
            )

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
            if file.endswith(('.mp4', '.mkv', '.avi', '.mov', '.webm', '.mp3', '.flac', '.wav', '.aac', '.m4v', '.ts', '.vob', '.mts', '.3gp')):
                print(f"Processing file: {file}")  # 调试日志
                media_files.append({
                    "name": os.path.basename(file),
                    "type": "audio" if file.endswith(('.mp3', '.flac', '.wav', '.aac')) else "video"
                })
                
        ftp.quit()
        return {"files": media_files}
    except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"WebDAV操作失败: {str(e)}"
            )

# 客户端解码路由 - 只返回元数据信息
@app.get("/api/stream/{filename:path}")
async def stream_file(filename: str):
    try:
        # URL解码文件名
        decoded_filename = unquote(filename)
        logging.info(f"解码后的文件名: {decoded_filename}")
        
        # 创建WebDAV客户端
        webdav = Client({
            'webdav_hostname': os.getenv('WEBDAV_SERVER'),
            'webdav_login': os.getenv('WEBDAV_USERNAME'),
            'webdav_password': os.getenv('WEBDAV_PASSWORD'),
            'webdav_timeout': 30
        })
        webdav.verify = False
        
        # 构建远程路径
        media_root = os.getenv('MEDIA_ROOT', '')
        encoded_filename = quote(decoded_filename)
        remote_path = f"{media_root}/{encoded_filename}" if media_root else encoded_filename
        
        # 判断文件类型
        file_type = "video"
        if decoded_filename.endswith(('.mp3', '.flac', '.wav', '.aac')):
            file_type = "audio"
            
        # 返回流媒体URL和类型
        return {
            "file": decoded_filename,
            "url": f"/api/stream-direct/{filename}",
            "type": file_type,
            "direct_streaming": True  # 标识为直接流式传输
        }
    except Exception as e:
        logging.exception(f"流媒体信息获取失败: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"流媒体信息获取失败: {str(e)}"
        )

# 支持HEAD方法的直接流API
@app.head("/api/stream-direct/{filename:path}")
async def head_stream_direct(filename: str):
    return await head_raw_file(filename)

# 直接流式传输API - 支持范围请求
@app.get("/api/stream-direct/{filename:path}")
async def stream_direct(request: Request, filename: str):
    try:
        # URL解码文件名
        decoded_filename = unquote(filename)
        logging.info(f"直接流式传输请求: {decoded_filename}")
        
        # 创建WebDAV客户端
        webdav = Client({
            'webdav_hostname': os.getenv('WEBDAV_SERVER'),
            'webdav_login': os.getenv('WEBDAV_USERNAME'),
            'webdav_password': os.getenv('WEBDAV_PASSWORD'),
            'webdav_timeout': 30
        })
        webdav.verify = False
        
        # 构建远程路径
        media_root = os.getenv('MEDIA_ROOT', '')
        encoded_filename = quote(decoded_filename)
        remote_path = f"{media_root}/{encoded_filename}" if media_root else encoded_filename
        
        # 检查文件是否存在
        if not webdav.check(remote_path):
            raise HTTPException(status_code=404, detail=f"File not found: {decoded_filename}")
            
        # 获取文件信息
        file_info = webdav.info(remote_path)
        logging.info(f"文件信息: {file_info}")
        
        # 解析文件大小
        file_size = int(file_info.get('size', 0))
        if file_size <= 0:
            raise HTTPException(status_code=500, detail="Invalid file size")
            
        # 获取文件类型
        content_type = file_info.get('content_type', 'application/octet-stream')
        
        # 获取WebDAV完整URL
        webdav_url = os.getenv('WEBDAV_SERVER', '')
        if not webdav_url.endswith('/'):
            webdav_url += '/'
        
        full_url = f"{webdav_url}{remote_path}"
        logging.info(f"完整URL: {full_url}")
        
        # 获取请求的Range头
        range_header = request.headers.get("Range")
        
        # 创建WebDAV请求
        # 不再使用 webdav._token，改为直接使用基本认证
        webdav_username = os.getenv('WEBDAV_USERNAME')
        webdav_password = os.getenv('WEBDAV_PASSWORD')
        
        # 创建基本认证头
        headers = {}
        
        # 处理范围请求
        start_byte = 0
        end_byte = file_size - 1
        
        if range_header:
            logging.info(f"处理范围请求: {range_header}")
            try:
                range_match = range_header.split('=')[1]
                start_byte = int(range_match.split('-')[0])
                end_part = range_match.split('-')[1]
                if end_part:
                    end_byte = int(end_part)
                else:
                    # 如果没有指定结束位置，则设为一个合理的块大小
                    end_byte = min(start_byte + 1024*1024, file_size - 1)  # 1MB 块或文件剩余部分
            except Exception as e:
                logging.error(f"解析范围请求出错: {str(e)}")
                # 如果解析失败，使用默认值
            
            headers["Range"] = f"bytes={start_byte}-{end_byte}"
            
        logging.info(f"请求范围: {start_byte}-{end_byte}/{file_size}")
        
        # 发送请求并处理流式响应
        def iterfile():
            s = requests.Session()
            # 关闭流式传输自动解码，保持原始字节
            with s.get(full_url, headers=headers, stream=True, auth=(webdav_username, webdav_password), verify=False) as r:
                # 获取实际响应状态码
                status_code = r.status_code
                logging.info(f"WebDAV响应状态码: {status_code}")
                
                if status_code >= 400:
                    logging.error(f"WebDAV请求失败: {status_code}")
                    yield bytes(f"Error: {status_code}", 'utf-8')
                    return
                    
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        yield chunk
        
        # 根据是否为范围请求设置适当的状态码和头信息
        status_code = 206 if range_header else 200
        response_headers = {
            "Content-Type": content_type,
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{quote(decoded_filename)}"'
        }
        
        if range_header:
            response_headers["Content-Range"] = f"bytes {start_byte}-{end_byte}/{file_size}"
            content_length = end_byte - start_byte + 1
        else:
            content_length = file_size
            
        response_headers["Content-Length"] = str(content_length)
            
        logging.info(f"发送流式响应, 状态码: {status_code}, 内容类型: {content_type}, 内容长度: {content_length}")
        return StreamingResponse(
            iterfile(), 
            status_code=status_code,
            headers=response_headers
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"流式传输出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Stream error: {str(e)}")

# 添加对HEAD请求的支持
@app.head("/api/raw/{filename:path}")
async def head_raw_file_alt(filename: str):
    return await head_raw_file(filename)

# 提供原始媒体文件流 (保留以兼容旧版客户端)
@app.get("/api/raw/{filename:path}")
async def get_raw_file(request: Request, filename: str):
    return await stream_direct(request, filename)

# 支持HEAD请求的转换API
@app.head("/api/converted/{filename:path}")
async def head_converted_file(filename: str):
    # 简单返回一个200响应，不做实际转换
    # URL解码文件名
    decoded_filename = unquote(filename)
    
    # 获取不带扩展名的文件名
    filename_base = os.path.splitext(decoded_filename)[0]
    mp4_filename = f"{filename_base}.mp4"
    
    return Response(
        content=None,
        status_code=200,
        headers={
            "Content-Type": "video/mp4",
            "Accept-Ranges": "bytes",
            "Content-Disposition": f'inline; filename="{quote(mp4_filename)}"'
        }
    )

# 转换为兼容格式API
@app.get("/api/converted/{filename:path}")
async def get_converted_file(request: Request, filename: str):
    try:
        # URL解码文件名
        decoded_filename = unquote(filename)
        logging.info(f"格式转换请求: {decoded_filename}")
        
        # 创建WebDAV客户端
        webdav = Client({
            'webdav_hostname': os.getenv('WEBDAV_SERVER'),
            'webdav_login': os.getenv('WEBDAV_USERNAME'),
            'webdav_password': os.getenv('WEBDAV_PASSWORD'),
            'webdav_timeout': 30
        })
        webdav.verify = False
        
        # 构建远程路径
        media_root = os.getenv('MEDIA_ROOT', '')
        encoded_filename = quote(decoded_filename)
        remote_path = f"{media_root}/{encoded_filename}" if media_root else encoded_filename
        
        # 检查文件是否存在
        if not webdav.check(remote_path):
            raise HTTPException(status_code=404, detail=f"File not found: {decoded_filename}")

        # 创建临时目录
        temp_dir = os.path.join(tempfile.gettempdir(), 'noediv_cache')
        os.makedirs(temp_dir, exist_ok=True)
        
        # 创建临时文件路径 - 使用更安全的文件名
        safe_filename = ''.join(c if c.isalnum() or c in '._-' else '_' for c in decoded_filename)
        source_file = os.path.join(temp_dir, safe_filename)
        
        # 获取文件名（不含扩展名）和新扩展名
        filename_base = os.path.splitext(safe_filename)[0]
        mp4_filename = f"{filename_base}.mp4"
        output_file = os.path.join(temp_dir, mp4_filename)
        
        # 下载文件
        try:
            logging.info(f"下载原始文件到临时位置: {source_file}")
            webdav.download_file(remote_path=remote_path, local_path=source_file)
        except Exception as e:
            logging.error(f"下载文件失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to download file: {str(e)}")

        # 如果源文件已经是MP4格式且大小较小，直接流式传输
        if decoded_filename.endswith('.mp4') and os.path.getsize(source_file) < 100 * 1024 * 1024:  # 100MB
            logging.info(f"文件已经是MP4格式且小于100MB，直接传输")
            # 清理临时文件
            try:
                if os.path.exists(source_file):
                    os.remove(source_file)
            except:
                pass
            return await stream_direct(request, filename)
            
        # 转换为MP4格式
        try:
            logging.info(f"转换文件为MP4格式: {source_file} -> {output_file}")
            (
                ffmpeg
                .input(source_file)
                .output(
                    output_file, 
                    vcodec='libx264',
                    preset='ultrafast', 
                    crf=23,
                    acodec='aac',
                    audio_bitrate='128k',
                    movflags='faststart',
                    loglevel='info'
                )
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            logging.info(f"转换完成: {output_file}")
        except Exception as e:
            logging.error(f"转换文件失败: {str(e)}")
            # 如果转换失败，尝试只复制流而不重新编码
            try:
                logging.info("尝试仅复制流不重新编码...")
                (
                    ffmpeg
                    .input(source_file)
                    .output(
                        output_file,
                        vcodec='copy',
                        acodec='copy',
                        movflags='faststart'
                    )
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )
                logging.info(f"流复制完成: {output_file}")
            except Exception as e2:
                logging.error(f"流复制也失败了: {str(e2)}")
                # 清理临时文件
                try:
                    if os.path.exists(source_file):
                        os.remove(source_file)
                except:
                    pass
                raise HTTPException(status_code=500, detail=f"File conversion failed: {str(e2)}")

        # 将转换后的文件作为响应返回
        try:
            async with aiofiles.open(output_file, 'rb') as f:
                content = await f.read()
            
            # 清理临时文件
            try:
                if os.path.exists(source_file):
                    os.remove(source_file)
                if os.path.exists(output_file):
                    os.remove(output_file)
            except Exception as e:
                logging.warning(f"清理临时文件失败: {str(e)}")
                
            return Response(
                content=content,
                headers={
                    'Content-Type': 'video/mp4',
                    'Content-Disposition': f'inline; filename="{quote(mp4_filename)}"',
                    'Content-Length': str(len(content))
                }
            )
        except Exception as e:
            logging.error(f"读取转换后文件失败: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to read converted file: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"转换过程中出错: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")

# 如果存在本地静态文件目录，则提供静态文件服务
if os.path.exists("./static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")