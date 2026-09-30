/* ==========================================================================
 * theme.js —— 配色与主题模块
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：预设颜色、完整主题、标题装饰风格、和谐配色生成、封面取色、行内样式内联。
 * ========================================================================== */

/** 预设文字颜色 */
const TEXT_COLORS = [
  { c: '#07c160', n: '微信绿' }, { c: '#576b95', n: '链接蓝' }, { c: '#e64340', n: '强调红' },
  { c: '#f0883a', n: '活力橙' }, { c: '#8b5cf6', n: '优雅紫' }, { c: '#3e3e3e', n: '正文黑' },
  { c: '#666666', n: '次要灰' }, { c: '#999999', n: '浅灰' }, { c: '#f5a623', n: '金色' },
  { c: '#4a90d9', n: '天空蓝' }, { c: '#059669', n: '墨绿' }, { c: '#ff6b81', n: '樱花粉' },
  { c: '#d48806', n: '琥珀' }, { c: '#1e293b', n: '深蓝黑' }, { c: '#7c3aed', n: '紫罗兰' }, { c: '#0ea5e9', n: '亮蓝' }
];

/** 预设背景颜色 */
const BG_COLORS = [
  { c: '#fffacd', n: '淡黄' }, { c: '#e8f8ef', n: '浅绿' }, { c: '#e6f0ff', n: '浅蓝' },
  { c: '#fff0f5', n: '浅粉' }, { c: '#f5f0ff', n: '浅紫' }, { c: '#fff5e6', n: '浅橙' },
  { c: '#d9d9d9', n: '灰色' }, { c: '#fdf6ec', n: '米色' }, { c: '#fef0f0', n: '浅红' },
  { c: '#f0fdf4', n: '薄荷' }, { c: '#fffff0', n: '象牙' }, { c: '#f7f9fc', n: '雾霾蓝' }
];

