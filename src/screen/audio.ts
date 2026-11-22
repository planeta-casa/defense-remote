/**
 * Фоновая музыка: канал жанра и канал гачи. Смена трека — кроссфейд.
 * Звук играет только после жеста пользователя на странице (кнопка «Начать показ»).
 */
type Channel = 'genre' | 'gacha';

interface Voice {
  audio: HTMLAudioElement;
  channel: Channel;
  raf: number;
}

export class Music {
  private voices: Voice[] = [];
  private current: Record<Channel, Voice | null> = { genre: null, gacha: null };

  constructor(private base: Record<Channel, number>, public volume: number, public muted: boolean) {}

  private target(ch: Channel) {
    return this.muted ? 0 : Math.min(1, this.base[ch] * this.volume);
  }

  private fade(v: Voice, to: number, ms: number, then?: () => void) {
    cancelAnimationFrame(v.raf);
    const from = v.audio.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      v.audio.volume = Math.max(0, Math.min(1, from + (to - from) * p));
      if (p < 1) v.raf = requestAnimationFrame(step);
      else then?.();
    };
    v.raf = requestAnimationFrame(step);
  }

  private start(ch: Channel, url: string, ms: number) {
    const old = this.current[ch];
    if (old) this.stopVoice(old, ms);
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 0;
    const v: Voice = { audio, channel: ch, raf: 0 };
    this.voices.push(v);
    this.current[ch] = v;
    audio.play().catch(() => {
      /* до жеста пользователя браузер не даст играть — молча */
    });
    this.fade(v, this.target(ch), ms);
  }

  private stopVoice(v: Voice, ms: number) {
    if (this.current[v.channel] === v) this.current[v.channel] = null;
    this.fade(v, 0, ms, () => {
      v.audio.pause();
      v.audio.src = '';
      this.voices = this.voices.filter((x) => x !== v);
    });
  }

  playGenre(url: string | undefined) {
    if (!url) {
      if (this.current.genre) this.stopVoice(this.current.genre, 1000);
      return;
    }
    this.start('genre', url, 1000);
  }

  stopGenre() {
    if (this.current.genre) this.stopVoice(this.current.genre, 1000);
  }

  playGacha(url: string | undefined) {
    this.stopGenre();
    if (url) this.start('gacha', url, 1500);
  }

  stopGacha() {
    if (this.current.gacha) this.stopVoice(this.current.gacha, 800);
  }

  stopAll() {
    this.stopGenre();
    this.stopGacha();
  }

  apply() {
    for (const ch of ['genre', 'gacha'] as Channel[]) {
      const v = this.current[ch];
      if (v) this.fade(v, this.target(ch), 300);
    }
  }

  setVolume(mult: number) {
    this.volume = mult;
    this.apply();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.apply();
  }
}
