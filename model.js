export function validateData(data) {
  const fail = (message) => { throw new Error(message); };
  if (!data || !Array.isArray(data.members) || !data.members.length || !Array.isArray(data.books)) fail('Нужны списки members и books.');
  const memberIds = new Set();
  for (const member of data.members) {
    if (!member || typeof member.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(member.id) || typeof member.name !== 'string' || !member.name.trim() || memberIds.has(member.id)) fail('У участников должны быть непустые имена и уникальные id.');
    memberIds.add(member.id);
  }
  const bookIds = new Set();
  for (const book of data.books) {
    if (!book || typeof book.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(book.id) || bookIds.has(book.id)) fail('У каждой книги должен быть уникальный id латиницей.');
    bookIds.add(book.id);
    for (const field of ['title', 'author']) if (typeof book[field] !== 'string' || !book[field].trim()) fail(`${book.id}: заполните ${field}.`);
    if (typeof book.cover !== 'string' || !/^assets\/[a-zA-Z0-9_/-]+\.(svg|png|jpe?g|webp)$/.test(book.cover) || book.cover.includes('..')) fail(`${book.id}: укажите путь к обложке внутри assets/.`);
    if (book.pages !== null && (!Number.isInteger(book.pages) || book.pages <= 0)) fail(`${book.id}: pages — положительное целое число или null.`);
    if (book.suggestedBy !== null && !memberIds.has(book.suggestedBy)) fail(`${book.id}: неизвестный участник в suggestedBy.`);
    if (!['reading', 'read'].includes(book.status)) fail(`${book.id}: status должен быть reading или read.`);
    if (book.finishedAt !== null && (typeof book.finishedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(book.finishedAt) || !Number.isFinite(Date.parse(`${book.finishedAt}T00:00:00Z`)) || new Date(`${book.finishedAt}T00:00:00Z`).toISOString().slice(0, 10) !== book.finishedAt)) fail(`${book.id}: finishedAt — существующая дата ГГГГ-ММ-ДД или null.`);
    if (book.startedAt != null && (typeof book.startedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(book.startedAt) || !Number.isFinite(Date.parse(`${book.startedAt}T00:00:00Z`)) || new Date(`${book.startedAt}T00:00:00Z`).toISOString().slice(0, 10) !== book.startedAt)) fail(`${book.id}: startedAt — существующая дата ГГГГ-ММ-ДД или null.`);
    if (book.startedAt && book.finishedAt && book.startedAt > book.finishedAt) fail(`${book.id}: дата начала чтения позже даты завершения.`);
    if (book.status === 'reading' && book.finishedAt !== null) fail(`${book.id}: у текущей книги finishedAt должен быть null.`);
    if (!book.ratings || typeof book.ratings !== 'object' || Array.isArray(book.ratings)) fail(`${book.id}: нужен объект ratings.`);
    for (const [memberId, rating] of Object.entries(book.ratings)) {
      if (!memberIds.has(memberId)) fail(`${book.id}: неизвестный участник ${memberId}.`);
      if (!rating || (rating.stars !== null && (typeof rating.stars !== 'number' || rating.stars < 0.5 || rating.stars > 5 || !Number.isInteger(rating.stars * 2)))) fail(`${book.id}: оценка ${memberId} должна быть от 0.5 до 5 с шагом 0.5 или null.`);
      if (typeof rating.text !== 'string') fail(`${book.id}: отзыв ${memberId} должен быть строкой.`);
    }
  }
  return data;
}

export const completedBooks = (books) => books.filter((book) => book.status === 'read');
export const votes = (book) => Object.values(book.ratings).map((rating) => rating.stars).filter((stars) => stars !== null);
export const average = (book) => {
  const scores = votes(book);
  return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
};

export function ranking(books) {
  const sorted = completedBooks(books).filter((book) => average(book) !== null).sort((a, b) => average(b) - average(a) || a.title.localeCompare(b.title, 'ru'));
  let previousScore = null;
  let rank = 0;
  return sorted.map((book, index) => {
    const score = average(book);
    if (score !== previousScore) rank = index + 1;
    previousScore = score;
    return { book, rank, score };
  });
}

export function timeline(books) {
  return [...books].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'reading' ? -1 : 1;
    return (b.finishedAt || '').localeCompare(a.finishedAt || '') || a.title.localeCompare(b.title, 'ru');
  });
}

export function statistics(books, members) {
  const completed = completedBooks(books);
  const scores = completed.flatMap(votes);
  const counts = members.map((member) => ({ ...member, count: completed.filter((book) => book.suggestedBy === member.id).length }));
  const maximum = Math.max(0, ...counts.map((member) => member.count));
  return {
    books: completed.length,
    pages: completed.reduce((sum, book) => sum + (book.pages || 0), 0),
    missingPages: completed.filter((book) => book.pages === null).length,
    mean: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    voteCount: scores.length,
    proposers: maximum ? counts.filter((member) => member.count === maximum) : [],
  };
}

export function editorialPicks(books, members) {
  const completed = completedBooks(books);
  const disagreements = completed.filter((book) => votes(book).length >= 2).map((book) => ({ book, spread: Math.max(...votes(book)) - Math.min(...votes(book)) }));
  const maximum = Math.max(0, ...disagreements.map((entry) => entry.spread));
  return {
    controversial: disagreements.filter((entry) => maximum > 0 && entry.spread === maximum),
    unanimous: ranking(completed.filter((book) => members.every((member) => (book.ratings[member.id]?.stars ?? 0) >= 4))).map((entry) => entry.book),
    favorites: members.map((member) => {
      const rated = completed.filter((book) => book.ratings[member.id]?.stars != null);
      const best = Math.max(0, ...rated.map((book) => book.ratings[member.id].stars));
      return { member, score: best || null, books: rated.filter((book) => book.ratings[member.id].stars === best) };
    }),
  };
}
