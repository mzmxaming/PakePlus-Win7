/* ==========================================================================
 * typeset.js —— 排版参数与样式扩展
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：对标 doocs/md 的「样式扩展」能力——字号/行高/字间距/段间距/首行缩进/
 *       主题色/标题样式/引用样式/代码主题/外链转脚注/去除超链接/脚注/自定义 CSS。
 * 依赖：utils.js / config.js / editor.js / theme.js / markdown.js
 * ========================================================================== */

/** 排版参数默认值 */
const TYPESET_DEFAULTS = {
  primary: '#07c160',
  fontFamily: "'PingFang SC','Microsoft YaHei',sans-serif",
  fontSize: 15,
  lineHeight: 1.8,
  letterSpacing: 0.5,
  paraSpacing: 16,
  indent: false,
  headingStyle: 'left-bar',
  quoteStyle: 'bar',
  codeTheme: 'light',
  linkFootnote: false,
  stripLinks: false,
  showFootnotes: true,
  customCss: ''
};

/** 代码高亮配色表 */
const CODE_THEMES = {
  light: { bg: '#f6f8fa', color: '#24292e', kw: '#d73a49', str: '#032f62', num: '#005cc5', com: '#6a737d', cls: '#6f42c1', var: '#e36209', border: '#e6e8eb' },
  dark: { bg: '#282c34', color: '#abb2bf', kw: '#c678dd', str: '#98c379', num: '#d19a66', com: '#5c6370', cls: '#e5c07b', var: '#e06c75', border: '#3a3f4b' },
  green: { bg: '#f3fbf6', color: '#2f4a3c', kw: '#067a4b', str: '#0a7d3f', num: '#1b6ca8', com: '#8aa79a', cls: '#7a4bbf', var: '#b45309', border: '#d9f0e4' },
  plain: { bg: '#f7f7f7', color: '#333333', kw: '#333333', str: '#333333', num: '#333333', com: '#999999', cls: '#333333', var: '#333333', border: '#e8e8e8' }
};

/**
 * 读取排版配置
 * @returns {Object} 合并默认值后的配置
 */
function getTypesetConfig() {
  try {
    const raw = localStorage.getItem('wxeditor_typeset');
    return Object.assign({}, TYPESET_DEFAULTS, raw ? JSON.parse(raw) : {});
  } catch (e) { return Object.assign({}, TYPESET_DEFAULTS); }
}

/**
 * 保存排版配置
 * @param {Object} cfg 配置片段
 * @returns {Object} 保存后的完整配置
 */
function saveTypesetConfig(cfg) {
  const merged = Object.assign({}, getTypesetConfig(), cfg || {});
  try { localStorage.setItem('wxeditor_typeset', JSON.stringify(merged)); } catch (e) { /* 忽略 */ }
  return merged;
}

/**
 * 从界面控件读取排版参数
 * @returns {Object} 排版参数对象
 */
function collectTypesetFromUI() {
  const val = function (id, def) { const el = document.getElementById(id); return el ? el.value : def; };
  const chk = function (id) { const el = document.getElementById(id); return el ? !!el.checked : false; };
  return {
    primary: val('tsPrimaryColor', TYPESET_DEFAULTS.primary),
    fontFamily: val('tsFontFamily', TYPESET_DEFAULTS.fontFamily),
    fontSize: parseFloat(val('tsFontSize', TYPESET_DEFAULTS.fontSize)) || 15,
    lineHeight: parseFloat(val('tsLineHeight', TYPESET_DEFAULTS.lineHeight)) || 1.8,
    letterSpacing: parseFloat(val('tsLetterSpacing', TYPESET_DEFAULTS.letterSpacing)) || 0,
    paraSpacing: parseFloat(val('tsParaSpacing', TYPESET_DEFAULTS.paraSpacing)) || 16,
    indent: chk('tsIndent'),
    headingStyle: val('tsHeadingStyle', TYPESET_DEFAULTS.headingStyle),
    quoteStyle: val('tsQuoteStyle', TYPESET_DEFAULTS.quoteStyle),
    codeTheme: val('tsCodeTheme', TYPESET_DEFAULTS.codeTheme),
    linkFootnote: chk('tsLinkFootnote'),
    stripLinks: chk('tsStripLinks'),
    showFootnotes: chk('tsShowFootnotes'),
    customCss: val('tsCustomCss', '')
  };
}

