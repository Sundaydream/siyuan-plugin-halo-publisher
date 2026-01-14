import { PublishMapping } from '../types';

const STORAGE_KEY = 'publish-records';

// 内存缓存
let recordsCache: PublishMapping[] | null = null;
let isInitialized = false;

/**
 * 发布记录管理工具类
 * 使用插件 API 进行持久化，同时维护内存缓存以支持同步读取
 */
export class PublishStore {
    /**
     * 初始化：从插件存储加载数据到内存缓存
     * 应在应用启动时调用
     */
    static async init(): Promise<void> {
        if (isInitialized) return;

        try {
            const plugin = (window as any).haloPublisherPlugin;
            if (plugin && plugin.loadPluginData) {
                const data = await plugin.loadPluginData(STORAGE_KEY);
                recordsCache = Array.isArray(data) ? data : [];
                console.log('[PublishStore] Loaded records from plugin storage:', recordsCache.length);
            } else {
                // 兼容：从 localStorage 迁移
                const localData = localStorage.getItem('halo-publisher-records');
                recordsCache = localData ? JSON.parse(localData) : [];
                console.log('[PublishStore] Loaded records from localStorage:', recordsCache.length);

                // 迁移到插件存储
                if (recordsCache.length > 0 && plugin && plugin.savePluginData) {
                    await plugin.savePluginData(STORAGE_KEY, recordsCache);
                    console.log('[PublishStore] Migrated records to plugin storage');
                }
            }
            isInitialized = true;
        } catch (e) {
            console.error('[PublishStore] Init failed:', e);
            recordsCache = [];
            isInitialized = true;
        }
    }

    /**
     * 获取所有发布记录（同步，从缓存读取）
     */
    static getAllRecords(): PublishMapping[] {
        if (!isInitialized) {
            console.warn('[PublishStore] Not initialized, returning empty array');
            return [];
        }
        return recordsCache || [];
    }

    /**
     * 保存或更新发布记录
     */
    static async saveRecord(record: PublishMapping): Promise<void> {
        if (!recordsCache) recordsCache = [];

        const index = recordsCache.findIndex(r => r.siyuanId === record.siyuanId);

        if (index >= 0) {
            recordsCache[index] = { ...recordsCache[index], ...record };
        } else {
            recordsCache.push(record);
        }

        await this.persist();
    }

    /**
     * 删除发布记录
     */
    static async removeRecord(siyuanId: string): Promise<void> {
        if (!recordsCache) return;
        recordsCache = recordsCache.filter(r => r.siyuanId !== siyuanId);
        await this.persist();
    }

    /**
     * 根据思源文档 ID 获取记录
     */
    static getRecordBySiyuanId(siyuanId: string): PublishMapping | undefined {
        return this.getAllRecords().find(r => r.siyuanId === siyuanId);
    }

    /**
     * 根据 Halo 文章 ID 获取记录
     */
    static getRecordByHaloId(haloId: string): PublishMapping | undefined {
        return this.getAllRecords().find(r => r.haloId === haloId);
    }

    /**
     * 检查是否由当前插件发布
     */
    static isPluginPublished(haloId: string): boolean {
        return !!this.getRecordByHaloId(haloId);
    }

    /**
     * 简单的字符串 Hash 计算
     */
    static computeContentHash(content: string): string {
        let hash = 0;
        if (content.length === 0) return '0';
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return hash.toString();
    }

    /**
     * 持久化到插件存储
     */
    private static async persist(): Promise<void> {
        try {
            const plugin = (window as any).haloPublisherPlugin;
            if (plugin && plugin.savePluginData) {
                await plugin.savePluginData(STORAGE_KEY, recordsCache);
                console.log('[PublishStore] Saved records to plugin storage:', recordsCache?.length);
            } else {
                // 回退到 localStorage
                localStorage.setItem('halo-publisher-records', JSON.stringify(recordsCache));
            }
        } catch (e) {
            console.error('[PublishStore] Persist failed:', e);
        }
    }
}
