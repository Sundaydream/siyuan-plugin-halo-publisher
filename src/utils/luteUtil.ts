/**
 * Lute 工具类 - 使用思源笔记内置的 Lute 解析器将 Markdown 转换为 HTML
 */
class LuteUtil {
    /**
     * 使用 Lute 将 Markdown 转换为 HTML
     * @param markdown Markdown 内容
     * @returns HTML 内容
     */
    public static mdToHtml(markdown: string): string {
        try {
            const Lute = (window as any).Lute;
            if (!Lute) {
                console.warn('[HaloPublisher] Lute not found, returning raw markdown');
                return markdown;
            }

            const lute = Lute.New();
            // 设置一些渲染选项
            lute.SetAutoSpace(true);
            lute.SetToC(true);

            const html = lute.Md2HTML(markdown);
            return html;
        } catch (e) {
            console.error('[HaloPublisher] Lute mdToHtml error:', e);
            return markdown;
        }
    }

    /**
     * 为 h1-h6 标签添加 id 属性（用于锚点跳转）
     * 例如：<h1>标题</h1> 转换为 <h1 id="标题">标题</h1>
     * @param content HTML 内容
     * @returns 处理后的 HTML
     */
    public static addIdToHeadings(content: string): string {
        return content.replace(/<h([1-6])>(.*?)<\/h\1>/g, (_match, level, title) => {
            return `<h${level} id="${title}">${title}</h${level}>`;
        });
    }
}

export { LuteUtil };
