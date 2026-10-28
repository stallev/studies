/* Book manifest: metadata, reading order, routes. Chapter content lives in data/chapters/chN.js. */
window.Book = window.Book || {};

Book.meta = {
  title: 'Реклама, аналитика и агенты',
  lede: 'Рабочий handbook для разработчика, который строит услугу из рекламы, сквозной аналитики и посадочных страниц. Рынки: Беларусь и Россия. Сквозной пример: аренда манипулятора.',
  updated: '28.10.2026',
  routes: [
    { title: 'Позиционирование и цена', text: 'Что продавать и сколько стоит заявка', href: '#/ch1' },
    { title: 'Измерение', text: 'План событий, GA4, Метрика, GTM', href: '#/ch5' },
    { title: 'Семантика и конкуренты', text: 'Ядро, Serpstat, Semrush, Similarweb', href: '#/ch11' },
    { title: 'Google Ads', text: 'Поиск, Performance Max, Demand Gen', href: '#/ch16' },
    { title: 'Яндекс Директ', text: 'Поиск, РСЯ, единая перфоманс-кампания', href: '#/ch21' },
    { title: 'Работа с клиентом', text: 'Отчёты, продажи, политики', href: '#/ch26' }
  ]
};

/* Order of parts and chapters. A chapter id listed here must exist in data/chapters. */
Book.parts = [
  { title: 'Начало', chapters: ['ch0'] },
  { title: 'Часть I. Основа', chapters: ['ch1', 'ch2', 'ch3', 'ch4'] },
  { title: 'Часть II. Измерение', chapters: ['ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10'] },
  { title: 'Часть III. Семантика и рынок', chapters: ['ch11', 'ch12', 'ch13', 'ch14', 'ch15'] },
  { title: 'Часть IV. Google Ads', chapters: ['ch16', 'ch17', 'ch18', 'ch19', 'ch20'] },
  { title: 'Часть V. Яндекс Директ', chapters: ['ch21', 'ch22', 'ch23'] },
  { title: 'Часть VI. Сайт и креатив', chapters: ['ch24', 'ch25'] },
  { title: 'Часть VII. Работа с клиентом', chapters: ['ch26', 'ch27', 'ch28', 'ch29'] },
  { title: 'Часть VIII. Автоматизация', chapters: ['ch30'] }
];
