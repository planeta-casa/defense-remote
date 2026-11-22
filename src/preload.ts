import { assetUrl } from './config';
import { warn } from './log';

/**
 * Предзагрузка: каждый файл скачивается целиком и превращается в blob: URL,
 * чтобы во время показа ничего не грузилось из сети.
 * Пропавший файл не валит приложение — только предупреждение.
 */
const cache = new Map<string, string>();
const missing = new Set<string>();

export function blobUrl(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (missing.has(path)) return undefined;
  return cache.get(path) ?? assetUrl(path);
}

export function isMissing(path: string | undefined): boolean {
  return !path || missing.has(path);
}

export async function preloadAll(paths: string[], onProgress: (done: number, total: number) => void): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  let done = 0;
  onProgress(0, unique.length);
  // по 4 параллельно: быстрее, но не забиваем канал
  const queue = [...unique];
  async function worker() {
    for (let p = queue.shift(); p !== undefined; p = queue.shift()) {
      try {
        const res = await fetch(assetUrl(p));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        cache.set(p, URL.createObjectURL(blob));
      } catch (e) {
        missing.add(p);
        warn(`Нет файла ${p} (${(e as Error).message}) — пропускаю`);
      }
      done++;
      onProgress(done, unique.length);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
}
