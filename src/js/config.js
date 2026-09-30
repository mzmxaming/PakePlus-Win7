/* ==========================================================================
 * config.js —— 全局常量与配置读写
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：集中管理应用信息、本地存储键名、AI 配置（仅存本地）与厂商预设。
 * ========================================================================== */

/** 应用版权与标识信息 */
const APP_INFO = {
  name: '微信公众号 AI 排版编辑器',
  author: '涯系石头',
  wechat: '涯系石头',
  version: '2.1.0'
};

/** 本地存储键名 */
const STORAGE_KEYS = {
  draft: 'wxeditor_draft',
  myTemplates: 'wxeditor_my_templates',
  aiConfig: 'wxeditor_ai_config',
  myStyles: 'wxeditor_my_styles',
  theme: 'wxeditor_current_theme'
};

/** AI 默认配置 */
const DEFAULT_AI_CONFIG = {
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  model: 'deepseek-chat',
  temperature: 0.7,
  stream: true,
  imageSource: 'builtin',
  imageApiUrl: '',
  imageApiKey: '',
  imageApiModel: '',
  imageSize: 'landscape_4_3'
};

/** 常见厂商预设，便于一键填充 */
const AI_PRESETS = {
  deepseek:  { baseUrl: 'https://api.deepseek.com',              model: 'deepseek-chat' },
  dashscope: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode', model: 'qwen-plus' },
  zhipu:     { baseUrl: 'https://open.bigmodel.cn/api/paas/v4',  model: 'glm-4-flash' },
  moonshot:  { baseUrl: 'https://api.moonshot.cn',               model: 'moonshot-v1-8k' },
  openai:    { baseUrl: 'https://api.openai.com',                model: 'gpt-4o-mini' },
  ollama:    { baseUrl: 'http://localhost:11434/v1',             model: 'qwen2.5:7b' }
};

/** 内置文生图接口（免 Key，由平台提供） */
const BUILTIN_IMAGE_API = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image';

/**
 * 读取 AI 配置
 * @returns {Object} 合并默认值后的配置对象
 */
function getAIConfig() {
  let saved = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.aiConfig);
    saved = raw ? JSON.parse(raw) : {};
  } catch (e) { saved = {}; }
  return Object.assign({}, DEFAULT_AI_CONFIG, saved);
}

/**
 * 保存 AI 配置
 * @param {Object} cfg 需要合并保存的配置片段
 * @returns {Object} 保存后的完整配置
 */
function saveAIConfig(cfg) {
  const merged = Object.assign({}, getAIConfig(), cfg || {});
  try {
    localStorage.setItem(STORAGE_KEYS.aiConfig, JSON.stringify(merged));
  } catch (e) {
    showToast('⚠️ AI 配置保存失败（本地存储不可用）');
  }
  return merged;
}

/**
 * 判断 AI 文本能力是否已配置可用
 * @returns {boolean} 已填写 Base URL / Key / 模型则返回 true
 */
function isAiConfigured() {
  const c = getAIConfig();
  return !!(c.baseUrl && c.apiKey && c.model);
}

/**
 * 规范化对话补全接口地址：兼容用户只填域名、只填 /v1、或直接填完整地址
 * @param {string} baseUrl 用户填写的 Base URL
 * @returns {string} 可直接 POST 的 chat/completions 完整地址
 */
function buildChatEndpoint(baseUrl) {
  let url = String(baseUrl || '').trim().replace(/\s+/g, '');
  if (!url) return '';
  url = url.replace(/\/+$/, '');                       // 去掉结尾斜杠
  if (/\/chat\/completions$/.test(url)) return url;    // 已是完整地址
  if (/\/v\d+$/.test(url)) return url + '/chat/completions';
  return url + '/v1/chat/completions';
}

/**
 * 规范化图片生成接口地址（OpenAI 兼容）
 * @param {string} baseUrl 用户填写的图片 Base URL
 * @returns {string} 可直接 POST 的 images/generations 完整地址
 */
function buildImageEndpoint(baseUrl) {
  let url = String(baseUrl || '').trim().replace(/\s+/g, '');
  if (!url) return '';
  url = url.replace(/\/+$/, '');
  if (/\/images\/generations$/.test(url)) return url;
  if (/\/v\d+$/.test(url)) return url + '/images/generations';
  return url + '/v1/images/generations';
}

/**
 * 读取「我的风格」列表
 * @returns {Object[]} 已学习的风格数组
 */
function getMyStyles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.myStyles);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

/**
 * 保存「我的风格」列表
 * @param {Object[]} list 风格数组
 * @returns {void}
 */
function saveMyStyles(list) {
  try {
    localStorage.setItem(STORAGE_KEYS.myStyles, JSON.stringify(list));
  } catch (e) {
    showToast('⚠️ 风格保存失败（本地存储空间不足）');
  }
}
