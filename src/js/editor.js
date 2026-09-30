/* ==========================================================================
 * editor.js —— 编辑器核心
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：负责富文本编辑、图片、链接、表格、源码模式、草稿、预览、复制与导出。
 * ========================================================================== */

/** 富文本编辑区元素 */
var editor = null;
/** 文章标题输入框 */
var titleInput = null;
/** 作者输入框 */
var authorInput = null;
/** 摘要输入框 */
var summaryInput = null;
/** 是否处于源码模式 */
var sourceMode = false;
/** 封面图 DataURL */
var coverDataUrl = null;
/** 当前选中的图片元素 */
var selectedImage = null;
/** 图片浮动工具条元素 */
var imageToolbar = null;
/** 自动保存定时器 */
var autoSaveTimer = null;

/**
 * 初始化编辑器：缓存 DOM 引用并绑定各类事件
 * @returns {void}
 */
function initEditor() {
  editor = document.getElementById('editorContent');
  titleInput = document.getElementById('articleTitle');
  authorInput = document.getElementById('articleAuthor');
  summaryInput = document.getElementById('articleSummary');

  // 输入自动保存
  editor.addEventListener('input', debounceAutoSave);
  titleInput.addEventListener('input', debounceAutoSave);
  authorInput.addEventListener('input', debounceAutoSave);
  summaryInput.addEventListener('input', function () { updateCharCount(); debounceAutoSave(); });

  // 选区变化时更新工具栏状态与浮动气泡
  document.addEventListener('selectionchange', function () {
    updateToolbarState();
    if (typeof updateSelectionBubble === 'function') updateSelectionBubble();
  });

  // 图片点击选中
  editor.addEventListener('click', function (e) {
    if (e.target && e.target.tagName === 'IMG') {
      e.stopPropagation();
      selectImage(e.target);
    } else {
      deselectImage();
    }
  });

  // 键盘：删除选中图片 / Esc 取消选中
  editor.addEventListener('keydown', function (e) {
    if (selectedImage && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      deleteSelectedImage();
    }
    if (e.key === 'Escape' && selectedImage) deselectImage();
  });

  // 滚动时重定位图片工具条（避免错位）
  var scrollArea = document.getElementById('editorScroll');
  if (scrollArea) scrollArea.addEventListener('scroll', function () { if (selectedImage) positionToolbar(selectedImage); });
  window.addEventListener('resize', function () { if (selectedImage) positionToolbar(selectedImage); });

  // 粘贴清洗：保留样式，去除脚本等危险内容；支持粘贴图片
  editor.addEventListener('paste', handleEditorPaste);

  // 载入草稿并刷新统计
  loadDraft();
  updateArticleInfo();
  setTimeout(function () { if (editor) editor.focus(); }, 120);
}

/* ============================================================
 * 一、工具栏基础命令
 * ============================================================ */

/**
 * 执行浏览器富文本命令
 * @param {string} command 命令名，如 bold / justifyCenter
 * @param {string} [value] 命令参数
 * @returns {void}
 */
function exec(command, value) {
  if (!editor) return;
  editor.focus();
  document.execCommand('styleWithCSS', false, true);
  document.execCommand(command, false, value == null ? null : value);
  updateToolbarState();
  debounceAutoSave();
}

/**
 * 仅清除选中文字的「格式」（保留段落结构），用于去掉从别处复制来的样式
 * @returns {void}
 */
function clearFormat() {
  editor.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) {
    showToast('⚠️ 请先选中要清除格式的文字');
    return;
  }
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;

  const fragment = range.extractContents();
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);

  /**
   * 递归剥离元素的行内样式与属性
   * @param {Node} node 起始节点
   * @returns {void}
   */
  function stripFormatting(node) {
    const children = Array.from(node.childNodes);
    children.forEach(function (child) {
      if (child.nodeType !== 1) return;
      const el = child;
      const structuralTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'BLOCKQUOTE', 'UL', 'OL', 'LI', 'TABLE', 'TBODY', 'TR', 'TD', 'TH',
        'HR', 'BR', 'IMG', 'A', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL',
        'SUB', 'SUP', 'CODE', 'PRE', 'SPAN'];
      if (structuralTags.indexOf(el.tagName) === -1) {
        // 非结构标签直接解包
        while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
        el.parentNode.removeChild(el);
        return;
      }
      el.removeAttribute('style');
      el.removeAttribute('class');
      el.removeAttribute('color');
      el.removeAttribute('size');
      el.removeAttribute('face');
      el.removeAttribute('bgcolor');
      el.removeAttribute('align');
      el.removeAttribute('valign');
      Array.from(el.attributes).forEach(function (attr) {
        if (attr.name.slice(0, 2) === 'on') el.removeAttribute(attr.name);
      });
      stripFormatting(el);
    });
  }

  stripFormatting(wrapper);
  range.insertNode(wrapper);
  wrapper.normalize();
  while (wrapper.firstChild) wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
  wrapper.parentNode.removeChild(wrapper);
  sel.removeAllRanges();
  updateToolbarState();
  debounceAutoSave();
}

