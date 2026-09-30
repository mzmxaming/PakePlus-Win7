/* ==========================================================================
 * upload.js —— 图片上传 / 图床
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：支持「本地内嵌 base64 / 自定义上传接口 / GitHub 图床」三种方式，
 *       并支持拖拽与粘贴上传。配置仅保存在本机浏览器。
 * 依赖：utils.js / config.js / editor.js
 * ========================================================================== */

/** 上传配置默认值 */
const UPLOAD_DEFAULTS = {
  source: 'local',            // local | custom | github
  customUrl: '',              // 自定义上传接口
  customField: 'file',        // 表单字段名
  customHeaders: '',          // 额外请求头（JSON 字符串）
  customResultPath: 'data.url', // 从返回 JSON 中取 URL 的路径
  ghOwner: '',
  ghRepo: '',
  ghBranch: 'main',
  ghToken: '',
  ghDir: 'images',
  ghCdn: true                 // 使用 jsDelivr 加速
};

/**
 * 读取上传配置
 * @returns {Object} 配置对象
 */
function getUploadConfig() {
  try {
    const raw = localStorage.getItem('wxeditor_upload');
    return Object.assign({}, UPLOAD_DEFAULTS, raw ? JSON.parse(raw) : {});
  } catch (e) { return Object.assign({}, UPLOAD_DEFAULTS); }
}

/**
 * 保存上传配置
 * @param {Object} cfg 配置片段
 * @returns {Object} 保存后的完整配置
 */
function saveUploadConfig(cfg) {
  const merged = Object.assign({}, getUploadConfig(), cfg || {});
  try { localStorage.setItem('wxeditor_upload', JSON.stringify(merged)); } catch (e) { /* 忽略 */ }
  return merged;
}

/**
 * 从界面读取上传配置
 * @returns {Object} 配置对象
 */
function collectUploadFromUI() {
  const val = function (id, def) { const el = document.getElementById(id); return el ? el.value.trim() : def; };
  const chk = function (id) { const el = document.getElementById(id); return el ? !!el.checked : false; };
  return {
    source: val('upSource', 'local'),
    customUrl: val('upCustomUrl', ''),
    customField: val('upCustomField', 'file') || 'file',
    customHeaders: val('upCustomHeaders', ''),
    customResultPath: val('upCustomResultPath', 'data.url') || 'data.url',
    ghOwner: val('upGhOwner', ''),
    ghRepo: val('upGhRepo', ''),
    ghBranch: val('upGhBranch', 'main') || 'main',
    ghToken: val('upGhToken', ''),
    ghDir: (val('upGhDir', 'images') || 'images').replace(/^\/+|\/+$/g, ''),
    ghCdn: chk('upGhCdn')
  };
}

/**
 * 把上传配置回填到界面
 * @param {Object} [cfg] 配置，缺省读取本地配置
 * @returns {void}
 */
function fillUploadUI(cfg) {
  const c = cfg || getUploadConfig();
  const set = function (id, v) { const el = document.getElementById(id); if (el != null) el.value = v; };
  const chk = function (id, v) { const el = document.getElementById(id); if (el) el.checked = !!v; };
  set('upSource', c.source);
  set('upCustomUrl', c.customUrl);
  set('upCustomField', c.customField);
  set('upCustomHeaders', c.customHeaders);
  set('upCustomResultPath', c.customResultPath);
  set('upGhOwner', c.ghOwner);
  set('upGhRepo', c.ghRepo);
  set('upGhBranch', c.ghBranch);
  set('upGhToken', c.ghToken);
  set('upGhDir', c.ghDir);
  chk('upGhCdn', c.ghCdn);
  toggleUploadFields();
}

/**
 * 按当前图床选择显示/隐藏对应配置区
 * @returns {void}
 */
function toggleUploadFields() {
  const src = (document.getElementById('upSource') || {}).value || 'local';
  const c = document.getElementById('upCustomFields');
  const g = document.getElementById('upGithubFields');
  if (c) c.style.display = src === 'custom' ? 'block' : 'none';
  if (g) g.style.display = src === 'github' ? 'block' : 'none';
}

/**
 * 保存上传设置
 * @returns {void}
 */
function saveUploadSettings() {
  const cfg = saveUploadConfig(collectUploadFromUI());
  fillUploadUI(cfg);
  showToast('💾 图片上传设置已保存');
}

/**
 * 按路径从对象中取值，如 data.url
 * @param {Object} obj 对象
 * @param {string} path 点分路径
 * @returns {*} 取到的值
 */
function pickByPath(obj, path) {
  if (!obj) return undefined;
  return String(path || '').split('.').filter(Boolean).reduce(function (acc, k) {
    return (acc == null) ? undefined : acc[k];
  }, obj);
}

/**
 * 上传图片，返回可直接用于 <img src> 的地址
 * @param {File} file 图片文件
 * @param {Object} [cfg] 上传配置，缺省读取
 * @returns {Promise<string>} 图片地址（URL 或 DataURL）
 */
