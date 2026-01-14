import { Plugin, showMessage, Menu, Dialog, fetchSyncPost } from "siyuan";
import PluginInfo from '../plugin.json';
import { createApp } from 'vue';
import App from './App.vue';
import { t } from './utils/i18n';

// 定义插件图标 SVG（云端上传图标）
const ICON_SVG = `<symbol id="iconHalo" viewBox="0 0 24 24">
  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
</symbol>`;

export default class HaloPublisherPlugin extends Plugin {
  private dialog: Dialog | null = null;
  private vueApp: any = null;

  async onload() {
    console.log('Halo Publisher Plugin loaded, version:', PluginInfo.version);

    // 添加自定义图标
    this.addIcons(ICON_SVG);

    // 添加顶栏按钮
    this.addTopBar({
      icon: "iconHalo",
      title: t('menu.title'),
      position: "right",
      callback: (event: MouseEvent) => {
        this.showPluginMenu(event);
      }
    });

    // 将插件实例保存到全局，供 UI 使用
    (window as any).haloPublisherPlugin = this;
  }

  /**
   * 显示插件菜单
   */
  private showPluginMenu(event: MouseEvent) {
    const menu = new Menu("halo-publisher-menu");

    menu.addItem({
      icon: "iconEdit",
      label: t('tab.publish'),
      click: () => {
        this.openPluginDialog('articlePublish');
      }
    });

    menu.addItem({
      icon: "iconList",
      label: t('tab.management'),
      click: () => {
        this.openPluginDialog('articleManagement');
      }
    });

    menu.addItem({
      icon: "iconSettings",
      label: t('tab.settings'),
      click: () => {
        this.openPluginDialog('generalSettings');
      }
    });

    menu.addItem({
      icon: "iconInfo",
      label: t('tab.about'),
      click: () => {
        this.openPluginDialog('about');
      }
    });

    // 根据点击位置显示菜单
    if (this.isMobile) {
      menu.fullscreen();
    } else {
      menu.open({
        x: event.clientX,
        y: event.clientY,
        isLeft: false
      });
    }
  }

  private get isMobile(): boolean {
    return document.body.classList.contains("body--mobile");
  }

  /**
   * 保存插件数据（使用 SiYuan 插件存储 API）
   * @param key 存储键
   * @param data 要存储的数据
   */
  public async savePluginData(key: string, data: any): Promise<void> {
    try {
      // SiYuan saveData 需要字符串，所以我们序列化数据
      const jsonStr = JSON.stringify(data);
      await this.saveData(`settings-${key}.json`, jsonStr);
      console.log(`[HaloPublisher] Saved plugin data: ${key}`);
    } catch (error) {
      console.error(`[HaloPublisher] Failed to save plugin data (${key}):`, error);
    }
  }

  /**
   * 加载插件数据（使用 SiYuan 插件存储 API）
   * @param key 存储键
   * @returns 存储的数据，如果不存在则返回 null
   */
  public async loadPluginData(key: string): Promise<any> {
    try {
      const data = await this.loadData(`settings-${key}.json`);
      if (data === null || data === undefined || data === '') {
        return null;
      }
      // 如果数据是字符串，尝试解析为 JSON
      if (typeof data === 'string') {
        try {
          return JSON.parse(data);
        } catch {
          // 如果解析失败，可能是旧格式的简单字符串（如 "en"）
          // 直接返回原始字符串
          console.log(`[HaloPublisher] Returning raw string for key: ${key}`);
          return data;
        }
      }
      // 如果已经是对象，直接返回
      return data;
    } catch (error) {
      console.error(`[HaloPublisher] Failed to load plugin data (${key}):`, error);
      return null;
    }
  }

