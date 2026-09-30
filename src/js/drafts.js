/* ==========================================================================
 * drafts.js —— 多草稿箱与数据备份
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：本地草稿箱（保存/载入/删除/重命名）、全量数据备份与恢复。
 * 依赖：utils.js / config.js / editor.js
 * ========================================================================== */

/** 草稿箱存储键 */
const DRAFTS_KEY = 'wxeditor_drafts';

/**
 * 读取草稿箱
 * @returns {Object[]} 草稿数组（按更新时间倒序）
 */
function getDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return list.sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
  } catch (e) { return []; }
}

/**
 * 保存草稿箱
 * @param {Object[]} list 草稿数组
 * @returns {boolean} 是否保存成功
 */
function saveDrafts(list) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(list));
    return true;
  } catch (e) {
    showToast('⚠️ 草稿保存失败：本地存储空间不足（图片过多）');
    return false;
  }
}

/**
 * 收集当前编辑器中的文章数据
 * @returns {Object} 文章数据对象
 */
function collectCurrentArticle() {
  return {
    title: (document.getElementById('articleTitle') || {}).value || '',
    author: (document.getElementById('articleAuthor') || {}).value || '',
    summary: (document.getElementById('articleSummary') || {}).value || '',
    content: (editor && editor.innerHTML) || '',
    coverImage: coverDataUrl || ''
  };
}

/**
 * 把文章数据写回编辑器
 * @param {Object} data 文章数据
 * @returns {void}
 */
function applyArticleData(data) {
  if (!data) return;
  const t = document.getElementById('articleTitle');
  const a = document.getElementById('articleAuthor');
  const s = document.getElementById('articleSummary');
  if (t) t.value = data.title || '';
  if (a) a.value = data.author || '';
  if (s) s.value = data.summary || '';
  if (editor) editor.innerHTML = data.content || '';
  if (data.coverImage) applyCoverFromUrl(data.coverImage);
  else removeCover();
  autoResizeTitle();
  updateCharCount();
  updateArticleInfo();
  saveDraft();
}

/**
 * 把当前文章另存为新草稿
 * @param {string} [name] 草稿名称
 * @returns {void}
 */
function saveAsNewDraft(name) {
  const data = collectCurrentArticle();
  if (!data.content.trim() && !data.title.trim()) { showToast('⚠️ 当前没有可保存的内容'); return; }
  const list = getDrafts();
  const now = new Date().toISOString();
  list.push({
    id: uid('draft'),
    name: (name || data.title || '未命名草稿').slice(0, 40),
    title: data.title,
    author: data.author,
    summary: data.summary,
    content: data.content,
    coverImage: data.coverImage,
    createdAt: now,
    updatedAt: now
  });
  if (saveDrafts(list)) {
    showToast('💾 已存入草稿箱：' + (name || data.title || '未命名草稿'));
    renderDraftsList();
  }
}

/**
 * 弹窗输入草稿名并保存
 * @returns {void}
 */
function promptSaveDraft() {
  const data = collectCurrentArticle();
  showModal('保存到草稿箱',
    '<div class="modal-label">草稿名称</div>' +
    '<input class="modal-input" id="draftName" placeholder="给这篇草稿起个名字" value="' + escapeHtml(data.title || ('草稿 ' + new Date().toLocaleDateString())) + '">' +
    '<div class="hint-text">同一名称可重复保存，草稿箱会自动按更新时间排序。</div>',
    function () {
      const name = (document.getElementById('draftName') || {}).value || '';
      saveAsNewDraft(name.trim());
    });
}

/**
 * 打开草稿箱
 * @returns {void}
 */
function openDraftsManager() {
  showModal('草稿箱 / 数据管理',
    '<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">' +
      '<button class="action-btn secondary sm" style="flex:1;min-width:110px" onclick="promptSaveDraft()">＋ 当前存为新草稿</button>' +
      '<button class="action-btn secondary sm" style="flex:1;min-width:110px" onclick="exportBackup()">📦 备份全部数据</button>' +
      '<button class="action-btn secondary sm" style="flex:1;min-width:110px" onclick="document.getElementById(\'backupFileInput\').click()">📥 恢复备份</button>' +
    '</div>' +
    '<div id="draftListBox"></div>' +
    '<div class="hint-text" style="margin-top:10px">草稿仅保存在本机浏览器，建议定期使用「备份全部数据」导出 JSON。</div>',
    null,
    {
      confirmText: '关闭',
      hideCancel: true,
      onOpen: renderDraftsList
    });
}

