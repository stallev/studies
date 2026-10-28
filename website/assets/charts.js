/* Diagrams and widgets. Every renderer takes plain data from a chapter file and returns a DOM node. */
(function () {
  'use strict';
  const Book = window.Book;
  const { H, S, fmt, clamp, inline } = Book;

  const colorVar = i => (i % 6 ? 'var(--bar' + ((i % 6) + 1) + ')' : 'var(--bar)');
  const tone = t => (t ? ' ' + t : '');

  /* ---------- diagrams ---------- */
  const diagrams = {
    /* data: { steps: [{ title, text?, tone? }] } */
    flow(d) {
      const wrap = H('div', { class: 'flow' });
      d.steps.forEach((s, i) => {
        if (i) wrap.append(H('div', { class: 'arr', 'aria-hidden': 'true' }, '↓'));
        wrap.append(H('div', { class: 'node' + tone(s.tone) }, H('b', { text: s.title }), s.text ? H('span', null, inline(s.text)) : null));
      });
      return wrap;
    },

    /* data: { rows: [{ label, value, display? }], max? } */
    bars(d) {
      const max = d.max || Math.max(...d.rows.map(r => r.value), 1);
      return H('div', null, d.rows.map((r, i) => H('div', { class: 'hbar' },
        H('div', { class: 'lbl', text: r.label }),
        H('div', { class: 'track' }, H('div', { class: 'fill', style: { width: clamp(r.value / max * 100, 0, 100) + '%', background: colorVar(i) } })),
        H('div', { class: 'val', text: r.display != null ? r.display : fmt(r.value) }))));
    },

    /* data: { parts: [{ label, value }] } */
    stack(d) {
      const total = d.parts.reduce((s, p) => s + p.value, 0) || 1;
      return H('div', null,
        H('div', { class: 'stack', role: 'img', 'aria-label': d.parts.map(p => p.label + ' ' + fmt(p.value / total * 100) + '%').join(', ') },
          d.parts.map((p, i) => H('div', { style: { width: (p.value / total * 100) + '%', background: colorVar(i) } }))),
        H('div', { class: 'legend' }, d.parts.map((p, i) => H('span', null, H('i', { style: { background: colorVar(i) } }), p.label + ': ' + fmt(p.value / total * 100) + '%'))));
    },

    /* data: { label, text?, tone?, children?: [same] } */
    tree(d) {
      const build = n => H('li', null,
        H('div', { class: 'node' + tone(n.tone) }, H('b', { text: n.label }), n.text ? H('span', null, inline(n.text)) : null),
        n.children && n.children.length ? H('ul', null, n.children.map(build)) : null);
      return H('ul', { class: 'tree' }, build(d));
    },

    /* data: { days, startLabel?, rows: [{ label, from, days }] }  from/days are day offsets */
    gantt(d) {
      const g = H('div', { class: 'gantt' });
      d.rows.forEach((r, i) => g.append(H('div', { class: 'g' },
        H('span', { text: r.label }),
        H('div', { class: 'gt' }, H('div', { class: 'gb', style: { left: (r.from / d.days * 100) + '%', width: (r.days / d.days * 100) + '%', background: colorVar(i) } })))));
      const mid = Math.round(d.days / 2);
      g.append(H('div', { class: 'g' }, H('span'), H('div', { class: 'gaxis' },
        H('span', { text: 'день 0' }), H('span', { text: 'день ' + mid }), H('span', { text: 'день ' + d.days }))));
      return g;
    },

    /* data: { points: [{ x, y }], min?, max?, unit? } */
    line(d) {
      const w = 600, h = 220, pl = 44, pr = 12, pt = 12, pb = 28, n = d.points.length;
      const ys = d.points.map(p => p.y);
      const max = d.max != null ? d.max : Math.max(...ys);
      const min = d.min != null ? d.min : 0;
      const x = i => pl + (w - pl - pr) * (n > 1 ? i / (n - 1) : 0.5);
      const y = v => pt + (h - pt - pb) * (1 - (v - min) / ((max - min) || 1));
      const path = d.points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.y).toFixed(1)).join(' ');
      const grid = [min, (min + max) / 2, max].map(v => S('g', null,
        S('line', { class: 'axis', x1: pl, x2: w - pr, y1: y(v), y2: y(v) }),
        S('text', { x: pl - 6, y: y(v) + 4, 'text-anchor': 'end' }, fmt(v) + (d.unit || ''))));
      return S('svg', { class: 'chart', viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': d.title || 'График' },
        grid,
        S('path', { class: 'area', d: path + ' L' + x(n - 1).toFixed(1) + ' ' + y(min) + ' L' + x(0).toFixed(1) + ' ' + y(min) + ' Z' }),
        S('path', { class: 'line', d: path }),
        d.points.map((p, i) => S('g', null,
          S('circle', { class: 'dot', cx: x(i), cy: y(p.y), r: 3.5 }),
          S('text', { x: x(i), y: h - 8, 'text-anchor': 'middle' }, p.x))));
    }
  };

  /* ---------- widgets ---------- */
  let uid = 0;

  /* spec: { inputs: [{ id, label, min, max, step, value, unit? }], compute(values) -> { kpis: [{ label, value, tone? }], verdict: { tone?, text } } } */
  function calc(el, spec, overrides) {
    const state = {};
    spec.inputs.forEach(i => { state[i.id] = overrides && overrides[i.id] != null ? overrides[i.id] : i.value; });
    const kpis = H('div', { class: 'kpis' });
    const verdict = H('div', { class: 'verdict', role: 'status' });

    const update = () => {
      const r = spec.compute(state);
      kpis.replaceChildren(...r.kpis.map(k => H('div', { class: 'kpi' + tone(k.tone) }, H('small', { text: k.label }), H('b', { text: k.value }))));
      verdict.className = 'verdict' + tone(r.verdict.tone);
      verdict.textContent = r.verdict.text;
    };

    spec.inputs.forEach(i => {
      const id = 'w' + (++uid);
      const unit = i.unit ? ' ' + i.unit : '';
      const out = H('output', { for: id, text: fmt(state[i.id], i.step < 1 ? 2 : 0) + unit });
      const input = H('input', {
        type: 'range', id, min: i.min, max: i.max, step: i.step, value: state[i.id],
        oninput: e => { state[i.id] = Number(e.target.value); out.textContent = fmt(state[i.id], i.step < 1 ? 2 : 0) + unit; update(); }
      });
      el.append(H('div', { class: 'ctrl' }, H('label', { for: id, text: i.label }), out, input));
    });
    el.append(kpis, verdict);
    update();
  }

  const money = (v, cur) => (isFinite(v) ? fmt(v, v < 100 ? 2 : 0) + ' ' + cur : 'нет данных');

  const widgets = {
    /* props: { currency?, defaults?: { budget, cpc, cr, close, margin } } */
    'unit-economics'(el, props) {
      const cur = (props && props.currency) || 'BYN';
      calc(el, {
        inputs: [
          { id: 'budget', label: 'Бюджет в месяц, ' + cur, min: 100, max: 5000, step: 50, value: 1000 },
          { id: 'cpc', label: 'Цена клика, ' + cur, min: 0.2, max: 5, step: 0.05, value: 0.8 },
          { id: 'cr', label: 'Сайт: клик в заявку, %', min: 0.5, max: 15, step: 0.5, value: 4 },
          { id: 'close', label: 'Заявка в заказ, %', min: 5, max: 60, step: 1, value: 25 },
          { id: 'margin', label: 'Прибыль с одного заказа, ' + cur, min: 50, max: 3000, step: 10, value: 400 }
        ],
        compute(v) {
          const clicks = v.budget / v.cpc;
          const leads = clicks * v.cr / 100;
          const orders = leads * v.close / 100;
          const cpl = leads > 0 ? v.budget / leads : Infinity;
          const cac = orders > 0 ? v.budget / orders : Infinity;
          const profit = orders * v.margin - v.budget;
          return {
            kpis: [
              { label: 'Клики', value: fmt(clicks) },
              { label: 'Заявки', value: fmt(leads, 1) },
              { label: 'Стоимость заявки', value: money(cpl, cur) },
              { label: 'Заказы', value: fmt(orders, 1) },
              { label: 'Стоимость заказа', value: money(cac, cur), tone: cac <= v.margin ? 'good' : 'bad' },
              { label: 'Прибыль после рекламы', value: fmt(profit) + ' ' + cur, tone: profit >= 0 ? 'good' : 'bad' }
            ],
            verdict: profit >= 0
              ? { tone: 'good', text: 'Реклама окупается: стоимость заказа ' + money(cac, cur) + ' ниже прибыли с заказа ' + fmt(v.margin) + ' ' + cur + '.' }
              : { tone: 'bad', text: 'Реклама убыточна. Допустимая стоимость заказа равна прибыли с заказа (' + fmt(v.margin) + ' ' + cur + '), сейчас она выше или заказов нет.' }
          };
        }
      }, props && props.defaults);
    },

    /* props: { target?, defaults?: { touches, weeks, reply, call, close, pay } } */
    'sales-funnel'(el, props) {
      const target = (props && props.target) || 1000;
      calc(el, {
        inputs: [
          { id: 'touches', label: 'Касаний в неделю', min: 5, max: 30, step: 1, value: 10 },
          { id: 'weeks', label: 'Недель работы воронки', min: 4, max: 26, step: 1, value: 22 },
          { id: 'reply', label: 'Касание в ответ, %', min: 1, max: 30, step: 1, value: 10 },
          { id: 'call', label: 'Ответ в разговор, %', min: 10, max: 100, step: 5, value: 50 },
          { id: 'close', label: 'Разговор в клиента, %', min: 5, max: 60, step: 5, value: 40 },
          { id: 'pay', label: 'Платёж клиента в месяц, $', min: 100, max: 400, step: 10, value: 220 }
        ],
        compute(v) {
          const touches = v.touches * v.weeks;
          const replies = touches * v.reply / 100;
          const calls = replies * v.call / 100;
          const clients = calls * v.close / 100;
          const income = clients * v.pay;
          return {
            kpis: [
              { label: 'Касаний всего', value: fmt(touches) },
              { label: 'Ответов', value: fmt(replies, 1) },
              { label: 'Разговоров', value: fmt(calls, 1) },
              { label: 'Клиентов', value: fmt(clients, 1) },
              { label: 'Доход в месяц', value: '$' + fmt(income), tone: income >= target ? 'good' : 'bad' }
            ],
            verdict: income >= target
              ? { tone: 'good', text: 'Цель $' + fmt(target) + ' в месяц достигается при этих коэффициентах.' }
              : { tone: 'warn', text: 'До цели $' + fmt(target) + ' не хватает $' + fmt(target - income) + ' в месяц. Увеличьте объём касаний или улучшите коэффициент, который просел сильнее всего.' }
          };
        }
      }, props && props.defaults);
    }
  };

  Book.diagrams = diagrams;
  Book.widgets = widgets;
})();
