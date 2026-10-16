import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateData } from '../model.js';

const root = new URL('../', import.meta.url);
const data = validateData(JSON.parse(await readFile(new URL('data/books.json', root), 'utf8')));
for (const book of data.books) {
  try {
    await access(new URL(book.cover, root));
  } catch {
    throw new Error(`Не найдена обложка: ${fileURLToPath(new URL(book.cover, root))}`);
  }
}
for (const file of ['index.html', 'styles.css', 'app.js', 'model.js', 'assets/favicon.svg']) await access(new URL(file, root));
console.log(`Данные и файлы в порядке: ${data.books.length} книг, ${data.members.length} участников.`);
