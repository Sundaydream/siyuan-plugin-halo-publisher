@echo off
chcp 65001 >nul
setlocal

set "SOURCE_DIR=%~dp0dist"
set "TARGET_DIR=%~1"

if "%TARGET_DIR%"=="" (
    echo ❌ 错误: 请提供思源笔记插件目录路径
    echo.
    echo 使用方法:
    echo   install-plugin.bat "{思源笔记数据目录}\data\plugins\siyuan-halo-publisher"
    echo.
    echo 如何找到思源笔记数据目录:
    echo   1. 打开思源笔记
    echo   2. 点击「设置」→「关于」→「工作空间路径」
    echo   3. 插件目录在: {工作空间路径}\data\plugins\siyuan-halo-publisher
    exit /b 1
)

echo 🚀 开始安装插件...
echo 📦 源目录: %SOURCE_DIR%
echo 📁 目标目录: %TARGET_DIR%

if not exist "%SOURCE_DIR%" (
    echo ❌ 错误: 源目录不存在: %SOURCE_DIR%
    echo 💡 提示: 请先运行 npm run build 构建插件
    exit /b 1
)

echo.
echo 📋 复制文件...

:: 创建目标目录
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

:: 复制所有文件
xcopy /E /I /Y /Q "%SOURCE_DIR%\*" "%TARGET_DIR%\" >nul

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 插件安装成功!
    echo.
    echo 📝 下一步:
    echo   1. 关闭思源笔记（如果正在运行）
    echo   2. 重新打开思源笔记
    echo   3. 在工具栏右侧应该能看到 Halo 图标
    echo   4. 如果看不到，请检查「设置」→「插件」中是否已启用插件
) else (
    echo ❌ 安装失败，请检查权限和路径是否正确
    exit /b 1
)

endlocal