/** 完整主题：应用于全文的行内样式 */
const THEMES = [
  {
    id: 'wx-green', name: '微信绿', desc: '官方简洁风',
    primary: '#07c160', secondary: '#576b95', text: '#3e3e3e', textLight: '#888888',
    quoteBg: '#f9fdfb', quoteBorder: '#07c160', hrColor: '#e6f5ec', headingColor: '#1a1a1a'
  },
  {
    id: 'ink-blue', name: '墨蓝商务', desc: '稳重专业',
    primary: '#1e5aa8', secondary: '#3b7dd8', text: '#333333', textLight: '#8a8a8a',
    quoteBg: '#f2f7fd', quoteBorder: '#1e5aa8', hrColor: '#dbe7f5', headingColor: '#123c73'
  },
  {
    id: 'warm-orange', name: '暖阳橙', desc: '温暖活力',
    primary: '#f0883a', secondary: '#e64340', text: '#443a33', textLight: '#9a8c80',
    quoteBg: '#fff8f0', quoteBorder: '#f0883a', hrColor: '#fbe6d2', headingColor: '#8a4516'
  },
  {
    id: 'elegant-purple', name: '优雅紫', desc: '文艺清新',
    primary: '#8b5cf6', secondary: '#c084fc', text: '#3d3550', textLight: '#8f87a3',
    quoteBg: '#f8f5ff', quoteBorder: '#8b5cf6', hrColor: '#e8e0fb', headingColor: '#5b21b6'
  },
  {
    id: 'sakura-pink', name: '樱花粉', desc: '柔和治愈',
    primary: '#ff6b81', secondary: '#f472b6', text: '#4a3b40', textLight: '#a08a91',
    quoteBg: '#fff5f7', quoteBorder: '#ff6b81', hrColor: '#fbdde3', headingColor: '#9d2449'
  },
  {
    id: 'forest-green', name: '森系墨绿', desc: '自然清新',
    primary: '#059669', secondary: '#0d9488', text: '#33443c', textLight: '#83998e',
    quoteBg: '#f2fbf6', quoteBorder: '#059669', hrColor: '#d3ede0', headingColor: '#065f46'
  },
  {
    id: 'midnight', name: '夜读黑金', desc: '高端质感',
    primary: '#c9a227', secondary: '#a68b1f', text: '#2f2f2f', textLight: '#8d8d8d',
    quoteBg: '#faf7ee', quoteBorder: '#c9a227', hrColor: '#efe6c9', headingColor: '#1f1f1f'
  },
  {
    id: 'minimal-gray', name: '极简灰', desc: '冷静克制',
    primary: '#4b5563', secondary: '#6b7280', text: '#374151', textLight: '#9ca3af',
    quoteBg: '#f8fafc', quoteBorder: '#4b5563', hrColor: '#e5e7eb', headingColor: '#111827'
  },
  {
    id: 'rose-red', name: '玫瑰红', desc: '热烈醒目',
    primary: '#e11d48', secondary: '#fb7185', text: '#43303a', textLight: '#9b8b92',
    quoteBg: '#fff5f7', quoteBorder: '#e11d48', hrColor: '#fbdfe5', headingColor: '#9f1239'
  },
  {
    id: 'indigo', name: '靛蓝', desc: '沉稳理性',
    primary: '#4338ca', secondary: '#6366f1', text: '#333344', textLight: '#8b8ba3',
    quoteBg: '#f5f6ff', quoteBorder: '#4338ca', hrColor: '#e0e1f7', headingColor: '#312e81'
  },
  {
    id: 'teal', name: '青碧', desc: '清爽干净',
    primary: '#0d9488', secondary: '#14b8a6', text: '#2f4340', textLight: '#84a09c',
    quoteBg: '#f2fbfa', quoteBorder: '#0d9488', hrColor: '#d6efec', headingColor: '#115e59'
  },
  {
    id: 'coffee', name: '咖啡棕', desc: '复古质感',
    primary: '#8b5e34', secondary: '#b08968', text: '#40372e', textLight: '#9c9086',
    quoteBg: '#faf6f1', quoteBorder: '#8b5e34', hrColor: '#ece0d2', headingColor: '#5c3d21'
  },
  {
    id: 'sky-blue', name: '天空蓝', desc: '轻盈通透',
    primary: '#0284c7', secondary: '#38bdf8', text: '#2f3b45', textLight: '#8a9aa8',
    quoteBg: '#f2f9ff', quoteBorder: '#0284c7', hrColor: '#d9ecfa', headingColor: '#075985'
  },
  {
    id: 'matcha', name: '抹茶绿', desc: '清新自然',
    primary: '#65a30d', secondary: '#a3e635', text: '#39422f', textLight: '#93a08a',
    quoteBg: '#f7fbf0', quoteBorder: '#65a30d', hrColor: '#e6f2d3', headingColor: '#3f6212'
  },
  {
    id: 'graphite', name: '石墨黑', desc: '高级简约',
    primary: '#18181b', secondary: '#52525b', text: '#27272a', textLight: '#a1a1aa',
    quoteBg: '#f6f6f7', quoteBorder: '#18181b', hrColor: '#e6e6e8', headingColor: '#09090b'
  },
  {
    id: 'coral', name: '珊瑚橙', desc: '活泼亲和',
    primary: '#f97316', secondary: '#fb923c', text: '#463629', textLight: '#a3948a',
    quoteBg: '#fff7ed', quoteBorder: '#f97316', hrColor: '#fbe3d0', headingColor: '#9a3412'
  }
];

/** 标题装饰风格定义（每项负责把标题元素装饰成对应效果） */
const HEADING_STYLES = [
  { id: 'plain', name: '简约加粗', demo: '标题' },
  { id: 'left-bar', name: '左竖线', demo: '▍标题' },
  { id: 'underline', name: '底部下划线', demo: '标题̲' },
  { id: 'pill', name: '圆角标签', demo: '▣ 标题' },
  { id: 'card', name: '底色卡片', demo: '▭ 标题' },
  { id: 'gradient', name: '渐变底块', demo: '▓ 标题' }
];

/** 当前选中的主题 ID */
var currentThemeId = 'wx-green';
/** 当前选中的标题风格 ID */
var currentHeadingStyleId = 'left-bar';

/**
 * 依据 ID 获取主题对象
 * @param {string} id 主题 ID
 * @returns {Object} 主题对象（找不到返回默认主题）
 */
function getThemeById(id) {
  return THEMES.find(function (t) { return t.id === id; }) || THEMES[0];
}

/**
 * 初始化配色与主题面板（渲染预设颜色、主题列表、标题风格）
 * @returns {void}
 */
