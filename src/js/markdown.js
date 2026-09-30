/* ==========================================================================
 * markdown.js —— 公众号级 Markdown 解析器 + 轻量代码高亮
 * 微信公众号 AI 排版编辑器 · 程序开发：涯系石头
 * 说明：纯字符串处理，不依赖 DOM，可在 Node 中单测。
 * 支持：标题/段落/引用(含 GFM 警告块)/有序无序列表/任务列表/表格/围栏代码/
 *       行内代码/加粗/斜体/删除线/高亮/链接/图片/自动链接/脚注/Ruby 注音/
 *       行内与块级公式/Katex 占位/Mermaid 占位。
 * ========================================================================== */

/** HTML 转义（内部实现，便于 Node 单测，不依赖 utils.js） */
function mdEsc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 各语言关键字表（用于轻量高亮） */
const MD_KEYWORDS = {
  js: 'var let const function return if else for while do switch case break continue new delete typeof instanceof in of class extends super this null undefined true false try catch finally throw async await yield import export from default static get set void with debugger',
  ts: 'var let const function return if else for while do switch case break continue new delete typeof instanceof in of class extends implements interface type enum namespace declare module public private protected readonly abstract as any unknown never void this null undefined true false try catch finally throw async await yield import export from default static get set',
  py: 'def class return if elif else for while break continue import from as pass with try except finally raise lambda yield global nonlocal assert del in is not and or None True False async await print self',
  java: 'public private protected class interface extends implements return if else for while do switch case break continue new static final void int long double float boolean char byte short String null true false try catch finally throw throws import package this super abstract synchronized volatile transient enum instanceof',
  go: 'package import func var const type struct interface map chan go defer return if else for range switch case break continue select default nil true false string int int64 float64 bool byte rune error make new len cap append copy delete panic recover',
  php: 'function return if else elseif for foreach while do switch case break continue new class extends implements public private protected static const echo print array null true false try catch finally throw use namespace isset unset empty',
  ruby: 'def end class module return if elsif else unless for while until break next yield do begin rescue ensure raise require attr_accessor attr_reader attr_writer nil true false self new',
  rust: 'fn let mut const struct enum impl trait return if else match for while loop break continue use mod pub crate self super as where unsafe async await move ref dyn box true false Some None Ok Err String Vec',
  c: 'include define ifdef ifndef endif int long short char float double void struct union enum typedef static extern const volatile unsigned signed return if else for while do switch case break continue sizeof goto NULL',
  css: 'important media supports keyframes import charset font-face',
  sql: 'select from where insert into values update set delete create table alter drop index join left right inner outer on group by order having limit offset union all distinct as and or not null is in like between count sum avg max min'
};

/** 语言别名归一 */
function mdNormLang(lang) {
  const l = String(lang || '').toLowerCase().trim();
  const map = {
    javascript: 'js', jsx: 'js', node: 'js', mjs: 'js',
    typescript: 'ts', tsx: 'ts',
    python: 'py', py3: 'py',
    golang: 'go', rs: 'rust', rb: 'ruby',
    cpp: 'c', 'c++': 'c', h: 'c', objc: 'c',
    shell: 'bash', sh: 'bash', zsh: 'bash', console: 'bash', powershell: 'bash', ps1: 'bash',
    htm: 'html', xhtml: 'html', vue: 'html', xml: 'html', svg: 'html',
    yml: 'yaml', json5: 'json', md: 'markdown', text: 'plain', txt: 'plain'
  };
  return map[l] || l || 'plain';
}

/**
 * 轻量代码高亮
 * @param {string} code 源码
 * @param {string} lang 语言标识
 * @returns {string} 已转义并带 <span class="tok-*"> 的 HTML
 */
