// Что ходит между пультом и экраном.

/** Пульт → экран */
export type RemoteEvent =
  | { type: 'meme'; id: string }
  | { type: 'shake' }
  | { type: 'video'; id: string }
  | { type: 'video-off' }
  | { type: 'ticker'; text: string; custom: boolean }
  | { type: 'ticker-off' }
  | { type: 'gacha-spin' }
  | { type: 'wrapped' };

export interface Envelope {
  ev: RemoteEvent;
  /** id пульта */
  from: string;
  /** время отправки (серверное для Firebase, локальное для BroadcastChannel) */
  t: number;
}

/** Экран → пульты: то, что пульту нужно знать, даже если он подключился позже */
export interface SharedState {
  slide: number;
  total: number;
  /** ведущий выключил пульт клавишей X */
  paused: boolean;
  gachaEnabled: boolean;
  gachaSpun: boolean;
  genre: string | null;
  video: string | null;
  ticker: boolean;
  wrapped: boolean;
}

export const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function normalizeRoom(s: string): string {
  return s
    .toUpperCase()
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .split('')
    .filter((c) => ROOM_ALPHABET.includes(c))
    .join('')
    .slice(0, 4);
}

export function randomId(len: number, alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'): string {
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => alphabet[n % alphabet.length]).join('');
}
