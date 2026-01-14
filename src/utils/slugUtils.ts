import { SlugOptions } from '../types';

/**
 * 别名生成工具类，支持多种模式
 */
export class SlugUtils {
  /**
   * 生成文章别名
   * @param title 文章标题
   * @param options 别名生成选项
   * @returns 生成的别名
   */
  static generateSlug(title: string, options: SlugOptions = {
    autoGenerate: true,
    mode: 'timestamp',
    separator: '-',
    lowercase: true,
    useChinese: false
  }): string {
    if (!options.autoGenerate) {
      return '';
    }

    const mode = options.mode || 'timestamp';

    switch (mode) {
      case 'timestamp':
        return `post-${Date.now()}`;

      case 'translate':
        return this.generateTranslatedSlug(title, options);

      case 'original':
        return this.generateOriginalSlug(title, options);

      default:
        return `post-${Date.now()}`;
    }
  }

  /**
   * 生成翻译后的英文别名（中文翻译为拼音）
   */
  private static generateTranslatedSlug(title: string, options: SlugOptions): string {
    if (!title) return `post-${Date.now()}`;

    let slug = title.trim();

    // 检测是否包含中文
    const hasChinese = /[\u4e00-\u9fa5]/.test(slug);

    if (hasChinese) {
      // 简单拼音映射
      slug = this.simplePinyinConvert(slug);
    }

    // 移除所有非字母数字字符
    slug = slug.replace(/[^a-zA-Z0-9\s]/g, '');

    if (options.lowercase) {
      slug = slug.toLowerCase();
    }

    // 替换空格为分隔符
    slug = slug.replace(/\s+/g, options.separator);

    // 移除首尾分隔符
    slug = slug.replace(new RegExp(`^${options.separator}+|${options.separator}+$`, 'g'), '');

    // 如果转换后为空，使用时间戳
    return slug || `post-${Date.now()}`;
  }

  /**
   * 生成原始标题别名（支持中文）
   */
  private static generateOriginalSlug(title: string, options: SlugOptions): string {
    if (!title) return `post-${Date.now()}`;

    let slug = title.trim();

    // 保留中文、字母、数字
    slug = slug.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '');

    if (options.lowercase) {
      slug = slug.toLowerCase();
    }

    // 替换空格为分隔符
    slug = slug.replace(/\s+/g, options.separator);

    // 移除首尾分隔符
    slug = slug.replace(new RegExp(`^${options.separator}+|${options.separator}+$`, 'g'), '');

