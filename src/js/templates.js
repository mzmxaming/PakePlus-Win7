/* ==========================================================================
 * templates.js —— 模板模块
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：内置样式/整篇模板、结构化区块、我的模板（导入/缓存/插入/删除）。
 * ========================================================================== */

/* ============================================================
 * 一、内置模板
 * ============================================================ */

/**
 * 插入基础样式块
 * @param {string} type 类型：h1/h2/h3/para/quote
 * @param {string} text 占位文字
 * @returns {void}
 */
function insertTemplate(type, text) {
  let html = '';
  switch (type) {
    case 'h1': html = '<h1>' + text + '</h1><p>&nbsp;</p>'; break;
    case 'h2': html = '<h2>' + text + '</h2><p>&nbsp;</p>'; break;
    case 'h3': html = '<h3>' + text + '</h3><p>&nbsp;</p>'; break;
    case 'para': html = '<p style="font-size:15px;color:#3e3e3e;line-height:1.8">' + text + '</p>'; break;
    case 'quote': html = '<blockquote>' + text + '</blockquote><p>&nbsp;</p>'; break;
  }
  insertHtmlAtEnd(html);
}

/**
 * 插入整篇模板骨架
 * @param {string} type 类型：news/holiday/product/knowledge
 * @returns {void}
 */
function insertFullTemplate(type) {
  let html = '';
  switch (type) {
    case 'news':
      html = '<h2 style="text-align:center">📰 标题在这里</h2>' +
        '<p style="text-align:center;color:#999;font-size:13px">' + APP_INFO.author + ' · ' + new Date().toLocaleDateString() + '</p>' +
        '<hr>' +
        '<p>正文内容从这里开始，编辑你的文章内容。选择文字后可使用上方工具栏调整样式。</p>' +
        '<p>文章的第二段内容，继续编辑你的文字。</p>' +
        '<hr>' +
        '<p style="text-align:center;color:#999;font-size:13px">👇 关注「' + APP_INFO.wechat + '」，获取更多精彩内容</p>';
      break;
    case 'holiday':
      html = '<h1 style="text-align:center;color:#e64340">🎉 节日快乐！</h1>' +
        '<p style="text-align:center;font-size:18px;color:#f0883a">愿你每一天都充满阳光与温暖</p>' +
        '<hr>' +
        '<blockquote>在这个特别的日子里，送上我最真挚的祝福。愿你事业顺利，家庭美满，身体健康，万事如意！</blockquote>' +
        '<p style="text-align:right;color:#888">—— 来自 ' + APP_INFO.wechat + '</p>';
      break;
    case 'product':
      html = '<h2 style="text-align:center">🛒 产品名称</h2>' +
        '<p style="text-align:center;color:#666">一句话卖点描述</p>' +
        '<hr>' +
        '<p><b>✨ 核心亮点：</b></p>' +
        '<ul><li>亮点一：功能描述</li><li>亮点二：优势说明</li><li>亮点三：用户价值</li></ul>' +
        '<hr>' +
        '<p style="text-align:center"><b>限时优惠 ¥99</b></p>' +
        '<p style="text-align:center;color:#07c160">👇 点击下方立即购买</p>';
      break;
    case 'knowledge':
      html = '<h2>📚 文章主题</h2>' +
        '<p>开篇引入，简述这篇文章要解决的问题和读者的收获。</p>' +
        '<h3>一、核心概念</h3>' +
        '<p>详细解释核心概念，用通俗易懂的语言让读者理解。</p>' +
        '<h3>二、实操步骤</h3>' +
        '<ol><li>第一步：准备工作</li><li>第二步：关键操作</li><li>第三步：验证结果</li></ol>' +
        '<h3>三、总结</h3>' +
        '<blockquote>核心要点回顾，一句话总结最重要的收获。</blockquote>';
      break;
  }
  insertHtmlAtEnd(html);
  showToast('模板已插入 ✅');
}

