import os
import re
from flask import jsonify, Response, send_file

@app.route('/api/raw/<path:filename>')
def get_file(filename):
    # 检查文件是否存在
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "文件不存在"}), 404
    
    # 获取文件扩展名
    _, ext = os.path.splitext(filename)
    ext = ext.lower().strip('.')
    
    # 确定正确的MIME类型
    mime_type = 'application/octet-stream'  # 默认
    if ext in ['mp4', 'webm', 'ogg']:
        mime_type = f'video/{ext}'
    elif ext == 'mp3':
        mime_type = 'audio/mpeg'
    elif ext in ['wav', 'ogg', 'flac']:
        mime_type = f'audio/{ext}'
    
    # 设置合适的Content-Disposition头，确保内容嵌入而不是下载
    headers = {
        'Content-Type': mime_type,
        'Content-Disposition': 'inline',  # 使用inline而不是attachment
        'Accept-Ranges': 'bytes',  # 支持范围请求
        'X-Content-Type-Options': 'nosniff',  # 防止MIME类型嗅探
        'Cache-Control': 'no-store, must-revalidate',  # 禁止缓存
        'Access-Control-Allow-Origin': '*',  # 允许跨域
    }
    
    # 检查是否有Range头
    range_header = request.headers.get('Range', None)
    if range_header:
        # 处理范围请求 (用于视频流的部分内容请求)
        file_size = os.path.getsize(file_path)
        byte1, byte2 = 0, None
        
        try:
            m = re.search('bytes=(\d+)-(\d*)', range_header)
            g = m.groups()
            if g[0]: byte1 = int(g[0])
            if g[1]: byte2 = int(g[1])
        except (AttributeError, ValueError) as e:
            print(f"Range header parsing error: {e}")
        
        if byte2 is None:
            byte2 = file_size - 1
        
        length = byte2 - byte1 + 1
        
        resp = Response(
            get_chunk(file_path, byte1, byte2),
            206,  # Partial Content
            headers=headers,
            direct_passthrough=True
        )
        
        resp.headers.add('Content-Range', f'bytes {byte1}-{byte2}/{file_size}')
        resp.headers.add('Content-Length', str(length))
        return resp
    
    # 对于不带Range头的请求，返回完整文件
    return send_file(
        file_path, 
        mimetype=mime_type,
        as_attachment=False,  # 确保是inline而非attachment
        download_name=None,   # 不提供下载名称
        conditional=True      # 支持条件请求
    )

def get_chunk(file_path, start, end):
    """生成器函数来返回文件的指定范围"""
    with open(file_path, 'rb') as f:
        f.seek(start)
        chunk_size = 8192
        pos = start
        
        while pos <= end:
            read_size = min(chunk_size, end - pos + 1)
            data = f.read(read_size)
            if not data:
                break
            pos += len(data)
            yield data 