async function uploadImageFile(file, cfg) {
  const c = cfg || getUploadConfig();
  if (c.source === 'github') return uploadToGithub(file, c);
  if (c.source === 'custom') return uploadToCustom(file, c);
  return readFileAsDataURL(file); // 本地内嵌
}

/**
 * 上传到自定义接口
 * @param {File} file 图片文件
 * @param {Object} c 配置
 * @returns {Promise<string>} 图片地址
 */
async function uploadToCustom(file, c) {
  if (!c.customUrl) throw new Error('请先填写自定义上传接口地址');
  const form = new FormData();
  form.append(c.customField || 'file', file, file.name || ('image-' + Date.now() + '.png'));

  const headers = {};
  if (c.customHeaders) {
    try {
      Object.assign(headers, JSON.parse(c.customHeaders));
    } catch (e) {
      throw new Error('额外请求头不是合法 JSON');
    }
  }
  const resp = await fetch(c.customUrl, { method: 'POST', body: form, headers: headers });
  if (!resp.ok) {
    let d = '';
    try { d = (await resp.text()).slice(0, 200); } catch (e) { /* 忽略 */ }
    throw new Error('上传接口返回 ' + resp.status + (d ? '：' + d : ''));
  }
  let data;
  try { data = await resp.json(); } catch (e) { throw new Error('上传接口返回的不是 JSON'); }
  const url = pickByPath(data, c.customResultPath);
  if (!url || typeof url !== 'string') throw new Error('未能从返回结果中解析图片地址（当前路径：' + c.customResultPath + '）');
  return url;
}

/**
 * 上传到 GitHub 仓库（Contents API）
 * @param {File} file 图片文件
 * @param {Object} c 配置
 * @returns {Promise<string>} 图片地址
 */
async function uploadToGithub(file, c) {
  if (!c.ghOwner || !c.ghRepo || !c.ghToken) throw new Error('请完整填写 GitHub 用户名、仓库与 Token');
  const dataUrl = await readFileAsDataURL(file);
  const base64 = String(dataUrl).split(',')[1] || '';
  const ext = (file.name.match(/\.(\w+)$/) || [null, 'png'])[1].toLowerCase();
  const safe = (file.name || 'image').replace(/[^\w.-]/g, '_').replace(/\.[^.]+$/, '');
  const path = (c.ghDir ? c.ghDir + '/' : '') + Date.now() + '-' + safe + '.' + ext;

  const apiUrl = 'https://api.github.com/repos/' + encodeURIComponent(c.ghOwner) + '/' + encodeURIComponent(c.ghRepo) +
    '/contents/' + path.split('/').map(encodeURIComponent).join('/');

  const resp = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + c.ghToken,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'upload: ' + path,
      content: base64,
      branch: c.ghBranch || 'main'
    })
  });
  if (!resp.ok) {
    let d = '';
    try { d = (await resp.text()).slice(0, 200); } catch (e) { /* 忽略 */ }
    throw new Error('GitHub 返回 ' + resp.status + (resp.status === 401 ? '（Token 无效或权限不足）' : '') + (d ? '：' + d : ''));
  }
  const data = await resp.json();
  const raw = (data.content && data.content.download_url) || '';
  if (!raw) throw new Error('GitHub 未返回图片地址');
  if (c.ghCdn) {
    return 'https://cdn.jsdelivr.net/gh/' + c.ghOwner + '/' + c.ghRepo + '@' + (c.ghBranch || 'main') + '/' + path;
  }
  return raw;
}

/**
 * 处理一个图片文件：按图床配置上传后插入正文
 * @param {File} file 图片文件
 * @returns {Promise<void>} 完成
 */
async function handleImageFileWithUpload(file) {
  if (!file || !/^image\//.test(file.type)) { showToast('⚠️ 仅支持图片文件'); return; }
  const cfg = getUploadConfig();
  if (cfg.source === 'local') { insertImageByUrl(await readFileAsDataURL(file)); return; }
  showToast('⏳ 正在上传图片...');
  try {
    const url = await uploadImageFile(file, cfg);
    insertImageByUrl(url);
    showToast('✅ 图片已上传并插入');
  } catch (e) {
    showToast('❌ 上传失败：' + e.message, 3200);
  }
}

/**
 * 初始化拖拽上传（拖到编辑区即可插入图片）
 * @returns {void}
 */
function initDragDropUpload() {
  const dropZones = [document.getElementById('editorContent'), document.getElementById('editorScroll')].filter(Boolean);
  dropZones.forEach(function (zone) {
    zone.addEventListener('dragover', function (e) {
      if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') !== -1) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        zone.style.outline = '2px dashed #07c160';
        zone.style.outlineOffset = '-6px';
      }
    });
    zone.addEventListener('dragleave', function () { zone.style.outline = ''; });
    zone.addEventListener('drop', function (e) {
      const files = e.dataTransfer && e.dataTransfer.files;
      if (!files || !files.length) return;
      const imgs = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); });
      if (!imgs.length) return;
      e.preventDefault();
      zone.style.outline = '';
      // 逐个插入（串行，保证顺序）
      (async function () {
        for (let i = 0; i < imgs.length; i++) {
          await handleImageFileWithUpload(imgs[i]);
        }
      })();
    });
  });
}
