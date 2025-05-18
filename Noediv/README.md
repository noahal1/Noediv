# Noediv 媒体播放器

基于TypeScript+React的Webdav/Ftp/Samba的前端网站播放器，核心利用客户端进行解码，减少服务端处理量。

## 功能特点

- **直接前端解码** - 客户端直接从存储服务器流式传输并解码媒体文件
- **支持多种格式** - 播放各种视频和音频格式，无需服务器转码
- **支持WebDAV、FTP、Samba等多种远程存储协议**
- **范围请求支持** - 支持媒体文件的部分加载（快进/快退）
- **媒体文件元数据管理**
- **现代化响应式用户界面**

## 支持的媒体格式

### 视频格式
- MP4 (.mp4)
- WebM (.webm)
- Matroska (.mkv)
- AVI (.avi)
- QuickTime (.mov)
- MP4 Video (.m4v)
- MPEG Transport Stream (.ts, .mts)
- DVD Video Object (.vob)
- 3GPP (.3gp)

### 音频格式
- MP3 (.mp3)
- Ogg Vorbis (.ogg)
- WAV (.wav)
- FLAC (.flac)
- AAC (.aac)

## 环境要求

- Python 3.8+
- Node.js 18+
- npm 或 yarn
- Web浏览器支持MSE (Media Source Extensions)

## 安装和运行

### Windows 环境

1. 安装依赖项：
   - 安装 [Python](https://www.python.org/downloads/)
   - 安装 [Node.js](https://nodejs.org/)

2. 配置环境变量:
   创建`.env`文件，包含以下内容:
   ```
   WEBDAV_SERVER=你的WebDAV服务器地址
   WEBDAV_USERNAME=用户名
   WEBDAV_PASSWORD=密码
   MEDIA_ROOT=媒体文件根目录
   ```

3. 使用PowerShell启动项目：
   ```
   # 启动后端
   .\start_backend.ps1
   
   # 在新的PowerShell窗口中启动前端
   .\start_frontend.ps1
   ```

### Linux/macOS 环境

1. 安装依赖:
   ```bash
   # 安装Python依赖
   pip install -r requirements.txt
   
   # 安装前端依赖
   cd frontend
   npm install
   cd ..
   ```

2. 配置环境变量:
   创建`.env`文件，包含以下内容:
   ```
   WEBDAV_SERVER=你的WebDAV服务器地址
   WEBDAV_USERNAME=用户名
   WEBDAV_PASSWORD=密码
   MEDIA_ROOT=媒体文件根目录
   ```

3. 启动项目:
   ```bash
   # 后端（终端1）
   ./start.sh
   
   # 前端（终端2）
   ./start_frontend.sh
   ```

4. 浏览器访问: http://localhost:5173

## 使用说明

1. 打开浏览器访问前端界面 (http://localhost:5173)
2. 在"服务器配置"中设置您的媒体服务器信息
3. 在"文件浏览"页面浏览并播放媒体文件
4. 播放器支持直接从服务器流式传输各种格式，无需下载或转码
5. 可为媒体文件添加元数据，如标题、描述和标签

## 工作原理

Noediv 使用以下技术实现直接前端解码：

1. **直接流式传输** - 后端仅代理来自 WebDAV/FTP 服务器的请求，将数据直接流式传输到前端
2. **范围请求** - 支持 HTTP Range 请求，允许浏览器仅请求所需的文件部分
3. **客户端解码** - 使用 video.js 和 HTTP Streaming 扩展在浏览器中解码各种媒体格式
4. **无服务器转码** - 不再需要 FFmpeg 进行服务器端格式转换

## 常见问题解决

1. 如果视频无法播放:
   - 确保浏览器支持 Media Source Extensions (MSE)
   - 检查 WebDAV/FTP 服务器配置是否正确
   - 服务器防火墙允许访问
   - 某些非常旧或罕见的格式可能无法直接在浏览器中播放

2. 如果流式传输缓慢:
   - 检查网络连接速度
   - WebDAV/FTP 服务器响应时间
   - 尝试降低视频清晰度或使用更高效的格式

## 技术栈

- 后端: FastAPI, Python, Requests
- 前端: React, TypeScript, Vite, Video.js
- 播放器: video.js 及 HTTP-Streaming 扩展
- 存储接口: webdavclient3, ftplib

## 贡献

欢迎提交问题和Pull Requests来帮助改进这个项目。

## 许可证

MIT
