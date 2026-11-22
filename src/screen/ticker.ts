import { el, esc } from '../util';

const SPEED = 170; // px/с — медленно, чтобы читалось в Зуме с низким FPS

/** Бегущая строка над плеером. Новый текст заменяет текущий; после N прогонов скрывается сама. */
export class Ticker {
  readonly el = el('div', 'ticker');
  private track: HTMLDivElement;
  private anim: Animation | null = null;
  active = false;
  onEnd: () => void = () => {};

  constructor() {
    this.el.innerHTML = '<div class="tk-label">В ЭФИРЕ</div><div class="tk-window"><div class="tk-track"></div></div>';
    this.track = this.el.querySelector('.tk-track')!;
  }

  show(text: string, loops: number) {
    this.anim?.cancel();
    this.track.innerHTML = esc(text);
    this.el.classList.add('show');
    this.active = true;
    const win = this.track.parentElement!.clientWidth || innerWidth;
    const w = this.track.scrollWidth;
    const dist = win + w;
    this.anim = this.track.animate(
      [{ transform: `translateX(${win}px)` }, { transform: `translateX(${-w}px)` }],
      { duration: (dist / SPEED) * 1000, iterations: Math.max(1, loops), easing: 'linear' },
    );
    this.anim.onfinish = () => this.hide();
  }

  hide() {
    if (!this.active) return;
    this.anim?.cancel();
    this.anim = null;
    this.active = false;
    this.el.classList.remove('show');
    this.onEnd();
  }
}
