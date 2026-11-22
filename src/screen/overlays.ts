import QRCode from 'qrcode';
import { HELP } from '../keys';
import { DEBUG, onLog } from '../log';
import { el, esc } from '../util';

export function remoteUrl(room: string): string {
  const u = new URL('remote.html', document.baseURI);
  u.searchParams.set('room', room);
  const forced = new URLSearchParams(location.search).get('transport');
  if (forced) u.searchParams.set('transport', forced);
  return u.href;
}

/** Стартовый экран: прогресс загрузки, потом кнопка «Начать показ» (жест для звука и полного экрана). */
export class Gate {
  readonly el = el('div', 'overlay gate');
  private bar: HTMLDivElement;
  private label: HTMLDivElement;
  private btn: HTMLButtonElement;

  constructor(title: string, team: string) {
    this.el.innerHTML = `
      <div class="gate-box">
        <div class="gate-kicker">${esc(team)}</div>
        <div class="gate-title">${esc(title)}</div>
        <div class="gate-label">Загружаем презентацию…</div>
        <div class="gate-bar"><div></div></div>
        <button class="gate-btn" disabled>Подождите…</button>
        <div class="gate-hint">Enter или клик — начать. Включатся полный экран и звук.<br>H — все горячие клавиши.</div>
      </div>`;
    this.bar = this.el.querySelector('.gate-bar div')!;
    this.label = this.el.querySelector('.gate-label')!;
    this.btn = this.el.querySelector('.gate-btn')!;
  }

  progress(text: string, ratio: number) {
    this.label.textContent = text;
    this.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  }

  ready(resumeSlide: number | null): Promise<void> {
    this.label.textContent = 'Всё загружено';
    this.bar.style.transform = 'scaleX(1)';
    this.btn.disabled = false;
    this.btn.textContent = resumeSlide !== null ? `Продолжить со слайда ${resumeSlide + 1}` : 'Начать показ';
    this.btn.focus();
    return new Promise((resolve) => {
      const go = (e?: Event) => {
        e?.preventDefault();
        removeEventListener('keydown', onKey, true);
        this.el.classList.add('hide');
        setTimeout(() => this.el.remove(), 400);
        resolve();
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
          e.stopPropagation();
          go(e);
        }
      };
      addEventListener('keydown', onKey, true);
      this.btn.onclick = go;
    });
  }
}

export class QrPanel {
  readonly el = el('div', 'qr-panel');
  visible = false;

  async setRoom(room: string) {
    const url = remoteUrl(room);
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 520, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } });
    const short = url.replace(/^https?:\/\//, '').replace(/\?.*$/, '');
    this.el.innerHTML = `
      <button class="qr-close" type="button" aria-label="Скрыть QR">×</button>
      <div class="qr-kicker">Пульт для жюри</div>
      <img class="qr-img" src="${dataUrl}" alt="QR">
      <div class="qr-code">${esc(room)}</div>
      <div class="qr-link">${esc(short)}<br>и код комнаты</div>`;
  }

  show(v: boolean) {
    this.visible = v;
    this.el.classList.toggle('show', v);
  }

  constructor() {
    this.el.addEventListener('click', (event) => {
      if ((event.target as HTMLElement).closest('.qr-close')) this.show(false);
    });
  }
}

export class Help {
  readonly el = el('div', 'overlay help');
  visible = false;
  constructor() {
    this.el.innerHTML = `
      <div class="help-box">
        <div class="help-head"><b>Горячие клавиши ведущего</b><span>работают в любой раскладке · H — закрыть</span></div>
        <div class="help-grid">${HELP.map(([k, d]) => `<div class="help-k">${esc(k)}</div><div class="help-d">${esc(d)}</div>`).join('')}</div>
        <div class="help-foot">Если пульт жюри шалит — X. Если на экране слишком много всего — C.</div>
      </div>`;
    this.el.onclick = () => this.toggle(false);
  }
  toggle(v = !this.visible) {
    this.visible = v;
    this.el.classList.toggle('show', v);
  }
}

export class Toasts {
  readonly el = el('div', 'toasts');
  show(html: string, ms = 2000, cls = '') {
    const t = el('div', `toast ${cls}`, html);
    this.el.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      setTimeout(() => t.remove(), 400);
    }, ms);
    while (this.el.children.length > 3) this.el.firstElementChild?.remove();
  }
}

export class ConnDot {
  readonly el = el('div', 'conn');
  set(remotes: number, online: boolean) {
    this.el.classList.toggle('on', online && remotes > 0);
    this.el.classList.toggle('offline', !online);
    this.el.title = !online ? 'Нет связи с сервером' : remotes > 0 ? `Пультов: ${remotes}` : 'Пульт не подключён';
    if (DEBUG) this.el.textContent = !online ? 'нет сети' : String(remotes);
  }
}

export class DebugPanel {
  readonly el = el('div', 'debug');
  private logEl: HTMLDivElement;
  constructor(room: string, transportKind: string, onSim: () => void) {
    this.el.innerHTML = `
      <div class="dbg-row">
        <button class="dbg-open">Открыть пульт в новой вкладке</button>
        <button class="dbg-sim">Симуляция жюри (J)</button>
        <span>комната ${esc(room)} · ${esc(transportKind)}</span>
      </div>
      <div class="dbg-log"></div>`;
    this.logEl = this.el.querySelector('.dbg-log')!;
    (this.el.querySelector('.dbg-open') as HTMLButtonElement).onclick = () => window.open(remoteUrl(room), '_blank');
    (this.el.querySelector('.dbg-sim') as HTMLButtonElement).onclick = onSim;
    onLog((line, level) => {
      const row = el('div', level, esc(line));
      this.logEl.appendChild(row);
      while (this.logEl.children.length > 60) this.logEl.firstElementChild?.remove();
      this.logEl.scrollTop = this.logEl.scrollHeight;
    });
  }
}
