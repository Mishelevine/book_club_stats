import { validateData, average, votes, ranking, timeline, statistics, editorialPicks } from './model.js';

const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const number = (value, digits = 0) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const plural = (value, forms) => forms[value % 100 >= 11 && value % 100 <= 14 ? 2 : value % 10 === 1 ? 0 : value % 10 >= 2 && value % 10 <= 4 ? 1 : 2];
const joinNames = (names) => names.length > 1 ? `${names.slice(0, -1).join(', ')} и ${names.at(-1)}` : (names[0] || '');
const memberName = (members, id) => members.find((member) => member.id === id)?.name;
const date = (value) => value ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`)).replace(' г.', '') : 'Дата встречи пока не указана';

function stars(value, extraClass = '') {
  if (value === null) return '<span class="not-rated">Ещё нет оценки</span>';
  return `<span class="rating ${extraClass}" aria-label="${escape(number(value, 1))} из 5 звёзд"><span class="stars" aria-hidden="true"><span class="stars-track">★★★★★</span><span class="stars-fill" style="width:${value / 5 * 100}%">★★★★★</span></span><span class="rating-number" aria-hidden="true">${number(value, 1)}</span></span>`;
}

function cover(book, className = '', eager = false) {
  return `<div class="book-cover ${className}"><img src="./${escape(book.cover)}" alt="Обложка книги «${escape(book.title)}»" width="600" height="870" loading="${eager ? 'eager' : 'lazy'}" decoding="async"><span class="cover-fallback" hidden>${escape(book.author)}<strong>${escape(book.title)}</strong></span></div>`;
}

function heading(index, title, description, id, aside = '') {
  return `<div class="section-heading"><div><p class="eyebrow section-eyebrow">${index}</p><h2 id="${id}">${title}</h2>${description ? `<p class="section-description">${description}</p>` : ''}</div>${aside ? `<span class="section-aside">${aside}</span>` : ''}</div>`;
}

function bookDetails(book, members) {
  const count = votes(book).length;
  const completed = book.status === 'read';
  return `<details class="book-details"><summary><span>Оценки редакции</span><span class="details-count">${count} из ${members.length}<span class="details-plus" aria-hidden="true">+</span></span></summary><div class="member-reviews">${members.map((member, index) => {
    const rating = book.ratings[member.id];
    return `<div class="member-review"><span class="member-avatar member-${index % 4}" aria-hidden="true">${escape(member.name.slice(0, 1))}</span><div class="review-body"><div class="review-line"><span class="review-name">${escape(member.name)}</span>${rating?.stars != null ? stars(rating.stars) : `<span class="not-rated">${completed ? 'Ещё не оценил' : 'После прочтения'}</span>`}</div>${rating?.text ? `<p class="review-text">${escape(rating.text)}</p>` : ''}</div></div>`;
  }).join('')}</div></details>`;
}

function renderCurrent(books, members) {
  const current = books.find((book) => book.status === 'reading');
  const section = document.querySelector('#current');
  if (!current) { section.hidden = true; return; }
  const isFirst = !books.some((book) => book.status === 'read');
  section.innerHTML = `<div class="current-card"><div class="current-copy"><p class="eyebrow"><span class="reading-dot" aria-hidden="true"></span> НА НАШИХ ПРИКРОВАТНЫХ СТОЛИКАХ</p><h2 id="current-title">${isFirst ? 'Всё начинается<br>с первой книги.' : 'Читаем сейчас.'}</h2><div class="current-book-title">${escape(current.title)}</div><p class="current-author">${escape(current.author)}</p><p class="current-description">${isFirst ? 'Наша первая общая история. Впереди — встреча,<br class="desktop-break"> разговор и первые звёзды на этой полке.' : 'Следующая встреча — об этой книге.<br class="desktop-break"> Пока читаем и собираем впечатления.'}</p><div class="current-meta"><span class="pill">Читаем сейчас</span>${current.suggestedBy ? `<span>Выбор: ${escape(memberName(members, current.suggestedBy))}</span>` : ''}${current.pages ? `<span>${number(current.pages)} стр.</span>` : ''}</div><a class="text-link" href="#book-${escape(current.id)}">К записи в дневнике <span aria-hidden="true">↗</span></a></div><div class="current-art"><span class="art-orbit" aria-hidden="true"></span><span class="art-caption art-caption-top" aria-hidden="true">СЛЕДУЮЩАЯ ТЕМА ДЛЯ РАЗГОВОРА</span>${cover(current, 'hero-cover', true)}<span class="art-caption art-caption-bottom" aria-hidden="true">ВЫБРАНО РЕДАКЦИЕЙ. ЧИТАЕМ ВМЕСТЕ.</span></div></div>`;
}

function renderBest(books, members) {
  const top = ranking(books).filter((entry) => entry.rank <= 3);
  document.querySelector('#best').innerHTML = heading('ЛИЧНЫЙ КАНОН', 'Выбор редакции', 'Книги, к которым хочется вернуться. По нашим общим оценкам.', 'best-title', 'ПЯТЬ ЗВЁЗД — МАКСИМУМ') + (top.length ? `<div class="top-grid">${top.map(({ book, rank, score }) => `<article class="top-book"><a class="top-cover-link" href="#book-${escape(book.id)}" aria-label="${escape(book.title)} — перейти к оценкам"><span class="rank">${rank}</span>${cover(book)}</a><div class="top-book-heading"><h3><a href="#book-${escape(book.id)}">${escape(book.title)}</a></h3>${stars(score)}</div><p class="book-author">${escape(book.author)}</p><p class="book-small-meta">${book.suggestedBy ? `Выбор: ${escape(memberName(members, book.suggestedBy))}<span aria-hidden="true"> · </span>` : ''}${votes(book).length} из ${members.length} оценок</p></article>`).join('')}</div>` : `<div class="top-empty"><div class="empty-stars" aria-hidden="true">☆ ☆ ☆ ☆ ☆</div><div><h3>Лучшее ещё впереди</h3><p>Прочитаем первую книгу, поделимся впечатлениями —<br class="desktop-break"> и здесь начнёт складываться наш личный канон.</p></div><span class="empty-margin-note">МЕСТО ДЛЯ<br>БУДУЩИХ ЛЮБИМЫХ</span></div>`);
}

function readingNote(book) {
  if (!book.startedAt) return '';
  const days = book.finishedAt ? (Date.parse(`${book.finishedAt}T00:00:00Z`) - Date.parse(`${book.startedAt}T00:00:00Z`)) / 86400000 : null;
  return `<p class="entry-meta">Начали ${date(book.startedAt)}${days !== null ? `<span aria-hidden="true"> · </span>Читали ${number(days)} ${plural(days, ['день', 'дня', 'дней'])}` : ''}</p>`;
}

function renderHistory(books, members) {
  document.querySelector('#history').innerHTML = heading('КНИГА ЗА КНИГОЙ', 'История чтения', 'Наша полка пополняется после каждой встречи.', 'history-title', `${books.length} ${plural(books.length, ['ИСТОРИЯ', 'ИСТОРИИ', 'ИСТОРИЙ'])}`) + `<div class="timeline">${timeline(books).map((book) => `<article id="book-${escape(book.id)}" class="timeline-entry"><div class="timeline-date"><span class="timeline-node ${book.status === 'reading' ? 'node-active' : ''}" aria-hidden="true"></span><span>${book.status === 'reading' ? 'Сейчас читаем' : date(book.finishedAt)}</span>${book.status === 'reading' ? '<span class="date-note">Встреча впереди</span>' : ''}</div><div class="timeline-cover">${cover(book)}</div><div class="timeline-body"><div class="entry-heading"><div><h3>${escape(book.title)}</h3><p class="book-author">${escape(book.author)}</p></div>${book.status === 'read' ? stars(average(book), 'entry-rating') : '<span class="pill">В процессе</span>'}</div><p class="entry-meta">${book.suggestedBy ? `Выбор: ${escape(memberName(members, book.suggestedBy))}` : 'Клубное чтение'}${book.pages ? `<span aria-hidden="true"> · </span>${number(book.pages)} страниц` : ''}</p>${readingNote(book)}${bookDetails(book, members)}</div></article>`).join('') || '<p class="plain-empty">Здесь будет история наших встреч и прочитанных книг.</p>'}</div>`;
}

function pickBook(book, members, note = '') {
  return `<a class="pick-book" href="#book-${escape(book.id)}">${cover(book)}<span><strong>${escape(book.title)}</strong><span class="pick-author">${escape(book.author)}</span>${note ? `<span class="pick-note">${note}</span>` : stars(average(book))}</span><span class="pick-arrow" aria-hidden="true">↗</span></a>`;
}

function renderEditorial(books, members) {
  const picks = editorialPicks(books, members);
  document.querySelector('#editorial-content').innerHTML = heading('МЕЖДУ СТРОК', 'У каждого — своё прочтение', 'Иногда мы согласны во всём. Иногда разговор только начинается.', 'editorial-title') + `<div class="editorial-grid"><article class="editorial-card"><div class="card-label"><span>МНЕНИЯ РАЗДЕЛИЛИСЬ</span></div><h3>Самая спорная</h3>${picks.controversial.length ? `<div class="picks-list">${picks.controversial.map(({ book, spread }) => pickBook(book, members, `Разница оценок — ${number(spread, 1)} ${plural(spread, ['звезда', 'звезды', 'звёзд'])}`)).join('')}</div>` : '<p class="editorial-empty">Одна книга, разные впечатления.<br>Здесь появится та, о которой<br class="desktop-break"> нам было бы интересно поспорить.</p><p class="card-footnote">Сравним, когда будут разные оценки.</p>'}</article><article class="editorial-card"><div class="card-label"><span>ПОЛНОЕ СОВПАДЕНИЕ</span></div><h3>Единодушно рекомендуем</h3>${picks.unanimous.length ? `<div class="picks-list">${picks.unanimous.map((book) => pickBook(book, members)).join('')}</div>` : '<p class="editorial-empty">Особое место для книг,<br>которым каждый из нас поставит<br class="desktop-break"> четыре звезды или больше.</p><p class="card-footnote">В ожидании первого общего «да».</p>'}</article></div><div class="favorites"><div class="favorites-heading"><h3>Вкус редактора</h3><p>Личные фавориты на общей полке</p></div><div class="favorites-grid">${picks.favorites.map(({ member, books: favorites, score }, index) => `<article class="favorite"><div class="favorite-member"><span class="member-avatar member-${index % 4}" aria-hidden="true">${escape(member.name.slice(0, 1))}</span><h4>${escape(member.name)}</h4></div>${favorites.length ? `<div class="favorite-books">${favorites.map((book) => `<a href="#book-${escape(book.id)}">${escape(book.title)} <span aria-hidden="true">↗</span></a>`).join('')}${stars(score)}</div>` : '<p class="favorite-empty">Любимая книга<br>ещё впереди</p>'}</article>`).join('')}</div></div>`;
}

function renderNumbers(books, members) {
  const stats = statistics(books, members);
  document.querySelector('#numbers').innerHTML = heading('ЧУТЬ-ЧУТЬ АРИФМЕТИКИ', 'Редакция в цифрах', '', 'numbers-title') + `<div class="stats-grid"><div class="stat"><span class="stat-value">${number(stats.books)}</span><span class="stat-label">${plural(stats.books, ['книга прочитана', 'книги прочитаны', 'книг прочитано'])}</span><p>И столько же поводов встретиться</p></div><div class="stat"><span class="stat-value">${stats.books && stats.missingPages === stats.books ? '—' : number(stats.pages)}</span><span class="stat-label">страниц на общей полке</span><p>${stats.missingPages ? `Не указан объём ${stats.missingPages} ${plural(stats.missingPages, ['книги', 'книг', 'книг'])}` : 'Каждую книгу считаем один раз'}</p></div><div class="stat"><span class="stat-value">${stats.mean === null ? '—' : number(stats.mean, 1)}<span class="stat-unit"> из 5</span></span><span class="stat-label">средняя оценка клуба</span><p>${stats.voteCount ? `На основе ${stats.voteCount} ${plural(stats.voteCount, ['оценки', 'оценок', 'оценок'])}` : 'Сложится после первых оценок'}</p></div><div class="stat"><span class="stat-value stat-names">${stats.proposers.length ? escape(joinNames(stats.proposers.map((member) => member.name))) : '—'}</span><span class="stat-label">${stats.proposers.length > 1 ? 'чаще всех выбирали книги' : 'чаще всех выбирает книги'}</span><p>${stats.proposers.length ? `${stats.proposers[0].count} ${plural(stats.proposers[0].count, ['прочитанная книга', 'прочитанные книги', 'прочитанных книг'])}` : 'У каждого ещё всё впереди'}</p></div></div><p class="numbers-note">Главное всё-таки не в цифрах. Главное — что есть с кем обсудить.</p>`;
}

async function start() {
  const state = document.querySelector('#load-state');
  try {
    const response = await fetch(new URL('./data/books.json', import.meta.url), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Не удалось загрузить книги (${response.status}).`);
    const { books, members } = validateData(await response.json());
    document.querySelector('#member-names').textContent = joinNames(members.map((member) => member.name));
    document.querySelector('.member-initials').innerHTML = members.map((member) => `<span>${escape(member.name.slice(0, 1))}</span>`).join('');
    renderCurrent(books, members);
    renderBest(books, members);
    renderHistory(books, members);
    renderEditorial(books, members);
    renderNumbers(books, members);
    if (ranking(books).length) {
      document.querySelector('#content').classList.add('has-ranked-books');
      document.querySelector('#current').classList.add('current-compact');
      document.querySelector('#content').insertBefore(document.querySelector('#best'), document.querySelector('#current'));
    }
    document.querySelectorAll('.book-cover img').forEach((img) => {
      img.addEventListener('error', () => { img.hidden = true; img.nextElementSibling.hidden = false; });
      if (img.complete && img.naturalWidth === 0) { img.hidden = true; img.nextElementSibling.hidden = false; }
    });
    state.hidden = true;
    document.querySelector('#content').hidden = false;
    if (location.hash.startsWith('#book-')) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (error) {
    console.error(error);
    state.classList.add('load-error');
    state.innerHTML = '<p>Книжная полка пока не открылась. Попробуйте обновить страницу.</p><button class="retry-button" type="button">Попробовать ещё раз <span aria-hidden="true">↻</span></button>';
    state.querySelector('button').addEventListener('click', () => location.reload());
  }
}

start();
