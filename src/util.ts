export function fmtTime(ms: number): string {
  const s = Math.floor(Math.abs(ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function pick<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

export function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