/**
 * 把配置回填到界面控件
 * @param {Object} [cfg] 配置对象，缺省读取本地配置
 * @returns {void}
 */
function fillTypesetUI(cfg) {
  const c = cfg || getTypesetConfig();
  const set = function (id, v) { const el = document.getElementById(id); if (el != null) el.value = v; };
  const chk = function (id, v) { const el = document.getElementById(id); if (el) el.checked = !!v; };
  set('tsPrimaryColor', c.primary);
  set('tsFontFamily', c.fontFamily);
  set('tsFontSize', c.fontSize);
  set('tsLineHeight', c.lineHeight);
  set('tsLetterSpacing', c.letterSpacing);
  set('tsParaSpacing', c.paraSpacing);
  chk('tsIndent', c.indent);
  set('tsHeadingStyle', c.headingStyle);
  set('tsQuoteStyle', c.quoteStyle);
  set('tsCodeTheme', c.codeTheme);
  chk('tsLinkFootnote', c.linkFootnote);
  chk('tsStripLinks', c.stripLinks);
  chk('tsShowFootnotes', c.showFootnotes);
  set('tsCustomCss', c.customCss || '');
}

/**
 * 依据主色构造一个临时主题对象（复用 theme.js 的标题装饰能力）
 * @param {string} primary 主色
 * @returns {Object} 主题对象
 */
function buildThemeFromPrimary(primary) {
  const hsl = hexToHsl(primary);
  return {
    id: 'typeset', name: '排版主题',
    primary: primary,
    secondary: hslToHex(hsl.h, Math.min(100, hsl.s + 5), Math.max(20, hsl.l - 8)),
    text: '#3e3e3e', textLight: '#888888',
    quoteBg: hslToHex(hsl.h, Math.max(8, Math.min(60, hsl.s * 0.25)), 97),
    quoteBorder: primary,
    hrColor: hslToHex(hsl.h, 30, 90),
    headingColor: '#1a1a1a'
  };
}

/**
 * 应用「引用块」样式
 * @param {HTMLElement} q 引用块元素
 * @param {Object} theme 主题
 * @param {string} style 样式：bar/card/quote
 * @returns {void}
 */
function applyQuoteStyle(q, theme, style) {
  q.style.cssText = '';
  if (style === 'card') {
    q.style.background = theme.quoteBg;
    q.style.borderLeft = 'none';
    q.style.borderRadius = '8px';
    q.style.padding = '14px 18px';
    q.style.color = '#5a5a5a';
  } else if (style === 'quote') {
    q.style.borderLeft = 'none';
    q.style.background = 'transparent';
    q.style.padding = '6px 0 6px 34px';
    q.style.position = 'relative';
    q.style.color = '#6b6b6b';
  } else {
    q.style.borderLeft = '3px solid ' + theme.quoteBorder;
    q.style.background = theme.quoteBg;
    q.style.borderRadius = '4px';
    q.style.padding = '12px 16px';
    q.style.color = '#6b6b6b';
  }
  q.style.fontSize = '14px';
  q.style.lineHeight = '1.8';
  q.style.margin = '16px 0';
}

/**
 * 为代码块应用主题配色（含高亮 token 颜色）
 * @param {HTMLElement} root 处理根节点
 * @param {string} themeName 代码主题名
 * @returns {void}
 */
