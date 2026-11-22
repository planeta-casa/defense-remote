import { el, esc, fmtTime } from '../util';

export interface Track {
  cover?: string;
  title: string;
  artist: string;
  badge?: string;
}

/** Мини-плеер в стиле Яндекс Музыки — он же таймер защиты. */
export class Player {
  readonly el: HTMLDivElement;
  private coverEl: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private artistEl: HTMLDivElement;
  private nextEl: HTMLDivElement;
  private fill: HTMLDivElement;
  private time: HTMLDivElement;
  private slideEl: HTMLDivElement;
  private playIcon: HTMLDivElement;
  private musicEl: HTMLDivElement;

  constructor(private durationMs: number, private warnMs: number, nextTrack: string) {
    this.el = el('div', 'player');
    this.el.innerHTML = `
      <div class="pl-left">
        <div class="pl-cover"></div>
        <div class="pl-meta">
          <div class="pl-title"></div>
          <div class="pl-artist"></div>
          <div class="pl-next">Следующий трек: ${esc(nextTrack)}</div>
        </div>
      </div>
      <div class="pl-center">
        <div class="pl-controls">
          <div class="pl-btn">${ICON_PREV}</div>
          <div class="pl-btn pl-play"></div>
          <div class="pl-btn">${ICON_NEXT}</div>
          <div class="pl-slide"></div>
        </div>
        <div class="pl-bar"><div class="pl-fill"></div></div>
      </div>
      <div class="pl-right">
        <div class="pl-music"></div>
        <div class="pl-time"></div>
      </div>`;
    const q = <T extends HTMLElement>(s: string) => this.el.querySelector(s) as T;
    this.coverEl = q('.pl-cover');
    this.titleEl = q('.pl-title');
    this.artistEl = q('.pl-artist');
    this.nextEl = q('.pl-next');
    this.fill = q('.pl-fill');
    this.time = q('.pl-time');
    this.slideEl = q('.pl-slide');
    this.playIcon = q('.pl-play');
    this.musicEl = q('.pl-music');
  }

  setTrack(t: Track) {
    this.coverEl.innerHTML = t.cover ? `<img src="${t.cover}" alt="">` : '';
    this.coverEl.classList.toggle('empty', !t.cover);
    this.titleEl.innerHTML = esc(t.title) + (t.badge ? ` <span class="pl-badge ${t.badge}">${BADGE[t.badge] ?? ''}</span>` : '');
    this.artistEl.textContent = t.artist;
    this.el.classList.remove('track-swap');
    void this.el.offsetWidth;
    this.el.classList.add('track-swap');
  }

  coverRect(): DOMRect {
    return this.coverEl.getBoundingClientRect();
  }

  setSlide(i: number, n: number) {
    this.slideEl.textContent = `${i + 1} / ${n}`;
  }

  setMusic(text: string) {
    this.musicEl.textContent = text;
  }

  update(elapsed: number, running: boolean) {
    const over = elapsed - this.durationMs;
    const ratio = Math.min(1, elapsed / this.durationMs);
    this.fill.style.transform = `scaleX(${ratio})`;
    this.el.classList.toggle('warn', elapsed >= this.warnMs && over < 0);
    this.el.classList.toggle('over', over >= 0);
    this.nextEl.classList.toggle('show', over >= 0);
    this.time.innerHTML =
      over >= 0
        ? `<span class="pl-over">+${fmtTime(over)}</span> / ${fmtTime(this.durationMs)}`
        : `${fmtTime(elapsed)} / ${fmtTime(this.durationMs)}`;
    this.playIcon.innerHTML = running ? ICON_PAUSE : ICON_PLAY;
  }
}

const BADGE: Record<string, string> = { common: 'обычная', rare: 'редкая', legendary: 'легендарная' };

const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
const ICON_PREV = '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>';