/**
 * 插入结构化区块（卡片 / 步骤 / 引导关注）
 * @param {string} kind 区块类型：card/steps/cta
 * @returns {void}
 */
function insertBlock(kind) {
  let html = '';
  if (kind === 'card') {
    html = '<section style="background:#f0fdf4;border:1px solid #ccf0dc;border-radius:8px;padding:14px 16px;margin:16px 0">' +
      '<p style="margin:0 0 6px;font-weight:700;color:#07c160">💡 提示标题</p>' +
      '<p style="margin:0;font-size:14px;color:#3e3e3e;line-height:1.8">这里填写提示或重点内容，可用于强调关键信息。</p>' +
      '</section>';
  } else if (kind === 'steps') {
    html = '<ol style="padding-left:22px;margin:12px 0;line-height:2">' +
      '<li><b>第一步：</b>准备工作</li>' +
      '<li><b>第二步：</b>关键操作</li>' +
      '<li><b>第三步：</b>验证结果</li></ol>';
  } else if (kind === 'cta') {
    html = '<hr>' +
      '<p style="text-align:center;font-size:15px;color:#07c160;font-weight:600;margin:12px 0">👇 关注「' + APP_INFO.wechat + '」，阅读更多精彩内容</p>' +
      '<p style="text-align:center;font-size:13px;color:#999">点个「在看」，分享给身边的朋友</p>';
  }
  insertHtmlAtEnd(html);
  showToast('区块已插入 ✅');
}

/* ============================================================
 * 二、我的模板：存储
 * ============================================================ */

/**
 * 读取「我的模板」
 * @returns {Object[]} 模板数组
 */
function getMyTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.myTemplates);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

/**
 * 保存「我的模板」
 * @param {Object[]} templates 模板数组
 * @returns {void}
 */
function saveMyTemplates(templates) {
  try {
    localStorage.setItem(STORAGE_KEYS.myTemplates, JSON.stringify(templates));
  } catch (e) {
    showToast('⚠️ 存储空间不足，请清理旧模板');
  }
}

/**
 * 添加一个模板到「我的模板」
 * @param {string} name 模板名称
 * @param {string} htmlContent 原始 HTML（网页源码或片段）
 * @returns {void}
 */