  /**
   * 代理 GET 请求
   * @param url 请求 URL
   * @param options 请求选项，包含 headers
   */
  public async fetchGet(url: string, options: any = {}) {
    try {
      console.log(`[HaloPublisher] Proxying GET request: ${url}`);

      const headers: any[] = [];
      if (options.headers) {
        for (const key in options.headers) {
          headers.push({ [key]: options.headers[key] });
        }
      }

      // 添加默认 UA
      if (!options.headers || !options.headers['User-Agent']) {
        headers.push({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) SiYuan/1.0 Chrome/100.0.0.0 Safari/537.36' });
      }

      const response = await fetchSyncPost('/api/network/forwardProxy', {
        url: url,
        method: 'GET',
        headers: headers,
        timeout: 10000,
        contentType: 'application/json'
      });

      console.log('[HaloPublisher] Raw Proxy Response:', JSON.stringify(response));

      // 检查 code 是否为 0 (思源 API 调用成功)
      if (response && response.code === 0 && response.data) {
        // forwardProxy 实际返回的数据通常包含 status, headers, body
        /*
          Example data structure expected:
          {
            status: 200,
            headers: {...},
            body: "{\"items\": [...]}" or Object
          }
        */
        console.log('[HaloPublisher] Proxy Response Data:', JSON.stringify(response.data));

        if (response.data.status >= 400) {
          console.error(`[HaloPublisher] Remote API Error: ${response.data.status}`, response.data.body);
        }

        let body = response.data.body;
        // 尝试解析 body
        if (typeof body === 'string') {
          try {
            return JSON.parse(body);
          } catch (e) {
            return body;
          }
        }
        return body;
      } else {
        console.error('[HaloPublisher] Proxy call failed or returned non-zero code:', response);
      }
      return response;
    } catch (error) {
      console.error('[HaloPublisher] Proxy GET failed:', error);
      throw error;
    }
  }

  /**
   * 代理 POST/PUT/DELETE 请求
   * @param url 请求 URL
   * @param options 请求选项
   */
  public async fetchPost(url: string, options: any) {
    try {
      console.log(`[HaloPublisher] Proxying ${options.method || 'POST'} request: ${url}`);

      const headers: any[] = [];
      if (options.headers) {
        for (const key in options.headers) {
          headers.push({ [key]: options.headers[key] });
        }
      }

      // 添加默认 UA
      headers.push({ 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) SiYuan/1.0 Chrome/100.0.0.0 Safari/537.36' });

      // 检测是否是 multipart/form-data（用于文件上传）
      const contentTypeHeader = options.headers?.['Content-Type'] || '';
      const isMultipart = contentTypeHeader.includes('multipart/form-data');

      let proxyRequest: any;

      if (isMultipart && typeof options.body === 'string') {
        // 对于 multipart/form-data，使用 base64 编码传输
        const base64Payload = btoa(unescape(encodeURIComponent(options.body)));

        proxyRequest = {
          url: url,
          method: options.method || 'POST',
          headers: headers,
          payload: base64Payload,
          payloadEncoding: 'base64',
          timeout: 60000, // 文件上传增加超时时间
          contentType: contentTypeHeader
        };

        console.log('[HaloPublisher] Using base64 payload encoding for multipart upload');
      } else {
        // 标准 JSON 请求
        let payload = options.body || {};
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch (e) {
            // 如果解析失败，直接使用字符串
            console.warn('[HaloPublisher] Body is not valid JSON, sending as-is');
          }
        }

        proxyRequest = {
          url: url,
          method: options.method || 'POST',
          headers: headers,
          payload: payload,
          timeout: 10000,
          contentType: 'application/json'
        };
      }

      const response = await fetchSyncPost('/api/network/forwardProxy', proxyRequest);

      console.log('[HaloPublisher] Raw Proxy Response (POST):', JSON.stringify(response));

      if (response && response.code === 0 && response.data) {
        if (response.data.status >= 400) {
          console.error(`[HaloPublisher] Remote API Error (POST): ${response.data.status}`, response.data.body);
        }

        let body = response.data.body;
        try {
          return JSON.parse(body);
        } catch (e) {
          return body;
        }
      } else {
        console.error('[HaloPublisher] Proxy POST call failed:', response);
      }
      return response;
    } catch (error) {
      console.error('[HaloPublisher] Proxy Request failed:', error);
      throw error;
    }
  }

  /**
   * 代理二进制文件上传请求
   * @param url 请求 URL
   * @param options 请求选项（包含 base64 编码的 body）
   */
  public async fetchPostBinary(url: string, options: {
    method: string;
    contentType: string;
    cookie: string;
    bodyBase64: string;
  }) {
    try {
      console.log(`[HaloPublisher] Proxying binary ${options.method} request: ${url}`);

      const headers: any[] = [
        { 'Content-Type': options.contentType },
        { 'Cookie': options.cookie },
        { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) SiYuan/1.0 Chrome/100.0.0.0 Safari/537.36' }
      ];

      const response = await fetchSyncPost('/api/network/forwardProxy', {
        url: url,
        method: options.method,
        headers: headers,
        payload: options.bodyBase64,
        payloadEncoding: 'base64',
        responseEncoding: 'text',
        timeout: 120000, // 2 分钟超时用于大文件上传
        contentType: options.contentType
      });

      console.log('[HaloPublisher] Binary upload response status:', response?.data?.status);

      if (response && response.code === 0 && response.data) {
        if (response.data.status >= 400) {
          console.error(`[HaloPublisher] Remote API Error (Binary): ${response.data.status}`, response.data.body);
          throw new Error(`Upload failed: ${response.data.status}`);
        }

        let body = response.data.body;
        try {
          return JSON.parse(body);
        } catch (e) {
          return body;
        }
      } else {
        console.error('[HaloPublisher] Binary upload failed:', response);
        throw new Error('Binary upload failed');
      }
    } catch (error) {
      console.error('[HaloPublisher] Binary Request failed:', error);
      throw error;
    }
  }

  /**
   * 打开插件弹窗
   */
  public openPluginDialog(tab: string = 'articlePublish') {
    // 如果已有弹窗，先关闭
    if (this.dialog) {
      this.destroyDialog();
    }

    // 创建弹窗
    this.dialog = new Dialog({
      title: "Halo 发布插件",
      content: `<div id="halo-publisher-app" style="height: 100%;"></div>`,
      width: this.isMobile ? "100vw" : "900px",
      height: this.isMobile ? "100vh" : "700px",
      destroyCallback: () => {
        this.destroyDialog();
      }
    });

    // 挂载 Vue 应用到弹窗内容区域
    const appContainer = this.dialog.element.querySelector('#halo-publisher-app');
    if (appContainer) {
      this.vueApp = createApp(App, {
        initialTab: tab,
        plugin: this
      });
      const vm = this.vueApp.mount(appContainer);

      // 将 Vue 实例绑定到 window 对象上，方便调试
      (window as any)._sy_halo_publisher = vm;
    }
  }

  /**
   * 销毁弹窗
   */
  private destroyDialog() {
    if (this.vueApp) {
      this.vueApp.unmount();
      this.vueApp = null;
    }
    if ((window as any)._sy_halo_publisher) {
      delete (window as any)._sy_halo_publisher;
    }
    this.dialog = null;
  }

  /**
   * 获取当前文档 ID
   */
  async getCurrentDocId(): Promise<string> {
    try {
      // 方法1: 从 DOM 中查找当前激活的编辑器
      const activeProtyle = document.querySelector('.layout__center .protyle:not(.fn__none)');
      if (activeProtyle) {
        const title = activeProtyle.querySelector('.protyle-title');
        if (title) {
          const docId = title.getAttribute('data-node-id');
          if (docId) return docId;
        }
        // 尝试从 protyle 的 background 获取
        const background = activeProtyle.querySelector('.protyle-background');
        if (background) {
          const docId = background.getAttribute('data-node-id');
          if (docId) return docId;
        }
      }

      // 方法2: 尝试从 siyuan 全局对象获取
      const siyuanGlobal = (window as any).siyuan;
      if (siyuanGlobal) {
        // 尝试多种路径
        const layout = siyuanGlobal.layout;
        if (layout?.centerLayout?.currentTab?.model?.editor?.protyle?.block?.rootID) {
          return layout.centerLayout.currentTab.model.editor.protyle.block.rootID;
        }
      }

      return '';
    } catch (error) {
      console.error('获取当前文档 ID 失败:', error);
      return '';
    }
  }

  /**
   * 获取文档信息
   */
  async getDocInfo(id: string): Promise<any> {
    try {
      const result = await fetchSyncPost('/api/filetree/getDoc', { id, size: 102400 });
      return result;
    } catch (error) {
      console.error('获取文档信息失败:', error);
      throw error;
    }
  }

  /**
   * 执行 SQL 查询
   */
  async sql(stmt: string): Promise<any> {
    try {
      const result = await fetchSyncPost('/api/query/sql', { stmt });
      return result;
    } catch (error) {
      console.error('SQL 查询失败:', error);
      throw error;
    }
  }

  /**
   * 导出文档为 Markdown
   */
  async exportMdContent(id: string): Promise<string> {
    try {
      const result = await fetchSyncPost('/api/export/exportMdContent', { id });
      if (result.code === 0) {
        return result.data.content;
      }
      throw new Error(result.msg || '导出失败');
    } catch (error) {
      console.error('导出 Markdown 失败:', error);
      throw error;
    }
  }

  /**
   * 打开 Halo 登录窗口并获取 Cookie（使用 webview）
   * @param haloUrl Halo 网站地址
   * @returns Cookie 字符串
   */
  async openLoginWindow(haloUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // 构建登录 URL
      let loginUrl = haloUrl.trim();
      if (loginUrl.endsWith('/')) {
        loginUrl = loginUrl.slice(0, -1);
      }
      loginUrl += '/console';

      // 创建一个登录对话框，使用 webview 标签
      const loginDialog = new Dialog({
        title: t('menu.loginTitle'),
        content: `
          <div style="display: flex; flex-direction: column; height: 100%;">
            <div style="padding: 10px; background: #f5f5f5; border-bottom: 1px solid #ddd;">
              <span style="font-size: 13px; color: #666;">
                ${t('menu.loginInstruction')}
              </span>
            </div>
            <webview 
              id="halo-login-webview" 
              src="${loginUrl}" 
              style="flex: 1; width: 100%; border: none;"
              allowpopups
            ></webview>
            <div style="padding: 12px; background: #f5f5f5; border-top: 1px solid #ddd; display: flex; justify-content: flex-end; gap: 10px;">
              <button id="halo-login-cancel" class="b3-button b3-button--cancel">${t('menu.loginCancel')}</button>
              <button id="halo-login-confirm" class="b3-button b3-button--text">${t('menu.loginConfirm')}</button>
            </div>
          </div>
        `,
        width: "1024px",
        height: "700px",
      });

      // 获取 webview 元素
      const webview = loginDialog.element.querySelector('#halo-login-webview') as any;
      const confirmBtn = loginDialog.element.querySelector('#halo-login-confirm');
      const cancelBtn = loginDialog.element.querySelector('#halo-login-cancel');

      // 取消按钮
      cancelBtn?.addEventListener('click', () => {
        loginDialog.destroy();
        reject(new Error(t('menu.loginCancelled')));
      });

      // 确认按钮 - 获取 Cookie
      confirmBtn?.addEventListener('click', async () => {
        try {
          let cookieStr = '';

          // 获取 Electron remote
          const electron = (window as any).require?.('@electron/remote') || (window as any).require?.('electron')?.remote;

          // 方法1: 尝试从 webview 实例直接获取 session (最可靠)
          if (webview && webview.getWebContents) {
            try {
              const wc = webview.getWebContents();
              if (wc && wc.session) {
                const cookies = await wc.session.cookies.get({ url: loginUrl });
                if (cookies && cookies.length > 0) {
                  cookieStr = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
                  console.log('通过 webview.getWebContents().session 获取到 Cookie');
                }
              }
            } catch (e) {
              console.warn('webview.getWebContents 方法失败:', e);
            }
          }

          // 方法2: 如果上面失败，且有 remote，尝试从 defaultSession 获取 (因为移除了 partition)
          if (!cookieStr && electron && electron.session) {
            try {
              const cookies = await electron.session.defaultSession.cookies.get({ url: loginUrl });
              if (cookies && cookies.length > 0) {
                cookieStr = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
                console.log('通过 defaultSession 获取到 Cookie');
              }
            } catch (e) {
              console.warn('defaultSession 方法失败:', e);
            }
          }

          // 方法3: 回退到 executeJavaScript (无法获取 HttpOnly)
          if (!cookieStr && webview && webview.executeJavaScript) {
            try {
              const jsCookie = await webview.executeJavaScript('document.cookie');
              if (jsCookie) {
                console.warn('只能获取非 HttpOnly Cookie');
                cookieStr = jsCookie;
              }
            } catch (e) {
              console.warn('executeJavaScript 方法失败:', e);
            }
          }

          // 验证 Cookie
          if (cookieStr) {
            // 简单的验证：是否有 SESSION 或相关字段
            const hasAuth = /SESSION|XSRF-TOKEN|token|auth/i.test(cookieStr);
            if (!hasAuth && cookieStr.includes('language=')) {
              showMessage('警告：未检测到认证 Cookie (HttpOnly)，可能登录不完整或获取受限');
            } else {
              showMessage('Cookie 获取成功');
            }

            loginDialog.destroy();
            resolve(cookieStr);
          } else {
            showMessage('未获取到 Cookie，请确认已登录');
          }

        } catch (error) {
          console.error('获取 Cookie 流程异常:', error);
          showMessage('获取 Cookie 出错: ' + (error instanceof Error ? error.message : '未知错误'));
        }
      });

      // 监听 webview 加载事件
      if (webview) {
        webview.addEventListener('did-finish-load', () => {
          console.log('Webview 加载完成');
        });

        webview.addEventListener('did-fail-load', (event: any) => {
          console.error('Webview 加载失败:', event);
          showMessage('加载登录页面失败，请检查网址是否正确');
        });
      }
    });
  }

  /**
   * 检查是否支持内嵌登录（webview）
   */
  isElectronAvailable(): boolean {
    // 检查是否支持 webview 标签
    try {
      const testDiv = document.createElement('div');
      testDiv.innerHTML = '<webview src="about:blank"></webview>';
      const webview = testDiv.querySelector('webview');
      return webview !== null;
    } catch {
      return false;
    }
  }

  onunload() {
    console.log('Halo Publisher Plugin unloaded');

    // 关闭弹窗
    if (this.dialog) {
      this.dialog.destroy();
      this.destroyDialog();
    }

    // 清理全局引用
    if ((window as any).haloPublisherPlugin) {
      delete (window as any).haloPublisherPlugin;
    }
  }
}