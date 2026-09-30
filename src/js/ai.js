/* ==========================================================================
 * ai.js —— AI 能力模块
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：AI 设置与连接、写方案、选中文字处理、智能排版、生图、模板风格学习、配图建议。
 * 依赖：utils.js / config.js / editor.js / templates.js / theme.js
 * ========================================================================== */

/** 当前 AI 请求的中断控制器（用于「停止生成」） */
var aiAbortController = null;
/** 最近一次学习得到的风格令牌 */
var lastLearnedTokens = null;
/** 最近一次生成/预览的图片地址 */
var lastGeneratedImageUrl = '';

/* ============================================================
 * 一、抽屉与标签
 * ============================================================ */

/**
 * 打开 AI 工作台抽屉
 * @param {string} [tab] 指定要激活的标签：write/layout/image/learn/settings
 * @returns {void}
 */
function openAiDrawer(tab) {
  const drawer = document.getElementById('aiDrawer');
  const mask = document.getElementById('aiDrawerMask');
  if (!drawer) return;
  drawer.classList.add('show');
  mask.classList.add('show');
  loadAiSettingsIntoForm();
  refreshLearnTemplateSelect();
  renderMyStyles();
  if (tab) {
    const btn = document.querySelector('.ai-tab[data-ai-tab="' + tab + '"]');
    if (btn) switchAiTab(tab, btn);
  }
}

/**
 * 关闭 AI 工作台抽屉
 * @returns {void}
 */
function closeAiDrawer() {
  const drawer = document.getElementById('aiDrawer');
  const mask = document.getElementById('aiDrawerMask');
  if (drawer) drawer.classList.remove('show');
  if (mask) mask.classList.remove('show');
  hideSelectionBubble();
}

/**
 * 切换 AI 抽屉标签页
 * @param {string} tab 标签名
 * @param {HTMLElement} btn 被点击的标签按钮
 * @returns {void}
 */
function switchAiTab(tab, btn) {
  $$('.ai-tab').forEach(function (t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ['write', 'layout', 'image', 'learn', 'settings'].forEach(function (name) {
    const pane = document.getElementById('ai-pane-' + name);
    if (pane) pane.style.display = name === tab ? 'block' : 'none';
  });
  if (tab === 'learn') refreshLearnTemplateSelect();
}

/* ============================================================
 * 二、AI 设置
 * ============================================================ */

/**
 * 将已保存的 AI 配置回填到设置表单
 * @returns {void}
 */
function loadAiSettingsIntoForm() {
  const cfg = getAIConfig();
  const set = function (id, val) { const el = document.getElementById(id); if (el != null) el.value = val; };
  set('aiBaseUrl', cfg.baseUrl);
  set('aiApiKey', cfg.apiKey);
  set('aiModel', cfg.model);
  set('aiTemperature', cfg.temperature);
  const tv = document.getElementById('aiTempVal');
  if (tv) tv.textContent = cfg.temperature;
  set('aiStream', cfg.stream ? '1' : '0');
  set('imgSource', cfg.imageSource || 'builtin');
  set('imgApiUrl', cfg.imageApiUrl || '');
  set('imgApiKey', cfg.imageApiKey || '');
  set('imgApiModel', cfg.imageApiModel || '');
  set('imgSize', cfg.imageSize || 'landscape_4_3');
  toggleImageSourceFields();
  updateAiStatusChip();
}

/**
 * 保存 AI 设置
 * @returns {void}
 */
function saveAiSettings() {
  const val = function (id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  saveAIConfig({
    baseUrl: val('aiBaseUrl'),
    apiKey: val('aiApiKey'),
    model: val('aiModel'),
    temperature: parseFloat(val('aiTemperature')) || 0.7,
    stream: val('aiStream') === '1',
    imageSource: val('imgSource') || 'builtin',
    imageApiUrl: val('imgApiUrl'),
    imageApiKey: val('imgApiKey'),
    imageApiModel: val('imgApiModel'),
    imageSize: val('imgSize') || 'landscape_4_3'
  });
  updateAiStatusChip();
  showToast('💾 AI 设置已保存（仅存本机）');
}

/**
 * 一键填充厂商预设
 * @param {string} key 预设键：deepseek/dashscope/zhipu/moonshot/openai/ollama
 * @returns {void}
 */
function fillAiPreset(key) {
  const preset = AI_PRESETS[key];
  if (!preset) return;
  const base = document.getElementById('aiBaseUrl');
  const model = document.getElementById('aiModel');
  if (base) base.value = preset.baseUrl;
  if (model) model.value = preset.model;
  showToast('已填充「' + key + '」预设，请补充 API Key');
}

/**
 * 测试 AI 连接
 * @returns {Promise<void>} 测试结果
 */
async function testAiConnection() {
  const status = document.getElementById('aiTestStatus');
  const setStatus = function (text, cls) {
    if (!status) return;
    status.textContent = text;
    status.className = 'ai-status' + (cls ? ' ' + cls : '');
  };
  saveAiSettings();
  if (!isAiConfigured()) { setStatus('❌ 请先完整填写 Base URL、API Key 与模型名称', 'err'); return; }
  setStatus('⏳ 正在连接...');
  try {
    const reply = await callChat([
      { role: 'system', content: '你是测试助手，请只回复两个字：正常' },
      { role: 'user', content: '连接测试' }
    ], { stream: false, temperature: 0 });
    setStatus('✅ 连接成功，模型回复：' + String(reply).slice(0, 40), 'ok');
    updateAiStatusChip(true);
  } catch (e) {
    setStatus('❌ 连接失败：' + e.message, 'err');
    updateAiStatusChip(false);
  }
}

/**
 * 更新顶部 AI 状态标签
 * @param {boolean} [ok] 已知连接结果；不传则仅按是否配置判断
 * @returns {void}
 */
function updateAiStatusChip(ok) {
  const chip = document.getElementById('aiStatusChip');
  if (!chip) return;
  if (!isAiConfigured()) { chip.textContent = 'AI 未配置'; chip.className = 'ai-chip'; return; }
  if (ok === false) { chip.textContent = 'AI 连接异常'; chip.className = 'ai-chip err'; return; }
  const cfg = getAIConfig();
  chip.textContent = 'AI 已配置 · ' + (cfg.model || '');
  chip.className = 'ai-chip on';
}

/* ============================================================
 * 三、核心对话调用
 * ============================================================ */

/**
 * 调用 OpenAI 兼容的 chat/completions 接口
 * @param {Array<{role:string,content:string}>} messages 对话消息
 * @param {Object} [opts] 可选项 { stream, temperature, onDelta }
 * @returns {Promise<string>} 模型回复全文
 */
async function callChat(messages, opts) {
  opts = opts || {};
  const cfg = getAIConfig();
  if (!cfg.baseUrl || !cfg.apiKey || !cfg.model) throw new Error('请先在 AI 工作台「设置」中配置接口');

  const endpoint = buildChatEndpoint(cfg.baseUrl);
  const useStream = opts.stream != null ? opts.stream : cfg.stream;

  aiAbortController = new AbortController();
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + cfg.apiKey
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: messages,
      temperature: opts.temperature != null ? opts.temperature : cfg.temperature,
      stream: !!useStream
    }),
    signal: aiAbortController.signal
  });

  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.text()).slice(0, 300); } catch (e) { detail = ''; }
    throw new Error('接口返回 ' + resp.status + ' ' + resp.statusText + (detail ? '：' + detail : ''));
  }

  // 非流式：一次性返回
  if (!useStream) {
    const data = await resp.json();
    const content = data && data.choices && data.choices[0] &&
      (data.choices[0].message ? data.choices[0].message.content : data.choices[0].text);
    return content || '';
  }

  // 流式：逐块解析 SSE
  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let full = '';
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.indexOf('data:') !== 0) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices && json.choices[0] &&
          (json.choices[0].delta ? json.choices[0].delta.content : '');
        if (delta) {
          full += delta;
          if (opts.onDelta) opts.onDelta(delta, full);
        }
      } catch (e) { /* 忽略不完整分片 */ }
    }
  }
  return full;
}