/**
 * 渲染草稿箱列表
 * @returns {void}
 */
function renderDraftsList() {
  const box = document.getElementById('draftListBox');
  if (!box) return;
  const list = getDrafts();
  if (!list.length) {
    box.innerHTML = '<div class="empty-tip">草稿箱为空<br>点击右上角保存按钮或此处新建</div>';
    return;
  }
  box.innerHTML = list.map(function (d) {
    const chars = String(d.content || '').replace(/<[^>]*>/g, '').length;
    const time = new Date(d.updatedAt || d.createdAt || Date.now()).toLocaleString();
    return '<div class="my-style-item" style="align-items:flex-start">' +
      '<span style="flex:1;min-width:0">' +
        '<span class="name" style="display:block;font-weight:600;color:#333">' + escapeHtml(d.name || '未命名') + '</span>' +
        '<span style="font-size:10px;color:#bbb">' + time + ' · 约 ' + chars + ' 字</span>' +
      '</span>' +
      '<button class="mini-btn" onclick="loadDraftById(\'' + d.id + '\')">载入</button>' +
      '<button class="mini-btn del" onclick="deleteDraftById(\'' + d.id + '\')">删除</button>' +
    '</div>';
  }).join('');
}

/**
 * 载入指定草稿
 * @param {string} id 草稿 ID
 * @returns {void}
 */
function loadDraftById(id) {
  const d = getDrafts().find(function (x) { return x.id === id; });
  if (!d) { showToast('❌ 草稿未找到'); return; }
  applyArticleData(d);
  document.querySelectorAll('.modal-overlay').forEach(function (m) { m.remove(); });
  showToast('✅ 已载入草稿：' + (d.name || '未命名'));
}

/**
 * 删除指定草稿
 * @param {string} id 草稿 ID
 * @returns {void}
 */
function deleteDraftById(id) {
  saveDrafts(getDrafts().filter(function (x) { return x.id !== id; }));
  renderDraftsList();
  showToast('🗑️ 草稿已删除');
}

/* ============================================================
 * 数据备份与恢复
 * ============================================================ */

/**
 * 备份全部本地数据为 JSON 文件
 * @returns {void}
 */
function exportBackup() {
  const payload = {
    app: APP_INFO.name,
    version: APP_INFO.version,
    exportedAt: new Date().toISOString(),
    data: {}
  };
  Object.keys(STORAGE_KEYS).forEach(function (k) {
    payload.data[k] = localStorage.getItem(STORAGE_KEYS[k]);
  });
  payload.data[DRAFTS_KEY] = localStorage.getItem(DRAFTS_KEY);
  payload.data.wxeditor_upload = localStorage.getItem('wxeditor_upload');
  payload.data.wxeditor_typeset = localStorage.getItem('wxeditor_typeset');
  downloadText('wxeditor-backup-' + new Date().toISOString().slice(0, 10) + '.json',
    JSON.stringify(payload, null, 2), 'application/json;charset=UTF-8');
  showToast('💾 数据已备份下载');
}

/**
 * 从备份文件恢复数据
 * @param {Event} event file input 的 change 事件
 * @returns {Promise<void>} 完成
 */
async function importBackup(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await readFileAsText(file);
    const json = JSON.parse(text);
    const data = json.data || {};
    Object.keys(data).forEach(function (k) {
      if (data[k] == null) return;
      localStorage.setItem(k, data[k]);
    });
    showToast('✅ 数据已恢复，正在重新载入…');
    setTimeout(function () { location.reload(); }, 900);
  } catch (e) {
    showToast('❌ 备份文件解析失败：' + e.message);
  }
  event.target.value = '';
}
