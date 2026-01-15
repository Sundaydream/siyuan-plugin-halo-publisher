const STORAGE_KEY = 'image-upload-cache';

// 内存缓存
let cacheData: Record<string, string> | null = null;
let isInitialized = false;

/**
 * 图片上传缓存管理工具类
 * 使用插件 API 进行持久化，避免重复上传相同图片
 * 缓存 key 格式: policyName:fileName -> uploadedUrl
 */
export class ImageCacheStore {
    /**
     * 初始化：从插件存储加载缓存到内存
     * 应在应用启动时调用
     */
    static async init(): Promise<void> {
        if (isInitialized) return;

        try {
            const plugin = (window as any).haloPublisherPlugin;
            if (plugin && plugin.loadPluginData) {
                const data = await plugin.loadPluginData(STORAGE_KEY);
                cacheData = (data && typeof data === 'object') ? data : {};
                console.log('[ImageCacheStore] Loaded cache from plugin storage:', Object.keys(cacheData || {}).length, 'entries');
            } else {
                cacheData = {};
            }
            isInitialized = true;
        } catch (e) {
            console.error('[ImageCacheStore] Init failed:', e);
            cacheData = {};
            isInitialized = true;
        }
    }

    /**
     * 检查缓存中是否存在
     */
    static has(key: string): boolean {
        if (!isInitialized || !cacheData) {
            console.warn('[ImageCacheStore] Not initialized');
            return false;
        }
        return key in cacheData;
    }

    /**
     * 从缓存获取 URL
     */
    static get(key: string): string | undefined {
        if (!isInitialized || !cacheData) {
            return undefined;
        }
        return cacheData[key];
    }

    /**
     * 设置缓存并持久化
     */
    static async set(key: string, url: string): Promise<void> {
        if (!cacheData) cacheData = {};
        cacheData[key] = url;
        await this.persist();
    }

    /**
     * 获取所有缓存（用于调试）
     */
    static getAllEntries(): Record<string, string> {
        return cacheData || {};
    }

    /**
     * 清除所有缓存
     */
    static async clear(): Promise<void> {
        cacheData = {};
        await this.persist();
    }

    /**
     * 持久化到插件存储
     */
    private static async persist(): Promise<void> {
        try {
            const plugin = (window as any).haloPublisherPlugin;
            if (plugin && plugin.savePluginData) {
                await plugin.savePluginData(STORAGE_KEY, cacheData);
                console.log('[ImageCacheStore] Saved cache to plugin storage:', Object.keys(cacheData || {}).length, 'entries');
            }
        } catch (e) {
            console.error('[ImageCacheStore] Persist failed:', e);
        }
    }
}