/**
 * 中断当前 AI 请求
 * @returns {void}
 */
function aiStop() {
  if (aiAbortController) {
    try { aiAbortController.abort(); } catch (e) { /* 忽略 */ }
    aiAbortController = null;
    showToast('⏹ 已停止生成');
  }
  setWriteButtons(false);
}

/**
 * 切换「生成 / 停止」按钮状态
 * @param {boolean} running 是否正在生成
 * @returns {void}
 */
function setWriteButtons(running) {
  const b1 = document.getElementById('btnAiWrite');
  const b2 = document.getElementById('btnAiStop');
  if (b1) { b1.disabled = running; b1.textContent = running ? '⏳ 生成中...' : '✨ 生成文章'; }
  if (b2) b2.style.display = running ? 'block' : 'none';
}

/* ============================================================
 * 四、AI 写方案
 * ============================================================ */

/**
 * 依据表单参数调用 AI 生成整篇文章
 * @returns {Promise<void>} 生成完成
 */
async function aiWriteArticle() {
  if (!isAiConfigured()) { showToast('⚠️ 请先在「设置」中配置 AI'); switchAiTab('settings', document.querySelector('.ai-tab[data-ai-tab="settings"]')); return; }

  const topic = (document.getElementById('aiTopic').value || '').trim();
  if (!topic) { showToast('⚠️ 请先填写文章主题/提示词'); return; }

  const type = document.getElementById('aiArticleType').value;
  const tone = document.getElementById('aiTone').value;
  const audience = (document.getElementById('aiAudience').value || '').trim();
  const words = document.getElementById('aiWordCount').value;
  const withSubheads = document.getElementById('aiWithSubheads').checked;
  const autoLayout = document.getElementById('aiAutoLayout').checked;
  const appendMode = document.getElementById('aiAppendMode').checked;

  const status = document.getElementById('aiWriteStatus');
  const streamBox = document.getElementById('aiWriteStream');
  const setStatus = function (t, cls) { if (status) { status.textContent = t; status.className = 'ai-status' + (cls ? ' ' + cls : ''); } };
  if (streamBox) streamBox.textContent = '';

  const system = '你是一位资深的微信公众号主编，擅长把内容写得既有信息量又有可读性。' +
    '请直接输出 Markdown 格式的文章：第一行用「# 标题」给出标题，之后用小标题（## / ###）分段，' +
    '合理使用列表、引用（>）、加粗强调。不要输出任何解释性文字、不要使用代码块包裹整篇文章，不要出现"作为AI"之类的话。';
  const user = '请写一篇【' + type + '】。\n' +
    '主题/要求：' + topic + '\n' +
    '目标读者：' + (audience || '公众号普通读者') + '\n' +
    '语气风格：' + tone + '\n' +
    '篇幅：约 ' + words + ' 字\n' +
    (withSubheads ? '要求：使用小标题分段，结构清晰，每段 2-4 句。\n' : '要求：不使用小标题，用自然段展开。\n') +
    '结尾请自然地引导读者关注公众号「' + APP_INFO.wechat + '」。';

  setWriteButtons(true);
  setStatus('⏳ 正在生成，请稍候...');
  let full = '';
  try {
    full = await callChat([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], {
      stream: true,
      onDelta: function (delta, all) {
        full = all;
        if (streamBox) { streamBox.textContent = all; streamBox.scrollTop = streamBox.scrollHeight; }
      }
    });
  } catch (e) {
    if (e.name === 'AbortError') setStatus('⏹ 已停止生成');
    else setStatus('❌ 生成失败：' + e.message, 'err');
    setWriteButtons(false);
    return;
  }
  setWriteButtons(false);
  if (!full.trim()) { setStatus('❌ 未获得内容，请检查接口配置', 'err'); return; }

  applyGeneratedArticle(full, { autoLayout: autoLayout, appendMode: appendMode });
  setStatus('✅ 生成完成，已写入编辑区', 'ok');
}

/**
 * 将 AI 生成的 Markdown 文章写入编辑器
 * @param {string} markdown Markdown 文本
 * @param {Object} [opts] 可选项 { autoLayout: 是否自动排版, appendMode: 是否追加到文末 }
 * @returns {void}
 */
