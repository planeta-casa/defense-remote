import type { GachaCfg } from '../config';
import { el, esc, sleep } from '../util';

const RARITY_NAME = { common: 'Обычная', rare: 'Редкая', legendary: 'Легендарная' } as const;
const RARITY_COLOR = { common: '#e9e9e9', rare: '#4da3ff', legendary: '#ffcc33' } as const;

export function weightedPick(list: GachaCfg[]): number {
  const total = list.reduce((s, g) => s + g.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= list[i].weight;
    if (r <= 0) return i;
  }
  return list.length - 1;
}

/** Полноэкранный автомат с капсулами: рычаг → тряска → капсула → вскрытие → карточка улетает в плеер. */
export class Gacha {
  readonly el = el('div', 'overlay gacha');
  busy = false;

  constructor() {
    const caps = Array.from({ length: 14 }, (_, i) => {
      const cols = ['#ff5c8a', '#4da3ff', '#ffcc33', '#8affc1', '#c49bff', '#ff8a5c'];
      const x = 30 + ((i * 47) % 150);
      const y = 40 + Math.floor(i / 4) * 34 + (i % 2) * 8;
      return `<div class="gc-cap" style="left:${x}px;top:${y}px;--c:${cols[i % cols.length]};--d:${(i % 5) * 0.07}s"></div>`;
    }).join('');
    this.el.innerHTML = `
      <div class="gc-title">Песня для финала</div>
      <div class="gc-machine">
        <div class="gc-dome">${caps}<div class="gc-shine"></div></div>
        <div class="gc-body">
          <div class="gc-label">АЛИСА·ГАЧА</div>
          <div class="gc-slot"></div>
          <div class="gc-chute"></div>
        </div>
        <div class="gc-lever"><div class="gc-knob"></div></div>
      </div>
      <div class="gc-capsule"><div class="gc-top"></div><div class="gc-bottom"></div></div>
      <div class="gc-flash"></div>
      <div class="gc-card"></div>`;
  }

  async spin(song: GachaCfg, cover: string | undefined, target: () => DOMRect, onReveal: () => void) {
    if (this.busy) return;
    this.busy = true;
    const q = <T extends HTMLElement>(s: string) => this.el.querySelector(s) as T;
    const machine = q<HTMLDivElement>('.gc-machine');
    const lever = q<HTMLDivElement>('.gc-lever');
    const capsule = q<HTMLDivElement>('.gc-capsule');
    const flash = q<HTMLDivElement>('.gc-flash');
    const card = q<HTMLDivElement>('.gc-card');
    const color = RARITY_COLOR[song.rarity] ?? RARITY_COLOR.common;

    this.el.className = `overlay gacha show r-${song.rarity}`;
    capsule.style.setProperty('--c', color);
    capsule.className = 'gc-capsule';
    card.className = 'gc-card';
    card.style.transform = '';
    card.innerHTML = `
      <div class="gc-cover">${cover ? `<img src="${cover}" alt="">` : ''}</div>
      <div class="gc-rarity">${RARITY_NAME[song.rarity] ?? ''}</div>
      <div class="gc-song">${esc(song.title)}</div>
      <div class="gc-artist">${esc(song.artist)}</div>`;

    await sleep(350);
    // рычаг
    await lever.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(200deg)' }, { transform: 'rotate(360deg)' }], { duration: 900, easing: 'ease-in-out' }).finished;
    // тряска автомата с нарастанием
    const shakeFrames: Keyframe[] = [];
    for (let i = 0; i <= 20; i++) {
      const amp = 1 + (i / 20) * 9;
      shakeFrames.push({ transform: `translate(${(i % 2 ? 1 : -1) * amp}px, ${(i % 3) - 1}px) rotate(${(i % 2 ? -1 : 1) * amp * 0.25}deg)` });
    }
    machine.classList.add('rattle');
    await machine.animate(shakeFrames, { duration: 1300, easing: 'linear' }).finished;
    machine.classList.remove('rattle');
    // капсула выкатывается
    capsule.classList.add('out');
    const chute = q<HTMLDivElement>('.gc-chute').getBoundingClientRect();
    const rest = capsule.getBoundingClientRect();
    const sx = chute.left + chute.width / 2 - (rest.left + rest.width / 2);
    const sy = chute.top + chute.height / 2 - (rest.top + rest.height / 2);
    await capsule.animate(
      [
        { transform: `translate(${sx}px, ${sy}px) scale(.35)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy + 40}px) scale(.4)`, opacity: 1, offset: 0.3 },
        { transform: 'translate(0, 0) scale(1) rotate(720deg)', opacity: 1 },
      ],
      { duration: 900, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'forwards' },
    ).finished;
    machine.classList.add('dim');
    // капсула трясётся всё сильнее
    const capFrames: Keyframe[] = [];
    for (let i = 0; i <= 24; i++) {
      const amp = (i / 24) ** 1.6 * 16;
      capFrames.push({ transform: `rotate(${(i % 2 ? 1 : -1) * amp}deg) scale(${1 + (i / 24) * 0.12})` });
    }
    capsule.classList.add('charge');
    await capsule.animate(capFrames, { duration: 1500, easing: 'linear' }).finished;
    // вскрытие
    capsule.classList.add('open');
    flash.animate([{ opacity: 0 }, { opacity: 0.95, offset: 0.15 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
    onReveal();
    await sleep(180);
    card.classList.add('show');
    await sleep(3600);

    // карточка уезжает в плеер
    const from = card.getBoundingClientRect();
    const to = target();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const s = to.width / from.width;
    this.el.classList.add('leaving');
    await card.animate(
      [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0.6 }],
      { duration: 700, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' },
    ).finished;
    this.el.className = 'overlay gacha';
    machine.classList.remove('dim');
    capsule.getAnimations().forEach((a) => a.cancel());
    card.getAnimations().forEach((a) => a.cancel());
    this.busy = false;
  }
}
