/* Shared DOM helpers. Content from data files is inserted as text nodes, never as HTML. */
(function () {
  'use strict';
  const Book = window.Book = window.Book || {};
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function append(el, kids) {
    kids.flat(Infinity).forEach(c => {
      if (c == null || c === false) return;
      el.append(c.nodeType ? c : document.createTextNode(String(c)));
    });
  }

  function apply(el, attrs) {
    if (!attrs) return;
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.setAttribute('class', v);
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }

  Book.H = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    apply(el, attrs);
    append(el, kids);
    return el;
  };

  Book.S = function (tag, attrs, ...kids) {
    const el = document.createElementNS(SVG_NS, tag);
    apply(el, attrs);
    append(el, kids);
    return el;
  };

  Book.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  Book.fmt = (n, d = 0) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: d, minimumFractionDigits: d });

  Book.store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  Book.safeHref = href => (/^#\//.test(href) || /^https:\/\//.test(href)) ? href : null;

  /* Inline markup: **bold**, `code`, [text](#/chapter or https://...) */
  const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  Book.inline = function (text) {
    const H = Book.H;
    return String(text).split(TOKEN).filter(Boolean).map(part => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return H('strong', { text: part.slice(2, -2) });
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return H('code', { text: part.slice(1, -1) });
      const m = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (m) {
        const href = Book.safeHref(m[2]);
        if (!href) return m[1];
        const external = href.startsWith('https://');
        return H('a', { href, target: external ? '_blank' : null, rel: external ? 'noopener noreferrer' : null, text: m[1] });
      }
      return part;
    });
  };

  /* All visible strings of a chapter, for search. */
  const SKIP_KEYS = new Set(['type', 'kind', 'variant', 'lang', 'tone', 'name', 'href', 'id', 'status']);
  Book.flatText = function flat(node) {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(flat).join(' ');
    if (node && typeof node === 'object') {
      return Object.keys(node).filter(k => !SKIP_KEYS.has(k)).map(k => flat(node[k])).join(' ');
    }
    return '';
  };
})();