function applyGeneratedArticle(markdown, opts) {
  opts = opts || {};
  const parsed = extractTitleFromMarkdown(markdown);
  let html = markdownToHtml(parsed.body);

  if (opts.appendMode) {
    insertHtmlAtEnd(html);
  } else {
    setEditorHtml(html, true);
  }
  if (parsed.title && (!titleInput.value.trim() || !opts.appendMode)) titleInput.value = parsed.title;
  autoResizeTitle();

  if (opts.autoLayout) applyThemeToEditor({ firstLineIndent: true, spacing: true });
  else { updateArticleInfo(); saveDraft(); }
}

/**
 * 从 Markdown 中抽取标题（首个 # 标题）
 * @param {string} md Markdown 文本
 * @returns {{title:string, body:string}} 标题与正文
 */
function extractTitleFromMarkdown(md) {
  const lines = String(md || '').split(/\r?\n/);
  let title = '';
  const rest = [];
  let titleTaken = false;
  lines.forEach(function (line) {
    const m = line.match(/^\s*#\s+(.+?)\s*$/);
    if (!titleTaken && m) { title = m[1].replace(/[#*`]/g, '').trim(); titleTaken = true; return; }
    const m2 = line.match(/^\s*(?:标题|题目)[:：]\s*(.+)$/);
    if (!titleTaken && m2) { title = m2[1].trim(); titleTaken = true; return; }
    rest.push(line);
  });
  return { title: title, body: rest.join('\n') };
}

/**
 * 将 Markdown 文本转换为语义化 HTML
 * @param {string} md Markdown 文本
 * @returns {string} HTML 内容
 */
function markdownToHtml(md) {
  // 统一使用 markdown.js 的增强解析器（支持表格、任务列表、脚注、代码高亮、警告块等）
  return renderMarkdown(md, { breaks: true });
}

/**
 * AI 生成标题（给出现有正文的多个标题候选）
 * @returns {Promise<void>} 生成完成
 */
async function aiGenerateTitle() {
  if (!isAiConfigured()) { showToast('⚠️ 请先配置 AI'); openAiDrawer('settings'); return; }
  const content = (editor.innerText || '').trim();
  if (content.length < 20) { showToast('⚠️ 正文内容太少，无法生成标题'); return; }
  showToast('⏳ 正在生成标题...');
  try {
    const reply = await callChat([
      { role: 'system', content: '你是公众号标题党克星+爆款标题专家。请给出 5 个不同风格的中文标题，每行一个，不要序号、不要引号、不要解释。每个标题不超过 30 字。' },
      { role: 'user', content: '文章内容如下：\n' + content.slice(0, 2500) }
    ], { stream: false });
    const titles = reply.split('\n').map(function (s) { return s.replace(/^[\s\d.、)）\-*#]+/, '').trim(); }).filter(Boolean).slice(0, 5);
    if (!titles.length) { showToast('❌ 未生成有效标题'); return; }
    window.__aiTitles = titles;
    const html = titles.map(function (t, i) {
      return '<div class="template-card" onclick="pickTitleByIndex(' + i + ')">' +
        '<div class="template-name">' + (i + 1) + '. ' + escapeHtml(t) + '</div></div>';
    }).join('');
    showModal('选择标题（点击即用）', html, null, { hideCancel: true, confirmText: '关闭' });
  } catch (e) {
    showToast('❌ 生成失败：' + e.message);
  }
}

/**
 * 按索引选用 AI 生成的标题
 * @param {number} index 标题索引
 * @returns {void}
 */
function pickTitleByIndex(index) {
  const list = window.__aiTitles || [];
  pickTitle(list[index] || '');
}

/**
 * 选用某个标题
 * @param {string} title 标题文本
 * @returns {void}
 */
function pickTitle(title) {
  titleInput.value = title;
  autoResizeTitle();
  saveDraft();
  const ov = document.querySelector('.modal-overlay');
  if (ov) ov.remove();
  showToast('✅ 标题已应用');
}

/**
 * AI 生成摘要（≤100 字）
 * @returns {Promise<void>} 生成完成
 */
async function aiGenerateSummary() {
  if (!isAiConfigured()) { showToast('⚠️ 请先配置 AI'); openAiDrawer('settings'); return; }
  const content = (editor.innerText || '').trim();
  if (content.length < 20) { showToast('⚠️ 正文内容太少'); return; }
  showToast('⏳ 正在生成摘要...');
  try {
    const reply = await callChat([
      { role: 'system', content: '你是公众号运营，请用 40-90 字概括文章核心，吸引点击。只输出摘要正文，不要引号和解释。' },
      { role: 'user', content: content.slice(0, 2500) }
    ], { stream: false });
    summaryInput.value = reply.trim().slice(0, 120);
    updateCharCount();
    saveDraft();
    showToast('✅ 摘要已生成');
  } catch (e) {
    showToast('❌ 生成失败：' + e.message);
  }
}

/* ============================================================
 * 五、选中文字处理（浮动气泡）
 * ============================================================ */

/** 文本处理动作对应的提示词 */
const TEXT_ACTIONS = {
  polish:    { label: '润色', sys: '你是中文润色专家，请在保持原意的前提下让文字更流畅、更有文采。只输出润色后的正文。' },
  expand:    { label: '扩写', sys: '你是资深编辑，请把内容扩写到约 1.5-2 倍，补充细节与例子，保持风格一致。只输出扩写后的正文。' },
  shorten:   { label: '缩写', sys: '你是精编编辑，请把内容压缩到约一半，保留核心信息。只输出压缩后的正文。' },
  rewrite:   { label: '改写', sys: '你是改写高手，请用不同表达重写这段文字，意思不变但措辞焕然一新。只输出改写后的正文。' },
  proofread: { label: '纠错', sys: '你是中文校对，请修正错别字、标点与语病，不改变原意与风格。只输出修正后的正文。' },
  translate: { label: '翻译', sys: '你是专业翻译，若原文是中文翻译成自然流畅的英文，若是英文则翻译成中文。只输出译文。' }
};

/**
 * 更新选区浮动气泡的显示位置
 * @returns {void}
 */
function updateSelectionBubble() {
  const bubble = document.getElementById('selectionBubble');
  if (!bubble || !editor) return;
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed || !editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    hideSelectionBubble();
    return;
  }
  const text = sel.toString().trim();
  if (text.length < 2) { hideSelectionBubble(); return; }

  if (!bubble.dataset.built) {
    const items = Object.keys(TEXT_ACTIONS).map(function (k) {
      return '<button class="sb-btn" data-act="' + k + '">' + TEXT_ACTIONS[k].label + '</button>';
    }).join('');
    bubble.innerHTML = items +
      '<span class="sb-divider"></span>' +
      '<button class="sb-btn" data-act="ai-tools">更多 AI…</button>';
    bubble.dataset.built = '1';
    bubble.addEventListener('mousedown', function (e) { e.preventDefault(); });
    bubble.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'ai-tools') { openAiDrawer(); return; }
      runTextAction(act);
    });
  }

  const rect = sel.getRangeAt(0).getBoundingClientRect();
  bubble.classList.add('show');
  bubble.style.top = Math.max(8, rect.top - 42) + 'px';
  bubble.style.left = Math.max(8, Math.min(rect.left + rect.width / 2 - 150, window.innerWidth - 340)) + 'px';
}

/**
 * 隐藏选区浮动气泡
 * @returns {void}
 */
function hideSelectionBubble() {
  const bubble = document.getElementById('selectionBubble');
  if (bubble) bubble.classList.remove('show');
}

/**
 * 对选中文字执行 AI 处理并替换选区
 * @param {string} action 动作键，见 TEXT_ACTIONS
 * @returns {Promise<void>} 处理完成
 */
async function runTextAction(action) {
  const conf = TEXT_ACTIONS[action];
  if (!conf) return;
  if (!isAiConfigured()) { showToast('⚠️ 请先配置 AI'); openAiDrawer('settings'); return; }

  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) { showToast('⚠️ 请先选中文字'); return; }
  const text = sel.toString();
  const html = getSelectionHtml();

  hideSelectionBubble();
  showToast('⏳ 正在' + conf.label + '...');
  try {
    const reply = await callChat([
      { role: 'system', content: conf.sys },
      { role: 'user', content: text }
    ], { stream: false });
    const result = String(reply || '').trim();
    if (!result) { showToast('❌ 未获得结果'); return; }
    // 尽量保留原有标签结构：把结果按段落转换为 HTML
    const newHtml = markdownToHtml(result).replace(/^<p>([\s\S]*)<\/p>$/, '$1');
    if (!replaceSelectionWithHtml(newHtml || escapeHtml(result))) {
      // 选区已失效则插入到文末
      insertHtmlAtEnd('<p>' + escapeHtml(result) + '</p>');
    }
    saveDraft();
    showToast('✅ 已' + conf.label + '并替换选中内容');
  } catch (e) {
    if (e.name === 'AbortError') showToast('⏹ 已停止');
    else showToast('❌ 处理失败：' + e.message);
  }
}

/* ============================================================
 * 六、AI 排版
 * ============================================================ */

/**
 * 工具栏快捷键：AI 智能排版
 * @returns {void}
 */
function aiQuickLayout() {
  openAiDrawer('layout');
}

/**
 * 执行排版（按抽屉中选择的引擎）
 * @returns {Promise<void>} 排版完成
 */
async function aiDoLayout() {
  const engine = document.getElementById('layoutEngine').value;
  const themeId = document.getElementById('layoutTheme').value;
  const headingStyleId = document.getElementById('layoutHeadingStyle').value;
  const firstLineIndent = document.getElementById('layoutFirstLineIndent').checked;
  const target = document.getElementById('layoutTarget').value;
  const status = document.getElementById('aiLayoutStatus');
  const setStatus = function (t, cls) { if (status) { status.textContent = t; status.className = 'ai-status' + (cls ? ' ' + cls : ''); } };

  if (engine === 'ai') {
    if (!isAiConfigured()) { setStatus('❌ 未配置 AI，已改用本地规则排版', 'err'); }
    else {
      setStatus('⏳ AI 正在排版...');
      try {
        await aiLayoutWithAi({ themeId: themeId, headingStyleId: headingStyleId, firstLineIndent: firstLineIndent, target: target });
        setStatus('✅ AI 排版完成', 'ok');
        return;
      } catch (e) {
        setStatus('❌ AI 排版失败，已回退本地规则：' + e.message, 'err');
      }
    }
  }
  layoutOffline({ themeId: themeId, headingStyleId: headingStyleId, firstLineIndent: firstLineIndent, target: target });
  setStatus('✅ 本地规则排版完成', 'ok');
}

/**
 * 本地规则排版：结构化纯文本 + 应用主题（无需 AI）
 * @param {Object} [opts] 可选项 { themeId, headingStyleId, firstLineIndent, target }
 * @returns {void}
 */
function layoutOffline(opts) {
  opts = opts || {};
  if (!editor || !editor.innerHTML.trim()) { showToast('⚠️ 编辑区暂无内容'); return; }

  if (opts.target === 'selection' && hasEditorSelection()) {
    // 仅排版选中内容：抽取选区 -> 转换 -> 应用主题 -> 回填
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    const frag = range.extractContents();
    const temp = document.createElement('div');
    temp.appendChild(frag);
    const converted = textToStructuredHtml(temp.textContent);
    const holder = document.createElement('div');
    holder.innerHTML = converted;
    applyThemeToEditor({ root: holder, themeId: opts.themeId, headingStyleId: opts.headingStyleId, firstLineIndent: opts.firstLineIndent, spacing: true });
    range.insertNode(holder);
    while (holder.firstChild) holder.parentNode.insertBefore(holder.firstChild, holder);
    holder.parentNode.removeChild(holder);
    updateArticleInfo(); saveDraft();
    showToast('✅ 已排版选中内容');
    return;
  }

  // 全文排版：若内容几乎为纯文本，则先结构化为 HTML
  const blockCount = editor.querySelectorAll('p,h1,h2,h3,h4,h5,h6,ul,ol,blockquote,table,li').length;
  if (blockCount === 0) {
    // 完全没有块级结构：直接按纯文本（含换行）重新结构化
    editor.innerHTML = textToStructuredHtml(getRawTextForLayout());
  } else if (blockCount <= 1) {
    const textRatio = (editor.innerText || '').length / Math.max(1, editor.innerHTML.length);
    if (textRatio > 0.6) editor.innerHTML = textToStructuredHtml(editor.innerText);
  }
  applyThemeToEditor({
    themeId: opts.themeId,
    headingStyleId: opts.headingStyleId,
    firstLineIndent: opts.firstLineIndent,
    spacing: true
  });
  if (typeof inlineAllStyles === 'function' && editor.querySelector('[class]')) inlineAllStyles();
}

/**
 * AI 智能排版：让模型把内容改写成带行内样式的公众号 HTML
 * @param {Object} opts 排版选项 { themeId, headingStyleId, firstLineIndent, target }
 * @returns {Promise<void>} 完成
 */
async function aiLayoutWithAi(opts) {
  const theme = getThemeById(opts.themeId);
  let sourceHtml = editor.innerHTML;
  if (opts.target === 'selection' && hasEditorSelection()) sourceHtml = getSelectionHtml();

  const spec = '主色 ' + theme.primary + '，辅助色 ' + theme.secondary + '，正文色 ' + theme.text +
    '，引用背景 ' + theme.quoteBg + '，标题色 ' + theme.headingColor +
    '，标题风格：' + opts.headingStyleId + (opts.firstLineIndent ? '，正文首行缩进 2em' : '');

  const reply = await callChat([
    { role: 'system', content: '你是微信公众号排版专家。请把用户提供的 HTML 内容重新排版，输出「纯 HTML 片段」，要求：' +
      '① 只使用行内 style 属性，禁止使用 class、<style>、<script>；' +
      '② 保留全部文字内容，不得增删意思；' +
      '③ 合理使用 h2/h3 标题、p 段落、blockquote 引用、ul/ol 列表、hr 分隔线；' +
      '④ 正文 p 使用 font-size:15px、line-height:1.8、color:' + theme.text + '、margin:0 0 16px；' +
      '⑤ 不要输出 markdown 代码块标记，不要任何解释文字。' },
    { role: 'user', content: '配色与风格要求：' + spec + '\n\n待排版内容：\n' + sourceHtml.slice(0, 6000) }
  ], { stream: false });

  let html = String(reply || '').trim();
  html = html.replace(/^```[a-zA-Z]*\s*/, '').replace(/```$/, '').trim();
  if (!html || html.indexOf('<') === -1) throw new Error('模型未返回有效 HTML');

  if (opts.target === 'selection' && hasEditorSelection()) {
    replaceSelectionWithHtml(html);
  } else {
    setEditorHtml(html, true);
    applyThemeToEditor({ themeId: opts.themeId, headingStyleId: opts.headingStyleId, firstLineIndent: opts.firstLineIndent, spacing: true });
  }
  updateArticleInfo();
  saveDraft();
}

/**
 * 把 Markdown / 纯文本转换为带排版的文章并插入
 * @returns {void}
 */
function convertMarkdownToArticle() {
  const box = document.getElementById('markdownInput');
  const text = box ? box.value.trim() : '';
  if (!text) { showToast('⚠️ 请先粘贴 Markdown 或纯文本'); return; }

  const isMarkdown = /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```)/m.test(text);
  const parsed = isMarkdown ? extractTitleFromMarkdown(text) : { title: '', body: text };
  const html = isMarkdown ? markdownToHtml(parsed.body) : textToStructuredHtml(text);

  const holder = document.createElement('div');
  holder.innerHTML = html;
  applyThemeToEditor({
    root: holder,
    themeId: document.getElementById('layoutTheme').value,
    headingStyleId: document.getElementById('layoutHeadingStyle').value,
    firstLineIndent: document.getElementById('layoutFirstLineIndent').checked,
    spacing: true
  });
  setEditorHtml(holder.innerHTML, true);
  if (parsed.title) { titleInput.value = parsed.title; autoResizeTitle(); }

  // 模板样式统一内联，保证微信兼容
  if (editor.querySelector('[class]')) inlineAllStyles();
  if (box) box.value = '';
  showToast('✅ 已转换为排版并插入正文');
}

/**
 * 获取用于排版的原始纯文本（优先 innerText，兼容「纯文本节点 + 换行」的极端情况）
 * @returns {string} 纯文本
 */
function getRawTextForLayout() {
  if (!editor) return '';
  const html = editor.innerHTML || '';
  if (html.indexOf('\n') !== -1) {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }
  return editor.innerText || '';
}

/**
 * 将纯文本按空行/短行规则转换为结构化 HTML
 * @param {string} text 纯文本
 * @returns {string} HTML 结构
 */
function textToStructuredHtml(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let buf = [];

  /** 输出累积的正文段落 */
  function flush() {
    if (!buf.length) return;
    out.push('<p>' + escapeHtml(buf.join('').trim()) + '</p>');
    buf = [];
  }

  lines.forEach(function (raw) {
    const line = raw.trim();
    if (!line) { flush(); return; }
    // 短行（<= 22 字）且非句末标点结尾，视为小标题
    if (line.length <= 22 && !/[。！？；，,.!?;]$/.test(line) && !/^\d/.test(line)) {
      flush();
      out.push('<h3>' + escapeHtml(line) + '</h3>');
      return;
    }
    // 以「一、1. ①」等开头也视为小标题
    if (/^([一二三四五六七八九十]+[、.]|\d+[.、)]|[①②③④⑤⑥⑦⑧⑨⑩])/.test(line) && line.length <= 30) {
      flush();
      out.push('<h3>' + escapeHtml(line) + '</h3>');
      return;
    }
    buf.push(line);
  });
  flush();
  return out.join('\n');
}

/* ============================================================
 * 七、AI 生图
 * ============================================================ */

/**
 * 切换生图通道时显示/隐藏自定义接口字段
 * @returns {void}
 */
function toggleImageSourceFields() {
  const src = (document.getElementById('imgSource') || {}).value || 'builtin';
  const box = document.getElementById('customImageFields');
  if (box) box.style.display = src === 'custom' ? 'block' : 'none';
}

/**
 * 生成图片并插入正文（按选择的通道）
 * @returns {Promise<void>} 完成
 */
async function aiGenerateImage() {
  const promptEl = document.getElementById('imgPrompt');
  const prompt = promptEl ? promptEl.value.trim() : '';
  if (!prompt) { showToast('⚠️ 请先填写图片描述/提示词'); return; }

  const status = document.getElementById('aiImageStatus');
  const setStatus = function (t, cls) { if (status) { status.textContent = t; status.className = 'ai-status' + (cls ? ' ' + cls : ''); } };
  const source = (document.getElementById('imgSource') || {}).value || 'builtin';
  const size = (document.getElementById('imgSize') || {}).value || 'landscape_4_3';
  const useAsCover = (document.getElementById('imgUseAsCover') || {}).checked;

  const btn = document.getElementById('btnGenImage');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 生成中...'; }
  setStatus('⏳ 正在生成图片...');

  try {
    let url;
    if (source === 'custom') url = await generateImageCustom(prompt, size);
    else url = buildBuiltinImageUrl(prompt, size);

    // 预览（图片地址存入全局，避免超长地址写进 onclick 属性）
    lastGeneratedImageUrl = url;
    const box = document.getElementById('aiImagePreview');
    if (box) {
      box.innerHTML = '<img src="' + url + '" alt="生成结果">' +
        '<div class="ai-img-actions">' +
          '<button class="action-btn secondary sm" onclick="insertGeneratedImage()">插入正文</button>' +
          '<button class="action-btn secondary sm" onclick="useGeneratedImageAsCover()">设为封面</button>' +
          '<button class="action-btn secondary sm" onclick="downloadGeneratedImage()">下载</button>' +
        '</div>';
    }
    insertImageByUrl(url);
    if (useAsCover) applyCoverFromUrl(url);
    saveAIConfig({ imageSource: source, imageSize: size });
    setStatus('✅ 图片已生成并插入正文', 'ok');
  } catch (e) {
    setStatus('❌ 生成失败：' + e.message, 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🖼️ 生成并插入图片'; }
  }
}

/**
 * 拼接内置文生图接口地址
 * @param {string} prompt 提示词
 * @param {string} size 尺寸枚举
 * @returns {string} 完整图片地址
 */
function buildBuiltinImageUrl(prompt, size) {
  return BUILTIN_IMAGE_API + '?prompt=' + encodeURIComponent(prompt) + '&image_size=' + encodeURIComponent(size || 'landscape_4_3');
}

/**
 * 通过用户自填的 OpenAI 兼容图片接口生成图片
 * @param {string} prompt 提示词
 * @param {string} size 尺寸枚举
 * @returns {Promise<string>} 图片地址（可能为 DataURL）
 */
async function generateImageCustom(prompt, size) {
  const cfg = getAIConfig();
  const url = (document.getElementById('imgApiUrl') || {}).value.trim() || cfg.imageApiUrl;
  const key = (document.getElementById('imgApiKey') || {}).value.trim() || cfg.imageApiKey;
  const model = (document.getElementById('imgApiModel') || {}).value.trim() || cfg.imageApiModel;
  if (!url || !key) throw new Error('请填写图片接口地址与 Key');

  const sizeMap = {
    landscape_16_9: '1792x1024', landscape_4_3: '1024x768', square_hd: '1024x1024',
    portrait_4_3: '768x1024', portrait_16_9: '1024x1792'
  };

  const resp = await fetch(buildImageEndpoint(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: model || undefined, prompt: prompt, n: 1, size: sizeMap[size] || '1024x768' })
  });
  if (!resp.ok) {
    let d = ''; try { d = (await resp.text()).slice(0, 200); } catch (e) {}
    throw new Error('图片接口返回 ' + resp.status + (d ? '：' + d : ''));
  }
  const data = await resp.json();
  const item = data && data.data && data.data[0];
  if (!item) throw new Error('图片接口未返回数据');
  if (item.b64_json) return 'data:image/png;base64,' + item.b64_json;
  if (item.url) return item.url;
  throw new Error('无法识别的图片返回格式');
}

/**
 * 插入最近生成的图片到正文
 * @returns {void}
 */
function insertGeneratedImage() {
  if (!lastGeneratedImageUrl) { showToast('⚠️ 暂无可插入的图片'); return; }
  insertImageByUrl(lastGeneratedImageUrl);
  showToast('✅ 已插入正文');
}

/**
 * 把最近生成的图片设为文章封面
 * @returns {void}
 */
function useGeneratedImageAsCover() {
  if (!lastGeneratedImageUrl) { showToast('⚠️ 暂无可用的图片'); return; }
  applyCoverFromUrl(lastGeneratedImageUrl);
  showToast('✅ 已设为封面');
}

/**
 * 下载最近生成的图片
 * @returns {void}
 */
function downloadGeneratedImage() {
  if (!lastGeneratedImageUrl) { showToast('⚠️ 暂无可下载的图片'); return; }
  const a = document.createElement('a');
  a.href = lastGeneratedImageUrl;
  a.download = 'ai-image-' + Date.now() + '.png';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * 根据文章内容生成配图提示词（写入生图输入框）
 * @returns {Promise<void>} 完成
 */
async function aiSuggestImagePrompt() {
  if (!isAiConfigured()) { showToast('⚠️ 请先配置 AI'); openAiDrawer('settings'); return; }
  const content = (editor.innerText || '').trim() || (titleInput.value || '').trim();
  if (!content) { showToast('⚠️ 请先输入文章内容'); return; }
  showToast('⏳ 正在生成配图提示词...');
  try {
    const reply = await callChat([
      { role: 'system', content: '你是 AI 绘画提示词专家。请根据文章内容给出 1 条中文配图提示词，要求：画面具体、含主体/场景/光线/风格/画质词，30-80 字，只输出提示词本身。' },
      { role: 'user', content: content.slice(0, 2000) }
    ], { stream: false });
    const el = document.getElementById('imgPrompt');
    if (el) el.value = String(reply || '').trim();
    showToast('✅ 提示词已生成');
  } catch (e) {
    showToast('❌ 生成失败：' + e.message);
  }
}

/**
 * 为指定图片生成图片说明（caption）并插入图片下方
 * @param {HTMLImageElement} img 目标图片
 * @returns {Promise<void>} 完成
 */
async function aiImageCaption(img) {
  if (!isAiConfigured()) { showToast('⚠️ 请先配置 AI'); return; }
  const alt = (img && img.alt) || '';
  const ctx = (titleInput.value || '') + ' ' + (editor.innerText || '').slice(0, 300);
  showToast('⏳ 正在生成图片说明...');
  try {
    const reply = await callChat([
      { role: 'system', content: '请为图片写一句 10-25 字的中文图注，语言简洁有信息量，只输出图注本身。' },
      { role: 'user', content: '文章背景：' + ctx + '\n图片替代文字：' + alt }
    ], { stream: false });
    const caption = String(reply || '').trim();
    if (!caption) { showToast('❌ 未获得图注'); return; }
    const p = document.createElement('p');
    p.style.cssText = 'text-align:center;font-size:12px;color:#999;margin:-8px 0 16px';
    p.textContent = '▲ ' + caption;
    if (img.parentNode) img.parentNode.insertBefore(p, img.nextSibling);
    saveDraft();
    showToast('✅ 图注已插入');
  } catch (e) {
    showToast('❌ 生成失败：' + e.message);
  }
}

/* ============================================================
 * 八、AI 学习模板风格
 * ============================================================ */

/**
 * 刷新「风格学习」中的模板下拉选项
 * @returns {void}
 */
function refreshLearnTemplateSelect() {
  const sel = document.getElementById('learnTemplateSelect');
  if (!sel) return;
  const templates = getMyTemplates();
  sel.innerHTML = '<option value="">— 不使用已有模板 —</option>' + templates.map(function (t) {
    return '<option value="' + t.id + '">' + escapeHtml(t.name) + '</option>';
  }).join('');
}

/**
 * 从 HTML/CSS 中提取设计令牌（配色、字体、圆角、间距、标题风格）
 * @param {string} html HTML 内容
 * @param {string} [css] 附带的 CSS 文本
 * @returns {Object} 设计令牌对象
 */
function extractDesignTokens(html, css) {
  const temp = document.createElement('div');
  temp.innerHTML = html || '';
  const cssText = (css || '') + ' ' + (function () {
    let s = '';
    temp.querySelectorAll('[style]').forEach(function (el) { s += el.getAttribute('style') + ';'; });
    return s;
  })();

  const colorCount = {};
  const colorRe = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b|rgba?\([^)]+\)/g;
  let m;
  while ((m = colorRe.exec(cssText)) !== null) {
    const hex = parseColorToHex(m[0]);
    if (!hex) continue;
    colorCount[hex] = (colorCount[hex] || 0) + 1;
  }
  // 过滤掉近黑近白，突出主色
  const ranked = Object.keys(colorCount).sort(function (a, b) { return colorCount[b] - colorCount[a]; });
  const vivid = ranked.filter(function (c) {
    const rgb = hexToRgb(c);
    if (!rgb) return false;
    const max = Math.max(rgb.r, rgb.g, rgb.b), min = Math.min(rgb.r, rgb.g, rgb.b);
    return (max - min) > 40 && max > 60;
  });
  const palette = (vivid.length >= 2 ? vivid : ranked).slice(0, 6);

  const fonts = {};
  const fontRe = /font-family\s*:\s*([^;"}]+)/gi;
  while ((m = fontRe.exec(cssText)) !== null) {
    const f = m[1].trim();
    fonts[f] = (fonts[f] || 0) + 1;
  }
  const fontList = Object.keys(fonts).sort(function (a, b) { return fonts[b] - fonts[a]; }).slice(0, 3);

  const radii = {};
  const radiusRe = /border-radius\s*:\s*([^;"}]+)/gi;
  while ((m = radiusRe.exec(cssText)) !== null) {
    const r = m[1].trim();
    radii[r] = (radii[r] || 0) + 1;
  }
  const radiusList = Object.keys(radii).sort(function (a, b) { return radii[b] - radii[a]; }).slice(0, 3);

  const sizes = {};
  const sizeRe = /font-size\s*:\s*(\d+(?:\.\d+)?)px/gi;
  while ((m = sizeRe.exec(cssText)) !== null) {
    const s = Math.round(parseFloat(m[1]));
    sizes[s] = (sizes[s] || 0) + 1;
  }
  const sizeList = Object.keys(sizes).sort(function (a, b) { return sizes[b] - sizes[a]; }).map(Number);

  const headings = Array.from(temp.querySelectorAll('h1,h2,h3')).slice(0, 3).map(function (h) {
    const cs = window.getComputedStyle(h);
    return { tag: h.tagName, fontSize: cs.fontSize, color: cs.color };
  });

  return {
    palette: palette,
    primary: palette[0] || '#07c160',
    secondary: palette[1] || palette[0] || '#576b95',
    fonts: fontList,
    radii: radiusList,
    fontSizes: sizeList.slice(0, 6),
    headings: headings,
    bgColors: ranked.filter(function (c) {
      const rgb = hexToRgb(c);
      return rgb && (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) > 225;
    }).slice(0, 4),
    blockCount: temp.querySelectorAll('*').length,
    classes: Array.from(new Set(Array.from(temp.querySelectorAll('[class]')).map(function (e) { return e.className; }))).slice(0, 8)
  };
}

/**
 * 学习模板风格（规则提取 + 可选 AI 归纳）
 * @returns {Promise<void>} 完成
 */
async function aiLearnTemplate() {
  const status = document.getElementById('aiLearnStatus');
  const resultBox = document.getElementById('aiLearnResult');
  const setStatus = function (t, cls) { if (status) { status.textContent = t; status.className = 'ai-status' + (cls ? ' ' + cls : ''); } };

  const selId = (document.getElementById('learnTemplateSelect') || {}).value;
  let html = (document.getElementById('learnPasteHtml') || {}).value.trim();
  let css = '';
  if (!html && selId) {
    const tpl = getMyTemplates().find(function (t) { return t.id === selId; });
    if (tpl) { html = tpl.html; css = tpl.styles || ''; }
  }
  if (!html) { setStatus('❌ 请选择模板或粘贴 HTML 源码', 'err'); return; }

  setStatus('⏳ 正在提取设计特征...');
  const tokens = extractDesignTokens(html, css);
  lastLearnedTokens = tokens;

  let summary = summarizeTokensLocally(tokens);
  const useAi = (document.getElementById('learnUseAi') || {}).checked;
  if (useAi && isAiConfigured()) {
    setStatus('⏳ 正在由 AI 归纳风格...');
    try {
      const reply = await callChat([
        { role: 'system', content: '你是视觉设计分析师。请根据给定的设计参数，用简洁中文总结这套排版风格（风格定位、配色逻辑、排版特征、适用场景），150 字以内，只输出总结正文。' },
        { role: 'user', content: JSON.stringify(tokens).slice(0, 3000) }
      ], { stream: false });
      summary = String(reply || summary).trim();
      setStatus('✅ 风格学习完成（AI 归纳）', 'ok');
    } catch (e) {
      setStatus('⚠️ AI 归纳失败，已使用本地分析：' + e.message, 'err');
    }
  } else {
    setStatus('✅ 风格学习完成（本地分析）', 'ok');
  }

  if (resultBox) {
    resultBox.innerHTML =
      '<div class="ai-card">' + escapeHtml(summary) + '</div>' +
      '<div class="lr-section">主色 / 辅助色：<b>' + tokens.primary + '</b> / <b>' + tokens.secondary + '</b>' +
        '<div class="lr-swatches">' + tokens.palette.map(function (c) {
          return '<span class="lr-swatch" style="background:' + c + '" title="' + c + '"></span>';
        }).join('') + '</div></div>' +
      '<div class="lr-section">字体：' + (tokens.fonts.join('、') || '默认系统字体') + '</div>' +
      '<div class="lr-section">圆角：' + (tokens.radii.join('、') || '无') + '</div>' +
      '<div class="lr-section">字号：' + (tokens.fontSizes.join('、') || '默认') + ' px</div>' +
      '<div class="ai-img-actions" style="margin-top:8px">' +
        '<button class="action-btn secondary sm" onclick="applyDesignTokensToEditor()">应用到全文配色</button>' +
      '</div>';
  }
  const nameInput = document.getElementById('learnStyleName');
  if (nameInput && !nameInput.value) nameInput.value = '风格 ' + (getMyStyles().length + 1);
}

/**
 * 本地规则生成风格总结文字
 * @param {Object} tokens 设计令牌
 * @returns {string} 总结文案
 */
function summarizeTokensLocally(tokens) {
  const warm = (function () {
    const hsl = hexToHsl(tokens.primary);
    return (hsl.h < 60 || hsl.h > 300) ? '偏暖' : '偏冷';
  })();
  return '主色 ' + tokens.primary + '（' + warm + '调），辅助色 ' + tokens.secondary +
    '；整体配色 ' + (tokens.palette.length >= 4 ? '丰富，层次分明' : '克制，主次清晰') +
    '；推荐用于' + (tokens.palette.length >= 4 ? '内容活泼的图文推文' : '偏正式的资讯/知识类推文') + '。';
}

/**
 * 把已学习的设计令牌应用到全文配色
 * @returns {void}
 */
function applyDesignTokensToEditor() {
  if (!lastLearnedTokens) { showToast('⚠️ 请先学习模板风格'); return; }
  // 构造一个临时主题并应用
  const t = lastLearnedTokens;
  const theme = {
    id: 'learned', name: '学习风格',
    primary: t.primary, secondary: t.secondary,
    text: '#3e3e3e', textLight: '#888888',
    quoteBg: t.bgColors[0] || '#f9fdfb', quoteBorder: t.primary,
    hrColor: '#ececec', headingColor: t.primary
  };
  const idx = THEMES.findIndex(function (x) { return x.id === 'learned'; });
  if (idx === -1) THEMES.push(theme); else THEMES[idx] = theme;
  currentThemeId = 'learned';
  renderThemeList();
  renderLayoutThemeOptions();
  applyThemeToEditor({ themeId: 'learned', firstLineIndent: true, spacing: true });
}

/**
 * 保存当前学习结果为「我的风格」
 * @returns {void}
 */
function saveLearnedStyle() {
  if (!lastLearnedTokens) { showToast('⚠️ 请先学习模板风格'); return; }
  const nameEl = document.getElementById('learnStyleName');
  const name = (nameEl && nameEl.value.trim()) || ('风格 ' + (getMyStyles().length + 1));
  const list = getMyStyles();
  list.push({
    id: uid('style'),
    name: name,
    tokens: lastLearnedTokens,
    createdAt: new Date().toISOString()
  });
  saveMyStyles(list);
  renderMyStyles();
  showToast('💾 风格已保存：' + name);
}

/**
 * 渲染「我的风格」列表
 * @returns {void}
 */
function renderMyStyles() {
  const box = document.getElementById('myStyleList');
  if (!box) return;
  const list = getMyStyles();
  if (!list.length) { box.innerHTML = '<div class="empty-tip">暂无风格，学习模板后会显示</div>'; return; }
  box.innerHTML = list.map(function (s) {
    const t = s.tokens || {};
    return '<div class="my-style-item">' +
      '<span style="display:flex;gap:3px">' +
        '<span class="theme-swatch" style="background:' + (t.primary || '#ccc') + '"></span>' +
        '<span class="theme-swatch" style="background:' + (t.secondary || '#ddd') + '"></span>' +
      '</span>' +
      '<span class="name" title="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) + '</span>' +
      '<button class="mini-btn" onclick="applyMyStyle(\'' + s.id + '\')">应用</button>' +
      '<button class="mini-btn del" onclick="deleteMyStyle(\'' + s.id + '\')">删除</button>' +
    '</div>';
  }).join('');
}

/**
 * 应用某个已保存的风格
 * @param {string} id 风格 ID
 * @returns {void}
 */
function applyMyStyle(id) {
  const style = getMyStyles().find(function (s) { return s.id === id; });
  if (!style) { showToast('❌ 风格未找到'); return; }
  lastLearnedTokens = style.tokens;
  applyDesignTokensToEditor();
}

/**
 * 删除某个已保存的风格
 * @param {string} id 风格 ID
 * @returns {void}
 */
function deleteMyStyle(id) {
  saveMyStyles(getMyStyles().filter(function (s) { return s.id !== id; }));
  renderMyStyles();
  showToast('🗑️ 风格已删除');
}
