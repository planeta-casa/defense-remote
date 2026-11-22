import { warn } from './log';

export interface MemeCfg { id: string; file: string; label: string }
export interface VideoCfg { id: string; file: string; poster?: string; label: string }
export interface DecorFiles { top?: string; left?: string; right?: string }
export interface GenreCfg { id: string; name: string; music?: string; decor?: string | DecorFiles }
export type Rarity = 'common' | 'rare' | 'legendary';
export interface GachaCfg { title: string; artist: string; file?: string; cover?: string; rarity: Rarity; weight: number }

export interface Config {
  pdf: string;
  player: {
    title: string;
    artist: string;
    cover?: string;
    durationSec: number;
    warnAtSec: number;
    autostart: boolean;
    nextTrack: string;
  };
  slogan: string;
  gachaFromSlide: number | null;
  memes: MemeCfg[];
  videos: VideoCfg[];
  genres: GenreCfg[];
  startGenre: string | null;
  tickerPresets: string[];
  tickerLoops: number;
  gacha: GachaCfg[];
  volume: { genre: number; gacha: number };
}

const DEFAULTS: Config = {
  pdf: 'assets/presentation.pdf',
  player: {
    title: 'Дипломная защита',
    artist: 'Команда',
    durationSec: 420,
    warnAtSec: 360,
    autostart: false,
    nextTrack: 'Вопросы комиссии',
  },
  slogan: '',
  gachaFromSlide: null,
  memes: [],
  videos: [],
  genres: [],
  startGenre: null,
  tickerPresets: [],
  tickerLoops: 3,
  gacha: [],
  volume: { genre: 0.12, gacha: 0.25 },
};

/** Путь из конфига → URL относительно сайта (работает из подпапки GitHub Pages). */
export function assetUrl(path: string): string {
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  return new URL(path.replace(/^\//, ''), document.baseURI).href;
}

export async function loadConfig(): Promise<Config> {
  let raw: Partial<Config> = {};
  try {
    const res = await fetch(assetUrl('config.json'), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.json();
  } catch (e) {
    warn(`config.json не загрузился (${(e as Error).message}), работаю на настройках по умолчанию`);
  }
  const cfg: Config = {
    ...DEFAULTS,
    ...raw,
    player: { ...DEFAULTS.player, ...(raw.player ?? {}) },
    volume: { ...DEFAULTS.volume, ...(raw.volume ?? {}) },
  };
  cfg.gacha = cfg.gacha.map((g) => ({ ...g, weight: g.weight > 0 ? g.weight : 1, rarity: g.rarity ?? 'common' }));
  return cfg;
}
