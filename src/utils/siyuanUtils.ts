import { SiyuanDoc } from '../types';

/**
 * 思源笔记工具类，用于获取和解析笔记内容
 */
export class SiyuanUtils {
  /**
   * 获取插件实例
   */
  private static getPlugin(): any {
    const plugin = (window as any).haloPublisherPlugin;
    if (!plugin) {
      throw new Error('插件实例不可用，请确保插件已正确加载');
    }
    return plugin;
  }

  /**
   * 获取当前打开的思源笔记文档
   * @returns 思源笔记文档对象
   */
  static async getCurrentDoc(): Promise<SiyuanDoc> {
    try {
      const plugin = this.getPlugin();
      // 获取当前文档 ID
      const docId = await plugin.getCurrentDocId();

      if (!docId) {
        throw new Error('无法获取当前文档 ID，请先打开一个文档');
      }

      return await this.getDocById(docId);
    } catch (error) {
      console.error('获取思源笔记内容失败:', error);
      throw new Error('无法获取当前笔记内容：' + (error instanceof Error ? error.message : '未知错误'));
    }
  }

  /**
   * 根据 ID 获取思源笔记文档
   * @param docId 文档 ID
   */
  static async getDocById(docId: string): Promise<SiyuanDoc> {
    const plugin = this.getPlugin();
    let content = '';
    let title = '';
    let coverImage = '';
    let updated = '';

    try {
      // 导出 Markdown 内容
      content = await plugin.exportMdContent(docId);
    } catch (e) {
      // 备选方案：使用 SQL 查询
      const sqlResult = await plugin.sql(`SELECT * FROM blocks WHERE id = '${docId}'`);
      if (sqlResult.data && sqlResult.data.length > 0) {
        content = sqlResult.data[0].content || '';
      }
    }

    // 获取文档信息
    try {
      const docResult = await plugin.sql(`SELECT * FROM blocks WHERE id = '${docId}' AND type = 'd'`);
      if (docResult.data && docResult.data.length > 0) {
        title = docResult.data[0].content || '未命名文档';
        updated = docResult.data[0].updated || '';

        // 从文档属性（ial）中提取封面图
        const ial = docResult.data[0].ial || '';
        const iconMatch = ial.match(/title-img="([^"]+)"/);
        if (iconMatch && iconMatch[1]) {
          let rawCover = iconMatch[1];
          // 如果包含 url() 包装，提取其中的 URL
          const urlMatch = rawCover.match(/url\((['"]?)(.*?)\1\)/);
          if (urlMatch && urlMatch[2]) {
            rawCover = urlMatch[2];
          }
          coverImage = rawCover;
          console.log('[SiyuanUtils] Found cover image from ial:', coverImage);

          // 从内容中移除封面图（思源导出时会将封面图放在正文开头）
          // 匹配第一行的图片，如果文件名与封面图匹配则移除
          const coverFileName = coverImage.split('/').pop()?.split('?')[0] || '';
          if (coverFileName) {
            // 匹配内容开头的图片（可能有空行或 YAML 头部）
            const firstImgPattern = /^(---[\s\S]*?---\s*\n?)?\s*!\[[^\]]*\]\(([^)]+)\)\s*\n?/;
            const match = content.match(firstImgPattern);
            if (match && match[2]) {
              const imgUrl = match[2];
              const imgFileName = imgUrl.split('/').pop()?.split('?')[0] || '';
              if (imgFileName === coverFileName) {
                content = content.replace(match[0], match[1] || '').trim();
                console.log('[SiyuanUtils] Removed cover image from content start');
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('获取文档标题失败:', e);
    }

    return {
      id: docId,
      title: title || this.parseNoteContent(content).title,
      content: content,
      coverImage: coverImage,
      rawContent: content,
      format: 'markdown',
      updatedAt: updated || new Date().toISOString()
    };
  }



  /**
   * 解析笔记内容，提取标题、元数据等
   * @param content 笔记内容
   * @returns 解析后的内容和元数据
   */
  static parseNoteContent(content: string): {
    title: string;
    metadata: Record<string, string>;
    parsedContent: string;
  } {
    // 提取标题（第一个 H1）
    const titleRegex = /^#\s+(.*)$/m;
    const titleMatch = content.match(titleRegex);
    const title = titleMatch ? titleMatch[1] : 'Untitled';

    // 提取 YAML 元数据
    const yamlRegex = /^---\n([\s\S]*?)\n---\n/;
    const yamlMatch = content.match(yamlRegex);
    let metadata: Record<string, string> = {};
    let parsedContent = content;

    if (yamlMatch && yamlMatch[1]) {
      // 解析 YAML 元数据
      const yamlContent = yamlMatch[1];
      const lines = yamlContent.split('\n');
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          metadata[key.trim()] = valueParts.join(':').trim();
        }
      });

      // 移除 YAML 元数据，保留实际内容
      parsedContent = content.replace(yamlRegex, '');
    }

    return {
      title,
      metadata,
      parsedContent
    };
  }
}