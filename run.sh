#!/bin/bash
# Noediv 一键启动脚本

# 设置彩色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # 无颜色

# 尝试设置UTF-8编码
export LC_ALL=en_US.UTF-8 2>/dev/null || export LC_ALL=C.UTF-8 2>/dev/null || true

# 检查 Python 是否安装
python_version=$(python3 --version 2>&1)
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 未找到 Python，请安装 Python 3.8 或更高版本${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 已检测到 Python: $python_version${NC}"

# 检查 Node.js 是否安装
node_version=$(node --version 2>&1)
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 未找到 Node.js，请安装 Node.js 18 或更高版本${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 已检测到 Node.js: $node_version${NC}"

# 检查 FFmpeg 是否安装
ffmpeg_check=$(ffmpeg -version 2>&1)
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 未找到 FFmpeg，请安装 FFmpeg 并确保它在 PATH 中${NC}"
    exit 1
fi
echo -e "${GREEN}✅ 已检测到 FFmpeg${NC}"

# 检查 .env 文件是否存在
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}警告: 未找到 .env 文件，正在创建示例文件...${NC}"
    cat > .env << EOL
WEBDAV_SERVER=http://example.com:5005
WEBDAV_USERNAME=username
WEBDAV_PASSWORD=password
MEDIA_ROOT=/media
EOL
    echo -e "${YELLOW}已创建示例 .env 文件，请编辑它以指定您的服务器信息${NC}"
fi

# 确保脚本可执行
chmod +x start.sh
chmod +x start_frontend.sh

# 安装后端依赖
echo -e "${CYAN}正在安装后端依赖...${NC}"
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 安装后端依赖失败${NC}"
    exit 1
fi

# 安装前端依赖
echo -e "${CYAN}正在安装前端依赖...${NC}"
cd frontend
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}错误: 安装前端依赖失败${NC}"
    exit 1
fi
cd ..

echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}所有依赖已安装，Noediv 准备就绪!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo -e "${YELLOW}请在两个单独的终端窗口中运行以下命令:${NC}"
echo -e "${YELLOW}终端 1 (后端): ./start.sh${NC}"
echo -e "${YELLOW}终端 2 (前端): ./start_frontend.sh${NC}"
echo -e "${YELLOW}然后访问: http://localhost:5173${NC}"

read -p "您想要自动启动前后端服务吗? (Y/N): " startBoth
if [[ "$startBoth" == "Y" || "$startBoth" == "y" ]]; then
    echo -e "${CYAN}正在新窗口中启动前端...${NC}"
    
    # 检测操作系统并使用相应的终端启动命令
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open -a Terminal.app ./start_frontend.sh
    else
        # Linux，尝试常见的终端模拟器
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- ./start_frontend.sh
        elif command -v xterm &> /dev/null; then
            xterm -e ./start_frontend.sh &
        elif command -v konsole &> /dev/null; then
            konsole -e ./start_frontend.sh &
        else
            echo -e "${YELLOW}无法自动启动前端终端，请在新终端中手动运行: ./start_frontend.sh${NC}"
            # 仍然继续启动后端
        fi
    fi
    
    echo -e "${CYAN}正在启动后端...${NC}"
    ./start.sh
else
    echo -e "${GREEN}请按照上述说明手动启动服务。祝您使用愉快!${NC}"
fi 