function initThemePanel() {
  const textBox = document.getElementById('presetTextColors');
  if (textBox) {
    textBox.innerHTML = TEXT_COLORS.map(function (item) {
      return '<span class="color-dot" style="background:' + item.c + '" title="' + item.n + ' ' + item.c + '" onclick="setFontColor(\'' + item.c + '\')"></span>';
    }).join('');
  }
  const bgBox = document.getElementById('presetBgColors');
  if (bgBox) {
    bgBox.innerHTML = BG_COLORS.map(function (item) {
      return '<span class="color-dot" style="background:' + item.c + '" title="' + item.n + ' ' + item.c + '" onclick="setBgColor(\'' + item.c + '\')"></span>';
    }).join('') +
    '<span class="color-dot" style="background:transparent;border:2px dashed #ccc" title="清除背景" onclick="setBgColor(\'transparent\')"></span>';
  }

  // 恢复上次使用的主题
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved) {
      const obj = JSON.parse(saved);
      if (obj.themeId) currentThemeId = obj.themeId;
      if (obj.headingStyleId) currentHeadingStyleId = obj.headingStyleId;
    }
  } catch (e) { /* 忽略 */ }

  renderThemeList();
  renderHeadingStyleGrid();
  renderLayoutThemeOptions();
}

/**
 * 渲染主题列表
 * @returns {void}
 */
function renderThemeList() {
  const box = document.getElementById('themeList');
  if (!box) return;
  box.innerHTML = THEMES.map(function (t) {
    return '<div class="theme-card' + (t.id === currentThemeId ? ' active' : '') + '" data-theme="' + t.id + '" onclick="selectTheme(\'' + t.id + '\')">' +
      '<span class="theme-swatches">' +
        '<span class="theme-swatch" style="background:' + t.primary + '"></span>' +
        '<span class="theme-swatch" style="background:' + t.secondary + '"></span>' +
        '<span class="theme-swatch" style="background:' + t.quoteBg + '"></span>' +
      '</span>' +
      '<span><span class="theme-card-name">' + t.name + '</span><br><span class="theme-card-desc">' + t.desc + '</span></span>' +
    '</div>';
  }).join('');
}

/**
 * 选择主题（仅切换选中态，不立即应用）
 * @param {string} id 主题 ID
 * @returns {void}
 */
function selectTheme(id) {
  currentThemeId = id;
  renderThemeList();
  persistThemeSelection();
}

/**
 * 选择标题装饰风格
 * @param {string} id 风格 ID
 * @returns {void}
 */
function selectHeadingStyle(id) {
  currentHeadingStyleId = id;
  renderHeadingStyleGrid();
  persistThemeSelection();
}

/**
 * 保存主题与标题风格选择
 * @returns {void}
 */
function persistThemeSelection() {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify({
      themeId: currentThemeId, headingStyleId: currentHeadingStyleId
    }));
  } catch (e) { /* 忽略 */ }
}

/**
 * 渲染标题装饰风格选择网格
 * @returns {void}
 */
function renderHeadingStyleGrid() {
  const box = document.getElementById('headingStyleGrid');
  if (!box) return;
  box.innerHTML = HEADING_STYLES.map(function (s) {
    return '<div class="heading-style-item' + (s.id === currentHeadingStyleId ? ' active' : '') + '" onclick="selectHeadingStyle(\'' + s.id + '\')">' +
      '<span class="hs-demo">' + s.demo + '</span>' + s.name + '</div>';
  }).join('');
}

/**
 * 把主题与标题风格同步到 AI 抽屉的下拉选项
 * @returns {void}
 */
function renderLayoutThemeOptions() {
  const themeSel = document.getElementById('layoutTheme');
  if (themeSel) {
    themeSel.innerHTML = THEMES.map(function (t) {
      return '<option value="' + t.id + '"' + (t.id === currentThemeId ? ' selected' : '') + '>' + t.name + ' · ' + t.desc + '</option>';
    }).join('');
  }
  const hsSel = document.getElementById('layoutHeadingStyle');
  if (hsSel) {
    hsSel.innerHTML = HEADING_STYLES.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === currentHeadingStyleId ? ' selected' : '') + '>' + s.name + '</option>';
    }).join('');
  }
}

