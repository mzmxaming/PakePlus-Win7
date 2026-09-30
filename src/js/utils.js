/* ==========================================================================
 * utils.js —— 通用工具函数
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：提供选择器、提示、弹窗、剪贴板、下载、颜色换算等基础能力，供其它模块调用。
 * ========================================================================== */

/**
 * 查询单个元素（document.querySelector 简写）
 * @param {string} sel CSS 选择器
 * @param {ParentNode} [root=document] 查询根节点
 * @returns {Element|null} 匹配到的元素或 null
 */
function $(sel, root) { return (root || document).querySelector(sel); }

/**
 * 查询多个元素并返回数组（document.querySelectorAll 简写）
 * @param {string} sel CSS 选择器
 * @param {ParentNode} [root=document] 查询根节点
 * @returns {Element[]} 匹配到的元素数组
 */
function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

/**
 * 转义 HTML 特殊字符，防止 XSS 与结构破坏
 * @param {string} str 待转义字符串
 * @returns {string} 转义后的安全字符串
 */
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 生成唯一 ID
 * @param {string} [prefix='id'] 前缀
 * @returns {string} 形如 id_lz3k9a_4f2 的唯一标识
 */
function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

/**
 * 数值区间钳制
 * @param {number} v 输入值
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 钳制后的值
 */
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

/**
 * 简易防抖
 * @param {Function} fn 目标函数
 * @param {number} [wait=300] 延迟毫秒
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, wait) {
  let t = null;
  return function () {
    const args = arguments, ctx = this;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(ctx, args); }, wait == null ? 300 : wait);
  };
}

/**
 * 异步等待
 * @param {number} ms 毫秒
 * @returns {Promise<void>} 计时结束的 Promise
 */
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

/**
 * 顶部轻提示
 * @param {string} msg 提示文案
 * @param {number} [duration=2000] 展示时长（毫秒）
 * @returns {void}
 */
function showToast(msg, duration) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(function () { toast.remove(); }, 320);
  }, duration || 2000);
}

/**
 * 通用弹窗
 * @param {string} title 标题
 * @param {string} bodyHtml 内容 HTML
 * @param {Function} [onConfirm] 点击确定回调
 * @param {Object} [opts] 可选项 { confirmText, cancelText, hideCancel, onOpen }
 * @returns {HTMLElement} 弹窗遮罩元素
 */
function showModal(title, bodyHtml, onConfirm, opts) {
  opts = opts || {};
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal">' +
      '<div class="modal-header"><span>' + title + '</span>' +
        '<button class="modal-close" data-role="close">×</button></div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      '<div class="modal-footer">' +
        (opts.hideCancel ? '' : '<button class="action-btn secondary" style="width:auto" data-role="close">' + (opts.cancelText || '取消') + '</button>') +
        '<button class="action-btn primary" style="width:auto" data-role="confirm">' + (opts.confirmText || '确定') + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);

  /** 关闭弹窗 */
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', escHandler);
  }
  /** ESC 关闭处理 */
  function escHandler(e) { if (e.key === 'Escape') close(); }

  /** 处理按钮点击（直接绑定在弹窗元素上，避免被子元素阻止冒泡影响） */
  function handleAction(e) {
    const role = e.target && e.target.getAttribute && e.target.getAttribute('data-role');
    if (role === 'close') { close(); return; }
    if (role === 'confirm') {
      if (!onConfirm || onConfirm(overlay, close) !== false) close();
    }
  }

  // 点击遮罩空白处关闭
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  // 按钮点击直接绑定在弹窗容器上，确保「确定/取消/×」均可正常触发
  const modalEl = overlay.querySelector('.modal');
  if (modalEl) modalEl.addEventListener('click', handleAction);
  document.addEventListener('keydown', escHandler);
  if (typeof opts.onOpen === 'function') opts.onOpen(overlay);
  return overlay;
}

/**
 * 确认对话框
 * @param {string} message 提示文案
 * @param {Function} onConfirm 确认回调
 * @returns {void}
 */
function confirmDialog(message, onConfirm) {
  showModal('操作确认', '<p style="text-align:center;color:#666;padding:16px 0;line-height:1.7">' + message + '</p>', onConfirm);
}

/**
 * 将 HTML + 纯文本写入剪贴板（用于粘贴到微信公众号）
 * @param {string} html 富文本 HTML
 * @param {string} text 纯文本兜底
 * @returns {Promise<boolean>} 是否成功
 */
