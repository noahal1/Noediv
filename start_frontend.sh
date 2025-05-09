#!/bin/bash

# 确保在正确的目录
cd "$(dirname "$0")/frontend"

# 安装依赖
echo "安装前端依赖..."
npm install

# 启动前端开发服务
echo "启动前端服务..."
npm run dev 