/**
 * 生成标题元素的行内样式与装饰
 * @param {HTMLElement} el 标题元素（h1/h2/h3）
 * @param {Object} theme 主题对象
 * @param {string} [styleId] 标题风格 ID
 * @returns {void}
 */
function decorateHeading(el, theme, styleId) {
  const level = parseInt(el.tagName.slice(1), 10) || 2;
  const sizeMap = { 1: 22, 2: 19, 3: 17, 4: 16, 5: 15, 6: 15 };
  const size = sizeMap[level] || 18;
  // 先清掉装饰属性，避免叠加
  el.style.cssText = '';
  el.removeAttribute('class');

  el.style.fontSize = size + 'px';
  el.style.fontWeight = '700';
  el.style.lineHeight = '1.5';
  el.style.margin = '24px 0 14px';
  el.style.color = theme.headingColor;

  const sid = styleId || currentHeadingStyleId;
  if (sid === 'left-bar') {
    el.style.borderLeft = '4px solid ' + theme.primary;
    el.style.paddingLeft = '10px';
  } else if (sid === 'underline') {
    el.style.display = 'inline-block';
    el.style.borderBottom = '3px solid ' + theme.primary;
    el.style.paddingBottom = '5px';
  } else if (sid === 'pill') {
    el.style.display = 'inline-block';
    el.style.background = theme.primary;
    el.style.color = (typeof isLightColor === 'function' && isLightColor(theme.primary)) ? '#222' : '#ffffff';
    el.style.borderRadius = '22px';
    el.style.padding = '6px 16px';
  } else if (sid === 'card') {
    el.style.background = theme.quoteBg;
    el.style.borderLeft = '4px solid ' + theme.primary;
    el.style.borderRadius = '6px';
    el.style.padding = '10px 14px';
  } else if (sid === 'gradient') {
    el.style.background = 'linear-gradient(90deg,' + theme.primary + ' 0%,' + theme.secondary + ' 100%)';
    el.style.color = '#ffffff';
    el.style.borderRadius = '6px';
    el.style.padding = '8px 14px';
    el.style.letterSpacing = '1px';
  } else {
    el.style.color = theme.primary;
  }
}

/**
 * 将主题样式应用到编辑区全文（行内样式，兼容微信）
 * @param {Object} [opts] 可选项 { themeId, headingStyleId, firstLineIndent, spacing }
 * @returns {void}
 */
function applyThemeToEditor(opts) {
  opts = opts || {};
  const target = opts.root || editor;
  if (!target || !target.innerHTML.trim()) { showToast('⚠️ 编辑区暂无内容'); return; }

  const theme = getThemeById(opts.themeId || currentThemeId);
  const styleId = opts.headingStyleId || currentHeadingStyleId;

  // 处理标题
  target.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function (el) { decorateHeading(el, theme, styleId); });

  // 正文段落
  target.querySelectorAll('p').forEach(function (p) {
    if (p.closest('blockquote')) return;
    p.style.fontSize = '15px';
    p.style.color = theme.text;
    p.style.lineHeight = '1.8';
    p.style.letterSpacing = '0.5px';
    p.style.margin = opts.spacing === false ? p.style.margin : '0 0 16px';
    if (opts.firstLineIndent) p.style.textIndent = '2em';
  });

  // 引用块
  target.querySelectorAll('blockquote').forEach(function (q) {
    q.style.borderLeft = '3px solid ' + theme.quoteBorder;
    q.style.background = theme.quoteBg;
    q.style.color = '#6b6b6b';
    q.style.fontSize = '14px';
    q.style.lineHeight = '1.8';
    q.style.padding = '12px 16px';
    q.style.margin = '16px 0';
    q.style.borderRadius = '4px';
  });

  // 列表
  target.querySelectorAll('li').forEach(function (li) {
    li.style.fontSize = '15px';
    li.style.color = theme.text;
    li.style.lineHeight = '1.9';
    li.style.margin = '6px 0';
  });
  target.querySelectorAll('ul,ol').forEach(function (list) {
    list.style.paddingLeft = '24px';
    list.style.margin = '12px 0';
  });

  // 链接
  target.querySelectorAll('a').forEach(function (a) {
    a.style.color = theme.secondary;
    a.style.textDecoration = 'none';
  });

  // 强调
  target.querySelectorAll('strong,b').forEach(function (b) { b.style.color = theme.primary; });

  // 分隔线
  target.querySelectorAll('hr').forEach(function (hr) {
    hr.style.border = 'none';
    hr.style.height = '1px';
    hr.style.background = theme.hrColor;
    hr.style.margin = '24px 0';
  });

  // 表格
  target.querySelectorAll('table').forEach(function (tb) {
    tb.style.borderCollapse = 'collapse';
    tb.style.width = '100%';
    tb.style.margin = '16px 0';
    tb.style.fontSize = '14px';
  });
  target.querySelectorAll('td,th').forEach(function (cell) {
    cell.style.border = '1px solid ' + theme.hrColor;
    cell.style.padding = '8px 12px';
  });

  // 整体字体与颜色（仅作用于编辑区根节点时设置）
  if (target === editor) {
    editor.style.color = theme.text;
    editor.style.fontFamily = "'PingFang SC','Microsoft YaHei',sans-serif";
    editor.style.fontSize = '15px';
    editor.style.lineHeight = '1.8';
  }

  if (currentThemeId !== theme.id) { currentThemeId = theme.id; renderThemeList(); }
  persistThemeSelection();
  updateArticleInfo();
  saveDraft();
  showToast('🎨 已应用「' + theme.name + '」主题');
}

