/* Router, sidebar, search, progress. */
(function () {
  'use strict';
  const Book = window.Book;
  const { H, store, clamp } = Book;
  const $ = s => document.querySelector(s);
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- pages from manifest + registered chapters ---------- */
  const registered = {};
  (window.BOOK_CHAPTERS || []).forEach(c => { registered[c.id] = c; });
  const pages = [];
  const byId = {};
  Book.parts.forEach(part => part.chapters.forEach(id => {
    const c = registered[id];
    if (!c) { console.warn('Book: chapter listed in book.js but not loaded:', id); return; }
    const p = Object.assign({}, c, { part: part.title, i: pages.length });
    p.full = c.num + '. ' + c.title;
    p.text = Book.flatText(c);
    pages.push(p);
    byId[p.id] = p;
  }));

  /* ---------- sidebar ---------- */
  const app = $('#app'), sidebar = $('#sidebar'), btnSidebar = $('#btn-sidebar');
  const wide = matchMedia('(min-width:960px)');
  let sidebarOpen = wide.matches ? store.get('book_sidebar') !== 'closed' : false;

  function setSidebar(open, persist) {
    sidebarOpen = open;
    app.dataset.sidebar = open ? 'open' : 'closed';
    sidebar.inert = !open;
    sidebar.setAttribute('aria-hidden', String(!open));
    btnSidebar.setAttribute('aria-expanded', String(open));
    btnSidebar.setAttribute('aria-label', open ? 'Скрыть оглавление' : 'Показать оглавление');
    if (persist && wide.matches) store.set('book_sidebar', open ? 'open' : 'closed');
  }
  btnSidebar.addEventListener('click', () => {
    setSidebar(!sidebarOpen, true);
    if (sidebarOpen && !wide.matches) { const i = $('#sidebar .search'); if (i) i.focus({ preventScroll: true }); }
  });
  $('#scrim').addEventListener('click', () => { setSidebar(false); btnSidebar.focus({ preventScroll: true }); });
  sidebar.addEventListener('click', e => { if (!wide.matches && e.target.closest('a[href^="#/"]')) setSidebar(false); });
  wide.addEventListener('change', () => setSidebar(wide.matches ? store.get('book_sidebar') !== 'closed' : false));

  /* ---------- sidebar content: search + chapter list ---------- */
  function snippet(text, q) {
    const i = text.toLowerCase().indexOf(q);
    const from = Math.max(0, i - 40);
    const s = text.slice(from, i + q.length + 90);
    if (i < 0) return [s];
    const at = i - from;
    return ['…' + s.slice(0, at), H('mark', { text: s.slice(at, at + q.length) }), s.slice(at + q.length) + '…'];
  }

  function buildToc(host) {
    const input = H('input', { class: 'search', type: 'search', placeholder: 'Поиск по учебнику', autocomplete: 'off', 'aria-label': 'Поиск по учебнику' });
    const results = H('div', { class: 'results', hidden: true });
    const list = H('div', null, H('a', { class: 'home', href: '#/home', text: 'Главная' }));
    Book.parts.forEach(part => {
      list.append(H('h2', { text: part.title }));
      pages.filter(p => p.part === part.title).forEach(p =>
        list.append(H('a', { href: '#/' + p.id, 'data-id': p.id }, H('span', { class: 'n', text: p.num }), H('span', { text: p.title }))));
    });
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const q = input.value.trim().toLowerCase();
        results.replaceChildren();
        if (q.length < 2) { results.hidden = true; list.hidden = false; return; }
        const hits = pages
          .map(p => ({ p, inTitle: p.full.toLowerCase().includes(q), inText: p.text.toLowerCase().includes(q) }))
          .filter(h => h.inTitle || h.inText)
          .sort((a, b) => Number(b.inTitle) - Number(a.inTitle));
        results.hidden = false; list.hidden = true;
        if (!hits.length) results.append(H('p', { class: 'cap', text: 'Ничего не найдено' }));
        hits.slice(0, 12).forEach(h => results.append(H('a', { href: '#/' + h.p.id },
          H('span', { class: 'n', text: h.p.num }),
          H('span', null, h.p.title, H('small', null, snippet(h.p.text, q))))));
      }, 120);
    });
    host.append(input, results, list);
  }

  /* ---------- router ---------- */
  let current = 'home';
  function parseHash() {
    const m = location.hash.match(/^#\/([\w-]+)(?:\/([\w-]+))?/);
    return m ? { id: m[1], sec: m[2] } : { id: 'home' };
  }

  function route(first) {
    const { id, sec } = parseHash();
    const page = byId[id];
    const view = $('#view');
    view.replaceChildren();
    if (page) {
      view.append(Book.renderPage(page, pages[page.i - 1], pages[page.i + 1]));
      store.set('book_last', id);
      let seen = [];
      try { seen = JSON.parse(store.get('book_seen') || '[]'); } catch (e) { seen = []; }
      if (!seen.includes(id)) { seen.push(id); store.set('book_seen', JSON.stringify(seen)); }
    } else {
      let seen = [];
      try { seen = JSON.parse(store.get('book_seen') || '[]'); } catch (e) { seen = []; }
      view.append(Book.renderHome(pages, seen, store.get('book_last')));
    }
    current = page ? id : 'home';
    updateChrome();
    const target = sec ? document.getElementById(sec) : null;
    if (target) target.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 0);
    if (!first) {
      view.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduceMotion() ? 120 : 220 });
      view.focus({ preventScroll: true });
    }
    document.title = (page ? page.full + ' · ' : '') + Book.meta.title;
  }

  function updateChrome() {
    const page = byId[current];
    $('#crumb').replaceChildren(...(page ? [H('small', { text: page.part }), page.full] : [Book.meta.title]));
    const prev = page ? pages[page.i - 1] : null;
    const next = page ? pages[page.i + 1] : pages[0];
    [['#btn-prev', prev], ['#btn-next', next]].forEach(([sel, target]) => {
      const el = $(sel);
      el.disabled = !target;
      el.onclick = target ? () => { location.hash = '#/' + target.id; } : null;
    });
    document.querySelectorAll('.toc a[data-id]').forEach(a => {
      if (a.dataset.id === current) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  window.addEventListener('hashchange', () => route(false));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebarOpen && !wide.matches) { setSidebar(false); btnSidebar.focus({ preventScroll: true }); return; }
    if (e.target.matches && e.target.matches('input,textarea,select')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const page = byId[current];
    const next = page ? pages[page.i + 1] : pages[0];
    const prev = page ? pages[page.i - 1] : null;
    if (e.key === 'ArrowRight' && next) location.hash = '#/' + next.id;
    if (e.key === 'ArrowLeft' && prev) location.hash = '#/' + prev.id;
  });

  /* reading progress */
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const d = document.documentElement;
      const max = d.scrollHeight - innerHeight;
      $('#progress').style.transform = 'scaleX(' + (max > 0 ? clamp(scrollY / max, 0, 1) : 0) + ')';
    });
  }, { passive: true });

  buildToc(sidebar);
  setSidebar(sidebarOpen);
  route(true);
})();