/**
 * 清除全文所有样式（仅保留结构标签），用于「还原为纯文本」
 * @returns {void}
 */
function clearAllStyles() {
  if (!editor || !editor.innerHTML.trim()) { showToast('⚠️ 暂无内容'); return; }
  confirmDialog('确定清除全文所有样式吗？<br>将保留文字与段落结构，移除颜色、字号、背景等样式。', function () {
    const nodes = editor.querySelectorAll('*');
    nodes.forEach(function (el) {
      if (['IMG', 'HR', 'BR'].indexOf(el.tagName) !== -1) return;
      el.removeAttribute('style');
      el.removeAttribute('class');
      el.removeAttribute('color');
      el.removeAttribute('bgcolor');
      Array.from(el.attributes).forEach(function (attr) {
        if (attr.name.slice(0, 2) === 'on') el.removeAttribute(attr.name);
      });
    });
    debounceAutoSave();
    showToast('✅ 已清除全文样式');
  });
}

/**
 * 设置选中文字颜色
 * @param {string} color 颜色值，如 #07c160
 * @returns {void}
 */
function setFontColor(color) {
  editor.focus();
  document.execCommand('styleWithCSS', false, true);
  document.execCommand('foreColor', false, color);
  const ind = document.getElementById('fontColorIndicator');
  const picker = document.getElementById('fontColorPicker');
  if (ind) ind.style.background = color;
  if (picker) picker.value = color;
  debounceAutoSave();
}

/**
 * 设置选中文字背景色（transparent 表示清除背景）
 * @param {string} color 颜色值
 * @returns {void}
 */
function setBgColor(color) {
  editor.focus();
  document.execCommand('styleWithCSS', false, true);
  if (color === 'transparent') {
    const sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) { showToast('⚠️ 请先选中文字'); return; }
    const range = sel.getRangeAt(0);
    const spans = [];
    // 收集选区覆盖到的元素，逐一清除背景色
    let container = range.commonAncestorContainer;
    if (container.nodeType === 3) container = container.parentNode;
    const scope = container.closest ? (container.closest('span[style]') || container) : container;
    if (scope && scope.style) { scope.style.backgroundColor = ''; scope.style.background = ''; spans.push(scope); }
    $$('span[style*="background"]', editor).forEach(function (s) {
      if (range.intersectsNode(s)) { s.style.backgroundColor = ''; s.style.background = ''; spans.push(s); }
    });
    spans.forEach(function (s) {
      if (!s.getAttribute || !s.getAttribute('style') || !s.getAttribute('style').trim()) {
        if (s.parentNode) {
          while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s);
          s.parentNode.removeChild(s);
        }
      }
    });
  } else {
    document.execCommand('hiliteColor', false, color);
  }
  const ind = document.getElementById('bgColorIndicator');
  const picker = document.getElementById('bgColorPicker');
  if (ind) ind.style.background = color === 'transparent' ? 'transparent' : color;
  if (picker) picker.value = color === 'transparent' ? '#ffff00' : color;
  debounceAutoSave();
}

/**
 * 设置选中文字的字间距
 * @param {string|number} value 像素值
 * @returns {void}
 */
function setLetterSpacing(value) {
  editor.focus();
  if (!value || String(value) === '0') { showToast('已切换为默认字间距'); }
  wrapSelectionStyle('letter-spacing', value + 'px');
}

/**
 * 设置选中文字的行高
 * @param {string|number} value 倍数
 * @returns {void}
 */
function setLineHeight(value) {
  editor.focus();
  wrapSelectionStyle('line-height', String(value));
}

/**
 * 用 span 包裹选区并应用单条样式（跨元素选区走 insertHTML 兜底）
 * @param {string} prop CSS 属性名
 * @param {string} val CSS 属性值
 * @returns {void}
 */
function wrapSelectionStyle(prop, val) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) { showToast('⚠️ 请先选中文字'); return; }
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style[prop.replace(/-(\w)/g, function (m, c) { return c.toUpperCase(); })] = val;
  try {
    range.surroundContents(span);
  } catch (e) {
    document.execCommand('insertHTML', false, '<span style="' + prop + ':' + val + '">' + escapeHtml(sel.toString()) + '</span>');
  }
  debounceAutoSave();
}

/**
 * 根据当前选区同步工具栏按钮激活态
 * @returns {void}
 */
