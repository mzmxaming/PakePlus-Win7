/* ==========================================================================
 * app.js —— 应用初始化与全局交互
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：串联各模块、绑定全局快捷键与侧栏切换，负责启动应用。
 * 依赖：utils.js / config.js / editor.js / templates.js / theme.js / ai.js
 * ========================================================================== */

/**
 * 切换左侧栏标签页
 * @param {string} tab 标签名：styles/templates/colors/themes/mytemplates
 * @param {HTMLElement} btn 被点击的标签按钮
 * @returns {void}
 */
function switchSidebarTab(tab, btn) {
  $$('.sidebar-tab').forEach(function (t) { t.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  ['styles', 'templates', 'typeset', 'colors', 'themes', 'mytemplates'].forEach(function (name) {
    const panel = document.getElementById('panel-' + name);
    if (panel) panel.style.display = name === tab ? 'block' : 'none';
  });
  if (tab === 'mytemplates') {
    renderMyTemplates();
    refreshLearnTemplateSelect();
  }
  if (tab === 'themes') {
    renderThemeList();
    renderHeadingStyleGrid();
  }
}

/**
 * 显示「关于」弹窗（含版权信息）
 * @returns {void}
 */
function showAbout() {
  const html =
    '<div style="text-align:center;padding:6px 0 12px">' +
      '<div style="font-size:18px;font-weight:700;color:#07c160;margin-bottom:6px">' + APP_INFO.name + '</div>' +
      '<div style="font-size:12px;color:#999;line-height:1.9">' +
        '版本 v' + APP_INFO.version + '<br>' +
        '程序开发：<b style="color:#333">' + APP_INFO.author + '</b><br>' +
        '微信公众号：<b style="color:#333">' + APP_INFO.wechat + '</b>' +
      '</div>' +
      '<hr style="border:none;border-top:1px solid #f0f0f0;margin:14px 0">' +
      '<div style="font-size:12px;color:#666;text-align:left;line-height:2">' +
        '· 富文本编辑 + 模板套用 + 配色主题<br>' +
        '· AI 写方案 / 智能排版 / 生图 / 模板风格学习<br>' +
        '· AI 配置与草稿仅保存在本机浏览器<br>' +
        '· 支持一键复制到公众号后台、导出 HTML' +
      '</div>' +
    '</div>';
  showModal('关于本工具', html, null, { hideCancel: true, confirmText: '知道了' });
}

/**
 * 绑定全局键盘快捷键
 * @returns {void}
 */
function bindGlobalShortcuts() {
  document.addEventListener('keydown', function (e) {
    // Esc 关闭 AI 抽屉
    if (e.key === 'Escape') {
      const drawer = document.getElementById('aiDrawer');
      if (drawer && drawer.classList.contains('show')) closeAiDrawer();
    }
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 'b') { e.preventDefault(); exec('bold'); }
    else if (key === 'i') { e.preventDefault(); exec('italic'); }
    else if (key === 'u') { e.preventDefault(); exec('underline'); }
    else if (key === 's') { e.preventDefault(); saveDraft(true); }
    else if (key === 'z' && e.shiftKey) { e.preventDefault(); exec('redo'); }
  });
}

/**
 * 启动周期性自动保存与统计刷新
 * @returns {void}
 */
function startAutoSaveLoop() {
  setInterval(function () {
    if (editor && editor.innerHTML) { saveDraft(); updateArticleInfo(); }
  }, 30000);
  window.addEventListener('beforeunload', function () { saveDraft(); });
}

/**
 * 应用初始化入口
 * @returns {void}
 */
function initApp() {
  // 初始化编辑器（含草稿恢复）
  initEditor();

  // 初始化配色/主题面板
  initThemePanel();

  // 初始化排版参数与图片上传设置
  fillTypesetUI();
  fillUploadUI();
  applyPreviewCss();

  // 初始化 Markdown 双栏工作台与拖拽上传
  initMdStudio();
  initDragDropUpload();

  // 渲染「我的模板」与「我的风格」
  renderMyTemplates();
  refreshLearnTemplateSelect();
  renderMyStyles();
  renderDraftsList();

  // AI 状态与设置回填
  loadAiSettingsIntoForm();
  updateAiStatusChip();

  // 全局交互
  bindGlobalShortcuts();
  startAutoSaveLoop();

  // 图片通道选择实时联动
  const imgSrc = document.getElementById('imgSource');
  if (imgSrc) imgSrc.addEventListener('change', toggleImageSourceFields);

  // 主题/标题风格下拉变化时同步选中态
  const layoutTheme = document.getElementById('layoutTheme');
  if (layoutTheme) layoutTheme.addEventListener('change', function () { selectTheme(this.value); });
  const layoutHeading = document.getElementById('layoutHeadingStyle');
  if (layoutHeading) layoutHeading.addEventListener('change', function () { selectHeadingStyle(this.value); });

  console.log('%c' + APP_INFO.name + ' v' + APP_INFO.version + ' 已启动', 'color:#07c160;font-weight:bold');
  console.log('%c程序开发：' + APP_INFO.author + '　微信公众号：' + APP_INFO.wechat, 'color:#888');
}

// DOM 就绪后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
