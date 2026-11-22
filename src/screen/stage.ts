import type { Slides } from './pdf';

const DURATION = 360;

/**
 * Стопка карточек-слайдов. «Вперёд» — верхняя улетает вправо с поворотом (свайп),
 * следующая поднимается из-под неё. «Назад» — карточка возвращается слева.
 * Новое нажатие во время анимации мгновенно её завершает — кликер не ждёт.
 */
export class Stage {
  readonly el: HTMLDivElement;
  private card: HTMLDivElement | null = null;
  private index = -1;
  private cleanups: (() => void)[] = [];

  constructor(private slides: Slides) {
    this.el = document.createElement('div');
    this.el.className = 'stage';
    this.el.innerHTML = '<div class="ghost g2"></div><div class="ghost g1"></div>';
  }

  get current() {
    return this.index;
  }

  private makeCard(i: number) {
    const c = document.createElement('div');
    c.className = 'card';
    c.appendChild(this.slides.img(i));
    return c;
  }

  private settle() {
    const fns = this.cleanups;
    this.cleanups = [];
    fns.forEach((f) => f());
  }

  show(i: number, dir: 1 | -1 | 0) {
    this.settle();
    if (i === this.index && this.card) return;
    this.slides.focus(i);
    const prev = this.card;
    const next = this.makeCard(i);
    this.card = next;
    this.index = i;

    if (!prev || dir === 0) {
      prev?.remove();
      this.el.appendChild(next);
      return;
    }

    const opts: KeyframeAnimationOptions = { duration: DURATION, fill: 'both' };
    const anims: Animation[] = [];
    if (dir === 1) {
      // новая карточка снизу, старая улетает вправо
      this.el.insertBefore(next, prev);
      anims.push(
        prev.animate(
          [
            { transform: 'translateX(0) rotate(0deg)', opacity: 1 },
            { transform: 'translateX(115%) translateY(6%) rotate(13deg)', opacity: 0.4 },
          ],
          { ...opts, easing: 'cubic-bezier(.5,0,.75,.3)' },
        ),
        next.animate(
          [
            { transform: 'scale(0.95)', filter: 'brightness(0.6)' },
            { transform: 'scale(1)', filter: 'brightness(1)' },
          ],
          { ...opts, easing: 'cubic-bezier(.2,.7,.3,1)' },
        ),
      );
    } else {
      // новая карточка прилетает слева поверх, старая уходит вниз стопки
      this.el.appendChild(next);
      anims.push(
        next.animate(
          [
            { transform: 'translateX(-115%) translateY(6%) rotate(-13deg)', opacity: 0.4 },
            { transform: 'translateX(0) rotate(0deg)', opacity: 1 },
          ],
          { ...opts, easing: 'cubic-bezier(.2,.7,.3,1)' },
        ),
        prev.animate(
          [
            { transform: 'scale(1)', filter: 'brightness(1)' },
            { transform: 'scale(0.95)', filter: 'brightness(0.6)' },
          ],
          { ...opts, easing: 'ease-out' },
        ),
      );
    }

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      anims.forEach((a) => a.cancel());
      prev.remove();
    };
    this.cleanups.push(cleanup);
    anims[0].onfinish = () => {
      this.cleanups = this.cleanups.filter((f) => f !== cleanup);
      cleanup();
    };
  }

  shake() {
    this.el.classList.remove('shake');
    void this.el.offsetWidth;
    this.el.classList.add('shake');
  }
}