function updateToolbarState() {
  const btns = $$('.tool-btn');
  btns.forEach(function (b) {
    const oc = b.getAttribute('onclick') || '';
    const m = oc.match(/exec\('(\w+)'/);
    if (!m) return;
    try {
      if (document.queryCommandState(m[1])) b.classList.add('active');
      else b.classList.remove('active');
    } catch (e) { /* 忽略不支持的查询命令 */ }
  });
}

/* ============================================================
 * 二、插入元素
 * ============================================================ */

/**
 * 插入本地图片到光标位置
 * @param {Event} event file input 的 change 事件
 * @returns {void}
 */
function insertImage(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  readFileAsDataURL(file).then(function (dataUrl) {
    insertImageByUrl(dataUrl);
  });
  event.target.value = '';
}

/**
 * 按 URL/DataURL 在光标处插入图片
 * @param {string} url 图片地址
 * @param {Object} [opts] 可选项 { width }
 * @returns {HTMLElement|null} 插入的 img 元素
 */
function insertImageByUrl(url, opts) {
  opts = opts || {};
  if (!editor) return null;
  editor.focus();
  const img = document.createElement('img');
  img.src = url;
  img.style.maxWidth = '100%';
  img.style.display = 'block';
  img.style.margin = '16px auto';
  img.style.borderRadius = '4px';
  if (opts.width) img.style.width = opts.width;

  const sel = window.getSelection();
  if (sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(img);
  }
  updateArticleInfo();
  debounceAutoSave();
  return img;
}

/**
 * 插入分隔线
 * @returns {void}
 */
function insertDivider() { insertHtmlAtEnd('<hr>'); }

/**
 * 在光标处插入段后空行
 * @returns {void}
 */
function insertBlankLine() {
  editor.focus();
  const sel = window.getSelection();
  if (sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    range.collapse(false);
    const p1 = document.createElement('p'); p1.innerHTML = '<br>';
    const p2 = document.createElement('p'); p2.innerHTML = '<br>';
    range.insertNode(p2);
    range.insertNode(p1);
    range.setStartAfter(p2);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.insertAdjacentHTML('beforeend', '<p><br></p><p><br></p>');
  }
  const scrollArea = document.getElementById('editorScroll');
  if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
  debounceAutoSave();
}

/**
 * 切换当前段落的首行缩进 2 字符
 * @returns {void}
 */
function indentFirstLine() {
  editor.focus();
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  let node = range.commonAncestorContainer;
  const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'LI', 'TD', 'TH'];
  while (node && node !== editor) {
    if (node.nodeType === 1 && blockTags.indexOf(node.tagName) !== -1) {
      node.style.textIndent = (node.style.textIndent === '2em') ? '' : '2em';
      debounceAutoSave();
      return;
    }
    node = node.parentNode;
  }
  showToast('⚠️ 请将光标放在段落中再使用首行缩进');
}

/* ============================================================
 * 三、图片浮动工具条
 * ============================================================ */

/**
 * 创建（懒加载）图片浮动工具条
 * @returns {HTMLElement} 工具条元素
 */
