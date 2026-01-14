import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 源目录
const sourceDir = path.join(__dirname, 'dist');

// 从环境变量或命令行参数获取目标目录
const targetDir = process.env.SIYUAN_PLUGIN_DIR || process.argv[2];

if (!targetDir) {
  console.error('❌ 错误: 请提供思源笔记插件目录路径');
  console.log('\n使用方法:');
  console.log('  方法1: node install-plugin.mjs "{思源笔记数据目录}/data/plugins/siyuan-halo-publisher"');
  console.log('  方法2: SIYUAN_PLUGIN_DIR="{思源笔记数据目录}/data/plugins/siyuan-halo-publisher" node install-plugin.mjs');
  console.log('\n如何找到思源笔记数据目录:');
  console.log('  1. 打开思源笔记');
  console.log('  2. 点击「设置」→「关于」→「工作空间路径」');
  console.log('  3. 插件目录在: {工作空间路径}/data/plugins/siyuan-halo-publisher');
  process.exit(1);
}

console.log('🚀 开始安装插件...');
console.log(`📦 源目录: ${sourceDir}`);
console.log(`📁 目标目录: ${targetDir}`);

// 检查源目录是否存在
try {
  await fs.access(sourceDir);
} catch (error) {
  console.error(`❌ 错误: 源目录不存在: ${sourceDir}`);
  console.log('💡 提示: 请先运行 npm run build 构建插件');
  process.exit(1);
}

// 递归复制目录的函数
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
      console.log(`  ✓ 复制: ${entry.name}`);
    }
  }
}

try {
  // 确保目标目录的父目录存在
  const parentDir = path.dirname(targetDir);
  await fs.mkdir(parentDir, { recursive: true });

  // 如果目标目录已存在，先删除（可选，可以改为备份）
  try {
    const stats = await fs.stat(targetDir);
    if (stats.isDirectory()) {
      console.log(`⚠️  目标目录已存在，将覆盖: ${targetDir}`);
    }
  } catch (e) {
    // 目录不存在，继续
  }

  // 复制所有文件
  console.log('\n📋 复制文件...');
  await copyDir(sourceDir, targetDir);

  console.log('\n✅ 插件安装成功!');
  console.log('\n📝 下一步:');
  console.log('  1. 关闭思源笔记（如果正在运行）');
  console.log('  2. 重新打开思源笔记');
  console.log('  3. 在工具栏右侧应该能看到 Halo 图标');
  console.log('  4. 如果看不到，请检查「设置」→「插件」中是否已启用插件');

} catch (error) {
  console.error('❌ 安装失败:', error.message);
  console.error(error);
  process.exit(1);
}
