import { el } from '../util';

/** Вертикальное СДВГ-видео справа. Сцена со слайдом при этом сжимается (см. layout в main). */
export class SideVideo {
  readonly el = el('div', 'side-video');
  private video: HTMLVideoElement | null = null;
  id: string | null = null;

  show(id: string, url: string) {
    this.id = id;
    const old = this.video;
    const v = document.createElement('video');
    v.src = url;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.autoplay = true;
    v.className = 'sv-video';
    this.el.appendChild(v);
    v.play().catch(() => {});
    this.video = v;
    if (old) {
      old.classList.add('out');
      setTimeout(() => {
        old.pause();
        old.remove();
      }, 400);
    }
    this.el.classList.add('show');
  }

  hide() {
    this.id = null;
    this.el.classList.remove('show');
    const v = this.video;
    this.video = null;
    setTimeout(() => {
      if (v && !this.video) {
        v.pause();
        v.remove();
      }
    }, 600);
  }
}
