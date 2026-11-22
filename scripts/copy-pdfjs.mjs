// Копирует cmaps, standard_fonts, wasm и iccs из pdfjs-dist в public/pdfjs,
// чтобы PDF с кириллицей и нестандартными шрифтами рендерился без интернета.
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', 'pdfjs-dist');
const dst = join(root, 'public', 'pdfjs');
mkdirSync(dst, { recursive: true });
for (const dir of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
  cpSync(join(src, dir), join(dst, dir), { recursive: true });
}
console.log('pdfjs data → public/pdfjs');