/**
 * 应用当前选中主题到全文（左侧「主题」面板按钮）
 * @returns {void}
 */
function applyCurrentTheme() { applyThemeToEditor({}); }

/* ============================================================
 * 自定义颜色 / 配色生成 / 封面取色
 * ============================================================ */

/**
 * 将自定义取色器颜色设为文字色
 * @returns {void}
 */
function applyCustomTextColor() {
  const el = document.getElementById('customColorInput');
  if (el) setFontColor(el.value);
}

/**
 * 将自定义取色器颜色设为背景色
 * @returns {void}
 */
function applyCustomBgColor() {
  const el = document.getElementById('customColorInput');
  if (el) setBgColor(el.value);
}

/**
 * 基于基准色生成和谐配色（同色系明暗 + 邻近色 + 补色）
 * @returns {void}
 */
function generatePaletteFromBase() {
  const baseEl = document.getElementById('paletteBaseColor');
  if (!baseEl) return;
  const base = baseEl.value;
  const hsl = hexToHsl(base);
  const palette = [
    hslToHex(hsl.h, hsl.s, Math.max(20, hsl.l - 22)),   // 深
    base,                                                // 原色
    hslToHex(hsl.h, Math.max(20, hsl.s - 10), Math.min(88, hsl.l + 24)), // 浅
    hslToHex(hsl.h - 28, hsl.s, hsl.l),                  // 邻近左
    hslToHex(hsl.h + 28, hsl.s, hsl.l),                  // 邻近右
    hslToHex(hsl.h + 180, Math.min(70, hsl.s), hsl.l)    // 补色
  ];
  const box = document.getElementById('generatedPalette');
  if (box) {
    box.innerHTML = palette.map(function (c) {
      return '<span class="color-dot" style="background:' + c + '" title="' + c + '" ' +
        'onclick="setFontColor(\'' + c + '\')" oncontextmenu="event.preventDefault();setBgColor(\'' + c + '\')"></span>';
    }).join('') + '<div class="hint-text" style="width:100%;margin-top:4px">左键设文字色 / 右键设背景色</div>';
  }
}

/**
 * 从封面图提取主色（Canvas 采样 + 颜色归并）
 * @returns {void}
 */
function extractPaletteFromCover() {
  if (!coverDataUrl) { showToast('⚠️ 请先上传封面图'); return; }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    try {
      const canvas = document.createElement('canvas');
      const size = 60;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const buckets = {};
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue;
        // 轻微量化，减少相近色碎片
        const r = Math.round(data[i] / 24) * 24;
        const g = Math.round(data[i + 1] / 24) * 24;
        const b = Math.round(data[i + 2] / 24) * 24;
        const key = r + ',' + g + ',' + b;
        buckets[key] = (buckets[key] || 0) + 1;
      }
      const sorted = Object.keys(buckets).sort(function (a, b) { return buckets[b] - buckets[a]; }).slice(0, 8);
      const box = document.getElementById('coverPalette');
      if (box) {
        box.innerHTML = sorted.map(function (k) {
          const p = k.split(',');
          const hex = rgbToHex(+p[0], +p[1], +p[2]);
          return '<span class="color-dot" style="background:' + hex + '" title="' + hex + '" ' +
            'onclick="setFontColor(\'' + hex + '\')" oncontextmenu="event.preventDefault();setBgColor(\'' + hex + '\')"></span>';
        }).join('') || '<div class="hint-text">未提取到有效颜色</div>';
      }
      showToast('🎨 已提取封面主色');
    } catch (e) {
      showToast('⚠️ 图片跨域或格式限制，取色失败');
    }
  };
  img.onerror = function () { showToast('❌ 封面图加载失败'); };
  img.src = coverDataUrl;
}

