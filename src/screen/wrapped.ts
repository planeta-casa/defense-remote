import { el, esc } from '../util';

export interface Story {
  kicker: string;
  big: string;
  sub?: string;
  image?: string;
  theme: string;
}

const STEP_MS = 3600;

/** Итоги защиты в духе «Итогов года»: сторис с полосками прогресса. */
export class Wrapped {
  readonly el = el('div', 'overlay wrapped');
  visible = false;
  private stories: Story[] = [];
  private i = 0;
  private timer = 0;

  open(stories: Story[]) {
    this.stories = stories;
    this.visible = true;
    this.el.classList.add('show');
    this.go(0);
  }

  close() {
    clearTimeout(this.timer);
    this.visible = false;
    this.el.classList.remove('show');
  }

  next() {
    if (this.i < this.stories.length - 1) this.go(this.i + 1);
  }

  prev() {
    if (this.i > 0) this.go(this.i - 1);
  }

  private go(i: number) {
    clearTimeout(this.timer);
    this.i = i;
    const s = this.stories[i];
    const last = i === this.stories.length - 1;
    this.el.innerHTML = `
      <div class="wr-bars">${this.stories.map((_, k) => `<div class="wr-bar ${k < i ? 'done' : ''}"><div class="${k === i ? 'run' : ''}" style="animation-duration:${STEP_MS}ms"></div></div>`).join('')}</div>
      <div class="wr-card theme-${s.theme}">
        <div class="wr-kicker">${esc(s.kicker)}</div>
        ${s.image ? `<img class="wr-img" src="${s.image}" alt="">` : ''}
        <div class="wr-big">${s.big}</div>
        ${s.sub ? `<div class="wr-sub">${esc(s.sub)}</div>` : ''}
        <div class="wr-brand">Итоги защиты</div>
      </div>`;
    if (!last) this.timer = window.setTimeout(() => this.next(), STEP_MS);
    else this.el.querySelector('.wr-bar:last-child')?.classList.add('done');
  }
}