function applyCodeTheme(root, themeName) {
  const t = CODE_THEMES[themeName] || CODE_THEMES.light;
  root.querySelectorAll('pre, .md-code').forEach(function (pre) {
    pre.style.background = t.bg;
    pre.style.color = t.color;
    pre.style.border = '1px solid ' + t.border;
    pre.style.borderRadius = '6px';
    pre.style.padding = '14px 16px';
    pre.style.margin = '16px 0';
    pre.style.fontSize = '13px';
    pre.style.lineHeight = '1.7';
    pre.style.overflowX = 'auto';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordBreak = 'break-all';
    pre.style.fontFamily = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";
    const code = pre.querySelector('code');
    if (code) {
      code.style.background = 'transparent';
      code.style.color = t.color;
      code.style.fontFamily = 'inherit';
      code.style.fontSize = 'inherit';
    }
  });
  const map = { 'tok-kw': t.kw, 'tok-str': t.str, 'tok-num': t.num, 'tok-com': t.com, 'tok-cls': t.cls, 'tok-var': t.var };
  Object.keys(map).forEach(function (cls) {
    root.querySelectorAll('.' + cls).forEach(function (el) {
      el.style.color = map[cls];
      if (cls === 'tok-com') el.style.fontStyle = 'italic';
      el.removeAttribute('class');
    });
  });
  root.querySelectorAll('.md-inline-code').forEach(function (el) {
    el.style.background = t.bg;
    el.style.color = t.color;
    el.style.padding = '2px 6px';
    el.style.borderRadius = '3px';
    el.style.fontSize = '90%';
    el.style.fontFamily = "'SFMono-Regular',Consolas,Menlo,monospace";
  });
}

/**
 * 去除正文中的超链接（保留文字）
 * @param {HTMLElement} root 处理根节点
 * @returns {number} 处理数量
 */
function stripLinksIn(root) {
  const links = Array.from(root.querySelectorAll('a'));
  links.forEach(function (a) {
    const span = document.createElement('span');
    span.innerHTML = a.innerHTML;
    span.style.color = 'inherit';
    span.style.textDecoration = 'none';
    if (a.parentNode) a.parentNode.replaceChild(span, a);
  });
  return links.length;
}

/**
 * 将正文中的超链接转换为文末脚注
 * @param {HTMLElement} root 处理根节点
 * @returns {number} 转换数量
 */
function linksToFootnotes(root) {
  const links = Array.from(root.querySelectorAll('a'));
  if (!links.length) return 0;
  const oldSection = root.querySelector('.md-footnotes.md-auto-footnotes');
  if (oldSection) oldSection.remove();

  const items = [];
  links.forEach(function (a) {
    const url = a.getAttribute('href') || '';
    if (!url || url.charAt(0) === '#') return;
    const text = (a.textContent || '').trim();
    const idx = items.length + 1;
    items.push({ idx: idx, url: url, text: text });
    const sup = document.createElement('sup');
    sup.className = 'md-fn-ref';
    sup.setAttribute('data-fn', String(idx));
    sup.style.color = '#576b95';
    sup.style.fontSize = '12px';
    sup.textContent = '[' + idx + ']';
    a.parentNode.replaceChild(sup, a);
  });
  if (!items.length) return 0;

  const section = document.createElement('section');
  section.className = 'md-footnotes md-auto-footnotes';
  section.style.borderTop = '1px solid #eaeaea';
  section.style.marginTop = '24px';
  section.style.paddingTop = '12px';
  section.innerHTML = '<p style="font-size:13px;color:#999;margin:0 0 8px">参考</p>' +
    '<ol style="padding-left:20px;margin:0">' + items.map(function (it) {
      return '<li style="font-size:13px;color:#888;line-height:1.9;word-break:break-all">' +
        (it.text ? escapeHtml(it.text) + '：' : '') + escapeHtml(it.url) + '</li>';
    }).join('') + '</ol>';
  root.appendChild(section);
  return items.length;
}

/**
 * 应用自定义 CSS（注入到页面 head，作用于编辑区）
 * @param {string} css 自定义 CSS 文本
 * @returns {void}
 */