/* ============================================================
 * 行内样式内联（兼容微信）
 * ============================================================ */

/** 内联时需要保留的 CSS 属性白名单 */
const INLINE_PROPS = [
  'color', 'background-color', 'background-image', 'font-size', 'font-weight', 'font-style',
  'font-family', 'line-height', 'letter-spacing', 'text-align', 'text-indent', 'text-decoration',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-top-style', 'border-top-color',
  'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
  'border-left-width', 'border-left-style', 'border-left-color',
  'border-right-width', 'border-right-style', 'border-right-color',
  'border-radius', 'width', 'max-width', 'height', 'display', 'box-shadow', 'opacity', 'vertical-align'
];

/**
 * 将编辑区内元素的计算样式写成行内样式，并移除 class（微信兼容）
 * @param {HTMLElement} [root] 处理根节点，默认整个编辑区
 * @returns {number} 被内联处理的元素数量
 */
function inlineComputedStyles(root) {
  root = root || editor;
  if (!root) return 0;
  let count = 0;
  // 只处理子元素，绝不修改根节点自身的 id / class（否则会破坏页面结构引用）
  const nodes = Array.from(root.querySelectorAll('*'));
  nodes.forEach(function (el) {
    if (!el.tagName || el.tagName === 'BR') return;
    if (el.tagName === 'IMG' || el.tagName === 'HR') {
      // 图片/分隔线也把关键样式内联，并清理 class
      const cs0 = window.getComputedStyle(el);
      if (el.tagName === 'IMG') {
        el.setAttribute('style', 'max-width:100%;height:auto;display:block;margin:' + cs0.margin + ';border-radius:' + cs0.borderRadius + ';' +
          (el.style.width ? 'width:' + el.style.width + ';' : ''));
      } else {
        el.setAttribute('style', 'border:none;height:1px;background:' + (cs0.backgroundColor || '#eaeaea') + ';margin:' + cs0.margin + ';');
      }
      el.removeAttribute('class');
      el.removeAttribute('id');
      count++;
      return;
    }
    const cs = window.getComputedStyle(el);
    const buf = [];
    INLINE_PROPS.forEach(function (prop) {
      const val = cs.getPropertyValue(prop);
      if (!val) return;
      // 过滤默认值噪音
      if (val === '0px' && /margin|padding|border/.test(prop)) return;
      if (val === 'none' && prop === 'background-image') return;
      if (val === 'normal' && /letter-spacing|font-weight/.test(prop)) return;
      if (val === 'rgba(0, 0, 0, 0)' && prop === 'background-color') return;
      buf.push(prop + ':' + val);
    });
    el.setAttribute('style', buf.join(';'));
    el.removeAttribute('class');
    el.removeAttribute('id');
    count++;
  });
  return count;
}

/**
 * 一键把全文（含已插入模板）的样式内联，便于粘贴到微信公众号
 * @returns {void}
 */
function inlineAllStyles() {
  if (!editor || !editor.innerHTML.trim()) { showToast('⚠️ 编辑区暂无内容'); return; }
  const n = inlineComputedStyles(editor);
  // 清理遗留的作用域样式表
  $$('style[id^="tpl-scope-"]').forEach(function (s) { s.remove(); });
  updateArticleInfo();
  saveDraft();
  showToast('🧩 已内联 ' + n + ' 个元素的样式');
}

/**
 * 读取当前主题对象
 * @returns {Object} 主题对象
 */
function getCurrentTheme() { return getThemeById(currentThemeId); }

/**
 * 读取当前标题风格 ID
 * @returns {string} 风格 ID
 */
function getCurrentHeadingStyle() { return currentHeadingStyleId; }