function createImageToolbar() {
  if (imageToolbar) return imageToolbar;
  const tb = document.createElement('div');
  tb.className = 'image-toolbar';
  tb.style.display = 'none';
  tb.innerHTML =
    '<button class="img-tool-btn" title="左对齐" data-action="align-left">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 3h18v2H3zm0 8h10v2H3zm0-4h18v2H3zm0 8h10v2H3z"/></svg></button>' +
    '<button class="img-tool-btn" title="居中" data-action="align-center">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 3h18v2H3zm4 8h10v2H7zM3 7h18v2H3zm4 8h10v2H7z"/></svg></button>' +
    '<button class="img-tool-btn" title="右对齐" data-action="align-right">' +
      '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 3h18v2H3zm8 8h10v2H11zM3 7h18v2H3zm8 8h10v2H11z"/></svg></button>' +
    '<span class="img-tool-divider"></span>' +
    '<span class="img-size-label">宽</span>' +
    '<input class="img-size-input" type="number" id="imgWidthInput" value="" placeholder="auto" min="20" max="680" step="10">' +
    '<span class="img-size-label">px</span>' +
    '<button class="img-tool-btn" title="重置宽度" data-action="reset-width">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg></button>' +
    '<span class="img-tool-divider"></span>' +
    '<button class="img-tool-btn" title="生成图片说明（AI 配图建议）" data-action="ai-caption">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg></button>' +
    '<span class="img-tool-divider"></span>' +
    '<button class="img-tool-btn danger" title="删除图片" data-action="delete">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>';
  document.body.appendChild(tb);

  tb.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn || !selectedImage) return;
    const action = btn.dataset.action;
    if (action === 'align-left') { selectedImage.style.display = 'block'; selectedImage.style.margin = '16px auto 16px 0'; highlightActiveAlign(tb, 'left'); }
    else if (action === 'align-center') { selectedImage.style.display = 'block'; selectedImage.style.margin = '16px auto'; highlightActiveAlign(tb, 'center'); }
    else if (action === 'align-right') { selectedImage.style.display = 'block'; selectedImage.style.margin = '16px 0 16px auto'; highlightActiveAlign(tb, 'right'); }
    else if (action === 'reset-width') { selectedImage.style.width = ''; selectedImage.style.maxWidth = '100%'; const w = document.getElementById('imgWidthInput'); if (w) w.value = ''; }
    else if (action === 'delete') { deleteSelectedImage(); return; }
    else if (action === 'ai-caption') { if (typeof aiImageCaption === 'function') aiImageCaption(selectedImage); return; }
    debounceAutoSave();
  });

  const widthInput = tb.querySelector('#imgWidthInput');
  widthInput.addEventListener('input', function () {
    if (!selectedImage) return;
    const val = parseInt(widthInput.value, 10);
    if (val && val >= 20 && val <= 680) { selectedImage.style.width = val + 'px'; debounceAutoSave(); }
    else if (!widthInput.value) { selectedImage.style.width = ''; }
  });

  // 点击空白处取消选中
  document.addEventListener('mousedown', function (e) {
    if (selectedImage && !tb.contains(e.target) && e.target !== selectedImage) {
      setTimeout(function () { if (selectedImage && e.target !== selectedImage) deselectImage(); }, 100);
    }
  });

  imageToolbar = tb;
  return tb;
}

/**
 * 高亮图片工具条中当前对齐按钮
 * @param {HTMLElement} tb 工具条
 * @param {string} align left|center|right
 * @returns {void}
 */
function highlightActiveAlign(tb, align) {
  tb.querySelectorAll('[data-action^="align-"]').forEach(function (b) { b.classList.remove('active'); });
  const active = tb.querySelector('[data-action="align-' + align + '"]');
  if (active) active.classList.add('active');
}

/**
 * 定位图片工具条到目标图片上方
 * @param {HTMLImageElement} img 目标图片
 * @returns {void}
 */
function positionToolbar(img) {
  const tb = createImageToolbar();
  const rect = img.getBoundingClientRect();
  const top = rect.top - 44;
  const left = rect.left + rect.width / 2;
  tb.style.display = 'flex';
  tb.style.top = Math.max(8, top) + 'px';
  tb.style.left = Math.max(8, Math.min(left - 150, window.innerWidth - 330)) + 'px';
}

/**
 * 选中图片并显示工具条
 * @param {HTMLImageElement} img 目标图片
 * @returns {void}
 */
function selectImage(img) {
  if (selectedImage && selectedImage !== img) {
    selectedImage.classList.remove('selected');
    selectedImage.style.outline = '2px solid transparent';
  }
  selectedImage = img;
  img.classList.add('selected');
  img.style.outline = '2px solid #07c160';
  img.style.outlineOffset = '3px';
  positionToolbar(img);

  const widthInput = document.getElementById('imgWidthInput');
  if (widthInput) widthInput.value = img.style.width ? parseInt(img.style.width, 10) : '';

  const tb = createImageToolbar();
  const margin = img.style.margin || '';
  if (margin.indexOf('16px auto') === 0) highlightActiveAlign(tb, 'center');
  else if (margin.indexOf('16px auto 16px 0') === 0) highlightActiveAlign(tb, 'left');
  else if (margin.indexOf('16px 0 16px auto') === 0) highlightActiveAlign(tb, 'right');
  else { tb.querySelectorAll('[data-action^="align-"]').forEach(function (b) { b.classList.remove('active'); }); }
}

/**
 * 取消图片选中
 * @returns {void}
 */
function deselectImage() {
  if (selectedImage) {
    selectedImage.classList.remove('selected');
    selectedImage.style.outline = '2px solid transparent';
    selectedImage = null;
  }
  if (imageToolbar) imageToolbar.style.display = 'none';
}

/**
 * 删除当前选中的图片
 * @returns {void}
 */
function deleteSelectedImage() {
  if (!selectedImage) return;
  const img = selectedImage;
  deselectImage();
  if (img.parentNode) img.parentNode.removeChild(img);
  updateArticleInfo();
  debounceAutoSave();
}

/* ============================================================
 * 四、链接与表格
 * ============================================================ */

/**
 * 显示插入链接浮层（支持先选文字后填链接，也支持先填文字再插入）
 * @returns {void}
 */
function showLinkDialog() {
  editor.focus();
  const sel = window.getSelection();
  const selectedText = sel.toString() || '';
  document.querySelectorAll('.link-popup').forEach(function (p) { p.remove(); });

  const popup = document.createElement('div');
  popup.className = 'link-popup';
  popup.innerHTML =
    '<input type="text" id="linkText" placeholder="链接文字" value="' + escapeHtml(selectedText) + '" style="width:120px">' +
    '<input type="url" id="linkUrl" placeholder="https://..." value="" style="width:200px">' +
    '<button class="action-btn primary" style="margin:0;padding:6px 14px;font-size:12px;white-space:nowrap" onclick="insertLink()">确定</button>' +
    '<button style="background:none;border:none;cursor:pointer;color:#999;font-size:16px;padding:0 4px" onclick="this.parentElement.remove()">×</button>';
  document.body.appendChild(popup);

  if (sel.rangeCount > 0) {
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    popup.style.top = Math.min(window.innerHeight - 60, rect.bottom + 8) + 'px';
    popup.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 420)) + 'px';
  } else {
    popup.style.top = '160px';
    popup.style.left = '50%';
    popup.style.transform = 'translateX(-50%)';
  }

  const urlInput = document.getElementById('linkUrl');
  if (urlInput) urlInput.focus();
  popup.addEventListener('keydown', function (e) { if (e.key === 'Enter') insertLink(); });
}

/**
 * 插入超链接：有选区则包裹选区，无选区则插入链接文字本身
 * @returns {void}
 */
function insertLink() {
  const textEl = document.getElementById('linkText');
  const urlEl = document.getElementById('linkUrl');
  const text = (textEl && textEl.value.trim()) || '链接';
  let url = (urlEl && urlEl.value.trim()) || '#';
  if (url !== '#' && !/^(https?:|mailto:|tel:|#)/i.test(url)) url = 'https://' + url;

  editor.focus();
  const sel = window.getSelection();
  if (sel.rangeCount > 0 && !sel.isCollapsed && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    // 已有选区：直接创建链接（保留原选中文字）
    document.execCommand('createLink', false, url);
  } else {
    // 无选区：在光标处插入链接文字
    insertHtmlAtCursor('<a href="' + escapeHtml(url) + '" target="_blank" style="color:#576b95;text-decoration:none">' + escapeHtml(text) + '</a>', { atCursorOnly: true });
  }
  document.querySelectorAll('.link-popup').forEach(function (p) { p.remove(); });
  debounceAutoSave();
}

/**
 * 弹出插入表格对话框
 * @returns {void}
 */
function showTableDialog() {
  showModal('插入表格',
    '<div class="modal-label">行数</div>' +
    '<input class="modal-input" type="number" id="tableRows" value="3" min="1" max="20">' +
    '<div class="modal-label">列数</div>' +
    '<input class="modal-input" type="number" id="tableCols" value="3" min="1" max="10">',
    function () {
      const rows = parseInt((document.getElementById('tableRows') || {}).value, 10) || 3;
      const cols = parseInt((document.getElementById('tableCols') || {}).value, 10) || 3;
      insertTable(rows, cols);
    });
}

/**
 * 插入指定行列的表格
 * @param {number} rows 行数
 * @param {number} cols 列数
 * @returns {void}
 */
function insertTable(rows, cols) {
  editor.focus();
  let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0;font-size:14px"><tbody>';
  for (let r = 0; r < rows; r++) {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      html += '<td style="border:1px solid #e0e0e0;padding:8px 12px;min-width:40px">&nbsp;</td>';
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  insertHtmlAtCursor(html);
  debounceAutoSave();
}

/* ============================================================
 * 五、源码模式
 * ============================================================ */

/**
 * 切换可视化 / 源码模式
 * @returns {void}
 */
function toggleSourceMode() {
  sourceMode = !sourceMode;
  const panel = document.getElementById('sourceModePanel');
  const btn = document.getElementById('sourceBtn');
  if (sourceMode) {
    panel.style.display = 'block';
    document.getElementById('sourceCodeTextarea').value = editor.innerHTML;
    btn.classList.add('active');
  } else {
    editor.innerHTML = document.getElementById('sourceCodeTextarea').value;
    panel.style.display = 'none';
    btn.classList.remove('active');
    updateArticleInfo();
    saveDraft();
  }
}

/**
 * 源码模式下实时同步文本域内容到编辑区
 * @returns {void}
 */
function syncSourceToEditor() {
  if (sourceMode && editor) editor.innerHTML = document.getElementById('sourceCodeTextarea').value;
}

/* ============================================================
 * 六、光标与插入辅助
 * ============================================================ */

/**
 * 判断编辑器内是否存在有效选区
 * @returns {boolean} 存在非折叠选区返回 true
 */
function hasEditorSelection() {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return false;
  return editor.contains(sel.getRangeAt(0).commonAncestorContainer);
}

/**
 * 获取当前选区的 HTML 片段
 * @returns {string} 选区的 HTML，若无选区返回空字符串
 */
function getSelectionHtml() {
  const sel = window.getSelection();
  if (!sel.rangeCount) return '';
  const div = document.createElement('div');
  for (let i = 0; i < sel.rangeCount; i++) div.appendChild(sel.getRangeAt(i).cloneContents());
  return div.innerHTML;
}

/**
 * 用指定 HTML 替换当前选区
 * @param {string} html 新内容
 * @returns {boolean} 是否替换成功
 */
function replaceSelectionWithHtml(html) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const frag = document.createDocumentFragment();
  let last = null;
  while (temp.firstChild) { last = frag.appendChild(temp.firstChild); }
  range.insertNode(frag);
  if (last) { range.setStartAfter(last); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
  updateArticleInfo();
  debounceAutoSave();
  return true;
}

/**
 * 移动光标到编辑区末尾
 * @returns {void}
 */
function moveCursorToEnd() {
  editor.focus();
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * 在光标处插入 HTML（无有效光标则插入到文末），完成后光标移至插入内容之后
 * @param {string} html 待插入 HTML
 * @param {Object} [opts] 可选项 { atCursorOnly: 仅光标处插入（无光标则不插入）, noSeparator: 文末插入时不加空行 }
 * @returns {Node|null} 插入的最后一个节点
 */
function insertHtmlAtCursor(html, opts) {
  opts = opts || {};
  editor.focus();
  const sel = window.getSelection();
  const inEditor = sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).commonAncestorContainer);

  if (!inEditor && opts.atCursorOnly) return null;

  let range;
  let prefix = '';
  if (inEditor) {
    range = sel.getRangeAt(0);
    range.collapse(false);
  } else {
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const hasContent = editor.textContent && editor.textContent.trim().length > 0;
    if (hasContent && !opts.noSeparator) prefix = '<p><br></p>';
  }

  const temp = document.createElement('div');
  temp.innerHTML = prefix + html;
  const frag = document.createDocumentFragment();
  let last = null;
  while (temp.firstChild) last = frag.appendChild(temp.firstChild);
  range.insertNode(frag);
  if (last) { range.setStartAfter(last); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }

  const scrollArea = document.getElementById('editorScroll');
  if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
  updateArticleInfo();
  debounceAutoSave();
  return last;
}

/**
 * 在文末追加 HTML（保留原有内容）
 * @param {string} html 待插入 HTML
 * @returns {Node|null} 插入的最后一个节点
 */
function insertHtmlAtEnd(html) { return insertHtmlAtCursor(html, {}); }

/**
 * 用 HTML 整体替换编辑区内容
 * @param {string} html 新内容
 * @param {boolean} [keepTitle=true] 是否保留标题
 * @returns {void}
 */
function setEditorHtml(html, keepTitle) {
  editor.innerHTML = html || '';
  if (keepTitle === false) titleInput.value = '';
  updateArticleInfo();
  saveDraft();
}

/* ============================================================
 * 七、粘贴处理
 * ============================================================ */

/**
 * 编辑器粘贴处理：支持粘贴图片、清洗危险节点、保留样式
 * @param {ClipboardEvent} e 粘贴事件
 * @returns {void}
 */
function handleEditorPaste(e) {
  const cd = e.clipboardData;
  if (!cd) return;

  // 1) 优先处理剪贴板中的图片文件
  const items = cd.items ? Array.from(cd.items) : [];
  const imgItem = items.find(function (it) { return it.type && it.type.indexOf('image') === 0; });
  if (imgItem) {
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (file) readFileAsDataURL(file).then(function (url) { insertImageByUrl(url); });
    return;
  }

  // 2) 清洗粘贴的 HTML：去除脚本、事件、危险链接
  const html = cd.getData('text/html');
  if (html) {
    e.preventDefault();
    const clean = sanitizePastedHtml(html);
    insertHtmlAtCursor(clean, { noSeparator: true });
  }
  // 纯文本则走浏览器默认行为
}

/**
 * 清洗粘贴的 HTML，移除脚本/事件/危险属性
 * @param {string} html 原始 HTML
 * @returns {string} 清洗后的 HTML
 */
function sanitizePastedHtml(html) {
  const temp = document.createElement('div');
  temp.innerHTML = html;
  temp.querySelectorAll('script,style,link,meta,iframe,object,embed,form,input,button,select,textarea').forEach(function (el) { el.remove(); });
  temp.querySelectorAll('*').forEach(function (el) {
    Array.from(el.attributes).forEach(function (attr) {
      const name = attr.name.toLowerCase();
      const val = String(attr.value || '');
      if (name.slice(0, 2) === 'on') el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && /^\s*javascript:/i.test(val)) el.removeAttribute(attr.name);
      if (name === 'id' || name === 'class') { /* 保留 class 供排版参考 */ }
    });
  });
  return temp.innerHTML;
}

/* ============================================================
 * 八、封面图
 * ============================================================ */

/**
 * 设置封面图（来自 file input）
 * @param {Event} event change 事件
 * @returns {void}
 */
function setCoverImage(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  readFileAsDataURL(file).then(function (url) {
    applyCoverFromUrl(url);
    saveDraft();
  });
  event.target.value = '';
}

/**
 * 按 URL/DataURL 应用封面图
 * @param {string} url 图片地址
 * @returns {void}
 */
function applyCoverFromUrl(url) {
  coverDataUrl = url;
  const upload = document.getElementById('coverUpload');
  upload.innerHTML = '<img src="' + url + '" alt="封面图">' +
    '<button class="remove-cover" onclick="event.stopPropagation();removeCover()">×</button>';
  upload.classList.add('has-image');
}

/**
 * 移除封面图
 * @returns {void}
 */
function removeCover() {
  coverDataUrl = null;
  const upload = document.getElementById('coverUpload');
  upload.classList.remove('has-image');
  upload.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="1.5" width="32" height="32"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' +
    '<span>点击上传封面图</span><span style="font-size:11px">建议尺寸 900×383</span>' +
    '<button class="remove-cover" onclick="event.stopPropagation();removeCover()">×</button>';
  saveDraft();
}

/* ============================================================
 * 九、文章信息统计
 * ============================================================ */

/**
 * 刷新文章字数、阅读时长、段落数、图片数、摘要字数
 * @returns {void}
 */
function updateArticleInfo() {
  if (!editor) return;
  const text = editor.innerText || '';
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || []).length;
  const total = chineseChars + englishWords;

  const wc = document.getElementById('wordCount');
  if (wc) wc.textContent = total;
  const rt = document.getElementById('readTime');
  if (rt) rt.textContent = Math.max(1, Math.round(total / 400));
  const pc = document.getElementById('paraCount');
  if (pc) pc.textContent = editor.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, blockquote, li').length || 1;
  const ic = document.getElementById('imgCount');
  if (ic) ic.textContent = editor.querySelectorAll('img').length;
  if (summaryInput) {
    const cc = document.getElementById('charCount');
    if (cc) cc.textContent = summaryInput.value.length;
  }
}

