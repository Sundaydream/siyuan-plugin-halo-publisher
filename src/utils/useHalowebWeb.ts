import { PluginConfig } from '../types';

// 默认配置常量
const DEFAULT_CONFIG: Partial<PluginConfig> = {
  middlewareUrl: 'https://api.terwer.space/api/middleware',
  picbedType: 'local',
};

/**
 * 初始化 Halo Web 配置
 * @param userConfig 用户配置
 * @returns 完整的插件配置
 */
export const useHalowebWeb = (userConfig: Partial<PluginConfig>): PluginConfig => {
  // 合并用户配置和默认配置
  const config = { ...DEFAULT_CONFIG, ...userConfig } as PluginConfig;

  // 如果用户提供了 URL，则自动解析 API URL 和首页 URL
  if (config.url) {
    // 确保 URL 格式正确
    let normalizedUrl = config.url;
    if (!normalizedUrl.endsWith('/')) {
      normalizedUrl += '/';
    }

    // 设置首页 URL
    config.home = normalizedUrl;

    // 自动设置 API URL
    // Halo 2.x API 路径分为 console 和 content，需要在 Adaptor 中分别处理
    // 这里将 apiUrl 设置为根路径
    config.apiUrl = normalizedUrl;
  }

  return config;
};

/**
 * 保存配置到本地存储
 * @param config 要保存的配置
 */
export const saveConfig = (config: PluginConfig): void => {
  try {
    localStorage.setItem('halo-publisher-config', JSON.stringify(config));
  } catch (error) {
    console.error('保存配置失败:', error);
  }
};

/**
 * 从本地存储读取配置
 * @returns 保存的配置，如果不存在则返回 null
 */
export const loadConfig = (): PluginConfig | null => {
  try {
    const configStr = localStorage.getItem('halo-publisher-config');
    if (configStr) {
      return JSON.parse(configStr);
    }
    return null;
  } catch (error) {
    console.error('读取配置失败:', error);
    return null;
  }
};

/**
 * 清除本地存储的配置
 */
export const clearConfig = (): void => {
  try {
    localStorage.removeItem('halo-publisher-config');
  } catch (error) {
    console.error('清除配置失败:', error);
  }
};