function copyHtmlToClipboard(html, text) {
  // 优先使用现代异步剪贴板 API，可保留富文本格式
  if (navigator.clipboard && window.ClipboardItem) {
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text || ''], { type: 'text/plain' })
      });
      return navigator.clipboard.write([item]).then(function () { return true; }).catch(function () {
        return fallbackCopyHtml(html);
      });
    } catch (e) {
      return Promise.resolve(fallbackCopyHtml(html));
    }
  }
  return Promise.resolve(fallbackCopyHtml(html));
}

/**
 * 降级复制：通过临时节点选中 + execCommand('copy')
 * @param {string} html 富文本 HTML
 * @returns {boolean} 是否成功
 */
function fallbackCopyHtml(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);
  const range = document.createRange();
  range.selectNodeContents(container);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  sel.removeAllRanges();
  document.body.removeChild(container);
  return ok;
}

/**
 * 复制纯文本到剪贴板
 * @param {string} text 文本内容
 * @returns {Promise<boolean>} 是否成功
 */
function copyPlainText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).then(function () { return true; }).catch(function () { return false; });
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  document.body.removeChild(ta);
  return Promise.resolve(ok);
}

/**
 * 下载文本内容为文件
 * @param {string} filename 文件名
 * @param {string} content 文件内容
 * @param {string} [mime='text/plain;charset=UTF-8'] MIME 类型
 * @returns {void}
 */
function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime || 'text/plain;charset=UTF-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/**
 * 读取本地文件为 DataURL
 * @param {File} file 文件对象
 * @returns {Promise<string>} DataURL 字符串
 */
function readFileAsDataURL(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) { resolve(e.target.result); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 读取本地文件为文本
 * @param {File} file 文件对象
 * @returns {Promise<string>} 文本内容
 */
function readFileAsText(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function (e) { resolve(e.target.result); };
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * 十六进制颜色转 RGB 对象
 * @param {string} hex 形如 #07c160 或 07c160
 * @returns {{r:number,g:number,b:number}|null} RGB 对象，解析失败返回 null
 */
function hexToRgb(hex) {
  if (!hex) return null;
  let h = String(hex).trim().replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

/**
 * RGB 转十六进制颜色
 * @param {number} r 红 0-255
 * @param {number} g 绿 0-255
 * @param {number} b 蓝 0-255
 * @returns {string} 形如 #07c160
 */
function rgbToHex(r, g, b) {
  const to2 = function (n) { const s = clamp(Math.round(n), 0, 255).toString(16); return s.length === 1 ? '0' + s : s; };
  return '#' + to2(r) + to2(g) + to2(b);
}

/**
 * 将任意 CSS 颜色字符串解析为 hex（支持 #hex / rgb() / rgba()）
 * @param {string} color 颜色字符串
 * @returns {string|null} #rrggbb 或 null
 */
function parseColorToHex(color) {
  if (!color) return null;
  const c = String(color).trim().toLowerCase();
  if (c === 'transparent' || c === 'inherit' || c === 'currentcolor') return null;
  if (c[0] === '#') return hexToRgb(c) ? (c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c) : null;
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map(function (s) { return parseFloat(s.trim()); });
    if (parts.length >= 3) return rgbToHex(parts[0], parts[1], parts[2]);
  }
  return null;
}

/* ---------- HSL 工具：用于生成和谐配色 ---------- */

/**
 * hex 转 HSL
 * @param {string} hex 十六进制颜色
 * @returns {{h:number,s:number,l:number}} 色相 0-360，饱和度/亮度 0-100
 */
function hexToHsl(hex) {
  const rgb = hexToRgb(hex) || { r: 0, g: 0, b: 0 };
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * HSL 转 hex
 * @param {number} h 色相 0-360
 * @param {number} s 饱和度 0-100
 * @param {number} l 亮度 0-100
 * @returns {string} #rrggbb
 */
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/**
 * 判断颜色是否偏浅（用于自动选择文字前景色）
 * @param {string} hex 颜色
 * @returns {boolean} 亮度过高返回 true
 */
function isLightColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  // 相对亮度经验公式
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.72;
}

/**
 * 将 HTML 字符串转换为纯文本
 * @param {string} html HTML 内容
 * @returns {string} 纯文本
 */
function htmlToText(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';
  return div.textContent || div.innerText || '';
}