/**
 * 刷新摘要字数显示
 * @returns {void}
 */
function updateCharCount() {
  const cc = document.getElementById('charCount');
  if (cc && summaryInput) cc.textContent = summaryInput.value.length;
}

/* ============================================================
 * 十、预览 / 复制 / 导出 / 清空
 * ============================================================ */

/**
 * 手机预览弹窗
 * @returns {void}
 */
function showPreview() {
  if (!editor) return;
  const title = titleInput.value || '文章标题';
  const author = authorInput.value || '';
  const contentHtml = editor.innerHTML;
  const summary = summaryInput.value || (editor.innerText || '').slice(0, 54);

  const html =
    '<div class="modal-overlay" onclick="if(event.target===this)this.remove()">' +
      '<div class="preview-phone" onclick="event.stopPropagation()">' +
        '<div class="preview-phone-header">📱 手机预览 · ' + escapeHtml(APP_INFO.author) + '</div>' +
        '<div class="preview-phone-body">' +
          '<div class="preview-title">' + escapeHtml(title) + '</div>' +
          (author ? '<div class="preview-author">' + escapeHtml(author) + '</div>' : '') +
          contentHtml +
          (summary ? '<hr style="border:none;border-top:1px solid #eee;margin:12px 0"><div style="color:#999;font-size:12px">📝 ' + escapeHtml(summary) + '</div>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  document.getElementById('modalContainer').innerHTML = html;
}

/**
 * 构造适配微信公众号的正文 HTML（标题 + 作者 + 正文）
 * @returns {string} 完整正文 HTML
 */
function buildWechatHtml() {
  const title = (titleInput.value || '').trim();
  const author = (authorInput.value || '').trim();
  let html = '';
  if (title) {
    html += '<h1 style="font-size:22px;font-weight:700;color:#1a1a1a;text-align:center;margin:0 0 6px;line-height:1.4">' + escapeHtml(title) + '</h1>';
  }
  if (author) {
    html += '<p style="font-size:13px;color:#999;text-align:center;margin:0 0 20px">' + escapeHtml(author) + '</p>';
  }
  html += editor.innerHTML;
  return html;
}

/**
 * 一键复制到微信公众号（富文本）
 * @returns {void}
 */
function copyToWechat() {
  if (!editor) return;
  const contentHtml = editor.innerHTML;
  if (!contentHtml || !contentHtml.trim() || contentHtml === '<br>') {
    showToast('⚠️ 请先输入文章内容');
    return;
  }
  const html = buildWechatHtml();
  const text = (titleInput.value ? titleInput.value + '\n\n' : '') + (editor.innerText || '');
  copyHtmlToClipboard(html, text).then(function (ok) {
    if (ok) showToast('✅ 已复制！到公众号后台粘贴即可（图片需在后台重新上传）', 3200);
    else showToast('❌ 复制失败，请改用「导出 HTML 文件」', 3000);
  });
}

/**
 * 导出为独立 HTML 文件
 * @returns {void}
 */
function exportHTML() {
  const title = titleInput.value || '公众号文章';
  const fullHtml = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + escapeHtml(title) + '</title>\n' +
    '<meta name="author" content="' + escapeHtml(APP_INFO.author) + '">\n' +
    '<style>\n' +
    "  body { max-width: 680px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; font-size: 15px; line-height: 1.8; color: #3e3e3e; }\n" +
    '  blockquote { border-left: 3px solid #07c160; padding: 8px 16px; margin: 12px 0; background: #f9fdfb; color: #666; }\n' +
    '  img { max-width: 100%; height: auto; display: block; margin: 16px auto; border-radius: 4px; }\n' +
    '  table { border-collapse: collapse; width: 100%; margin: 12px 0; }\n' +
    '  table td, table th { border: 1px solid #e0e0e0; padding: 8px 12px; }\n' +
    '</style>\n</head>\n<body>\n' +
    buildWechatHtml() +
    '\n</body>\n</html>';
  downloadText(title + '.html', fullHtml, 'text/html;charset=UTF-8');
  showToast('💾 HTML 文件已下载');
}

/**
 * 清空全部内容（含草稿）
 * @returns {void}
 */
function clearAll() {
  confirmDialog('确定要清空所有编辑内容吗？<br>此操作不可撤销。', function () {
    editor.innerHTML = '';
    titleInput.value = '';
    authorInput.value = '';
    summaryInput.value = '';
    removeCover();
    updateCharCount();
    updateArticleInfo();
    localStorage.removeItem(STORAGE_KEYS.draft);
    showToast('🗑️ 内容已清空');
  });
}

/* ============================================================
 * 十一、草稿保存与恢复
 * ============================================================ */

/**
 * 防抖自动保存
 * @returns {void}
 */
function debounceAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(function () { saveDraft(); updateArticleInfo(); }, 500);
}

