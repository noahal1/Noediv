#!/bin/bash

# 确保在正确的目录
cd "$(dirname "$0")"

# 安装依赖
echo "安装后端依赖..."
pip install -r requirements.txt

# 启动后端服务
echo "启动后端服务..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload 