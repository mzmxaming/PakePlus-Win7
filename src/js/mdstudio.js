/* ==========================================================================
 * mdstudio.js —— Markdown 双栏工作台（对标 doocs/md 的写作形态）
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：源码编辑 + 实时预览 + 同步滚动 + 语法工具条 + 一键同步为公众号富文本 +
 *       文件导入导出（md / html / txt / pdf）。
 * 依赖：utils.js / config.js / editor.js / markdown.js / typeset.js
 * ========================================================================== */

/** 当前编辑模式：rich（富文本）/ markdown（Markdown 双栏） */
var editorMode = 'rich';
/** Markdown 实时渲染防抖定时器 */
var mdRenderTimer = null;
/** 是否正在由同步滚动驱动（避免互相触发） */
var mdScrollLock = false;
/** 最近一次「Markdown → 富文本」同步时的正文 HTML，用于检测是否已被改动 */
var mdLastSyncedEditorHtml = null;

/** Markdown 语法片段定义 */
const MD_SNIPPETS = {
  h1: { prefix: '# ', suffix: '', ph: '一级标题', block: true },
  h2: { prefix: '## ', suffix: '', ph: '二级标题', block: true },
  h3: { prefix: '### ', suffix: '', ph: '三级标题', block: true },
  bold: { prefix: '**', suffix: '**', ph: '加粗文字' },
  italic: { prefix: '*', suffix: '*', ph: '斜体文字' },
  strike: { prefix: '~~', suffix: '~~', ph: '删除线' },
  mark: { prefix: '==', suffix: '==', ph: '高亮文字' },
  code: { prefix: '`', suffix: '`', ph: '行内代码' },
  quote: { prefix: '> ', suffix: '', ph: '引用内容', block: true },
  ul: { prefix: '- ', suffix: '', ph: '列表项', block: true },
  ol: { prefix: '1. ', suffix: '', ph: '列表项', block: true },
  task: { prefix: '- [ ] ', suffix: '', ph: '待办事项', block: true },
  link: { prefix: '[', suffix: '](https://)', ph: '链接文字' },
  image: { prefix: '![', suffix: '](https://)', ph: '图片描述' },
  footnote: { text: '这里是被引用的内容[^1]\n\n[^1]: 脚注说明\n' },
  codeblock: { text: '```js\n// 在这里写代码\nconsole.log("hello")\n```\n' },
  math: { prefix: '$', suffix: '$', ph: 'E=mc^2' },
  mathblock: { text: '$$\n\\int_0^1 x\\,dx = \\frac{1}{2}\n$$\n' },
  mermaid: { text: '```mermaid\ngraph TD\n  A[开始] --> B[处理]\n  B --> C[结束]\n```\n' },
  admonition: { text: '> [!NOTE]\n> 这里写提示内容\n' },
  table: { text: '| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |\n' },
  hr: { text: '\n---\n' }
};

/**
 * 初始化 Markdown 工作台（绑定滚动同步与输入事件）
 * @returns {void}
 */
function initMdStudio() {
  const src = document.getElementById('mdSource');
  const prev = document.getElementById('mdPreview');
  if (!src || !prev) return;

  src.addEventListener('input', function () {
    mdUpdateStatus();
    clearTimeout(mdRenderTimer);
    mdRenderTimer = setTimeout(mdRender, 180);
  });

  // 编辑器内 Tab 缩进 / 回车自动续列表 / 快捷键
  src.addEventListener('keydown', handleMdKeydown);

  // 同步滚动（源码 -> 预览）
  src.addEventListener('scroll', function () {
    if (mdScrollLock) return;
    mdScrollLock = true;
    const max = src.scrollHeight - src.clientHeight;
    const ratio = max > 0 ? src.scrollTop / max : 0;
    prev.scrollTop = ratio * (prev.scrollHeight - prev.clientHeight);
    setTimeout(function () { mdScrollLock = false; }, 30);
  });
  prev.addEventListener('scroll', function () {
    if (mdScrollLock) return;
    mdScrollLock = true;
    const max = prev.scrollHeight - prev.clientHeight;
    const ratio = max > 0 ? prev.scrollTop / max : 0;
    src.scrollTop = ratio * (src.scrollHeight - src.clientHeight);
    setTimeout(function () { mdScrollLock = false; }, 30);
  });

  mdRender();
}

/**
 * Markdown 源码区的键盘增强：Tab 缩进、回车续列表、快捷键
 * @param {KeyboardEvent} e 键盘事件
 * @returns {void}
 */