/**
 * 保存草稿到 localStorage
 * @param {boolean} [manual=false] 是否手动触发（手动时给出提示）
 * @returns {void}
 */
function saveDraft(manual) {
  if (!editor) return;
  const draft = {
    title: titleInput.value,
    author: authorInput.value,
    content: editor.innerHTML,
    summary: summaryInput.value,
    coverImage: coverDataUrl,
    savedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(draft));
    const el = document.getElementById('saveStatus');
    if (el) {
      el.textContent = (manual ? '已保存 ' : '已自动保存 ') + new Date().toLocaleTimeString();
      setTimeout(function () { el.textContent = ''; }, 2500);
    }
    if (manual) showToast('💾 草稿已保存');
  } catch (e) {
    showToast('⚠️ 自动保存失败：本地存储空间不足，请清理大图');
  }
}

/**
 * 从 localStorage 恢复草稿
 * @returns {void}
 */
function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.draft);
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft.title) titleInput.value = draft.title;
    if (draft.author) authorInput.value = draft.author;
    if (draft.content) editor.innerHTML = draft.content;
    if (draft.summary) summaryInput.value = draft.summary;
    if (draft.coverImage) applyCoverFromUrl(draft.coverImage);
    if (draft.savedAt) {
      const t = new Date(draft.savedAt);
      const el = document.getElementById('saveStatus');
      if (!isNaN(t) && el) {
        el.textContent = '已恢复 ' + t.toLocaleString();
        setTimeout(function () { el.textContent = ''; }, 3000);
      }
    }
    autoResizeTitle();
    updateCharCount();
    updateArticleInfo();
  } catch (e) {
    console.error('草稿恢复失败', e);
  }
}

/**
 * 标题输入框高度自适应
 * @returns {void}
 */
function autoResizeTitle() {
  if (!titleInput) return;
  titleInput.style.height = 'auto';
  titleInput.style.height = titleInput.scrollHeight + 'px';
}
