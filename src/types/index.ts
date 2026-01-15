// 插件配置类型
export interface PluginConfig {
  url: string;
  apiUrl: string;
  home: string;
  middlewareUrl: string;
  picbedType: string;
  cookie: string;
  storagePolicyName?: string; // 存储策略名称，如 'attachment-policy-xxx'
}

// 思源笔记文档类型
export interface SiyuanDoc {
  id: string;
  title: string;
  content: string;
  coverImage?: string;
  rawContent: string;
  format: 'markdown' | 'html';
  updatedAt: string;
}

// 分类类型
export interface Category {
  id: string;
  name: string;
  slug: string;
}

// 标签类型
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

// 选择的分类标签类型
export interface SelectedTaxonomy {
  categories: Category[];
  tags: Tag[];
}

// 别名生成模式
export type SlugMode = 'timestamp' | 'translate' | 'original';

// 自动生成别名选项
export interface SlugOptions {
  autoGenerate: boolean;
  mode: SlugMode;  // 新增：别名生成模式
  separator: string;
  lowercase: boolean;
  useChinese: boolean;
}

// 文章元数据类型
export interface PostMetadata {
  title: string;
  slug: string;
  status: string;
  publishTime: string;
  coverImage: string;
  categories: string[];
  tags: string[];
  summary: string;
  // 发布选项
  allowComment?: boolean;
  pinned?: boolean;
  visible?: 'PUBLIC' | 'PRIVATE';
}

// 文章内容类型
export interface PostContent {
  content: string;
  rawContent: string;
  format: 'markdown' | 'html';
}

// 完整文章类型
export interface Post {
  metadata: PostMetadata;
  content: PostContent;
  id?: string;
}

// Halo API 响应类型
export interface HaloApiResponse<T> {
  data?: T;
  message?: string;
  success?: boolean;

  // Halo 2.0 K8s style response
  metadata?: {
    name: string;
    creationTimestamp?: string;
    [key: string]: any;
  };
  spec?: any;
  status?: {
    phase?: string;
    conditions?: Array<{ type: string; lastTransitionTime: string }>;
    [key: string]: any;
  };
  items?: any[];
  total?: number;
  [key: string]: any;
}

// Halo 文章规范类型
export interface HaloPostSpec {
  title: string;
  slug: string;
  summary: string;
  cover: string;
  content: {
    raw: string;
    html: string;
    markdown: string;
  };
  categories: {
    name: string;
  }[];
  tags: {
    name: string;
  }[];
}

// Halo 文章参数类型
export interface HaloPostParams {
  apiVersion: string;
  kind: string;
  metadata: {
    generateName?: string;
    name?: string;
  };
  spec: HaloPostSpec;
}

// 图片上传结果类型
export interface ImageUploadResult {
  url: string;
  success: boolean;
  message?: string;
}

// 已发布文章列表类型
export interface PublishedPost {
  id: string;
  title: string;
  publishedTime: string;
  status: string;
  url: string;
  slug?: string;
  cover?: string;
  categories?: string[];      // 分类 ID (metadata.name)
  categoryNames?: string[];   // 分类显示名称
  tags?: string[];            // 标签 ID (metadata.name)
  tagNames?: string[];        // 标签显示名称
  source?: 'plugin' | 'halo' | 'unknown';  // 发布来源
}

// 发布映射类型（思源 ↔ Halo）
export interface PublishMapping {
  siyuanId: string;        // 思源文档 ID
  haloId: string;          // Halo 文章 ID
  contentHash: string;     // 内容 hash
  publishedAt: string;     // 首次发布时间
  lastUpdated: string;     // 最后更新时间
  title: string;           // 文章标题
}

// 思源笔记列表项类型
export interface SiyuanNoteItem {
  id: string;
  title: string;
  updated: string;
  haloId?: string;           // 关联的 Halo 文章 ID
  isModified?: boolean;      // 是否已修改
  isPublished?: boolean;     // 是否已发布
  isDeleted?: boolean;       // 是否已在 Halo 删除
  categories?: string[];     // 分类 ID 列表
  categoryNames?: string[];  // 分类显示名称
  tags?: string[];           // 标签 ID 列表
  tagNames?: string[];       // 标签显示名称
}

// 存储策略类型
export interface StoragePolicy {
  id: string;           // metadata.name
  name: string;         // spec.displayName
  templateName: string; // spec.templateName (e.g. 'local', 's3')
}