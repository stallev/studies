/* Block renderers: turn chapter data into DOM. */
(function () {
  'use strict';
  const Book = window.Book;
  const { H, inline, safeHref } = Book;

  const blocks = {
    h3(b, ctx) {
      const id = 'sec-' + (ctx.toc.length + 1);
      ctx.toc.push({ id, title: b.text });
      return H('h3', { id, text: b.text });
    },
    h4: b => H('h4', { text: b.text }),
    p: b => H('p', null, inline(b.text)),
    ul: b => H('ul', null, b.items.map(t => H('li', null, inline(t)))),
    ol: b => H('ol', null, b.items.map(t => H('li', null, inline(t)))),
    hr: () => H('hr'),

    checklist: b => H('ul', { class: 'checklist' }, b.items.map(t =>
      H('li', { class: 'check' }, H('span', { class: 'box', 'aria-hidden': 'true' }), H('span', null, inline(t))))),

    table: b => H('div', { class: 'tablewrap', tabindex: '0', role: 'region', 'aria-label': b.caption || 'Таблица' },
      H('table', null,
        H('thead', null, H('tr', null, b.head.map(h => H('th', { scope: 'col', text: h })))),
        H('tbody', null, b.rows.map(r => H('tr', null, r.map((c, i) => H('td', { 'data-label': b.head[i] }, inline(c))))))
      )),

    callout: b => H('div', { class: 'callout ' + (b.variant || 'info') },
      b.title ? H('p', null, H('strong', { text: b.title })) : null,
      H('p', null, inline(b.text))),

    code(b) {
      const btn = H('button', { class: 'copy', type: 'button', text: 'Копировать' });
      btn.addEventListener('click', () => {
        const done = msg => { btn.textContent = msg; setTimeout(() => { btn.textContent = 'Копировать'; }, 1400); };
        if (!navigator.clipboard) return done('Недоступно');
        navigator.clipboard.writeText(b.code).then(() => done('Скопировано'), () => done('Не вышло'));
      });
      return H('div', { class: 'codewrap' },
        H('pre', { tabindex: '0' }, H('code', { class: b.lang ? 'lang-' + b.lang : null, text: b.code })), btn);
    },

    accordion: b => H('div', null, b.items.map(i =>
      H('details', { class: 'acc' }, H('summary', { text: i.title }), H('div', null, inline(i.text))))),

    cards: b => H('div', { class: 'cards' }, b.items.map(i => {
      const href = safeHref(i.href || '');
      return H(href ? 'a' : 'div', { class: 'card', href }, H('b', { text: i.title }), i.text ? H('span', { text: i.text }) : null);
    })),

    diagram(b) {
      const draw = Book.diagrams[b.kind];
      const box = H('div', { class: 'diagram', role: 'group', 'aria-label': b.title || 'Диаграмма' }, b.title ? H('h4', { text: b.title }) : null);
      box.append(draw ? draw(b.data) : H('p', { text: 'Неизвестный тип диаграммы: ' + b.kind }));
      if (b.caption) box.append(H('p', { class: 'cap' }, inline(b.caption)));
      return box;
    },

    widget(b) {
      const make = Book.widgets[b.name];
      const box = H('div', { class: 'widget' }, b.title ? H('h4', { text: b.title }) : null);
      if (make) make(box, b.props || {}); else box.append(H('p', { text: 'Неизвестный виджет: ' + b.name }));
      if (b.caption) box.append(H('p', { class: 'cap' }, inline(b.caption)));
      return box;
    }
  };

  function renderBlocks(list, ctx) {
    return list.map(b => {
      const fn = blocks[b.type];
      if (!fn) return H('div', { class: 'callout warn' }, H('p', { text: 'Неизвестный блок: ' + b.type }));
      try { return fn(b, ctx); } catch (err) {
        console.error('Book: block failed', b, err);
        return H('div', { class: 'callout warn' }, H('p', { text: 'Не удалось построить блок «' + b.type + '».' }));
      }
    });
  }

  Book.renderPage = function (p, prev, next) {
    const ctx = { toc: [] };
    const body = H('div', null, renderBlocks(p.blocks || [], ctx));
    const root = H('article', null,
      H('p', { class: 'eyebrow', text: p.part }),
      H('h1', { class: 'page-h1', text: p.full }),
      p.lede ? H('p', { class: 'lede' }, inline(p.lede)) : null,
      H('div', { class: 'meta' },
        p.status === 'draft' ? H('span', { class: 'badge', text: 'Черновик: ждёт проверки фактов' }) : null,
        p.status === 'reviewed' ? H('span', { class: 'badge done', text: 'Проверено' }) : null,
        p.updated ? H('span', { text: 'Обновлено ' + p.updated }) : null),
      ctx.toc.length > 1 ? H('nav', { class: 'chips', 'aria-label': 'Разделы страницы' },
        ctx.toc.map(t => H('a', { class: 'chip', href: '#/' + p.id + '/' + t.id, text: t.title }))) : null,
      body,
      H('nav', { class: 'pager', 'aria-label': 'Соседние главы' },
        prev ? H('a', { class: 'card prev', href: '#/' + prev.id }, H('span', { text: 'Назад' }), H('b', { text: prev.title })) : H('span', { class: 'card empty' }),
        next ? H('a', { class: 'card next', href: '#/' + next.id }, H('span', { text: 'Далее' }), H('b', { text: next.title })) : H('span', { class: 'card empty' })));
    return root;
  };

  Book.renderHome = function (pages, seen, last) {
    const meta = Book.meta;
    const count = (pred) => pages.reduce((n, p) => n + (p.blocks || []).filter(pred).length, 0);
    const extras = count(b => b.type === 'diagram' || b.type === 'widget');
    const lastPage = pages.find(p => p.id === last);
    const root = H('div', null);
    root.append(H('section', { class: 'hero' },
      H('p', { class: 'eyebrow', text: 'Рабочий учебник · обновлено ' + meta.updated }),
      H('h1', { text: meta.title }),
      H('p', { class: 'lede' }, inline(meta.lede)),
      H('div', { class: 'stats' },
        H('div', null, H('b', { text: String(pages.length) }), 'глав'),
        H('div', null, H('b', { text: String(extras) }), 'диаграмм и калькуляторов')),
      H('div', { class: 'chips' },
        pages[0] ? H('a', { class: 'btn', href: '#/' + pages[0].id, text: 'Начать' }) : null,
        lastPage ? H('a', { class: 'btn secondary', href: '#/' + lastPage.id, text: 'Продолжить: ' + lastPage.title.slice(0, 32) }) : null)));
    if (meta.routes && meta.routes.length) {
      root.append(H('h3', { text: 'Маршруты чтения' }), Book.renderBlocks([{ type: 'cards', items: meta.routes }], { toc: [] })[0]);
    }
    Book.parts.forEach(part => {
      const list = pages.filter(p => p.part === part.title);
      if (!list.length) return;
      root.append(H('section', { class: 'partblock' },
        H('h2', { text: part.title }),
        H('ul', { class: 'chlist' }, list.map(p => H('li', null,
          H('a', { href: '#/' + p.id },
            H('span', { class: 'n', text: p.num }),
            H('span', null, p.title, seen.includes(p.id) ? H('span', { class: 'badge done', text: 'прочитано' }) : null)))))));
    });
    return root;
  };

  Book.renderBlocks = renderBlocks;
})();
