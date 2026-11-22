import type { GenreCfg } from '../config';
import { blobUrl, isMissing } from '../preload';
import { el } from '../util';

/**
 * Украшения жанра: верхняя полоса и два нижних угла.
 * Если в конфиге "decor": "svg:<id>" — рисуем встроенные SVG, если объект с путями — берём картинки.
 */

const TOP_H = 120;

type Pt = [number, number];
const qb = (a: Pt, c: Pt, b: Pt, t: number): Pt => [
  (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
  (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
];
const qbAngle = (a: Pt, c: Pt, b: Pt, t: number) => {
  const dx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
  const dy = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};
/** Провисающие сегменты на всю ширину: [начало, контрольная, конец] */
function swags(w: number, span: number, y: number, sag: number): [Pt, Pt, Pt][] {
  const n = Math.max(2, Math.round(w / span));
  const s = w / n;
  return Array.from({ length: n }, (_, i) => [
    [i * s, y],
    [i * s + s / 2, y + sag * 2],
    [(i + 1) * s, y],
  ]);
}
const svg = (w: number, h: number, body: string, style = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><style>${style}</style>${body}</svg>`;

function flame(x: number, y: number, size: number, outer: string, inner: string, cls: string, delay: number) {
  return `<g class="${cls}" style="animation-delay:${delay}s">
    <circle cx="${x}" cy="${y - size * 0.6}" r="${size * 1.6}" fill="${outer}" opacity=".22" filter="url(#blur)"/>
    <path d="M${x} ${y - size * 2} C ${x + size * 0.9} ${y - size} ${x + size * 0.7} ${y} ${x} ${y} C ${x - size * 0.7} ${y} ${x - size * 0.9} ${y - size} ${x} ${y - size * 2} Z" fill="${outer}"/>
    <path d="M${x} ${y - size * 1.1} C ${x + size * 0.4} ${y - size * 0.5} ${x + size * 0.3} ${y} ${x} ${y} C ${x - size * 0.3} ${y} ${x - size * 0.4} ${y - size * 0.5} ${x} ${y - size * 1.1} Z" fill="${inner}"/>
  </g>`;
}
const BLUR = '<defs><filter id="blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="6"/></filter></defs>';
const FLICKER = `.fl{transform-box:fill-box;transform-origin:50% 100%;animation:fl 1.1s ease-in-out infinite alternate}
@keyframes fl{0%{transform:scale(1,1) rotate(-2deg)}50%{transform:scale(.92,1.08) rotate(2deg)}100%{transform:scale(1.05,.95) rotate(-1deg)}}`;

function candles(body: string, wax: string, drip: string | null, flameOuter: string, flameInner: string, list: [number, number, number][]) {
  return list
    .map(([x, h, w], i) => {
      const top = 236 - h;
      const drips = drip
        ? `<path d="M${x - w / 2} ${top + 4} h${w} v${10 + i * 6} q-4 8 -8 0 v-6 q-4 10 -9 0 v${8 - i * 2} q-4 7 -8 0 Z" fill="${drip}"/>`
        : '';
      return `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${h}" fill="${body}"/>
        <rect x="${x - w / 2}" y="${top}" width="${w * 0.28}" height="${h}" fill="${wax}" opacity=".5"/>${drips}
        <line x1="${x}" y1="${top}" x2="${x}" y2="${top - 8}" stroke="#222" stroke-width="2"/>
        ${flame(x, top - 6, 9 + w / 8, flameOuter, flameInner, 'fl', i * 0.23)}`;
    })
    .join('');
}

// ---------- Уютное ----------
function cozyTop(w: number) {
  const colors = ['#ffcf5c', '#ff8a5c', '#ff5c8a', '#8affc1', '#5cc8ff', '#c49bff'];
  let wires = '';
  let bulbs = '';
  let k = 0;
  for (const [a, c, b] of swags(w, 300, 8, 26)) {
    wires += `<path d="M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}" stroke="#2f4a2f" stroke-width="3" fill="none"/>`;
    for (const t of [0.12, 0.31, 0.5, 0.69, 0.88]) {
      const [x, y] = qb(a, c, b, t);
      const col = colors[k % colors.length];
      bulbs += `<g class="cz-b" style="animation-delay:${(k * 0.37) % 2.4}s">
        <ellipse cx="${x}" cy="${y + 20}" rx="18" ry="22" fill="${col}" opacity=".45" filter="url(#blur)"/>
        <rect x="${x - 4}" y="${y}" width="8" height="8" fill="#2f4a2f"/>
        <ellipse cx="${x}" cy="${y + 19}" rx="8" ry="12" fill="${col}"/>
        <ellipse cx="${x - 3}" cy="${y + 15}" rx="2" ry="4" fill="#fff" opacity=".7"/></g>`;
      k++;
    }
  }
  return svg(w, TOP_H, BLUR + wires + bulbs, `.cz-b{animation:czb 2.4s ease-in-out infinite}@keyframes czb{0%,100%{opacity:1}50%{opacity:.45}}`);
}
function cozyCorner() {
  const body =
    `<ellipse cx="110" cy="238" rx="105" ry="8" fill="#000" opacity=".35"/>` +
    candles('#f3e6cf', '#fff', null, '#ffb347', '#fff6d0', [
      [48, 92, 34],
      [104, 138, 40],
      [160, 70, 32],
    ]) +
    `<path d="M196 236 q8 -40 30 -60 q-4 30 -18 60z" fill="#3f6b3f"/><path d="M206 236 q16 -30 34 -36 q-10 24 -26 36z" fill="#4f8a4f"/>`;
  return svg(240, 240, BLUR + body, FLICKER);
}

// ---------- Готика ----------
function gothicTop(w: number) {
  let chains = '';
  for (const [a, c, b] of swags(w, 420, 6, 30)) {
    const steps = Math.round((b[0] - a[0]) / 17);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const [x, y] = qb(a, c, b, t);
      const ang = qbAngle(a, c, b, t);
      chains += `<ellipse cx="${x}" cy="${y}" rx="11" ry="${i % 2 ? 2.6 : 6}" transform="rotate(${ang} ${x} ${y})" fill="none" stroke="${i % 2 ? '#6e737c' : '#9aa0a8'}" stroke-width="3.5"/>`;
    }
  }
  const bat = (x: number, y: number, s: number, d: number) =>
    `<g class="gt-bat" style="animation-delay:${d}s"><g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 C-6 -8 -14 -10 -26 -6 C-20 -2 -18 2 -20 8 C-14 4 -8 6 -4 10 C-2 6 2 6 4 10 C8 6 14 4 20 8 C18 2 20 -2 26 -6 C14 -10 6 -8 0 0Z M-3 -2 l-2 -6 l3 3 l2 0 l3 -3 l-2 6z" fill="#120b17"/></g></g>`;
  const bats = [0.18, 0.52, 0.83].map((p, i) => bat(w * p, 58 + i * 8, 1.3 - i * 0.15, i * 0.7)).join('');
  const shade = `<defs><linearGradient id="gtg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0710" stop-opacity=".85"/><stop offset="1" stop-color="#0b0710" stop-opacity="0"/></linearGradient></defs><rect width="${w}" height="70" fill="url(#gtg)"/>`;
  return svg(w, TOP_H, shade + chains + bats, `.gt-bat{transform-box:fill-box;transform-origin:50% 0;animation:gtb 3s ease-in-out infinite alternate}@keyframes gtb{from{transform:rotate(-7deg) translateY(0)}to{transform:rotate(7deg) translateY(6px)}}`);
}
function gothicCorner() {
  let web = '';
  for (let i = 0; i <= 6; i++) {
    const a = (Math.PI / 2) * (i / 6);
    web += `<line x1="0" y1="240" x2="${Math.sin(a) * 200}" y2="${240 - Math.cos(a) * 200}" stroke="#bbb" stroke-width="1" opacity=".5"/>`;
  }
  for (const r of [50, 90, 130, 170]) {
    let d = '';
    for (let i = 0; i <= 6; i++) {
      const a = (Math.PI / 2) * (i / 6);
      const x = Math.sin(a) * r, y = 240 - Math.cos(a) * r;
      d += i === 0 ? `M${x} ${y}` : ` Q${Math.sin(a - Math.PI / 24) * r * 0.86} ${240 - Math.cos(a - Math.PI / 24) * r * 0.86} ${x} ${y}`;
    }
    web += `<path d="${d}" fill="none" stroke="#bbb" stroke-width="1" opacity=".45"/>`;
  }
  const body =
    web +
    `<rect x="20" y="226" width="200" height="12" fill="#1a1320"/>` +
    candles('#2b2233', '#5a4a66', '#3d2f48', '#b98cff', '#f4e9ff', [
      [70, 150, 30],
      [128, 110, 28],
      [180, 76, 26],
    ]);
  return svg(240, 240, BLUR + body, FLICKER);
}

// ---------- Гонки ----------
function racingTop(w: number) {
  const s = 22;
  let squares = '';
  for (let x = 0; x < w + s * 2; x += s) {
    for (let r = 0; r < 2; r++) {
      if ((x / s + r) % 2 === 0) squares += `<rect x="${x}" y="${r * s}" width="${s}" height="${s}"/>`;
    }
  }
  const body = `<rect width="${w}" height="${s * 2}" fill="#f5f5f5"/><g class="rc-flow" fill="#111">${squares}</g>
    <rect y="${s * 2}" width="${w}" height="5" fill="#e10600"/>
    ${[0.08, 0.3, 0.7, 0.92].map((p) => `<g class="rc-line" style="animation-delay:${p}s"><rect x="${w * p}" y="${s * 2 + 14}" width="120" height="3" fill="#fff" opacity=".6"/><rect x="${w * p + 30}" y="${s * 2 + 26}" width="70" height="3" fill="#fff" opacity=".4"/></g>`).join('')}`;
  return svg(w, TOP_H, body, `.rc-flow{animation:rcf 1.2s linear infinite}@keyframes rcf{from{transform:translateX(0)}to{transform:translateX(-${s * 2}px)}}
    .rc-line{animation:rcl .9s linear infinite}@keyframes rcl{from{transform:translateX(60px);opacity:0}30%{opacity:1}to{transform:translateX(-140px);opacity:0}}`);
}
function racingCorner() {
  let tread = '';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * 360;
    tread += `<rect x="-5" y="-62" width="10" height="12" fill="#2a2a2a" transform="rotate(${a})"/>`;
  }
  const puffs = [0, 1, 2, 3, 4]
    .map((i) => `<circle class="rc-puff" style="animation-delay:${i * 0.45}s" cx="${70 + i * 8}" cy="200" r="${26 + i * 4}" fill="#d6d6d6" filter="url(#blur)"/>`)
    .join('');
  const body = `${puffs}
    <g transform="translate(150 178)"><g class="rc-wheel"><circle r="58" fill="#161616"/>${tread}<circle r="34" fill="#9aa0a6"/><circle r="26" fill="#5b6066"/>
    ${[0, 72, 144, 216, 288].map((a) => `<rect x="-3" y="-26" width="6" height="22" fill="#c9cdd1" transform="rotate(${a})"/>`).join('')}<circle r="7" fill="#e10600"/></g></g>
    <line x1="30" y1="236" x2="30" y2="110" stroke="#ccc" stroke-width="4"/>
    <g class="rc-flag"><rect x="32" y="110" width="60" height="40" fill="#fff"/>${[0, 1, 2, 3, 4, 5].map((c) => [0, 1, 2, 3].map((r) => ((c + r) % 2 ? '' : `<rect x="${32 + c * 10}" y="${110 + r * 10}" width="10" height="10" fill="#111"/>`)).join('')).join('')}</g>`;
  return svg(240, 240, BLUR + body, `.rc-wheel{animation:rcw .6s linear infinite}@keyframes rcw{to{transform:rotate(-360deg)}}
    .rc-puff{transform-box:fill-box;transform-origin:center;animation:rcp 2.2s ease-out infinite}@keyframes rcp{0%{transform:translate(20px,10px) scale(.4);opacity:0}30%{opacity:.8}100%{transform:translate(-50px,-60px) scale(1.4);opacity:0}}
    .rc-flag{transform-box:fill-box;transform-origin:0 50%;animation:rcfl .5s ease-in-out infinite alternate}@keyframes rcfl{from{transform:skewY(-6deg) scaleX(.96)}to{transform:skewY(5deg) scaleX(1)}}`);
}

// ---------- Рейв ----------
function raveTop(w: number) {
  let leds = '';
  let i = 0;
  for (let x = 6; x < w; x += 36, i++) {
    leds += `<rect class="rv-led" style="animation-delay:${-(i * 0.08) % 2}s" x="${x}" y="8" width="28" height="12"/>`;
  }
  const lasers = [0.12, 0.35, 0.65, 0.88]
    .map((p, j) => `<g class="rv-laser" style="animation-delay:${j * 0.25}s"><line x1="${w * p}" y1="20" x2="${w * p + (j % 2 ? 160 : -160)}" y2="${TOP_H}" stroke="${['#ff2bd6', '#2bf0ff', '#b6ff2b', '#ff2bd6'][j]}" stroke-width="3"/></g>`)
    .join('');
  return svg(w, TOP_H, `<rect width="${w}" height="28" fill="#0a0a0f"/>${leds}${lasers}`, `.rv-led{animation:rvh 2s linear infinite}@keyframes rvh{0%{fill:#ff2bd6}25%{fill:#2bf0ff}50%{fill:#b6ff2b}75%{fill:#ffde2b}100%{fill:#ff2bd6}}
    .rv-laser{transform-box:fill-box;transform-origin:50% 0;animation:rvl 1s ease-in-out infinite alternate}@keyframes rvl{from{opacity:.2;transform:rotate(-8deg)}to{opacity:.9;transform:rotate(8deg)}}`);
}
function raveCorner() {
  const cone = (cx: number, cy: number, r: number, d: number) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#222" stroke="#444" stroke-width="3"/><g class="rv-cone" style="animation-delay:${d}s"><circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="#0d0d0d"/><circle cx="${cx}" cy="${cy}" r="${r * 0.25}" fill="#333"/></g>`;
  const body = `<rect x="18" y="40" width="130" height="198" fill="#151515" stroke="#ff2bd6" stroke-width="3" class="rv-glow"/>
    ${cone(83, 90, 34, 0)}${cone(83, 178, 50, 0.1)}
    <rect x="158" y="130" width="70" height="108" fill="#151515" stroke="#2bf0ff" stroke-width="3" class="rv-glow"/>${cone(193, 184, 28, 0.25)}`;
  return svg(240, 240, body, `.rv-cone{transform-box:fill-box;transform-origin:center;animation:rvc .5s cubic-bezier(.2,2,.4,1) infinite}@keyframes rvc{0%{transform:scale(1)}20%{transform:scale(1.12)}100%{transform:scale(1)}}
    .rv-glow{animation:rvg 1s ease-in-out infinite alternate}@keyframes rvg{from{filter:drop-shadow(0 0 2px currentColor);stroke-opacity:.6}to{stroke-opacity:1}}`);
}

// ---------- Кантри ----------
function countryTop(w: number) {
  const fills = ['url(#gingham)', '#f3e3c3', '#3a5a8c'];
  let rope = '';
  let flags = '';
  let k = 0;
  for (const [a, c, b] of swags(w, 340, 10, 22)) {
    rope += `<path d="M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}" stroke="#8b6a43" stroke-width="3" fill="none"/>`;
    for (const t of [0.1, 0.26, 0.42, 0.58, 0.74, 0.9]) {
      const [x, y] = qb(a, c, b, t);
      flags += `<g class="ct-flag" style="animation-delay:${(k * 0.21) % 1.6}s"><path d="M${x - 18} ${y} L${x + 18} ${y} L${x} ${y + 42} Z" fill="${fills[k % 3]}" stroke="#6b4f30" stroke-width="1"/></g>`;
      k++;
    }
  }
  const defs = `<defs><pattern id="gingham" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#c8382b"/><rect width="6" height="12" fill="#fff" opacity=".35"/><rect width="12" height="6" fill="#fff" opacity=".35"/></pattern></defs>`;
  return svg(w, TOP_H, defs + rope + flags, `.ct-flag{transform-box:fill-box;transform-origin:50% 0;animation:ctf 1.6s ease-in-out infinite alternate}@keyframes ctf{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}`);
}
function countryCorner() {
  let straw = '';
  for (let i = 0; i < 9; i++) straw += `<line x1="${24 + i * 15}" y1="168" x2="${20 + i * 15}" y2="236" stroke="#c79b33" stroke-width="3"/>`;
  const body = `<ellipse cx="110" cy="238" rx="110" ry="6" fill="#000" opacity=".3"/>
    <rect x="14" y="160" width="146" height="78" fill="#e2b84f"/>${straw}
    <rect x="14" y="184" width="146" height="5" fill="#8b6a43"/><rect x="14" y="214" width="146" height="5" fill="#8b6a43"/>
    <g class="ct-hat"><ellipse cx="88" cy="160" rx="56" ry="9" fill="#6b4423"/><path d="M58 158 q2 -36 18 -40 q12 6 24 0 q16 4 18 40z" fill="#8a5a2f"/><rect x="58" y="146" width="60" height="7" fill="#3d2614"/></g>
    <g class="ct-cactus"><path d="M190 238 v-120 a14 14 0 0 1 28 0 v120z" fill="#3f8f4a"/><path d="M190 180 h-14 a10 10 0 0 1 -10 -10 v-24 a7 7 0 0 1 14 0 v20 h10z" fill="#3f8f4a"/><path d="M218 160 h10 v-22 a7 7 0 0 1 14 0 v26 a10 10 0 0 1 -10 10 h-14z" fill="#3f8f4a"/>
    <line x1="204" y1="110" x2="204" y2="238" stroke="#2f6e38" stroke-width="3"/></g>`;
  return svg(240, 240, body, `.ct-hat{transform-box:fill-box;transform-origin:50% 100%;animation:cth 2s ease-in-out infinite alternate}@keyframes cth{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}`);
}

const BUILTIN: Record<string, { top: (w: number) => string; corner: () => string }> = {
  cozy: { top: cozyTop, corner: cozyCorner },
  gothic: { top: gothicTop, corner: gothicCorner },
  racing: { top: racingTop, corner: racingCorner },
  rave: { top: raveTop, corner: raveCorner },
  country: { top: countryTop, corner: countryCorner },
};

export const BUILTIN_DECOR = Object.keys(BUILTIN);

export class Decor {
  readonly el = el('div', 'decor');
  private parts: HTMLElement[] = [];
  private genre: GenreCfg | null = null;

  set(g: GenreCfg | null, animate = true) {
    this.genre = g;
    const old = this.parts;
    old.forEach((p, i) => {
      if (!animate) return p.remove();
      p.classList.remove('enter');
      p.style.setProperty('--fall-rot', `${(i % 2 ? 1 : -1) * (15 + Math.random() * 25)}deg`);
      p.classList.add('fall');
      setTimeout(() => p.remove(), 1000);
    });
    this.parts = g ? this.build(g) : [];
    this.parts.forEach((p, i) => {
      if (animate) {
        p.classList.add('enter');
        p.style.animationDelay = `${0.25 + i * 0.12}s`;
      }
      this.el.appendChild(p);
    });
  }

  /** Перерисовать полосу под новую ширину экрана. */
  relayout() {
    if (this.genre) this.set(this.genre, false);
  }

  private build(g: GenreCfg): HTMLElement[] {
    const d = g.decor;
    const w = Math.ceil(innerWidth);
    if (typeof d === 'string' && d.startsWith('svg:')) {
      const b = BUILTIN[d.slice(4)];
      if (!b) return [];
      return [el('div', 'dc-top', b.top(w)), el('div', 'dc-corner left', b.corner()), el('div', 'dc-corner right', b.corner())];
    }
    if (d && typeof d === 'object') {
      const out: HTMLElement[] = [];
      const img = (cls: string, path?: string) => {
        if (!path || isMissing(path)) return;
        const wrap = el('div', cls);
        const i = new Image();
        i.src = blobUrl(path)!;
        wrap.appendChild(i);
        out.push(wrap);
      };
      img('dc-top img', d.top);
      img('dc-corner left img', d.left);
      img('dc-corner right img', d.right);
      return out;
    }
    return [];
  }
}