function handleMdKeydown(e) {
  const ta = e.target;
  const start = ta.selectionStart;
  const end = ta.selectionEnd;

  // Ctrl/Cmd + B/I/K
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); mdInsertSyntax('bold'); return; }
    if (k === 'i') { e.preventDefault(); mdInsertSyntax('italic'); return; }
    if (k === 'k') { e.preventDefault(); mdInsertSyntax('link'); return; }
    if (k === 's') { e.preventDefault(); saveDraft(true); return; }
    return;
  }

  // Tab 插入两个空格
  if (e.key === 'Tab') {
    e.preventDefault();
    const v = ta.value;
    if (start !== end) {
      // 多行整体缩进
      const before = v.slice(0, start);
      const sel = v.slice(start, end);
      const after = v.slice(end);
      const indented = sel.split('\n').map(function (l) { return '  ' + l; }).join('\n');
      ta.value = before + indented + after;
      ta.selectionStart = start;
      ta.selectionEnd = start + indented.length;
    } else {
      ta.value = v.slice(0, start) + '  ' + v.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
    }
    mdUpdateStatus();
    clearTimeout(mdRenderTimer);
    mdRenderTimer = setTimeout(mdRender, 120);
    return;
  }

  // 回车自动续列表
  if (e.key === 'Enter' && !e.shiftKey) {
    const v = ta.value;
    const lineStart = v.lastIndexOf('\n', start - 1) + 1;
    const line = v.slice(lineStart, start);
    const m = line.match(/^(\s*)([-*+]\s\[[ xX]\]\s|[-*+]\s|\d+[.)]\s)(.*)$/);
    if (m) {
      e.preventDefault();
      // 空列表项则退出列表
      if (!m[3].trim()) {
        ta.value = v.slice(0, lineStart) + '\n' + v.slice(end);
        ta.selectionStart = ta.selectionEnd = lineStart + 1;
      } else {
        let prefix = m[1] + m[2];
        if (/^\d/.test(m[2])) {
          prefix = m[1] + (parseInt(m[2], 10) + 1) + m[2].replace(/^\d+/, '');
        }
        if (/\[[ xX]\]/.test(prefix)) prefix = prefix.replace(/\[[ xX]\]/, '[ ]');
        const insert = '\n' + prefix;
        ta.value = v.slice(0, start) + insert + v.slice(end);
        ta.selectionStart = ta.selectionEnd = start + insert.length;
      }
      mdUpdateStatus();
      clearTimeout(mdRenderTimer);
      mdRenderTimer = setTimeout(mdRender, 120);
    }
  }
}

/**
 * 在 Markdown 源码中插入语法片段
 * @param {string} kind 片段类型，见 MD_SNIPPETS
 * @returns {void}
 */
function mdInsertSyntax(kind) {
  const ta = document.getElementById('mdSource');
  const snip = MD_SNIPPETS[kind];
  if (!ta || !snip) return;
  ta.focus();
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const v = ta.value;
  const selected = v.slice(start, end);
  let insert, cursorStart, cursorEnd;

  if (snip.text != null) {
    // 插入整段模板
    const needNl = start > 0 && v[start - 1] !== '\n' ? '\n' : '';
    insert = needNl + snip.text;
    ta.value = v.slice(0, start) + insert + v.slice(end);
    cursorStart = cursorEnd = start + insert.length;
  } else {
    const body = selected || snip.ph || '';
    insert = snip.prefix + body + snip.suffix;
    // 行首类（标题/引用/列表）自动补换行
    let needNl = '';
    if (snip.block && start > 0 && v[start - 1] !== '\n') needNl = '\n';
    ta.value = v.slice(0, start) + needNl + insert + v.slice(end);
    cursorStart = start + needNl.length + snip.prefix.length;
    cursorEnd = cursorStart + body.length;
  }
  ta.selectionStart = cursorStart;
  ta.selectionEnd = cursorEnd;
  mdUpdateStatus();
  mdRender();
}

/**
 * 渲染 Markdown 到预览区
 * @returns {void}
 */
function mdRender() {
  const ta = document.getElementById('mdSource');
  const prev = document.getElementById('mdPreview');
  if (!ta || !prev) return;
  const html = renderMarkdown(ta.value, { breaks: true });
  prev.innerHTML = html || '<p style="color:#bbb">左侧输入 Markdown，这里实时预览…</p>';
  applyPreviewCss();
  // 可选：自动渲染公式与图表
  const auto = document.getElementById('mdAutoRender');
  if (auto && auto.checked) {
    renderMath(prev).catch(function () {});
    renderMermaid(prev).catch(function () {});
  }
}

/**
 * 更新 Markdown 源码区的统计信息
 * @returns {void}
 */
function mdUpdateStatus() {
  const ta = document.getElementById('mdSource');
  const box = document.getElementById('mdStats');
  if (!ta || !box) return;
  const text = ta.value;
  const chinese = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  box.textContent = '字符 ' + text.length + ' · 字数 ' + (chinese + words) + ' · 行数 ' + text.split('\n').length;
}

