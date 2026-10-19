import './check.mjs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const output = new URL('dist/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'model.js', 'assets', 'data']) {
  await cp(new URL(file, root), new URL(file, output), { recursive: true });
}
const appVersion = createHash('sha256').update(await readFile(new URL('app.js', root))).digest('hex').slice(0, 12);
const index = await readFile(new URL('index.html', output), 'utf8');
await writeFile(new URL('index.html', output), index.replace('src="./app.js"', `src="./app.js?v=${appVersion}"`));
await writeFile(new URL('.nojekyll', output), '');
console.log('Сайт подготовлен в dist/.');
