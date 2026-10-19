import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateData, average, ranking, timeline, statistics, editorialPicks } from '../model.js';

const members = [
  { id: 'misha', name: 'Миша' }, { id: 'varya', name: 'Варя' },
  { id: 'yulia', name: 'Юля' }, { id: 'dima', name: 'Дима' },
];
const book = (id, scores = [], extras = {}) => ({
  id, title: id, author: 'Автор', cover: 'assets/flowers-for-algernon.svg', pages: 200,
  suggestedBy: 'misha', status: 'read', finishedAt: '2026-10-16',
  ratings: Object.fromEntries(members.map((member, index) => [member.id, { stars: scores[index] ?? null, text: '' }])),
  ...extras,
});

test('a new library with one current book has no results', () => {
  const data = validateData({ members, books: [book('first', [], { status: 'reading', finishedAt: null, pages: null, suggestedBy: null })] });
  assert.equal(data.books.length, 1);
  assert.equal(data.books[0].status, 'reading');
  assert.equal(average(data.books[0]), null);
  assert.equal(statistics(data.books, data.members).books, 0);
});

test('published library data is valid and has at most one current book', async () => {
  const data = validateData(JSON.parse(await readFile(new URL('../data/books.json', import.meta.url), 'utf8')));
  assert.ok(data.books.filter((book) => book.status === 'reading').length <= 1);
});

test('an absent score is excluded; half stars are preserved', () => {
  assert.equal(average(book('a', [4.5, null, 3.5])), 4);
  assert.equal(average(book('b')), null);
});

test('ranking excludes current books and unscored books, and ties share a place', () => {
  const results = ranking([book('a', [5]), book('b', [5]), book('c', [4.5]), book('d'), book('e', [5], { status: 'reading', finishedAt: null })]);
  assert.deepEqual(results.map(({ book, rank }) => [book.id, rank]), [['a', 1], ['b', 1], ['c', 3]]);
});

test('ranking sorts unrounded averages, even when display rounds to the same value', () => {
  const results = ranking([book('lower', [4, 4, 4.5, 4.5]), book('higher', [4, 4.5, 4.5])]);
  assert.deepEqual(results.map(({ book }) => book.id), ['higher', 'lower']);
});

test('all tied books at a top-three place are kept', () => {
  const results = ranking([book('a', [5]), book('b', [4.5]), book('c', [4]), book('d', [4])]).filter(({ rank }) => rank <= 3);
  assert.equal(results.length, 4);
  assert.deepEqual(results.map(({ rank }) => rank), [1, 2, 3, 3]);
});

test('statistics count each completed volume once, track missing pages and proposer ties', () => {
  const stats = statistics([book('a', [5, 4]), book('b', [3], { suggestedBy: 'varya', pages: null }), book('c', [1], { status: 'reading', finishedAt: null })], members);
  assert.equal(stats.books, 2);
  assert.equal(stats.pages, 200);
  assert.equal(stats.missingPages, 1);
  assert.equal(stats.mean, 4);
  assert.equal(stats.voteCount, 3);
  assert.deepEqual(stats.proposers.map((member) => member.id), ['misha', 'varya']);
});

test('unanimous recommendations need all four votes at least four stars', () => {
  const picks = editorialPicks([book('complete', [4, 4.5, 5, 4]), book('incomplete', [5, 5, 5]), book('low', [5, 5, 5, 3.5])], members);
  assert.deepEqual(picks.unanimous.map((book) => book.id), ['complete']);
});

test('controversial books need two different scores and preserve ties', () => {
  const picks = editorialPicks([book('a', [5, 1]), book('b', [4.5, 0.5]), book('c', [5]), book('d', [3, 3])], members);
  assert.deepEqual(picks.controversial.map(({ book }) => book.id), ['a', 'b']);
  assert.equal(editorialPicks([book('same', [4, 4])], members).controversial.length, 0);
});

test('personal favorites use completed personal votes and keep ties', () => {
  const picks = editorialPicks([book('a', [4.5, 3]), book('b', [4.5, 5]), book('c', [5], { status: 'reading', finishedAt: null })], members);
  assert.deepEqual(picks.favorites[0].books.map((book) => book.id), ['a', 'b']);
  assert.deepEqual(picks.favorites[1].books.map((book) => book.id), ['b']);
  assert.equal(picks.favorites[2].score, null);
});

test('timeline shows current books first, then dated books newest first, then undated', () => {
  const input = [book('old', [], { finishedAt: '2026-01-01' }), book('undated', [], { finishedAt: null }), book('new'), book('current', [], { status: 'reading', finishedAt: null })];
  assert.deepEqual(timeline(input).map((book) => book.id), ['current', 'new', 'old', 'undated']);
  assert.equal(input[0].id, 'old');
});

test('empty library has honest empty results', () => {
  assert.deepEqual(ranking([]), []);
  assert.deepEqual(statistics([], members), { books: 0, pages: 0, missingPages: 0, mean: null, voteCount: 0, proposers: [] });
  assert.deepEqual(editorialPicks([], members).unanimous, []);
});

test('validation rejects invalid stars, nonexistent dates, duplicate IDs and unknown members', () => {
  for (const stars of [0, 5.5, -1, 3.2, '5', undefined]) {
    const invalid = book('a');
    invalid.ratings.misha.stars = stars;
    assert.throws(() => validateData({ members, books: [invalid] }));
  }
  for (const finishedAt of ['2026-02-30', '2026-13-01', '16.10.2026', '2025-02-29']) {
    assert.throws(() => validateData({ members, books: [book('a', [], { finishedAt })] }));
  }
  assert.throws(() => validateData({ members, books: [book('a'), book('a')] }));
  assert.throws(() => validateData({ members, books: [book('a', [], { suggestedBy: 'stranger' })] }));
  assert.throws(() => validateData({ members, books: [book('a', [], { ratings: { stranger: { stars: 5, text: '' } } })] }));
  assert.throws(() => validateData({ members, books: [book('a', [], { cover: 'https://example.com/cover.svg' })] }));
  assert.throws(() => validateData({ members, books: [book('a', [], { cover: 'assets/../secrets.svg' })] }));
});

test('reading start dates are optional, valid and do not follow the finish date', () => {
  for (const startedAt of [undefined, null, '2026-10-02', '2026-10-16']) {
    assert.doesNotThrow(() => validateData({ members, books: [book('a', [], { startedAt })] }));
  }
  for (const startedAt of ['2026-02-30', '2026-13-01', '04.10.2026', '2026-10-17', 20261004]) {
    assert.throws(() => validateData({ members, books: [book('a', [], { startedAt })] }));
  }
  assert.doesNotThrow(() => validateData({ members, books: [book('a', [], { status: 'reading', startedAt: '2026-10-18', finishedAt: null })] }));
});