    return slug || `post-${Date.now()}`;
  }

  /**
   * 简单拼音转换（常用字）
   */
  private static simplePinyinConvert(text: string): string {
    const pinyinMap: Record<string, string> = {
      '的': 'de', '一': 'yi', '是': 'shi', '了': 'le', '我': 'wo',
      '不': 'bu', '人': 'ren', '在': 'zai', '他': 'ta', '有': 'you',
      '这': 'zhe', '个': 'ge', '上': 'shang', '们': 'men', '来': 'lai',
      '到': 'dao', '时': 'shi', '大': 'da', '地': 'di', '为': 'wei',
      '子': 'zi', '中': 'zhong', '你': 'ni', '说': 'shuo', '生': 'sheng',
      '国': 'guo', '年': 'nian', '着': 'zhe', '就': 'jiu', '那': 'na',
      '和': 'he', '要': 'yao', '她': 'ta', '出': 'chu', '也': 'ye',
      '得': 'de', '里': 'li', '后': 'hou', '自': 'zi', '以': 'yi',
      '会': 'hui', '家': 'jia', '可': 'ke', '下': 'xia', '而': 'er',
      '过': 'guo', '天': 'tian', '去': 'qu', '能': 'neng', '对': 'dui',
      '小': 'xiao', '多': 'duo', '然': 'ran', '于': 'yu', '心': 'xin',
      '学': 'xue', '么': 'me', '之': 'zhi', '都': 'dou', '好': 'hao',
      '看': 'kan', '起': 'qi', '发': 'fa', '当': 'dang', '没': 'mei',
      '成': 'cheng', '只': 'zhi', '如': 'ru', '事': 'shi', '把': 'ba',
      '还': 'hai', '用': 'yong', '第': 'di', '样': 'yang', '道': 'dao',
      '想': 'xiang', '作': 'zuo', '种': 'zhong', '开': 'kai', '美': 'mei',
      '总': 'zong', '从': 'cong', '无': 'wu', '情': 'qing', '己': 'ji',
      '面': 'mian', '最': 'zui', '女': 'nv', '但': 'dan', '现': 'xian',
      '前': 'qian', '些': 'xie', '所': 'suo', '同': 'tong', '日': 'ri',
      '手': 'shou', '又': 'you', '行': 'xing', '意': 'yi', '动': 'dong',
      '方': 'fang', '期': 'qi', '它': 'ta', '头': 'tou', '经': 'jing',
      '长': 'chang', '儿': 'er', '回': 'hui', '位': 'wei', '分': 'fen',
      '爱': 'ai', '老': 'lao', '因': 'yin', '很': 'hen', '给': 'gei',
      '名': 'ming', '法': 'fa', '间': 'jian', '知': 'zhi', '两': 'liang',
      '世': 'shi', '什': 'shen', '被': 'bei', '高': 'gao', '已': 'yi',
      '亲': 'qin', '其': 'qi', '进': 'jin', '此': 'ci', '话': 'hua',
      '常': 'chang', '与': 'yu', '活': 'huo', '正': 'zheng', '感': 'gan',
      '见': 'jian', '明': 'ming', '问': 'wen', '力': 'li', '理': 'li',
      '点': 'dian', '文': 'wen', '几': 'ji', '定': 'ding', '公': 'gong',
      '本': 'ben', '特': 'te', '做': 'zuo', '外': 'wai', '孩': 'hai',
      '相': 'xiang', '西': 'xi', '果': 'guo', '走': 'zou', '月': 'yue',
      '将': 'jiang', '十': 'shi', '实': 'shi', '向': 'xiang', '全': 'quan',
      '声': 'sheng', '车': 'che', '信': 'xin', '重': 'zhong', '三': 'san',
      '机': 'ji', '工': 'gong', '物': 'wu', '气': 'qi', '每': 'mei',
      '并': 'bing', '别': 'bie', '真': 'zhen', '打': 'da', '太': 'tai',
      '新': 'xin', '比': 'bi', '才': 'cai', '便': 'bian', '夫': 'fu',
      '再': 'zai', '书': 'shu', '部': 'bu', '水': 'shui', '像': 'xiang',
      '眼': 'yan', '少': 'shao', '界': 'jie', '妈': 'ma', '海': 'hai',
      '笔': 'bi', '记': 'ji', '教': 'jiao', '四': 'si', '网': 'wang',
      '络': 'luo', '技': 'ji', '术': 'shu', '博': 'bo', '客': 'ke',
      '思': 'si', '源': 'yuan', '插': 'cha', '件': 'jian', '配': 'pei',
      '置': 'zhi', '测': 'ce', '试': 'shi', '功': 'gong', '图': 'tu',
      '片': 'pian', '视': 'shi', '频': 'pin', '音': 'yin', '设': 'she',
      '计': 'ji', '程': 'cheng', '序': 'xu', '代': 'dai', '码': 'ma',
      '软': 'ruan', '硬': 'ying', '数': 'shu', '据': 'ju', '库': 'ku',
      '服': 'fu', '务': 'wu', '器': 'qi', '云': 'yun', '端': 'duan',
      '系': 'xi', '统': 'tong', '平': 'ping', '台': 'tai', '应': 'ying',
      '接': 'jie', '口': 'kou', '模': 'mo', '块': 'kuai', '函': 'han',
      '类': 'lei', '变': 'bian', '量': 'liang', '循': 'xun', '环': 'huan',
      '条': 'tiao', '判': 'pan', '断': 'duan', '返': 'fan', '值': 'zhi',
      '参': 'can', '错': 'cuo', '误': 'wu', '调': 'diao', '编': 'bian',
      '译': 'yi', '运': 'yun', '安': 'an', '装': 'zhuang', '更': 'geng'
    };

    let result = '';
    for (const char of text) {
      if (pinyinMap[char]) {
        result += pinyinMap[char] + ' ';
      } else if (/[\u4e00-\u9fa5]/.test(char)) {
        // 未映射的中文字符保留原字符
        result += char;
      } else {
        result += char;
      }
    }
    return result.trim();
  }

  /**
   * 验证别名是否有效
   */
  static isValidSlug(slug: string): boolean {
    if (!slug || slug.trim() === '') {
      return false;
    }
    const validRegex = /^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/;
    return validRegex.test(slug);
  }
}