import { BaseExtendApi } from '../api/baseExtendApi';
import {
  PluginConfig,
  Post,
  HaloPostParams,
  HaloApiResponse,
  PublishedPost,
  Category,
  Tag,
  ImageUploadResult
} from '../types';
import { LuteUtil } from '../utils/luteUtil';

/**
 * Halo Web 适配器类，负责处理文章的发布、编辑、删除等生命周期管理
 */
export class HalowebWebAdaptor extends BaseExtendApi {
  private readonly CONSOLE_API = 'apis/api.console.halo.run/v1alpha1';
  private readonly CONTENT_API = 'apis/content.halo.run/v1alpha1';

  // 图片上传缓存：文件名 -> 已上传的 URL（避免重复上传）
  private static imageUploadCache: Map<string, string> = new Map();

  constructor(config: PluginConfig) {
    super(config);
  }

  /**
   * 使用用户名和密码登录 Halo
   * @param username 用户名
   * @param password 密码
   * @returns 登录结果，包含 token 或 cookie
   */
  async login(username: string, password: string): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      // Halo 2.x 登录 API
      const loginUrl = `${this.cfg.home}apis/api.console.halo.run/v1alpha1/auth/local`;

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
        credentials: 'include', // 确保接收 cookie
      });

      if (response.ok) {
        const data = await response.json();
        // 获取响应中的 cookie
        const cookies = document.cookie;
        return {
          success: true,
          message: '登录成功',
          token: data.accessToken || cookies
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: errorData.message || `登录失败: ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      console.error('登录失败:', error);
      return {
        success: false,
        message: '登录失败: ' + (error instanceof Error ? error.message : '网络错误')
      };
    }
  }

  /**
   * 发布文章
   * @param post 文章数据
   * @returns 发布结果，包含文章 ID
   */
  async publishPost(post: Post): Promise<string> {
    try {
      // 处理正文图片并获取上传映射
      let { processedContent, uploadedImages } = await this.processImagesWithMapping(
        post.content.content,
        post.content.format
      );

      // 处理封面图：检查是否在正文中已上传
      if (post.metadata.coverImage && !post.metadata.coverImage.startsWith('http')) {
        const coverImageFileName = this.getFileNameFromUrl(post.metadata.coverImage);
        // 检查封面图是否在已上传的图片中
        const existingUpload = uploadedImages.find(img =>
          this.getFileNameFromUrl(img.originalUrl) === coverImageFileName
        );
        if (existingUpload && existingUpload.success) {
          post.metadata.coverImage = existingUpload.url;
          console.log('[HaloPublisher] Cover image already uploaded:', existingUpload.url);
        }
      }

      // 检查并移除正文开头自动添加的封面图（思源导出时可能自动添加）
      // 只移除正文开头第一张与封面图文件名相同的图片
      if (post.metadata.coverImage) {
        const coverFileName = this.getFileNameFromUrl(post.metadata.coverImage);
        console.log('[HaloPublisher] Cover image filename:', coverFileName);

        // 移除 YAML front matter 后匹配第一张图片
        let contentWithoutYaml = processedContent.replace(/^---[\s\S]*?---\s*\n?/, '').trim();

        // 匹配内容开头的图片
        const firstImageMatch = contentWithoutYaml.match(/^!\[[^\]]*\]\(([^)]+)\)/);
        if (firstImageMatch) {
          const firstImageUrl = firstImageMatch[1];
          const firstImageFileName = this.getFileNameFromUrl(firstImageUrl);
          console.log('[HaloPublisher] First image in content:', firstImageFileName);

          // 如果第一张图片与封面图文件名相同，从原内容中移除
          if (firstImageFileName === coverFileName) {
            // 移除匹配到的图片行（包括可能的空行）
            processedContent = processedContent.replace(/!\[[^\]]*\]\([^)]+\)\s*\n?/, '').trim();
            console.log('[HaloPublisher] Removed duplicate cover image from content start');
          }
        }
      }

      // 构建 Halo 文章参数
      const haloPostParams: HaloPostParams = this.buildHaloPostParams(post, processedContent);

      // 创建草稿
      const draftResponse = await this.createPost(haloPostParams);

      // 提取文章 ID
      const postId = draftResponse?.metadata?.name;

      if (!postId) {
        console.error('无法获取文章 ID，响应数据:', draftResponse);
        throw new Error('创建草稿成功，但无法获取文章 ID');
      }

      // 发布文章
      await this.publishDraft(postId);

      return postId;
    } catch (error) {
      console.error('发布文章失败:', error);
      throw error;
    }
  }

  /**
   * 处理图片并返回映射
   */
  private async processImagesWithMapping(
    content: string,
    _format: 'markdown' | 'html'  // 保留参数以备后用（HTML 格式处理）
  ): Promise<{ processedContent: string; uploadedImages: Array<{ originalUrl: string; url: string; success: boolean }> }> {
    // 匹配 Markdown 图片语法：![alt](url)
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    let processedContent = content;
    const uploadedImages: Array<{ originalUrl: string; url: string; success: boolean }> = [];

    const images: string[] = [];
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      images.push(match[2]);
    }

    // 批量上传图片
    for (const imageUrl of images) {
      // 跳过已经是网络地址或已上传的图片
      if (this.isExternalImageUrl(imageUrl)) {
        uploadedImages.push({ originalUrl: imageUrl, url: imageUrl, success: true });
        continue;
      }

      try {
        const result = await this.uploadImage(imageUrl);
        uploadedImages.push({
          originalUrl: imageUrl,
          url: result.url,
          success: result.success
        });
        if (result.success && result.url) {
          processedContent = processedContent.replace(imageUrl, result.url);
        }
      } catch (e) {
        console.error('[HaloPublisher] Image upload failed:', imageUrl, e);
        uploadedImages.push({ originalUrl: imageUrl, url: imageUrl, success: false });
      }
    }

    return { processedContent, uploadedImages };
  }


  /**
   * 构建 Halo 文章参数
   * 参考 siyuan-plugin-publisher 的 HalowebWebAdaptor 实现
   * @param post 文章数据
   * @param processedContent 处理后的文章内容（图片 URL 已替换）
   * @returns Halo 文章参数
   */
  private buildHaloPostParams(post: Post, processedContent: string): any {
    const format = post.content.format || 'markdown';

    // 将 markdown 转换为 HTML（使用思源内置的 Lute 解析器）
    // 注意：processedContent 中的图片 URL 已经替换为上传后的 URL
    const htmlContent = format === 'markdown'
      ? LuteUtil.mdToHtml(processedContent)
      : processedContent;

    // 处理空 alt 文字：将 alt="image" 替换为空 alt
    const cleanedHtmlContent = htmlContent.replace(/alt="image"/g, 'alt=""');

    // 生成 UUID 作为 metadata.name
    const uuid = crypto.randomUUID();

    // 参考实现使用 { post: {...}, content: {...} } 包装结构
    const params: any = {
      post: {
        spec: {
          title: post.metadata.title,
          slug: post.metadata.slug || this.generateSlug(post.metadata.title) || `post-${Date.now()}`,
          template: '',
          cover: '',  // 封面图稍后处理
          deleted: false,
          publish: false,
          publishTime: new Date().toISOString(),
          pinned: false,
          allowComment: true,
          visible: 'PUBLIC',
          priority: 0,
          excerpt: {
            autoGenerate: true,
            raw: '',
          },
          categories: post.metadata.categories || [],
          tags: post.metadata.tags || [],
          htmlMetas: [],
        },
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'Post',
        metadata: {
          name: uuid,
          annotations: {},
        },
      },
      content: {
        // 使用处理后的内容（图片 URL 已替换）
        raw: format === 'markdown' ? processedContent : cleanedHtmlContent,
        content: LuteUtil.addIdToHeadings(cleanedHtmlContent),
        rawType: format === 'markdown' ? 'markdown' : 'html',
      },
    };

    // 摘要
    if (post.metadata.summary) {
      params.post.spec.excerpt.autoGenerate = false;
      params.post.spec.excerpt.raw = post.metadata.summary;
    }

    // 封面图（保留原始路径，在 createPost 中上传）
    if (post.metadata.coverImage) {
      params.post.spec.cover = post.metadata.coverImage;
    }

    return params;
  }

  /**
   * 生成文章别名（slug）
   * @param title 文章标题
   * @returns 生成的 slug
   */
  private generateSlug(title: string): string {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return slug || `post-${Date.now()}`;
  }

  /**
   * 创建文章（草稿）
   * @param params 文章参数
   * @returns API 响应
   */
  private async createPost(params: any): Promise<HaloApiResponse<any>> {
    // 新的结构：params = { post: {...}, content: {...} }
    const postData = params.post;

    // 自动处理封面图上传
    // 只有当封面图是本地路径（assets/xxx）时才需要上传
    // 如果已经是 http(s):// 开头或 /upload/ 开头，说明已经上传过了
    const coverUrl = postData.spec.cover;
    if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('/upload')) {
      try {
        console.log('[HaloPublisher] Uploading cover image:', coverUrl);
        const result = await this.uploadImage(coverUrl);
        if (result.success && result.url) {
          postData.spec.cover = result.url;
        } else {
          console.warn('[HaloPublisher] Cover uploaded but no URL returned');
          postData.spec.cover = '';
        }
      } catch (e) {
        console.warn('[HaloPublisher] Cover image upload failed, clearing cover:', e);
        postData.spec.cover = '';
      }
    }

    // Debug: 获取现有文章结构
    try {
      const existingPosts = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts?page=1&size=1`, {
        method: 'GET',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });
      console.log('[HaloPublisher] EXISTING POST STRUCTURE:', JSON.stringify(existingPosts));
    } catch (e) {
      console.warn('[HaloPublisher] Failed to fetch existing posts for debug:', e);
    }

    // 使用参考实现的 API 调用方式
    // 发送包含 post 和 content 的完整 payload
    console.log('[HaloPublisher] Creating Post Payload:', JSON.stringify(params));

    const response = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.cfg.cookie
      },
      body: JSON.stringify(params)
    });

    // Halo 2.0: 只要返回了 metadata.name 就算成功
    if (response && response.metadata && response.metadata.name) {
      console.log('[HaloPublisher] Post created successfully, name:', response.metadata.name);
      return response;
    }

    throw new Error(response.message || '创建文章失败');
  }

  /**
   * 发布草稿
   * @param postId 文章 ID
   * @returns API 响应
   */
  private async publishDraft(postId: string): Promise<HaloApiResponse<any>> {
    // 参考实现使用 PUT 方法发布
    const response = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts/${postId}/publish`, {
      method: 'PUT',
      headers: {
        'Cookie': this.cfg.cookie
      }
    });

    // 只要没有抛错且不是错误码
    if (response) {
      return response;
    }
    throw new Error('发布文章失败');
  }

  /**
   * 更新文章
   * @param postId 文章 ID
   * @param post 文章数据
   * @returns 更新结果
   */
  async updatePost(postId: string, post: Post): Promise<void> {
    try {
      // 处理图片
      const processedContent = await this.processImages(
        post.content.content,
        post.content.format
      );

      // 构建 Halo 文章参数
      const haloPostParams: HaloPostParams = this.buildHaloPostParams(post, processedContent);
      // 更新时需要携带 name
      haloPostParams.metadata.name = postId;
      delete haloPostParams.metadata.generateName;

      // 更新文章
      const updateResponse = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.cfg.cookie
        },
        body: JSON.stringify(haloPostParams)
      });

      if (!updateResponse) {
        throw new Error('更新文章失败');
      }

    } catch (error) {
      console.error('更新文章失败:', error);
      throw error;
    }
  }

  /**
   * 删除文章（移到回收站）
   * @param postId 文章 ID
   * @returns 删除结果
   */
  async deletePost(postId: string): Promise<void> {
    try {
      // Halo 2.x 使用 recycle 端点将文章移到回收站
      const res = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts/${postId}/recycle`, {
        method: 'PUT',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      if (!res?.metadata?.name) {
        throw new Error('删除文章失败');
      }
      console.log('[HaloPublisher] Post deleted (recycled):', postId);
    } catch (error) {
      console.error('删除文章失败:', error);
      throw error;
    }
  }

  /**
   * 更新文章元数据（标题、别名、分类、标签）
   */
  async updatePostMetadata(postId: string, metadata: {
    title?: string;
    slug?: string;
    categories?: string[];
    tags?: string[];
  }): Promise<void> {
    try {
      // 首先获取文章当前数据 - 使用 Content API
      const post = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONTENT_API}/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      if (!post || !post.spec) {
        throw new Error('获取文章数据失败');
      }

      // 更新 spec 中的字段
      if (metadata.title) post.spec.title = metadata.title;
      if (metadata.slug) post.spec.slug = metadata.slug;
      if (metadata.categories) {
        post.spec.categories = metadata.categories;
      }
      if (metadata.tags) {
        post.spec.tags = metadata.tags;
      }

      // 发送更新请求 - 使用 Content API
      await this.proxyRequest(`${this.cfg.apiUrl}${this.CONTENT_API}/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Cookie': this.cfg.cookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(post)
      });

      // 重新发布文章
      await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts/${postId}/publish`, {
        method: 'PUT',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      console.log('[HaloPublisher] Post metadata updated:', postId);
    } catch (error) {
      console.error('更新文章元数据失败:', error);
      throw error;
    }
  }

  /**
   * 更新文章内容（用于同步思源笔记的修改）
   * @param postId 文章 ID
   * @param title 新标题（可选，传空则不更新标题）
   * @param rawContent 新内容
   * @param coverImage 封面图 URL（可选，从思源文档属性获取）
   */
  async updatePostContent(postId: string, title: string, rawContent: string, coverImage?: string): Promise<void> {
    try {
      // 获取文章元数据
      const post = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONTENT_API}/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      if (!post || !post.spec) {
        throw new Error('获取文章数据失败');
      }

      // 获取文章当前内容
      const existingContent = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts/${postId}/head-content`, {
        method: 'GET',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      // 移除 YAML Front Matter（思源导出时可能包含）
      let cleanRawContent = rawContent;
      const yamlFrontMatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
      if (yamlFrontMatterRegex.test(cleanRawContent)) {
        cleanRawContent = cleanRawContent.replace(yamlFrontMatterRegex, '');
        console.log('[HaloPublisher] Removed YAML front matter from content');
      }

      // 移除正文开头与标题相同的 H1（避免重复）
      const articleTitle = title || post.spec.title;
      if (articleTitle) {
        const h1Regex = /^#\s+(.*)$/m;
        const h1Match = cleanRawContent.match(h1Regex);
        if (h1Match && h1Match[1]?.trim() === articleTitle.trim()) {
          cleanRawContent = cleanRawContent.replace(h1Regex, '').trim();
          console.log('[HaloPublisher] Removed duplicate H1 title from content');
        }
      }

      // 处理封面图更新
      let coverImageUrl = '';
      if (coverImage) {
        // 判断是否是本地图片需要上传
        if (!this.isExternalImageUrl(coverImage)) {
          try {
            const coverResult = await this.uploadImage(coverImage);
            if (coverResult.success && coverResult.url) {
              coverImageUrl = coverResult.url;
            }
          } catch (e) {
            console.warn('[HaloPublisher] Cover image upload failed:', e);
          }
        } else {
          coverImageUrl = coverImage;
        }
      }

      // 检查是否需要更新文章元数据（标题或封面）
      let needUpdateMeta = false;
      if (title && title.trim() && title !== post.spec.title) {
        post.spec.title = title;
        needUpdateMeta = true;
        console.log('[HaloPublisher] Post title will be updated:', title);
      }
      // 只有当思源设置了封面图时才更新
      if (coverImageUrl && coverImageUrl !== post.spec.cover) {
        post.spec.cover = coverImageUrl;
        needUpdateMeta = true;
        console.log('[HaloPublisher] Post cover will be updated:', coverImageUrl);
      }

      if (needUpdateMeta) {
        await this.proxyRequest(`${this.cfg.apiUrl}${this.CONTENT_API}/posts/${postId}`, {
          method: 'PUT',
          headers: {
            'Cookie': this.cfg.cookie,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(post)
        });
        console.log('[HaloPublisher] Post metadata updated');
      }

      // 从正文中移除与封面图相同的图片（避免重复）
      if (coverImage) {
        const coverFileName = this.getFileNameFromUrl(coverImage);
        // 移除正文中第一张与封面图文件名相同的图片
        const imagePattern = new RegExp(`!\\[[^\\]]*\\]\\([^)]*${coverFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^)]*\\)\\s*\\n?`);
        if (imagePattern.test(cleanRawContent)) {
          cleanRawContent = cleanRawContent.replace(imagePattern, '').trim();
          console.log('[HaloPublisher] Removed cover image from content');
        }
      }

      // 处理图片上传（跳过已上传的图片）
      const { processedContent } = await this.processImagesWithMapping(cleanRawContent, 'markdown');
      const htmlContent = LuteUtil.mdToHtml(processedContent);
      const cleanedHtmlContent = LuteUtil.addIdToHeadings(htmlContent.replace(/alt="image"/g, 'alt=""'));

      // 根据已发布类型确定 raw 的数据
      const rawType = existingContent?.rawType || 'markdown';
      const contentData = {
        raw: rawType === 'markdown' ? processedContent : cleanedHtmlContent,
        content: cleanedHtmlContent,
        rawType: rawType
      };

      // 发送内容更新请求
      await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts/${postId}/content`, {
        method: 'PUT',
        headers: {
          'Cookie': this.cfg.cookie,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contentData)
      });

      // 重新发布文章
      await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts/${postId}/publish`, {
        method: 'PUT',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      console.log('[HaloPublisher] Post content updated successfully:', postId);
    } catch (error) {
      console.error('更新文章内容失败:', error);
      throw error;
    }
  }

  /**
   * 判断图片 URL 是否为外部/已上传的图片
   */
  private isExternalImageUrl(url: string): boolean {
    // 检查是否已上传到当前 Halo 平台（URL 以站点首页开头）
    if (this.cfg.home && url.startsWith(this.cfg.home)) {
      return true;
    }
    // HTTP/HTTPS 开头的网络图片
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return true;
    }
    // 已上传到 Halo 的图片路径（常见格式）
    if (url.startsWith('/upload/') ||
      url.startsWith('/api/') ||
      url.includes('/upload/') ||
      url.includes('/attachments/')) {
      return true;
    }
    return false;
  }

  /**
   * 获取已发布的文章列表
   * @returns 已发布文章列表
   */
  async getPublishedPosts(): Promise<PublishedPost[]> {
    try {
      // 使用 Console API 获取文章列表
      const response = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts?page=1&size=100`, {
        method: 'GET',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      // Halo 2.x 返回结构是 { items: [{ post: {...}, categories: [...], tags: [...], ... }] }
      if (response && Array.isArray(response.items)) {
        return response.items
          .filter((item: any) => item.post && !item.post.spec.deleted)  // 过滤掉已删除的
          .map((item: any) => ({
            id: item.post.metadata.name,
            title: item.post.spec.title,
            slug: item.post.spec.slug,
            cover: item.post.spec.cover || '',
            publishedTime: item.post.status?.conditions?.find((c: any) => c.type === 'PUBLISHED')?.lastTransitionTime || item.post.metadata.creationTimestamp,
            status: item.post.status?.phase || 'UNKNOWN',
            url: `${this.cfg.home.replace(/\/$/, '')}${item.post.status?.permalink || '/archives/' + item.post.spec.slug}`,
            // 返回 metadata.name (ID) 用于编辑，同时保留 displayName 用于显示
            categories: item.categories?.map((c: any) => c.metadata?.name) || [],
            categoryNames: item.categories?.map((c: any) => c.spec?.displayName) || [],
            tags: item.tags?.map((t: any) => t.metadata?.name) || [],
            tagNames: item.tags?.map((t: any) => t.spec?.displayName) || [],
            source: 'unknown' as const  // 后续通过映射表判断
          }));
      }

      throw new Error(response.message || '获取文章列表失败');
    } catch (error) {
      console.error('获取已发布文章列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取单篇文章详情
   * @param postId 文章 ID
   * @returns 文章详情
   */
  async getPostDetail(postId: string): Promise<Post> {
    try {
      const response = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      // Halo 2.x API 直接返回文章数据
      const postData = response;

      if (!postData || !postData.post) {
        throw new Error('获取文章详情失败：数据结构异常');
      }

      const post = postData.post;

      // 转换为 Post 类型
      return {
        metadata: {
          title: post.spec?.title || '',
          slug: post.spec?.slug || '',
          status: post.status?.phase || 'UNKNOWN',
          publishTime: post.status?.conditions?.find((c: any) => c.type === 'PUBLISHED')?.lastTransitionTime || post.metadata?.creationTimestamp || '',
          coverImage: post.spec?.cover || '',
          categories: postData.categories?.map((cat: any) => cat.spec?.displayName || cat.metadata?.name) || [],
          tags: postData.tags?.map((tag: any) => tag.spec?.displayName || tag.metadata?.name) || [],
          summary: post.spec?.excerpt?.raw || ''
        },
        content: {
          content: postData.content?.content || '',
          rawContent: postData.content?.raw || '',
          format: postData.content?.rawType === 'markdown' ? 'markdown' : 'html'
        },
        id: post.metadata?.name
      };
    } catch (error) {
      console.error('获取文章详情失败:', error);
      throw error;
    }
  }

  /**
   * 检查 Cookie 是否有效
   * @returns Cookie 是否有效
   */
  /**
   * 检查 Cookie 是否有效
   * @returns Cookie 是否有效
   */
  async checkCookieValidity(): Promise<boolean> {
    try {
      // 使用 Console API 的 posts 接口来验证发布权限
      const response = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONSOLE_API}/posts?page=1&size=1`, {
        method: 'GET',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });
      // Halo 2.x 返回的是列表对象 { items: [], ... }，只要有 items 字段就算成功
      return response && Array.isArray(response.items);
    } catch (error) {
      console.error('检查 Cookie 有效性失败:', error);
      return false;
    }
  }

  /**
   * 获取分类列表
   * @returns 分类列表
   */
  async getCategories(): Promise<Category[]> {
    try {
      // 使用 Content API 获取分类
      const response = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONTENT_API}/categories`, {
        method: 'GET',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      // Halo 2.x 直接返回列表数据 { items: [...], total: ... }
      if (response && Array.isArray(response.items)) {
        return response.items.map((item: any) => ({
          id: item.metadata.name,
          name: item.spec.displayName,
          slug: item.spec.slug
        }));
      }

      throw new Error(response.message || '获取分类列表失败');
    } catch (error) {
      console.error('获取分类列表失败:', error);
      return [];
    }
  }

  /**
   * 获取标签列表
   * @returns 标签列表
   */
  async getTags(): Promise<Tag[]> {
    try {
      // 使用 Content API 获取标签
      const response = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONTENT_API}/tags`, {
        method: 'GET',
        headers: {
          'Cookie': this.cfg.cookie
        }
      });

      // Halo 2.x 直接返回列表数据 { items: [...], total: ... }
      if (response && Array.isArray(response.items)) {
        return response.items.map((item: any) => ({
          id: item.metadata.name,
          name: item.spec.displayName,
          slug: item.spec.slug
        }));
      }

      throw new Error(response.message || '获取标签列表失败');
    } catch (error) {
      console.error('获取标签列表失败:', error);
      return [];
    }
  }
  /**
   * 创建新分类
   * @param name 分类名称
   * @returns 创建的分类
   */
  async createCategory(name: string): Promise<Category> {
    try {
      // 使用 Content API 创建分类
      const response = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONTENT_API}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.cfg.cookie
        },
        body: JSON.stringify({
          apiVersion: 'content.halo.run/v1alpha1',
          kind: 'Category',
          metadata: {
            name: '',  // Halo will generate if empty
            generateName: 'category-'
          },
          spec: {
            displayName: name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            description: '',
            priority: 0,
            children: []
          }
        })
      });

      if (response && response.metadata && response.spec) {
        return {
          id: response.metadata.name,
          name: response.spec.displayName,
          slug: response.spec.slug
        };
      }

      throw new Error(response.message || '创建分类失败');
    } catch (error) {
      console.error('创建分类失败:', error);
      throw error;
    }
  }

  /**
   * 创建新标签
   * @param name 标签名称
   * @returns 创建的标签
   */
  async createTag(name: string): Promise<Tag> {
    try {
      // 使用 Content API 创建标签
      const response = await this.proxyRequest(`${this.cfg.apiUrl}${this.CONTENT_API}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.cfg.cookie
        },
        body: JSON.stringify({
          apiVersion: 'content.halo.run/v1alpha1',
          kind: 'Tag',
          metadata: {
            name: '',  // Halo will generate if empty
            generateName: 'tag-'
          },
          spec: {
            displayName: name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            color: '#ffffff'
          }
        })
      });

      if (response && response.metadata && response.spec) {
        return {
          id: response.metadata.name,
          name: response.spec.displayName,
          slug: response.spec.slug
        };
      }

      throw new Error(response.message || '创建标签失败');
    } catch (error) {
      console.error('创建标签失败:', error);
      throw error;
    }
  }
  /**
   * 上传单个图片 (Halo 专属实现)
   * @param imageUrl 图片 URL
   * @returns 上传结果
   */
  /**
   * 上传单个图片 (Halo 专属实现 - 使用代理绕过 CORS/Cookie 限制)
   * @param imageUrl 图片 URL
   * @returns 上传结果
   */
  protected async uploadImage(imageUrl: string): Promise<ImageUploadResult> {
    try {
      const fileName = this.getFileNameFromUrl(imageUrl);

      // 检查缓存
      if (HalowebWebAdaptor.imageUploadCache.has(fileName)) {
        const cachedUrl = HalowebWebAdaptor.imageUploadCache.get(fileName);
        console.log('[HaloPublisher] Using cached image for upload:', fileName);
        return {
          url: cachedUrl!,
          success: true
        };
      }

      // 1. 获取图片数据
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`无法获取图片: ${response.statusText}`);
      const blob = await response.blob();
      // const fileName = this.getFileNameFromUrl(imageUrl); // 已在上面获取
      const mimeType = blob.type || 'application/octet-stream';
      const arrayBuffer = await blob.arrayBuffer();

      console.log('[HaloPublisher] Uploading image:', fileName, 'size:', blob.size, 'type:', mimeType);

      // 2. 构建 multipart/form-data 请求体（正确的二进制格式）
      const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

      // 使用 TextEncoder 编码文本部分
      const textEncoder = new TextEncoder();

      const policyPart = textEncoder.encode(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="policyName"\r\n\r\n` +
        `default-policy\r\n`
      );

      const groupPart = textEncoder.encode(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="groupName"\r\n\r\n` +
        `\r\n`
      );

      const fileHeader = textEncoder.encode(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
      );

      const fileData = new Uint8Array(arrayBuffer);
      const endBoundary = textEncoder.encode(`\r\n--${boundary}--\r\n`);

      // 合并所有部分为完整 body
      const totalLength = policyPart.length + groupPart.length + fileHeader.length + fileData.length + endBoundary.length;
      const body = new Uint8Array(totalLength);
      let offset = 0;

      body.set(policyPart, offset); offset += policyPart.length;
      body.set(groupPart, offset); offset += groupPart.length;
      body.set(fileHeader, offset); offset += fileHeader.length;
      body.set(fileData, offset); offset += fileData.length;
      body.set(endBoundary, offset);

      // 整个 body 需要 base64 编码后通过代理传输
      const bodyBase64 = this.arrayBufferToBase64(body.buffer);

      // 3. 使用代理上传
      const uploadUrl = `${this.cfg.apiUrl}${this.CONSOLE_API}/attachments/upload`;
      console.log('[HaloPublisher] Using proxy for upload, body size:', body.length);

      const plugin = (window as any).haloPublisherPlugin;
      if (!plugin || typeof plugin.fetchPostBinary !== 'function') {
        throw new Error('Binary upload not supported: plugin.fetchPostBinary not found');
      }

      const result = await plugin.fetchPostBinary(uploadUrl, {
        method: 'POST',
        contentType: `multipart/form-data; boundary=${boundary}`,
        cookie: this.cfg.cookie,
        bodyBase64: bodyBase64,
      });

      console.log('[HaloPublisher] Upload response:', result);

      if (result && result.metadata?.name) {
        const uri = result.metadata.annotations?.['storage.halo.run/uri'];
        // 返回相对路径（不拼接域名），用于正文中的图片引用
        const url = uri || result.status?.permalink || null;
        if (url) {
          console.log('[HaloPublisher] Image uploaded successfully:', url);
          // 保存到缓存
          const fileName = this.getFileNameFromUrl(imageUrl);
          HalowebWebAdaptor.imageUploadCache.set(fileName, url);
          return { url, success: true };
        }
      }

      throw new Error('上传成功但无法获取图片 URL');
    } catch (error) {
      console.error('图片上传失败:', error);
      throw error;
    }
  }

  /**
   * 将 ArrayBuffer 转换为 base64 字符串（分块处理，避免栈溢出）
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192; // 每次处理 8KB
    let binary = '';

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
  }
}