function highlightCode(code, lang) {
  const l = mdNormLang(lang);
  const src = String(code == null ? '' : code);
  const kw = MD_KEYWORDS[l] || '';
  if (l === 'plain' || !kw) return mdEsc(src);

  const kwSet = {};
  kw.split(/\s+/).forEach(function (k) { if (k) kwSet[k] = 1; });

  // 注释风格：python/bash/yaml/sql 用 #，其余用 // 与 /* */
  const hashComment = ['py', 'bash', 'yaml', 'ruby'].indexOf(l) !== -1;
  const commentPattern = hashComment
    ? '#[^\\n]*'
    : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
  const strPattern = '"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\'|`(?:\\\\.|[^`\\\\])*`';
  const numPattern = '\\b(?:0[xX][0-9a-fA-F]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b';
  const idPattern = '\\b[A-Za-z_$][\\w$]*\\b';

  const re = new RegExp(
    '(' + commentPattern + ')|(' + strPattern + ')|(' + numPattern + ')|(' + idPattern + ')',
    'g'
  );

  let out = '';
  let last = 0;
  let m;
  while ((m = re.exec(src)) !== null) {
    out += mdEsc(src.slice(last, m.index));
    last = re.lastIndex;
    const text = m[0];
    if (m[1]) {
      out += '<span class="tok-com">' + mdEsc(text) + '</span>';
    } else if (m[2]) {
      out += '<span class="tok-str">' + mdEsc(text) + '</span>';
    } else if (m[3]) {
      out += '<span class="tok-num">' + mdEsc(text) + '</span>';
    } else {
      if (kwSet[text]) out += '<span class="tok-kw">' + mdEsc(text) + '</span>';
      else if (/^[A-Z]/.test(text)) out += '<span class="tok-cls">' + mdEsc(text) + '</span>';
      else if (/^\$/.test(text)) out += '<span class="tok-var">' + mdEsc(text) + '</span>';
      else out += mdEsc(text);
    }
  }
  out += mdEsc(src.slice(last));
  return out;
}

/**
 * 行内 Markdown 渲染
 * @param {string} text 行内文本
 * @param {Object} ctx 上下文 { footnotes: {id: {index, text}}, order: [] }
 * @param {Object} opts 选项
 * @returns {string} HTML
 */