/**
 * 切换编辑器模式
 * @param {string} mode rich | markdown
 * @returns {void}
 */
function switchEditorMode(mode) {
  editorMode = mode === 'markdown' ? 'markdown' : 'rich';
  const isMd = editorMode === 'markdown';
  const t1 = document.getElementById('toolbar');
  const t2 = document.getElementById('toolbar2');
  const studio = document.getElementById('mdStudio');
  const scroll = document.getElementById('editorScroll');
  const srcPanel = document.getElementById('sourceModePanel');
  const btn = document.getElementById('modeBtn');

  if (t1) t1.style.display = isMd ? 'none' : 'flex';
  if (t2) t2.style.display = isMd ? 'none' : 'flex';
  if (studio) studio.style.display = isMd ? 'flex' : 'none';
  if (scroll) scroll.style.display = isMd ? 'none' : 'flex';
  if (isMd && srcPanel) srcPanel.style.display = 'none';
  if (btn) {
    btn.classList.toggle('active', isMd);
    btn.title = isMd ? '切回富文本模式' : '切换到 Markdown 模式';
  }
  if (isMd) {
    const ta = document.getElementById('mdSource');
    if (ta && !ta.value.trim() && editor && editor.innerHTML.trim()) {
      // 源码为空而正文有内容：自动从正文提取 Markdown
      richToMd(true);
    } else if (ta && ta.value.trim() && mdLastSyncedEditorHtml !== null &&
               editor && editor.innerHTML !== mdLastSyncedEditorHtml) {
      // 正文已被改动但 Markdown 源码未同步，给出提示（不自动覆盖，避免丢失 Markdown 写法）
      showToast('提示：正文已修改，Markdown 源码未同步，可点下方「从正文提取 Markdown」', 3200);
    }
    mdRender();
    mdUpdateStatus();
  }
}

/**
 * 切换 Markdown / 富文本模式
 * @returns {void}
 */
function toggleMarkdownMode() {
  switchEditorMode(editorMode === 'markdown' ? 'rich' : 'markdown');
}

/**
 * 把当前富文本正文提取为 Markdown 填入源码区
 * @param {boolean} [silent] 是否静默
 * @returns {void}
 */
function richToMd(silent) {
  const ta = document.getElementById('mdSource');
  if (!ta) return;
  const title = (document.getElementById('articleTitle') || {}).value || '';
  let md = '';
  if (title.trim()) md += '# ' + title.trim() + '\n\n';
  md += htmlToMarkdown(editor ? editor.innerHTML : '');
  ta.value = md.trim();
  if (!silent) { mdRender(); mdUpdateStatus(); showToast('✅ 已将正文转换为 Markdown'); }
}

/**
 * 将 Markdown 同步为公众号富文本（应用当前主题与排版参数）
 * @returns {void}
 */
function mdToRichText() {
  const ta = document.getElementById('mdSource');
  if (!ta || !ta.value.trim()) { showToast('⚠️ 请先输入 Markdown 内容'); return; }

  const parsed = extractTitleFromMarkdown(ta.value);
  const html = renderMarkdown(parsed.body, { breaks: true });
  setEditorHtml(html, true);
  if (parsed.title) {
    document.getElementById('articleTitle').value = parsed.title;
    autoResizeTitle();
  }
  switchEditorMode('rich');
  applyTypeset({ silent: true });
  mdLastSyncedEditorHtml = editor ? editor.innerHTML : null;
  const auto = document.getElementById('mdAutoRender');
  if (auto && auto.checked) renderMathAndMermaid();
  showToast('✅ 已同步为公众号富文本，可直接复制到微信');
}

/**
 * 用内置示例填充 Markdown 源码区
 * @returns {void}
 */
function loadMdDemo() {
  const ta = document.getElementById('mdSource');
  if (!ta) return;
  ta.value = [
    '# 微信 Markdown 排版示例',
    '',
    '支持 **加粗**、*斜体*、~~删除线~~、==高亮==、`行内代码`。',
    '',
    '## 一、列表与任务',
    '',
    '- 无序列表项',
    '- [x] 已完成的事项',
    '- [ ] 待办事项',
    '',
    '1. 有序列表第一项',
    '2. 有序列表第二项',
    '',
    '## 二、表格',
    '',
    '| 名称 | 数量 | 单价 |',
    '| :--- | :---: | ---: |',
    '| 苹果 | 3 | 5.00 |',
    '| 香蕉 | 2 | 3.50 |',
    '',
    '## 三、代码与引用',
    '',
    '```js',
    '// 代码块自动高亮',
    'function hello(name) {',
    '  return "你好，" + name;',
    '}',
    '```',
    '',
    '> [!TIP]',
    '> 这是 GFM 警告块，支持 NOTE / TIP / WARNING 等类型。',
    '',
    '> 这是普通引用样式。',
    '',
    '## 四、公式与图表（可选）',
    '',
    '行内公式 $E = mc^2$，块级公式：',
    '',
    '$$',
    '\\int_0^1 x^2\\,dx = \\frac{1}{3}',
    '$$',
    '',
    '```mermaid',
    'graph LR',
    '  A[写作] --> B[预览]',
    '  B --> C[复制到微信]',
    '```',
    '',
    '## 五、脚注与注音',
    '',
    '这里引用一条说明[^1]，还有注音 [汉字]{hàn zì}。',
    '',
    '[^1]: 这是脚注内容，会自动汇总到文末。',
    '',
    '---',
    '',
    '关注「涯系石头」，获取更多排版技巧。'
  ].join('\n');
  mdRender();
  mdUpdateStatus();
  showToast('已载入示例，可直接点「同步为富文本」查看效果');
}

