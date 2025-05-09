# Noediv 媒体播放器

基于TypeScript+React的Webdav/Ftp/Samba的前端网站播放器，核心利用客户端进行解码，减少服务端处理量。

## 功能特点

- 支持WebDAV、FTP、Samba等多种远程存储协议
- 客户端解码，减轻服务器负担
- 媒体文件元数据管理
- 支持视频和音频播放
- 现代化的用户界面

## 环境要求

- Python 3.8+
- Node.js 18+
- npm 或 yarn

## 安装和运行

### 后端服务

1. 安装Python依赖:
```bash
pip install -r requirements.txt
```

2. 配置环境变量:
创建`.env`文件，包含以下内容:
```
WEBDAV_SERVER=你的WebDAV服务器地址
WEBDAV_USERNAME=用户名
WEBDAV_PASSWORD=密码
MEDIA_ROOT=媒体文件根目录
```

3. 启动后端服务:
```bash
./start.sh
```
或者
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 前端服务

1. 安装依赖:
```bash
cd frontend
npm install
```

2. 启动开发服务器:
```bash
npm run dev
```
或者使用脚本：
```bash
./start_frontend.sh
```

3. 打开浏览器访问: http://localhost:5173

## 使用说明

1. 启动前后端服务
2. 访问前端界面
3. 配置服务连接方式（WebDAV、FTP等）
4. 浏览并播放媒体文件
5. 可以对媒体文件添加和编辑元数据

## 技术栈

- 后端: FastAPI, Python
- 前端: React, TypeScript, Vite
- 播放器: video.js
- 存储接口: webdavclient3, ftplib

## 贡献

欢迎提交问题和Pull Requests来帮助改进这个项目。

## 许可证

MIT
