import { ROOM_ALPHABET, randomId } from '../protocol';

export interface Stats {
  reactions: number;
  memes: Record<string, number>;
  /** реакции по номерам слайдов (0-based) */
  slides: Record<string, number>;
  genreSwitches: number;
  genreMs: Record<string, number>;
  lastTicker: string | null;
}

export interface ScreenState {
  room: string;
  slide: number;
  timer: { elapsed: number; running: boolean; anchor: number };
  /** время защиты, зафиксированное на последнем слайде */
  finalMs: number | null;
  /** был ли уже переход со стартового слайда (QR скрыт, автостарт) */
  leftFirst: boolean;
  remotePaused: boolean;
  gachaEnabled: boolean;
  gachaSong: number | null;
  genreIdx: number;
  genreSince: number | null;
  musicMuted: boolean;
  /** множитель громкости музыки, 1 = как в конфиге */
  volume: number;
  stats: Stats;
}

const KEY = 'defense.screen.v1';

function fresh(room?: string): ScreenState {
  return {
    room: room ?? randomId(4, ROOM_ALPHABET),
    slide: 0,
    timer: { elapsed: 0, running: false, anchor: 0 },
    finalMs: null,
    leftFirst: false,
    remotePaused: false,
    gachaEnabled: false,
    gachaSong: null,
    genreIdx: -1,
    genreSince: null,
    musicMuted: false,
    volume: 1,
    stats: { reactions: 0, memes: {}, slides: {}, genreSwitches: 0, genreMs: {}, lastTicker: null },
  };
}

function load(): { state: ScreenState; restored: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as ScreenState;
      if (s && typeof s.room === 'string' && s.stats) return { state: { ...fresh(s.room), ...s }, restored: true };
    }
  } catch {
    /* приватный режим или битые данные — начинаем с нуля */
  }
  return { state: fresh(), restored: false };
}

const loaded = load();
export const state: ScreenState = loaded.state;
export const restored = loaded.restored && (state.slide > 0 || state.timer.elapsed > 0 || state.stats.reactions > 0);

let saveTimer = 0;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveNow, 300);
}
export function saveNow() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* не страшно */
  }
}
addEventListener('pagehide', saveNow);

/** Полный сброс. Код комнаты сохраняем, чтобы пульты не пришлось переподключать. */
export function resetAll() {
  const room = state.room;
  Object.assign(state, fresh(room));
  saveNow();
}

export function timerElapsed(): number {
  const t = state.timer;
  return t.running ? t.elapsed + (Date.now() - t.anchor) : t.elapsed;
}
export function timerStart() {
  if (state.timer.running) return;
  state.timer = { elapsed: state.timer.elapsed, running: true, anchor: Date.now() };
  save();
}
export function timerPause() {
  if (!state.timer.running) return;
  state.timer = { elapsed: timerElapsed(), running: false, anchor: 0 };
  save();
}
export function timerReset() {
  state.timer = { elapsed: 0, running: false, anchor: 0 };
  state.finalMs = null;
  save();
}