function applyCustomCss(css) {
  let el = document.getElementById('typeset-custom-css');
  if (!el) {
    el = document.createElement('style');
    el.id = 'typeset-custom-css';
    document.head.appendChild(el);
  }
  el.textContent = css || '';
}

/**
 * 执行排版：把参数应用到编辑区全文（输出行内样式，兼容微信）
 * @param {Object} [opts] 可选项 { silent: 是否静默（不弹提示） }
 * @returns {Object} 统计结果
 */
function applyTypeset(opts) {
  opts = opts || {};
  if (!editor || !editor.innerHTML.trim()) {
    if (!opts.silent) showToast('⚠️ 编辑区暂无内容');
    return { ok: false };
  }
  const cfg = collectTypesetFromUI();
  saveTypesetConfig(cfg);
  const theme = buildThemeFromPrimary(cfg.primary);

  // 1) 链接处理（先去链接，再转脚注，二者互斥）
  let linkCount = 0;
  if (cfg.stripLinks) linkCount = stripLinksIn(editor);
  else if (cfg.linkFootnote) linkCount = linksToFootnotes(editor);
  else {
    editor.querySelectorAll('a').forEach(function (a) {
      a.style.color = '#576b95';
      a.style.textDecoration = 'none';
      a.style.borderBottom = 'none';
    });
  }

  // 2) 标题
  editor.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(function (h) {
    decorateHeading(h, theme, cfg.headingStyle);
  });

  // 3) 段落与列表
  editor.querySelectorAll('p').forEach(function (p) {
    if (p.closest('blockquote')) return;
    if (p.classList.contains('md-footnotes-title')) return;
    p.style.fontSize = cfg.fontSize + 'px';
    p.style.color = '#3e3e3e';
    p.style.lineHeight = String(cfg.lineHeight);
    p.style.letterSpacing = cfg.letterSpacing + 'px';
    p.style.margin = '0 0 ' + cfg.paraSpacing + 'px';
    p.style.textAlign = 'justify';
    p.style.textIndent = cfg.indent ? '2em' : '';
    p.style.wordBreak = 'break-word';
  });
  editor.querySelectorAll('li').forEach(function (li) {
    li.style.fontSize = cfg.fontSize + 'px';
    li.style.color = '#3e3e3e';
    li.style.lineHeight = String(cfg.lineHeight + 0.1);
    li.style.letterSpacing = cfg.letterSpacing + 'px';
    li.style.margin = '6px 0';
  });
  editor.querySelectorAll('ul,ol').forEach(function (list) {
    list.style.paddingLeft = '24px';
    list.style.margin = '12px 0 ' + cfg.paraSpacing + 'px';
  });
  // 任务列表方框
  editor.querySelectorAll('.md-task-box').forEach(function (box) {
    box.style.marginRight = '6px';
    box.style.color = theme.primary;
    box.style.fontWeight = '700';
    box.removeAttribute('class');
  });

  // 4) 引用与警告块
  editor.querySelectorAll('blockquote').forEach(function (q) {
    applyQuoteStyle(q, theme, cfg.quoteStyle);
    if (q.classList.contains('md-admonition')) {
      const type = (q.className.match(/md-adm-(\w+)/) || [])[1] || 'note';
      const colors = {
        note: '#0969da', tip: '#1a7f37', important: '#8250df', warning: '#9a6700', caution: '#cf222e'
      };
      const c = colors[type] || colors.note;
      q.style.background = 'rgba(0,0,0,0.02)';
      q.style.borderLeft = '4px solid ' + c;
      q.style.borderRadius = '6px';
      q.style.padding = '12px 16px';
      const title = q.querySelector('.md-adm-title');
      if (title) {
        title.style.color = c;
        title.style.fontWeight = '700';
        title.style.fontSize = '14px';
        title.style.margin = '0 0 6px';
      }
      const body = q.querySelector('.md-adm-body');
      if (body) { body.style.margin = '0'; body.style.fontSize = cfg.fontSize + 'px'; body.style.color = '#5a5a5a'; }
      q.removeAttribute('class');
    }
  });

  // 5) 代码块
  applyCodeTheme(editor, cfg.codeTheme);

  // 6) 表格
  editor.querySelectorAll('table').forEach(function (tb) {
    tb.style.borderCollapse = 'collapse';
    tb.style.width = '100%';
    tb.style.margin = '16px 0';
    tb.style.fontSize = (cfg.fontSize - 1) + 'px';
  });
  editor.querySelectorAll('th').forEach(function (th) {
    th.style.border = '1px solid ' + theme.hrColor;
    th.style.background = theme.quoteBg;
    th.style.padding = '8px 12px';
    th.style.fontWeight = '700';
    th.style.color = theme.headingColor;
  });
  editor.querySelectorAll('td').forEach(function (td) {
    td.style.border = '1px solid ' + theme.hrColor;
    td.style.padding = '8px 12px';
    td.style.color = '#3e3e3e';
  });

  // 7) 其它元素
  editor.querySelectorAll('img').forEach(function (img) {
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '16px auto';
    img.style.borderRadius = '6px';
  });
  editor.querySelectorAll('hr').forEach(function (hr) {
    hr.style.border = 'none';
    hr.style.height = '1px';
    hr.style.background = theme.hrColor;
    hr.style.margin = '24px 0';
  });
  editor.querySelectorAll('strong,b').forEach(function (b) { b.style.color = theme.primary; });
  editor.querySelectorAll('mark,.md-mark').forEach(function (mk) {
    mk.style.background = theme.quoteBg;
    mk.style.color = theme.primary;
    mk.style.padding = '1px 4px';
    mk.style.borderRadius = '3px';
  });
  editor.querySelectorAll('ruby rt').forEach(function (rt) {
    rt.style.fontSize = '0.6em';
    rt.style.color = theme.quoteBorder;
  });

  // 8) 脚注区
  editor.querySelectorAll('.md-footnotes').forEach(function (sec) {
    sec.style.display = cfg.showFootnotes ? 'block' : 'none';
  });

  // 9) 自定义 CSS
  applyCustomCss(cfg.customCss);

  // 10) 根节点字体
  editor.style.fontFamily = cfg.fontFamily;
  editor.style.fontSize = cfg.fontSize + 'px';
  editor.style.lineHeight = String(cfg.lineHeight);
  editor.style.color = '#3e3e3e';

  updateArticleInfo();
  saveDraft();
  if (!opts.silent) {
    showToast('✅ 排版已应用' + (linkCount ? '（处理 ' + linkCount + ' 个链接）' : ''));
  }
  return { ok: true, links: linkCount, config: cfg };
}