/* ============================================================
 * 导入 / 导出
 * ============================================================ */

/**
 * 导出 Markdown 文件
 * @returns {void}
 */
function exportMarkdownFile() {
  let md;
  if (editorMode === 'markdown') {
    md = (document.getElementById('mdSource') || {}).value || '';
  } else {
    const title = (document.getElementById('articleTitle') || {}).value || '文章';
    md = (title ? '# ' + title + '\n\n' : '') + htmlToMarkdown(editor ? editor.innerHTML : '');
  }
  if (!md.trim()) { showToast('⚠️ 暂无可导出的内容'); return; }
  const name = ((document.getElementById('articleTitle') || {}).value || 'article').replace(/[\\/:*?"<>|]/g, '_');
  downloadText(name + '.md', md, 'text/markdown;charset=UTF-8');
  showToast('💾 Markdown 文件已下载');
}

/**
 * 导入文章文件（md / html / txt）
 * @param {Event} event file input 的 change 事件
 * @returns {void}
 */
async function importArticleFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const text = await readFileAsText(file);
  const name = file.name.toLowerCase();

  if (/\.(md|markdown)$/.test(name) || looksLikeMarkdown(text)) {
    switchEditorMode('markdown');
    const ta = document.getElementById('mdSource');
    if (ta) { ta.value = text; mdRender(); mdUpdateStatus(); }
    showToast('✅ 已导入 Markdown：' + file.name);
  } else if (/\.html?$/.test(name)) {
    const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const content = bodyMatch ? bodyMatch[1] : text;
    setEditorHtml(sanitizePastedHtml(content), true);
    switchEditorMode('rich');
    showToast('✅ 已导入 HTML：' + file.name);
  } else {
    const html = looksLikeMarkdown(text) ? renderMarkdown(text, { breaks: true }) : textToStructuredHtml(text);
    setEditorHtml(html, true);
    switchEditorMode('rich');
    showToast('✅ 已导入文本：' + file.name);
  }
  event.target.value = '';
}

/**
 * 导出为 PDF（通过隐藏 iframe 调起浏览器打印）
 * @returns {void}
 */
function exportPdf() {
  if (!editor || !editor.innerHTML.trim()) { showToast('⚠️ 编辑区暂无内容'); return; }
  const title = (document.getElementById('articleTitle') || {}).value || '我的文章';
  const author = (document.getElementById('articleAuthor') || {}).value || '';
  const doc = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>' + escapeHtml(title) + '</title>' +
    '<style>' +
    '@page{margin:18mm 16mm;}' +
    'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;font-size:15px;line-height:1.8;color:#3e3e3e;margin:0;}' +
    '.print-title{font-size:22px;font-weight:700;text-align:center;margin:0 0 6px;}' +
    '.print-author{font-size:13px;color:#999;text-align:center;margin:0 0 22px;}' +
    'img{max-width:100%;height:auto;}' +
    'pre{white-space:pre-wrap;word-break:break-all;}' +
    'table{border-collapse:collapse;width:100%;}' +
    'td,th{border:1px solid #e0e0e0;padding:8px 12px;}' +
    (document.getElementById('typeset-custom-css') || {}).textContent || '' +
    '</style></head><body>' +
    '<h1 class="print-title">' + escapeHtml(title) + '</h1>' +
    (author ? '<p class="print-author">' + escapeHtml(author) + '</p>' : '') +
    editor.innerHTML +
    '</body></html>';

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc2 = iframe.contentWindow.document;
  doc2.open();
  doc2.write(doc);
  doc2.close();
  setTimeout(function () {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      showToast('❌ 调起打印失败，请改用「导出 HTML」后打印');
    }
    setTimeout(function () { iframe.remove(); }, 2000);
  }, 350);
  showToast('请在打印窗口中选择「另存为 PDF」');
}
