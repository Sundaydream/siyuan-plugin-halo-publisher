#!/bin/bash

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/dist"
TARGET_DIR="$1"

if [ -z "$TARGET_DIR" ]; then
    echo "❌ 错误: 请提供思源笔记插件目录路径"
    echo ""
    echo "使用方法:"
    echo "  ./install-plugin.sh \"{思源笔记数据目录}/data/plugins/siyuan-halo-publisher\""
    echo ""
    echo "如何找到思源笔记数据目录:"
    echo "  1. 打开思源笔记"
    echo "  2. 点击「设置」→「关于」→「工作空间路径」"
    echo "  3. 插件目录在: {工作空间路径}/data/plugins/siyuan-halo-publisher"
    exit 1
fi

echo "🚀 开始安装插件..."
echo "📦 源目录: $SOURCE_DIR"
echo "📁 目标目录: $TARGET_DIR"

if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ 错误: 源目录不存在: $SOURCE_DIR"
    echo "💡 提示: 请先运行 npm run build 构建插件"
    exit 1
fi

echo ""
echo "📋 复制文件..."

# 创建目标目录
mkdir -p "$TARGET_DIR"

# 复制所有文件
cp -r "$SOURCE_DIR"/* "$TARGET_DIR"/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 插件安装成功!"
    echo ""
    echo "📝 下一步:"
    echo "  1. 关闭思源笔记（如果正在运行）"
    echo "  2. 重新打开思源笔记"
    echo "  3. 在工具栏右侧应该能看到 Halo 图标"
    echo "  4. 如果看不到，请检查「设置」→「插件」中是否已启用插件"
else
    echo "❌ 安装失败，请检查权限和路径是否正确"
    exit 1
fi