/**
 * 重置排版参数为默认值
 * @returns {void}
 */
function resetTypeset() {
  fillTypesetUI(Object.assign({}, TYPESET_DEFAULTS));
  saveTypesetConfig(TYPESET_DEFAULTS);
  applyCustomCss('');
  showToast('↺ 排版参数已重置（需重新点「应用排版」）');
}

/* ============================================================
 * KaTeX / Mermaid 可选增强（内置离线包，vendor 目录；缺失时回退 CDN）
 * ============================================================ */

/** 已加载的 CDN 资源缓存 */
var _cdnLoaded = {};

/** KaTeX 本地离线资源（优先） */
const LOCAL_KATEX_CSS = 'vendor/katex/katex.min.css';
/** KaTeX 本地脚本 */
const LOCAL_KATEX_JS = 'vendor/katex/katex.min.js';
/** Mermaid 本地脚本 */
const LOCAL_MERMAID_JS = 'vendor/mermaid/mermaid.min.js';

/**
 * 懒加载外部脚本（带备用 CDN）
 * @param {string[]} urls 候选脚本地址
 * @returns {Promise<void>} 加载完成
 */
function loadScriptOnce(urls) {
  const key = urls[0];
  if (_cdnLoaded[key]) return _cdnLoaded[key];
  _cdnLoaded[key] = new Promise(function (resolve, reject) {
    let idx = 0;
    const tryNext = function () {
      if (idx >= urls.length) { reject(new Error('CDN 加载失败')); return; }
      const s = document.createElement('script');
      s.src = urls[idx++];
      s.onload = function () { resolve(); };
      s.onerror = function () { s.remove(); tryNext(); };
      document.head.appendChild(s);
    };
    tryNext();
  });
  return _cdnLoaded[key];
}

