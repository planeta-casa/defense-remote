import { el } from '../util';

const MAX = 40;
const LIFE = 3200;

/** Мемы всплывают снизу с покачиванием и исчезают. Не больше 40 одновременно. */
export class Memes {
  readonly el = el('div', 'memes');

  spawn(url: string, bounds: { left: number; width: number; bottom: number }) {
    const size = 120 + Math.random() * 60;
    const img = new Image();
    img.src = url;
    img.className = 'meme';
    img.style.width = `${size}px`;
    img.style.left = `${bounds.left + Math.random() * Math.max(0, bounds.width - size)}px`;
    img.style.bottom = `${bounds.bottom}px`;
    this.el.appendChild(img);
    while (this.el.children.length > MAX) this.el.firstElementChild?.remove();

    const rise = innerHeight * (0.55 + Math.random() * 0.2);
    const sway = 18 + Math.random() * 22;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const spin = (Math.random() * 16 - 8) * dir;
    const frames: Keyframe[] = [];
    for (let k = 0; k <= 8; k++) {
      const p = k / 8;
      frames.push({
        offset: p,
        transform: `translate(${Math.sin(p * Math.PI * 3) * sway * dir}px, ${-rise * p}px) rotate(${spin * Math.sin(p * Math.PI * 2)}deg) scale(${k === 0 ? 0.4 : 1})`,
        opacity: k === 0 ? 0 : p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1,
      });
    }
    const a = img.animate(frames, { duration: LIFE, easing: 'cubic-bezier(.25,.6,.4,1)', fill: 'both' });
    a.onfinish = () => img.remove();
  }

  clear() {
    this.el.replaceChildren();
  }
}
