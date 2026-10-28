# Учебник: реклама, аналитика и агенты

Статический сайт без сборки. Данные глав, включая данные диаграмм и виджетов, лежат в JS-объектах, страницы рендерятся в браузере.

Требования к стилям и UI: `../docs/design-requirements.md`. Правила текста: `../CLAUDE.md`.

## Структура

| Путь | Назначение |
|---|---|
| `index.html` | Каркас страницы и подключение скриптов |
| `data/book.js` | Название, описание, маршруты чтения, порядок частей и глав |
| `data/chapters/chN.js` | Одна глава: объект с массивом блоков |
| `assets/styles.css` | Токены и стили компонентов |
| `assets/dom.js` | Хелперы DOM, безопасный разбор inline-разметки, хранилище |
| `assets/charts.js` | Диаграммы и виджеты |
| `assets/render.js` | Рендер блоков, страницы главы и главной |
| `assets/app.js` | Роутер на hash, сайдбар, поиск, прогресс |
| `vercel.json` | Настройки деплоя и заголовки безопасности |

## Просмотр локально

Откройте `index.html` в браузере или запустите сервер из каталога `website`:

```bash
npx serve .
```

## Как добавить главу

1. Создайте `data/chapters/chN.js` по образцу существующей.
2. Подключите файл в `index.html` перед `assets/dom.js` (сейчас подключены ch0-ch30).
3. Добавьте `id` главы в нужную часть в `data/book.js`.

## Схема главы

```js
(window.BOOK_CHAPTERS = window.BOOK_CHAPTERS || []).push({
  id: 'ch8',                 // используется в адресе #/ch8
  num: '8',                  // номер в оглавлении
  title: 'Название',
  status: 'draft',           // 'draft' или 'reviewed'
  updated: '28.10.2026',
  lede: 'Короткое вступление',
  blocks: [ /* см. ниже */ ]
});
```

## Блоки

| type | Поля |
|---|---|
| `h3`, `h4` | `text` (h3 попадает в чипы разделов страницы) |
| `p` | `text` |
| `ul`, `ol`, `checklist` | `items: [text]` |
| `table` | `head: [..]`, `rows: [[..]]`, `caption?` |
| `callout` | `variant: 'info' \| 'warn' \| 'analogy'`, `title?`, `text` |
| `code` | `lang?`, `code` |
| `accordion` | `items: [{ title, text }]` |
| `cards` | `items: [{ title, text?, href? }]` |
| `diagram` | `kind`, `title?`, `caption?`, `data` |
| `widget` | `name`, `title?`, `caption?`, `props?` |
| `hr` | без полей |

Inline-разметка в текстах: `**жирный**`, `` `код` ``, `[текст](#/ch3)`, `[текст](https://...)`. HTML в данных не поддерживается.

## Диаграммы (`kind` и `data`)

| kind | data |
|---|---|
| `flow` | `{ steps: [{ title, text?, tone? }] }` |
| `bars` | `{ rows: [{ label, value, display? }], max? }` |
| `stack` | `{ parts: [{ label, value }] }` |
| `tree` | `{ label, text?, tone?, children?: [..] }` |
| `gantt` | `{ days, rows: [{ label, from, days }] }` |
| `line` | `{ points: [{ x, y }], min?, max?, unit? }` |

`tone`: `accent`, `good`, `warn`, `bad`.

## Виджеты

- `unit-economics`: калькулятор окупаемости рекламы. `props`: `currency?`, `defaults?: { budget, cpc, cr, close, margin }`.
- `sales-funnel`: калькулятор воронки продаж. `props`: `target?`, `defaults?: { touches, weeks, reply, call, close, pay }`.

Новый виджет добавляется в `assets/charts.js` в объект `widgets`.

## Деплой на Vercel

Сайт публикуется как статика из каталога `website`. Сборка не нужна.

Через GitHub (рекомендуется):

1. В Vercel выберите Add New, Project и импортируйте репозиторий `stallev/studies`.
2. Root Directory: `website`.
3. Framework Preset: Other. Build Command и Install Command оставьте пустыми, Output Directory: `.`.
4. Production Branch: ветка, из которой вы публикуете (сейчас `master`).
5. Каждый push в эту ветку публикует сайт, остальные ветки получают preview-адреса.

Через CLI:

```bash
npm i -g vercel
cd website
vercel
vercel --prod
```

В `vercel.json` включены заголовки безопасности и строгая политика CSP: скрипты и стили только со своего домена, без inline. Сайт закрыт от индексации (`noindex`), потому что в материалах есть данные клиентов. Чтобы открыть его для поисковиков, уберите мета-тег `robots` из `index.html` и заголовок `X-Robots-Tag` из `vercel.json`.