/**
 * 懒加载外部样式
 * @param {string[]} urls 候选样式地址
 * @returns {Promise<void>} 加载完成
 */
function loadStyleOnce(urls) {
  const key = 'css:' + urls[0];
  if (_cdnLoaded[key]) return _cdnLoaded[key];
  _cdnLoaded[key] = new Promise(function (resolve, reject) {
    let idx = 0;
    const tryNext = function () {
      if (idx >= urls.length) { reject(new Error('CDN 加载失败')); return; }
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = urls[idx++];
      l.onload = function () { resolve(); };
      l.onerror = function () { l.remove(); tryNext(); };
      document.head.appendChild(l);
    };
    tryNext();
  });
  return _cdnLoaded[key];
}

/**
 * 渲染所有公式占位（KaTeX）
 * @param {HTMLElement} [root] 根节点
 * @returns {Promise<{ok:boolean,count:number}>} 渲染结果
 */
async function renderMath(root) {
  root = root || editor;
  const nodes = root.querySelectorAll('.md-math-inline, .md-math-block');
  if (!nodes.length) return { ok: true, count: 0 };
  try {
    await loadStyleOnce([
      LOCAL_KATEX_CSS,
      'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
      'https://unpkg.com/katex@0.16.9/dist/katex.min.css'
    ]);
    await loadScriptOnce([
      LOCAL_KATEX_JS,
      'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
      'https://unpkg.com/katex@0.16.9/dist/katex.min.js'
    ]);
  } catch (e) {
    showToast('⚠️ 公式组件加载失败，已保留公式原文');
    return { ok: false, count: nodes.length };
  }
  let ok = 0;
  nodes.forEach(function (n) {
    if (n.getAttribute('data-rendered') === '1') return;
    const tex = n.getAttribute('data-tex') || n.textContent || '';
    try {
      katex.render(tex, n, { throwOnError: false, displayMode: n.classList.contains('md-math-block') });
      n.setAttribute('data-rendered', '1');
      if (n.classList.contains('md-math-block')) n.style.textAlign = 'center';
      ok++;
    } catch (err) { /* 保留原文 */ }
  });
  return { ok: true, count: ok };
}

/**
 * 渲染所有 Mermaid 图表占位
 * @param {HTMLElement} [root] 根节点
 * @returns {Promise<{ok:boolean,count:number}>} 渲染结果
 */
async function renderMermaid(root) {
  root = root || editor;
  const nodes = root.querySelectorAll('.md-mermaid');
  if (!nodes.length) return { ok: true, count: 0 };
  try {
    await loadScriptOnce([
      LOCAL_MERMAID_JS,
      'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js',
      'https://unpkg.com/mermaid@10.9.1/dist/mermaid.min.js'
    ]);
  } catch (e) {
    showToast('⚠️ 图表组件加载失败，已保留代码原文');
    return { ok: false, count: nodes.length };
  }
  try {
    if (window.mermaid && mermaid.initialize) mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  } catch (e) { /* 忽略 */ }
  let ok = 0;
  const list = Array.from(nodes);
  for (let i = 0; i < list.length; i++) {
    const n = list[i];
    if (n.getAttribute('data-rendered') === '1') continue;
    const code = n.getAttribute('data-code') || '';
    try {
      const id = 'mmd-' + Date.now().toString(36) + '-' + i;
      const res = await mermaid.render(id, code);
      n.innerHTML = res.svg;
      n.setAttribute('data-rendered', '1');
      n.style.textAlign = 'center';
      const svg = n.querySelector('svg');
      if (svg) { svg.style.maxWidth = '100%'; svg.style.height = 'auto'; }
      ok++;
    } catch (err) { /* 保留原文 */ }
  }
  return { ok: true, count: ok };
}