function mdInline(text, ctx, opts) {
  let s = String(text == null ? '' : text);

  // 1) 保护行内代码与公式，避免被后续规则破坏
  const stash = [];
  const stashPush = function (html) { stash.push(html); return '\u0000' + (stash.length - 1) + '\u0000'; };

  s = s.replace(/`([^`]+)`/g, function (m, code) {
    return stashPush('<code class="md-inline-code">' + mdEsc(code) + '</code>');
  });
  s = s.replace(/\$([^$\n]+?)\$/g, function (m, tex) {
    return stashPush('<span class="md-math-inline" data-tex="' + mdEsc(tex) + '">' + mdEsc(tex) + '</span>');
  });

  // 2) 转义其余文本
  s = mdEsc(s);

  // 3) 图片与链接（转义后 URL 中的 & 会变成 &amp;，浏览器解析时自动还原）
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^)]*)&quot;)?\)/g, function (m, alt, url, title) {
    return '<img class="md-img" src="' + url + '" alt="' + alt + '"' + (title ? ' title="' + title + '"' : '') + '>';
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^)]*)&quot;)?\)/g, function (m, txt, url, title) {
    return '<a class="md-link" href="' + url + '"' + (title ? ' title="' + title + '"' : '') + '>' + txt + '</a>';
  });

  // 4) Ruby 注音：[文字]{注音} 与 [文字]^(注音)
  if (opts.ruby !== false) {
    s = s.replace(/\[([^\]\[]+)\]\{([^}]+)\}/g, function (m, base, ruby) {
      return '<ruby class="md-ruby">' + base + '<rp>(</rp><rt>' + ruby + '</rt><rp>)</rp></ruby>';
    });
    s = s.replace(/\[([^\]\[]+)\]\^\(([^)]+)\)/g, function (m, base, ruby) {
      return '<ruby class="md-ruby">' + base + '<rp>(</rp><rt>' + ruby + '</rt><rp>)</rp></ruby>';
    });
  }

  // 5) 脚注引用 [^id]
  if (opts.footnotes !== false) {
    s = s.replace(/\[\^([^\]\s]+)\]/g, function (m, id) {
      const item = ctx.footnotes[id];
      if (!item) return m;
      return '<sup class="md-fn-ref"><a href="#fn-' + mdEsc(id) + '">[' + item.index + ']</a></sup>';
    });
  }

  // 6) 自动链接（裸 URL）
  if (opts.autolink !== false) {
    s = s.replace(/(^|[\s(（])(https?:\/\/[^\s<)）]+)/g, function (m, pre, url) {
      return pre + '<a class="md-link" href="' + url + '">' + url + '</a>';
    });
  }

  // 7) 强调系列
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  s = s.replace(/==([^=]+)==/g, '<mark class="md-mark">$1</mark>');

  // 8) 还原保护内容
  s = s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return stash[Number(i)] || ''; });
  return s;
}

/**
 * 渲染 Markdown 为 HTML
 * @param {string} md Markdown 文本
 * @param {Object} [options] 选项 { breaks, footnotes, admonition, taskList, ruby, tables, highlight, autolink }
 * @returns {string} HTML 片段
 */
function renderMarkdown(md, options) {
  const opts = Object.assign({
    breaks: true, footnotes: true, admonition: true, taskList: true,
    ruby: true, tables: true, highlight: true, autolink: true
  }, options || {});

  const lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
  const ctx = { footnotes: {}, order: [] };
  const out = [];

  // 第一遍：收集脚注定义
  lines.forEach(function (line) {
    const m = line.match(/^\[\^([^\]\s]+)\]:\s*(.+)$/);
    if (m && !ctx.footnotes[m[1]]) {
      ctx.order.push(m[1]);
      ctx.footnotes[m[1]] = { index: ctx.order.length, text: m[2] };
    }
  });

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (!line.trim()) { i++; continue; }

    // 脚注定义行（已收集，跳过）
    if (/^\[\^([^\]\s]+)\]:/.test(line)) { i++; continue; }

    // 围栏代码块
    const fence = line.match(/^\s*(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/);
    if (fence) {
      const mark = fence[1][0];
      const lang = fence[2] || '';
      const buf = [];
      i++;
      while (i < lines.length && !new RegExp('^\\s*' + mark + '{3,}\\s*$').test(lines[i])) {
        buf.push(lines[i]); i++;
      }
      i++; // 跳过结束围栏
      const code = buf.join('\n');
      if (mdNormLang(lang) === 'mermaid') {
        out.push('<div class="md-mermaid" data-code="' + mdEsc(code) + '"><pre class="md-mermaid-src">' + mdEsc(code) + '</pre></div>');
      } else {
        const body = opts.highlight ? highlightCode(code, lang) : mdEsc(code);
        out.push('<pre class="md-code" data-lang="' + mdEsc(lang || 'text') + '"><code>' + body + '</code></pre>');
      }
      continue;
    }

    // 块级公式
    if (/^\s*\$\$\s*$/.test(line)) {
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*\$\$\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      const tex = buf.join('\n').trim();
      out.push('<div class="md-math-block" data-tex="' + mdEsc(tex) + '">' + mdEsc(tex) + '</div>');
      continue;
    }
    const singleLineMath = line.match(/^\s*\$\$(.+?)\$\$\s*$/);
    if (singleLineMath) {
      out.push('<div class="md-math-block" data-tex="' + mdEsc(singleLineMath[1]) + '">' + mdEsc(singleLineMath[1]) + '</div>');
      i++; continue;
    }

    // 分隔线
    if (/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(line)) { out.push('<hr class="md-hr">'); i++; continue; }

    // 标题
    const h = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) {
      const level = h[1].length;
      out.push('<h' + level + ' class="md-h' + level + '">' + mdInline(h[2], ctx, opts) + '</h' + level + '>');
      i++; continue;
    }

    // 引用（含 GFM 警告块）
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      const adm = buf[0] && buf[0].match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
      if (opts.admonition !== false && adm) {
        const type = adm[1].toLowerCase();
        const first = adm[2] || '';
        const rest = buf.slice(1).join('\n');
        const titleMap = { note: '注意', tip: '提示', important: '重要', warning: '警告', caution: '小心' };
        out.push('<blockquote class="md-admonition md-adm-' + type + '">' +
          '<p class="md-adm-title">' + mdEsc(titleMap[type] || type.toUpperCase()) + '</p>' +
          '<p class="md-adm-body">' + mdInline((first + (rest ? '\n' + rest : '')), ctx, opts).replace(/\n/g, '<br>') + '</p>' +
          '</blockquote>');
      } else {
        out.push('<blockquote class="md-quote"><p>' + buf.map(function (l) { return mdInline(l, ctx, opts); }).join('<br>') + '</p></blockquote>');
      }
      continue;
    }

    // 表格
    if (opts.tables !== false && /\|/.test(line) && i + 1 < lines.length &&
        /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const splitRow = function (row) {
        return row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) { return c.trim(); });
      };
      const head = splitRow(line);
      const alignRow = splitRow(lines[i + 1]);
      const aligns = alignRow.map(function (c) {
        if (/^:-+:$/.test(c)) return 'center';
        if (/^:-+$/.test(c)) return 'left';
        if (/^-+:$/.test(c)) return 'right';
        return '';
      });
      i += 2;
      const rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { rows.push(splitRow(lines[i])); i++; }
      const th = head.map(function (c, k) {
        return '<th' + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + mdInline(c, ctx, opts) + '</th>';
      }).join('');
      const tb = rows.map(function (r) {
        return '<tr>' + head.map(function (_, k) {
          return '<td' + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + mdInline(r[k] || '', ctx, opts) + '</td>';
        }).join('') + '</tr>';
      }).join('');
      out.push('<div class="md-table-wrap"><table class="md-table"><thead><tr>' + th + '</tr></thead><tbody>' + tb + '</tbody></table></div>');
      continue;
    }

    // 列表（有序 / 无序 / 任务）
    const listStart = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (listStart) {
      const listBlocks = [];
      let curIndent = null, curType = null, curItems = null;
      const flushList = function () {
        if (curItems) listBlocks.push({ indent: curIndent, type: curType, items: curItems });
        curItems = null;
      };
      while (i < lines.length) {
        const lm = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!lm) {
          // 列表项的续行
          if (curItems && lines[i].trim() && !/^\s*$/.test(lines[i]) && curItems.length) {
            curItems[curItems.length - 1].text += ' ' + lines[i].trim();
            i++; continue;
          }
          break;
        }
        const indent = lm[1].replace(/\t/g, '    ').length;
        const type = /\d/.test(lm[2]) ? 'ol' : 'ul';
        if (curItems === null) { curIndent = indent; curType = type; curItems = []; }
        if (indent > curIndent) {
          // 简单处理：嵌套项并入上一项文本
          if (curItems.length) curItems[curItems.length - 1].text += '\n' + lm[3];
          i++; continue;
        }
        if (indent < curIndent || type !== curType) { flushList(); curIndent = indent; curType = type; curItems = []; }
        curItems.push({ text: lm[3] });
        i++;
      }
      flushList();

      listBlocks.forEach(function (blk) {
        const tag = blk.type;
        const items = blk.items.map(function (it) {
          let inner = it.text;
          let taskHtml = '';
          if (opts.taskList !== false && tag === 'ul') {
            const tm = inner.match(/^\[([ xX])\]\s*(.*)$/);
            if (tm) {
              const checked = tm[1].toLowerCase() === 'x';
              taskHtml = '<span class="md-task-box">' + (checked ? '☑' : '☐') + '</span>';
              inner = tm[2];
            }
          }
          const parts = inner.split('\n').map(function (l) { return mdInline(l, ctx, opts); });
          return '<li class="' + (taskHtml ? 'md-task-item' : '') + '">' + taskHtml + parts.join('<br>') + '</li>';
        }).join('');
        out.push('<' + tag + ' class="md-list md-' + tag + '">' + items + '</' + tag + '>');
      });
      continue;
    }

    // 段落（连续非空行合并）
    const para = [];
    while (i < lines.length && lines[i].trim() &&
           !/^\s*(#{1,6})\s+/.test(lines[i]) &&
           !/^\s*>/.test(lines[i]) &&
           !/^\s*(`{3,}|~{3,})/.test(lines[i]) &&
           !/^\s*([-*_])\s*\1\s*\1[\s\-*_]*$/.test(lines[i]) &&
           !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i]) &&
           !/^\[\^([^\]\s]+)\]:/.test(lines[i]) &&
           !/^\s*\$\$\s*$/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    if (!para.length) { i++; continue; }
    let html = para.map(function (l) { return mdInline(l, ctx, opts); }).join(opts.breaks ? '<br>' : ' ');
    out.push('<p class="md-p">' + html + '</p>');
  }

  // 脚注区
  if (opts.footnotes !== false && ctx.order.length) {
    const list = ctx.order.map(function (id) {
      return '<li id="fn-' + mdEsc(id) + '">' + mdInline(ctx.footnotes[id].text, ctx, opts) + '</li>';
    }).join('');
    out.push('<section class="md-footnotes"><p class="md-footnotes-title">参考</p><ol>' + list + '</ol></section>');
  }

  return out.join('\n');
}

