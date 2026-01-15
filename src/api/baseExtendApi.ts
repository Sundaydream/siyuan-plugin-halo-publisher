import { PluginConfig, ImageUploadResult } from '../types';

/**
 * 基础扩展 API 类，负责处理图片上传和优化
 */
export class BaseExtendApi {
  protected cfg: PluginConfig;

  constructor(config: PluginConfig) {
    this.cfg = config;
  }

  /**
   * 批量上传图片
   * @param images 图片 URL 列表
   * @returns 上传结果列表
   */
  async batchUploadImages(images: string[]): Promise<ImageUploadResult[]> {
    const results: ImageUploadResult[] = [];

    for (const imageUrl of images) {
      // 检查图片是否已存在于当前 Halo 平台
      if (this.isImageAlreadyExists(imageUrl)) {
        results.push({
          url: imageUrl,
          success: true,
          message: '图片已存在，跳过上传'
        });
        continue;
      }

      // 上传图片
      try {
        const uploadResult = await this.uploadImage(imageUrl);
        results.push(uploadResult);
      } catch (error) {
        results.push({
          url: imageUrl,
          success: false,
          message: error instanceof Error ? error.message : '上传失败'
        });
      }
    }

    return results;
  }

  /**
   * 上传单个图片
   * @param imageUrl 图片 URL
   * @returns 上传结果
   */
  protected async uploadImage(imageUrl: string): Promise<ImageUploadResult> {
    try {
      // 获取图片 blob 数据
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`无法获取图片: ${response.statusText}`);
      }
      const blob = await response.blob();

      // 构建表单数据
      const formData = new FormData();
      formData.append('file', blob, this.getFileNameFromUrl(imageUrl));

      // 调用 Halo 图片上传 API
      const uploadResponse = await this.proxyRequest(
        `${this.cfg.apiUrl}/attachments/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Cookie': this.cfg.cookie
          }
        }
      );

      if (!uploadResponse.success) {
        throw new Error(uploadResponse.message || '图片上传失败');
      }

      // 返回上传后的图片 URL
      return {
        url: uploadResponse.data.url,
        success: true
      };
    } catch (error) {
      console.error('图片上传失败:', error);
      throw error;
    }
  }

  /**
   * 检查图片是否已存在于当前 Halo 平台
   * @param imageUrl 图片 URL
   * @returns 是否已存在
   */
  private isImageAlreadyExists(imageUrl: string): boolean {
    // 检查 URL 是否以配置的首页 URL 开头
    return imageUrl.startsWith(this.cfg.home);
  }

  /**
   * 从 URL 中提取文件名
   * @param url 图片 URL
   * @returns 文件名
   */
  protected getFileNameFromUrl(url: string): string {
    // 处理相对路径和绝对路径
    try {
      // 尝试作为 URL 解析
      const pathname = new URL(url).pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1);
    } catch (e) {
      // 如果不是有效 URL，当作普通路径处理
      // 移除可能的查询参数
      const cleanUrl = url.split('?')[0];
      return cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
    }
  }

  /**
   * 处理 Markdown 内容中的图片
   * @param content Markdown 内容
   * @returns 处理后的内容
   */
  async processMarkdownImages(content: string): Promise<string> {
    // 匹配 Markdown 图片语法：![alt](url)
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    let processedContent = content;

    const images: string[] = [];
    let match;

    // 收集所有图片 URL
    while ((match = imgRegex.exec(content)) !== null) {
      images.push(match[2]);
    }

    // 批量上传图片
    const uploadResults = await this.batchUploadImages(images);

    // 替换图片 URL
    for (let i = 0; i < images.length; i++) {
      if (uploadResults[i].success) {
        processedContent = processedContent.replace(images[i], uploadResults[i].url);
      }
    }

    return processedContent;
  }

  /**
   * 处理 HTML 内容中的图片
   * @param content HTML 内容
   * @returns 处理后的内容
   */
  async processHtmlImages(content: string): Promise<string> {
    // 创建临时 DOM 元素来处理 HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    const imgElements = tempDiv.querySelectorAll('img');
    const images: string[] = [];

    // 收集所有图片 URL 并清理默认 alt 文本
    imgElements.forEach(img => {
      // 清理默认 alt 文本
      if (img.alt === 'image' || img.alt === '') {
        img.alt = '';
      }

      images.push(img.src);
    });

    // 批量上传图片
    const uploadResults = await this.batchUploadImages(images);

    // 更新图片 URL
    imgElements.forEach((img, index) => {
      if (uploadResults[index].success) {
        img.src = uploadResults[index].url;
      }
    });

    return tempDiv.innerHTML;
  }

  /**
   * 处理图片，根据内容格式选择相应的处理方法
   * @param content 内容
   * @param format 内容格式
   * @returns 处理后的内容
   */
  async processImages(content: string, format: 'markdown' | 'html'): Promise<string> {
    if (format === 'markdown') {
      return this.processMarkdownImages(content);
    } else {
      return this.processHtmlImages(content);
    }
  }

  /**
   * 代理请求，处理跨域问题
   * @param url 请求 URL
   * @param options 请求选项
   * @returns 响应数据
   */
  protected async proxyRequest(url: string, options: RequestInit): Promise<any> {
    try {
      // 如果 body 是 FormData，直接使用 fetch，因为 JSON 代理无法处理二进制数据
      if (options.body instanceof FormData) {
        // 直接请求
      } else {
        // 优先使用思源笔记的代理 API（如果可用）
        const plugin = (window as any).haloPublisherPlugin;
        if (plugin) {
          // 尝试使用 fetchPost/fetchGet 进行代理请求
          const method = (options.method || 'GET').toUpperCase();
          try {
            if (method === 'GET' && typeof (plugin as any).fetchGet === 'function') {
              // 对于 GET 请求，也通过 headers 传递 cookie
              const response = await (plugin as any).fetchGet(url, {
                headers: {
                  ...(options.headers as Record<string, string>),
                  'Cookie': this.cfg.cookie
                }
              });
              return response;
            } else if ((method === 'POST' || method === 'PUT' || method === 'DELETE') &&
              typeof (plugin as any).fetchPost === 'function') {
              // 对于其他请求，使用 fetchPost
              const response = await (plugin as any).fetchPost(url, {
                ...options,
                headers: {
                  ...(options.headers as Record<string, string>),
                  'Cookie': this.cfg.cookie
                },
                body: options.body
              });
              return response;
            }
          } catch (e) {
            console.warn('使用思源笔记代理失败，尝试其他方法:', e);
          }
        }

      }


      // 最后尝试直接请求（可能遇到 CORS 问题）
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Cookie': this.cfg.cookie
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`请求失败: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        // 如果不是 JSON，返回文本
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          return { success: false, message: text };
        }
      }
    } catch (error) {
      console.error('代理请求失败:', error);
      throw error;
    }
  }
}