/**
 * 依据排版参数生成作用于 Markdown 预览区的 CSS 文本
 * @param {Object} cfg 排版参数
 * @returns {string} CSS 文本
 */
function buildPreviewCss(cfg) {
  const theme = buildThemeFromPrimary(cfg.primary);
  const t = CODE_THEMES[cfg.codeTheme] || CODE_THEMES.light;
  const indentCss = cfg.indent ? 'text-indent:2em;' : '';
  const sel = '.md-preview';

  // 标题装饰
  let headingCss = '';
  if (cfg.headingStyle === 'left-bar') headingCss = 'border-left:4px solid ' + theme.primary + ';padding-left:10px;';
  else if (cfg.headingStyle === 'underline') headingCss = 'display:inline-block;border-bottom:3px solid ' + theme.primary + ';padding-bottom:5px;';
  else if (cfg.headingStyle === 'pill') headingCss = 'display:inline-block;background:' + theme.primary + ';color:#fff;border-radius:22px;padding:6px 16px;';
  else if (cfg.headingStyle === 'card') headingCss = 'background:' + theme.quoteBg + ';border-left:4px solid ' + theme.primary + ';border-radius:6px;padding:10px 14px;';
  else if (cfg.headingStyle === 'gradient') headingCss = 'background:linear-gradient(90deg,' + theme.primary + ', ' + theme.secondary + ');color:#fff;border-radius:6px;padding:8px 14px;letter-spacing:1px;';
  else headingCss = 'color:' + theme.primary + ';';

  // 引用样式
  let quoteCss = '';
  if (cfg.quoteStyle === 'card') quoteCss = 'background:' + theme.quoteBg + ';border-radius:8px;padding:14px 18px;color:#5a5a5a;';
  else if (cfg.quoteStyle === 'quote') quoteCss = 'padding:6px 0 6px 34px;color:#6b6b6b;';
  else quoteCss = 'border-left:3px solid ' + theme.quoteBorder + ';background:' + theme.quoteBg + ';border-radius:4px;padding:12px 16px;color:#6b6b6b;';

  return [
    sel + '{font-family:' + cfg.fontFamily + ';font-size:' + cfg.fontSize + 'px;line-height:' + cfg.lineHeight + ';color:#3e3e3e;padding:24px 24px 40px;background:#fff;}',
    sel + ' h1,' + sel + ' h2,' + sel + ' h3,' + sel + ' h4{' + headingCss + 'color:' + theme.headingColor + ';font-weight:700;line-height:1.5;margin:24px 0 14px;}',
    sel + ' h1{font-size:' + (cfg.fontSize + 7) + 'px;}',
    sel + ' h2{font-size:' + (cfg.fontSize + 4) + 'px;}',
    sel + ' h3{font-size:' + (cfg.fontSize + 2) + 'px;}',
    sel + ' p{font-size:' + cfg.fontSize + 'px;line-height:' + cfg.lineHeight + ';letter-spacing:' + cfg.letterSpacing + 'px;margin:0 0 ' + cfg.paraSpacing + 'px;text-align:justify;' + indentCss + 'color:#3e3e3e;}',
    sel + ' ul,' + sel + ' ol{padding-left:24px;margin:12px 0 ' + cfg.paraSpacing + 'px;}',
    sel + ' li{font-size:' + cfg.fontSize + 'px;line-height:' + (cfg.lineHeight + 0.1) + ';margin:6px 0;letter-spacing:' + cfg.letterSpacing + 'px;}',
    sel + ' blockquote{' + quoteCss + 'font-size:14px;line-height:1.8;margin:16px 0;}',
    sel + ' blockquote p{margin:0;font-size:14px;line-height:1.8;}',
    sel + ' pre{background:' + t.bg + ';color:' + t.color + ';border:1px solid ' + t.border + ';border-radius:6px;padding:14px 16px;margin:16px 0;overflow-x:auto;white-space:pre-wrap;word-break:break-all;font-family:SFMono-Regular,Consolas,Menlo,monospace;font-size:13px;line-height:1.7;}',
    sel + ' pre code{background:transparent;color:' + t.color + ';font-size:inherit;}',
    sel + ' .md-inline-code{background:' + t.bg + ';color:' + t.color + ';padding:2px 6px;border-radius:3px;font-size:90%;font-family:SFMono-Regular,Consolas,Menlo,monospace;}',
    sel + ' .tok-kw{color:' + t.kw + ';}',
    sel + ' .tok-str{color:' + t.str + ';}',
    sel + ' .tok-num{color:' + t.num + ';}',
    sel + ' .tok-com{color:' + t.com + ';font-style:italic;}',
    sel + ' .tok-cls{color:' + t.cls + ';}',
    sel + ' .tok-var{color:' + t.var + ';}',
    sel + ' table{border-collapse:collapse;width:100%;margin:16px 0;font-size:' + (cfg.fontSize - 1) + 'px;}',
    sel + ' th{border:1px solid ' + theme.hrColor + ';background:' + theme.quoteBg + ';padding:8px 12px;font-weight:700;color:' + theme.headingColor + ';}',
    sel + ' td{border:1px solid ' + theme.hrColor + ';padding:8px 12px;color:#3e3e3e;}',
    sel + ' a{color:#576b95;text-decoration:none;}',
    sel + ' strong,' + sel + ' b{color:' + theme.primary + ';}',
    sel + ' mark{background:' + theme.quoteBg + ';color:' + theme.primary + ';padding:1px 4px;border-radius:3px;}',
    sel + ' hr{border:none;height:1px;background:' + theme.hrColor + ';margin:24px 0;}',
    sel + ' img{max-width:100%;height:auto;display:block;margin:16px auto;border-radius:6px;}',
    sel + ' ruby rt{font-size:0.6em;color:' + theme.quoteBorder + ';}',
    sel + ' .md-task-box{color:' + theme.primary + ';font-weight:700;margin-right:6px;}',
    sel + ' .md-footnotes{border-top:1px solid #eaeaea;margin-top:24px;padding-top:12px;}',
    sel + ' .md-footnotes-title{font-size:13px;color:#999;margin:0 0 8px;}',
    sel + ' .md-footnotes li{font-size:13px;color:#888;line-height:1.9;word-break:break-all;}',
    sel + ' .md-adm-title{font-weight:700;font-size:14px;margin:0 0 6px;}',
    cfg.customCss ? cfg.customCss.replace(/(^|\})\s*([^@}][^{]*)\{/g, function (m, br, s) { return br + ' ' + sel + ' ' + s.trim() + '{'; }) : ''
  ].join('\n');
}

/**
 * 将预览 CSS 注入页面
 * @param {Object} cfg 排版参数
 * @returns {void}
 */
function applyPreviewCss(cfg) {
  let el = document.getElementById('md-preview-css');
  if (!el) {
    el = document.createElement('style');
    el.id = 'md-preview-css';
    document.head.appendChild(el);
  }
  el.textContent = buildPreviewCss(cfg || collectTypesetFromUI());
}

/* 便于 Node 单测 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildPreviewCss: buildPreviewCss };
}

/**
 * 一键渲染公式与图表（可选增强）
 * @returns {Promise<void>} 渲染完成
 */
async function renderMathAndMermaid() {
  if (!editor) return;
  showToast('⏳ 正在渲染公式与图表...');
  const math = await renderMath(editor);
  const mermaidRes = await renderMermaid(editor);
  updateArticleInfo();
  saveDraft();
  if (math.ok && mermaidRes.ok) {
    showToast('✅ 渲染完成：公式 ' + math.count + ' 个，图表 ' + mermaidRes.count + ' 个');
  }
}