/**
 * 判断文本是否更像 Markdown（用于「智能识别」导入）
 * @param {string} text 文本
 * @returns {boolean} 含 Markdown 特征返回 true
 */
function looksLikeMarkdown(text) {
  return /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|~~~|\|.*\|)/m.test(String(text || ''));
}

/**
 * 将 HTML 反向转为近似 Markdown（用于把富文本导出为 .md）
 * @param {string} html HTML 内容
 * @returns {string} Markdown 文本
 */
function htmlToMarkdown(html) {
  const div = document.createElement('div');
  div.innerHTML = html || '';

  /**
   * 递归转换节点
   * @param {Node} node 节点
   * @returns {string} Markdown
   */
  function walk(node) {
    let out = '';
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) {
        out += n.textContent.replace(/\s+/g, ' ');
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      const inner = walk(n);
      switch (tag) {
        case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
          out += '\n\n' + '#'.repeat(Number(tag[1])) + ' ' + inner.trim() + '\n\n'; break;
        case 'p': out += '\n\n' + inner.trim() + '\n\n'; break;
        case 'br': out += '\n'; break;
        case 'strong': case 'b': out += '**' + inner + '**'; break;
        case 'em': case 'i': out += '*' + inner + '*'; break;
        case 's': case 'del': case 'strike': out += '~~' + inner + '~~'; break;
        case 'code': out += (n.parentNode && n.parentNode.tagName === 'PRE') ? inner : '`' + inner + '`'; break;
        case 'pre': out += '\n\n```\n' + n.textContent.replace(/^\n+|\n+$/g, '') + '\n```\n\n'; break;
        case 'blockquote': out += '\n\n' + inner.trim().split('\n').map(function (l) { return '> ' + l; }).join('\n') + '\n\n'; break;
        case 'ul': case 'ol':
          out += '\n' + Array.from(n.children).map(function (li, idx) {
            return (tag === 'ol' ? (idx + 1) + '. ' : '- ') + walk(li).trim();
          }).join('\n') + '\n'; break;
        case 'li': out += inner; break;
        case 'a': out += '[' + inner + '](' + (n.getAttribute('href') || '') + ')'; break;
        case 'img': out += '![' + (n.getAttribute('alt') || '') + '](' + (n.getAttribute('src') || '') + ')'; break;
        case 'hr': out += '\n\n---\n\n'; break;
        case 'table': out += '\n\n' + tableToMd(n) + '\n\n'; break;
        default: out += inner;
      }
    });
    return out;
  }

  /**
   * 表格转 Markdown 管道表
   * @param {HTMLTableElement} table 表格元素
   * @returns {string} Markdown 表格
   */
  function tableToMd(table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (!rows.length) return '';
    const matrix = rows.map(function (tr) {
      return Array.from(tr.children).map(function (td) { return walk(td).trim().replace(/\|/g, '\\|'); });
    });
    const cols = Math.max.apply(null, matrix.map(function (r) { return r.length; }));
    const head = matrix[0].concat(new Array(Math.max(0, cols - matrix[0].length)).fill(''));
    const sep = head.map(function () { return '---'; });
    const body = matrix.slice(1).map(function (r) {
      return r.concat(new Array(Math.max(0, cols - r.length)).fill(''));
    });
    return '| ' + head.join(' | ') + ' |\n| ' + sep.join(' | ') + ' |\n' +
      body.map(function (r) { return '| ' + r.join(' | ') + ' |'; }).join('\n');
  }

  return walk(div).replace(/\n{3,}/g, '\n\n').trim();
}

/* 便于 Node 单测 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderMarkdown: renderMarkdown, highlightCode: highlightCode, mdEsc: mdEsc, looksLikeMarkdown: looksLikeMarkdown };
}