function addMyTemplate(name, htmlContent) {
  const templates = getMyTemplates();
  const inputEl = document.getElementById('templateUrlInput');
  const inputVal = inputEl ? inputEl.value.trim() : '';

  // 推断来源地址，用于把相对图片路径转绝对路径
  let baseUrl = '';
  if (/^\d+$/.test(inputVal)) baseUrl = 'https://www.135editor.com/editor_styles/' + inputVal + '.html';
  else if (inputVal.indexOf('http') === 0) baseUrl = inputVal;
  else if (inputVal.indexOf('editor_styles') !== -1) baseUrl = 'https://www.135editor.com/' + inputVal.replace(/^\//, '');

  const styles = extractStyles(htmlContent);
  const bodyContent = extractBodyContent(htmlContent, baseUrl);

  templates.push({
    id: uid('tpl'),
    name: name || ('模板 ' + (templates.length + 1)),
    html: bodyContent,
    styles: styles,
    sourceUrl: baseUrl || inputVal,
    createdAt: new Date().toISOString()
  });
  saveMyTemplates(templates);
  renderMyTemplates();
  if (inputEl) inputEl.value = '';
  if (typeof refreshLearnTemplateSelect === 'function') refreshLearnTemplateSelect();
  showToast('✅ 模板已缓存到本地');
}

/**
 * 删除指定模板
 * @param {string} id 模板 ID
 * @returns {void}
 */
function deleteMyTemplate(id) {
  saveMyTemplates(getMyTemplates().filter(function (t) { return t.id !== id; }));
  renderMyTemplates();
  if (typeof refreshLearnTemplateSelect === 'function') refreshLearnTemplateSelect();
  showToast('🗑️ 模板已删除');
}

/**
 * 清空全部模板
 * @returns {void}
 */
function clearAllMyTemplates() {
  if (getMyTemplates().length === 0) { showToast('没有可清空的模板'); return; }
  confirmDialog('确定要删除所有自定义模板吗？<br>此操作不可撤销。', function () {
    saveMyTemplates([]);
    renderMyTemplates();
    if (typeof refreshLearnTemplateSelect === 'function') refreshLearnTemplateSelect();
    showToast('🗑️ 全部模板已清空');
  });
}

/**
 * 渲染「我的模板」列表
 * @returns {void}
 */
function renderMyTemplates() {
  const templates = getMyTemplates();
  const container = document.getElementById('myTemplateList');
  const countEl = document.getElementById('myTemplateCount');
  if (countEl) countEl.textContent = templates.length + '个';
  if (!container) return;

  if (templates.length === 0) {
    container.innerHTML = '<div class="empty-tip">暂无模板<br>导入后这里显示</div>';
    return;
  }
  container.innerHTML = templates.map(function (t) {
    const preview = (t.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || '(空模板)';
    return '<div class="template-card">' +
      '<div class="template-preview" style="max-height:50px;overflow:hidden;font-size:10px;text-align:left">' + escapeHtml(preview) + '</div>' +
      '<div class="template-name" style="display:flex;justify-content:space-between;align-items:center">' +
        '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(t.name) + '">📌 ' + escapeHtml(t.name) + '</span>' +
        '<span style="display:flex;gap:2px;flex-shrink:0">' +
          '<button class="tool-btn" style="width:22px;height:22px;font-size:10px" title="插入" onclick="event.stopPropagation();useMyTemplate(\'' + t.id + '\')">＋</button>' +
          '<button class="tool-btn" style="width:22px;height:22px;font-size:10px;color:#e64340" title="删除" onclick="event.stopPropagation();deleteMyTemplate(\'' + t.id + '\')">×</button>' +
        '</span>' +
      '</div>' +
      (t.sourceUrl ? '<div style="font-size:9px;color:#bbb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px">来源: ' + escapeHtml(t.sourceUrl) + '</div>' : '') +
    '</div>';
  }).join('');
}

/* ============================================================
 * 三、我的模板：插入
 * ============================================================ */

/**
 * 将「我的模板」插入编辑区（自动作用域化其样式）
 * @param {string} id 模板 ID
 * @returns {void}
 */
function useMyTemplate(id) {
  const tpl = getMyTemplates().find(function (t) { return t.id === id; });
  if (!tpl) { showToast('❌ 模板未找到'); return; }

  let contentHtml = (tpl.html || '').trim();
  if (!contentHtml || contentHtml.length < 20 || contentHtml.indexOf('未能提取到有效内容') === 0) {
    showToast('⚠️ 模板内容为空，请重新导入');
    return;
  }
  if (tpl.sourceUrl) contentHtml = resolveRelativeUrls(contentHtml, tpl.sourceUrl);

  const scopeClass = 'tpl-scope-' + Date.now().toString(36);
  if (tpl.styles && tpl.styles.trim()) {
    const styleEl = document.createElement('style');
    styleEl.id = scopeClass;
    let cssText = tpl.styles;
    if (tpl.sourceUrl) {
      cssText = cssText.replace(/url\(\s*["']?(?!data:|https?:|blob:)([^"')]+)["']?\s*\)/gi, function (m, path) {
        try { return 'url("' + new URL(path.trim(), tpl.sourceUrl).href + '")'; } catch (e) { return m; }
      });
    }
    styleEl.textContent = scopeCss(cssText, scopeClass);
    document.head.appendChild(styleEl);
  }

  const wrapped = '<div class="' + scopeClass + '" style="max-width:100%;width:100%;box-sizing:border-box;overflow:hidden;word-wrap:break-word">' + contentHtml + '</div>';
  insertHtmlAtEnd(wrapped);
  showToast('✅ 模板已插入');
}

/**
 * 为 CSS 增加作用域前缀，避免与页面样式冲突
 * @param {string} cssText 原始 CSS
 * @param {string} scopeClass 作用域类名
 * @returns {string} 作用域化后的 CSS
 */
function scopeCss(cssText, scopeClass) {
  // 逐条规则处理，跳过 @media / @keyframes 等复杂块，保持原样
  const blocks = cssText.split('}');
  return blocks.map(function (rule) {
    rule = rule.trim();
    if (!rule) return '';
    if (rule.charAt(0) === '@' || rule.indexOf('{') === -1) return rule + (rule ? '}' : '');
    const idx = rule.indexOf('{');
    const selectors = rule.slice(0, idx).trim();
    const body = rule.slice(idx + 1).trim();
    if (!selectors) return '';
    const scoped = selectors.split(',').map(function (s) {
      s = s.trim();
      if (!s) return '';
      if (s === 'html' || s === 'body' || s === ':root') return s === ':root' ? '.' + scopeClass : s;
      return '.' + scopeClass + ' ' + s;
    }).filter(Boolean).join(',');
    return scoped + '{' + body + '}';
  }).filter(Boolean).join('\n');
}

/* ============================================================
 * 四、HTML 解析工具
 * ============================================================ */

/**
 * 提取 HTML 中的全部样式（<style> 块 + 外链说明）
 * @param {string} html 原始 HTML
 * @returns {string} 汇总后的 CSS 文本
 */
function extractStyles(html) {
  const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  let all = '';
  styleMatches.forEach(function (s) {
    all += s.replace(/<style[^>]*>/gi, '').replace(/<\/style>/gi, '') + '\n';
  });
  const linkMatches = html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi) || [];
  if (linkMatches.length) {
    all += '\n/* 外部样式表（未内联）：\n';
    linkMatches.forEach(function (l) {
      const m = l.match(/href=["']([^"']+)["']/i);
      if (m) all += '   ' + m[1] + '\n';
    });
    all += '*/\n';
  }
  return all.trim();
}

/**
 * 将相对 URL（src/href/CSS url()）解析为绝对地址
 * @param {string} html HTML 内容
 * @param {string} baseUrl 基准地址
 * @returns {string} 处理后的 HTML
 */
function resolveRelativeUrls(html, baseUrl) {
  if (!baseUrl) return html;
  try { new URL(baseUrl); } catch (e) { return html; }

  const temp = document.createElement('div');
  temp.innerHTML = html;
  temp.querySelectorAll('[src]').forEach(function (el) {
    const raw = el.getAttribute('src');
    if (raw && raw.indexOf('data:') !== 0 && raw.indexOf('blob:') !== 0) {
      try { el.setAttribute('src', new URL(raw, baseUrl).href); } catch (e) {}
    }
  });
  temp.querySelectorAll('[href]').forEach(function (el) {
    const raw = el.getAttribute('href');
    if (raw && !/^(data:|blob:|javascript:|#)/i.test(raw)) {
      try { el.setAttribute('href', new URL(raw, baseUrl).href); } catch (e) {}
    }
  });
  temp.querySelectorAll('*').forEach(function (el) {
    const styleAttr = el.getAttribute('style');
    if (styleAttr && /url\(/i.test(styleAttr)) {
      el.setAttribute('style', resolveCssUrls(styleAttr, baseUrl));
    }
  });
  return temp.innerHTML;
}

/**
 * 将 CSS 文本中的 url() 相对地址解析为绝对地址
 * @param {string} css CSS 文本
 * @param {string} baseUrl 基准地址
 * @returns {string} 处理后的 CSS
 */
function resolveCssUrls(css, baseUrl) {
  return css.replace(/url\(\s*["']?(?!data:|https?:|blob:)([^"')]+)["']?\s*\)/gi, function (m, path) {
    try { return 'url("' + new URL(path.trim(), baseUrl).href + '")'; } catch (e) { return m; }
  });
}

/**
 * 解包 SVG 模板中的真实内容（保留 foreignObject 内 HTML，移除空壳 svg）
 * @param {string} html HTML 内容
 * @returns {string} 处理后的 HTML
 */
function unwrapSvgContent(html) {
  if (!html) return html;
  html = html.replace(/<foreignobject\b[^>]*>([\s\S]*?)<\/foreignobject>/gi, '$1');
  html = html.replace(/<svg\b[^>]*>([\s\S]*?)<\/svg>/gi, '$1');
  html = html.replace(/<svg\b[^>]*>/gi, '').replace(/<\/svg>/gi, '');
  return html;
}

/**
 * 从网页源码中提取正文内容（优先 section，其次常见内容容器）
 * @param {string} html 网页源码
 * @param {string} [sourceUrl] 来源地址，用于解析相对路径
 * @returns {string} 提取出的正文 HTML
 */
function extractBodyContent(html, sourceUrl) {
  let bodyHtml = html;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) bodyHtml = bodyMatch[1];

  bodyHtml = bodyHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  bodyHtml = bodyHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  bodyHtml = bodyHtml.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  bodyHtml = bodyHtml.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '');
  bodyHtml = bodyHtml.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  bodyHtml = bodyHtml.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  bodyHtml = bodyHtml.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  bodyHtml = bodyHtml.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '');
  bodyHtml = unwrapSvgContent(bodyHtml);

  let foundSection = false;
  try {
    const doc = new DOMParser().parseFromString(bodyHtml, 'text/html');
    const sections = Array.from(doc.querySelectorAll('section'));
    if (sections.length > 0) {
      const topLevel = sections.filter(function (s) {
        let p = s.parentElement;
        while (p && p !== doc.documentElement && p.tagName.toLowerCase() !== 'section') p = p.parentElement;
        return !(p && p.tagName.toLowerCase() === 'section');
      });
      const contentSections = topLevel.filter(function (s) { return s.innerHTML.length > 200; });
      if (contentSections.length > 0) {
        bodyHtml = contentSections.map(function (s) { return s.outerHTML; }).join('\n');
        foundSection = true;
      }
    }
  } catch (e) {
    const sectionMatches = bodyHtml.match(/<section[\s>][\s\S]*?<\/section>/gi);
    if (sectionMatches && sectionMatches.length > 0) {
      const outer = sectionMatches.filter(function (m) {
        return !sectionMatches.some(function (other) { return other !== m && other.length > m.length && other.indexOf(m) !== -1; });
      });
      const contentSections = outer.filter(function (s) { return s.length > 200; });
      if (contentSections.length > 0) { bodyHtml = contentSections.join('\n'); foundSection = true; }
    }
  }

  if (!foundSection) {
    const selectors = [
      /<div[^>]*(?:class|id)=["'][^"']*(?:content|main|article|post|entry|editor|preview|style-content|template|wrap)[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
      /<main[^>]*>[\s\S]*?<\/main>/gi
    ];
    for (let i = 0; i < selectors.length; i++) {
      const matches = bodyHtml.match(selectors[i]);
      if (matches) {
        const meaningful = matches.filter(function (m) { return m.length > 300; });
        if (meaningful.length > 0) { bodyHtml = meaningful.join('\n'); break; }
      }
    }
  }

  bodyHtml = bodyHtml.replace(/<!--[\s\S]*?-->/g, '');
  bodyHtml = bodyHtml.replace(/<img[^>]*\b(?:tracking|analytics|pixel|beacon|stats|count)[^>]*>/gi, '');
  if (sourceUrl) bodyHtml = resolveRelativeUrls(bodyHtml, sourceUrl);

  if (!bodyHtml || bodyHtml.trim().length < 50) {
    const textOnly = bodyHtml.replace(/<[^>]*>/g, '').trim();
    if (textOnly.length < 20) return '(未能提取到有效内容，请确认源码正确)';
  }
  return bodyHtml.trim();
}

/* ============================================================
 * 五、模板抓取与粘贴导入
 * ============================================================ */

/**
 * 从 135 编辑器抓取模板并缓存
 * @returns {Promise<void>} 抓取完成
 */
async function fetchTemplate() {
  const inputEl = document.getElementById('templateUrlInput');
  const input = inputEl ? inputEl.value.trim() : '';
  if (!input) { showToast('⚠️ 请输入模板ID或URL'); return; }

  let baseUrl = input;
  if (/^\d+$/.test(input)) baseUrl = 'https://www.135editor.com/editor_styles/' + input + '.html';
  else if (input.indexOf('editor_styles') !== -1 && input.indexOf('http') !== 0) baseUrl = 'https://www.135editor.com/' + input.replace(/^\//, '');
  if (baseUrl.indexOf('http') !== 0) baseUrl = 'https://' + baseUrl;

  showToast('🔍 正在获取模板...');
  const urls = [baseUrl];
  if (baseUrl.indexOf('preview=1') === -1) urls.push(baseUrl + (baseUrl.indexOf('?') === -1 ? '?' : '&') + 'preview=1');

  let html = null, lastError = null;
  for (let i = 0; i < urls.length; i++) {
    try {
      const resp = await fetch(urls[i], { mode: 'cors' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const t = await resp.text();
      if (t && t.length > 200) { html = t; break; }
    } catch (e) { lastError = e; }
  }

  if (html && html.length > 200) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    let name = titleMatch ? titleMatch[1].replace(/[\s|_-]+135编辑器.*$/, '').trim() : '';
    if (!name || name.length > 50) {
      const idMatch = baseUrl.match(/(\d+)/);
      name = idMatch ? '模板 ' + idMatch[1] : '导入模板';
    }
    addMyTemplate(name, html);
  } else {
    const isCors = lastError && (lastError.name === 'TypeError' || String(lastError.message).indexOf('Failed to fetch') !== -1);
    showToast(isCors ? '⚠️ 跨域限制，请改用「粘贴源码」导入' : '❌ 获取失败：' + (lastError ? lastError.message : '内容为空'));
    if (isCors) setTimeout(showPasteDialog, 1500);
  }
}

/**
 * 弹出「粘贴模板源码」对话框
 * @returns {void}
 */
function showPasteDialog() {
  const inputEl = document.getElementById('templateUrlInput');
  const inputUrl = inputEl ? inputEl.value.trim() : '';
  let defaultName = '';
  if (/^\d+$/.test(inputUrl)) defaultName = '模板 ' + inputUrl;
  else if (inputUrl.indexOf('editor_styles') !== -1) {
    const m = inputUrl.match(/(\d+)/);
    defaultName = m ? '模板 ' + m[1] : '';
  }

  showModal('粘贴模板源码',
    '<div class="modal-label">模板名称</div>' +
    '<input class="modal-input" type="text" id="pasteTemplateName" placeholder="给模板起个名字" value="' + escapeHtml(defaultName) + '">' +
    '<div class="modal-label">HTML 源码</div>' +
    '<textarea class="source-code-textarea" id="pasteTemplateHtml" placeholder="将网页 HTML 源码粘贴到这里..." style="min-height:200px"></textarea>' +
    '<div class="hint-text" style="margin-top:6px">💡 方法一（推荐）：打开模板页 → F12 → Elements → 找到 &lt;section&gt; → 右键 Copy outerHTML<br>' +
    '💡 方法二：右键「查看网页源代码」→ 全选复制<br>💡 方法三：URL 加 ?preview=1 后复制源码（更干净）</div>',
    function () {
      const name = (document.getElementById('pasteTemplateName').value || '').trim() || '导入模板';
      const html = (document.getElementById('pasteTemplateHtml').value || '').trim();
      if (!html) { showToast('⚠️ 请粘贴 HTML 源码'); return false; }
      addMyTemplate(name, html);
    });
}
