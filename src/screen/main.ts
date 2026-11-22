import '@fontsource-variable/onest';
import '../styles/screen.css';
import { assetUrl, loadConfig } from '../config';
import { actionFor, type Action } from '../keys';
import { DEBUG, log, warn } from '../log';
import { blobUrl, isMissing, preloadAll } from '../preload';
import type { RemoteEvent, SharedState } from '../protocol';
import { createTransport, type Transport } from '../transport';
import { el, esc, fmtTime, pick } from '../util';
import { Music } from './audio';
import { Decor } from './decor';
import { Gacha, weightedPick } from './gacha';
import { Memes } from './memes';
import { ConnDot, DebugPanel, Gate, Help, QrPanel, Toasts } from './overlays';
import { Slides } from './pdf';
import { Player } from './player';
import { Stage } from './stage';
import * as S from './store';
import { SideVideo } from './video';
import { Ticker } from './ticker';
import { Wrapped, type Story } from './wrapped';

const PLAYER_H = 72;
const PAD = 24;

const { state } = S;

async function main() {
  const cfg = await loadConfig();
  const app = document.getElementById('app')!;

  // ---------- слои ----------
  const slides = new Slides();
  const stage = new Stage(slides);
  const video = new SideVideo();
  const decor = new Decor();
  const memes = new Memes();
  const ticker = new Ticker();
  const player = new Player(cfg.player.durationSec * 1000, cfg.player.warnAtSec * 1000, cfg.player.nextTrack);
  const qr = new QrPanel();
  const help = new Help();
  const toasts = new Toasts();
  const conn = new ConnDot();
  const gacha = new Gacha();
  const wrapped = new Wrapped();
  const gate = new Gate(cfg.player.title, cfg.player.artist);
  const music = new Music({ genre: cfg.volume.genre, gacha: cfg.volume.gacha }, state.volume, state.musicMuted);

  const emptyMsg = el('div', 'stage-empty', 'Нет презентации.<br>Перетащите PDF в это окно.');
  app.append(el('div', 'bg'), stage.el, emptyMsg, video.el, decor.el, memes.el, ticker.el, player.el, qr.el, toasts.el, conn.el, gacha.el, wrapped.el, help.el, gate.el);

  // ---------- раскладка ----------
  let lastRenderPx = 0;
  function layout(): number {
    const W = innerWidth;
    const H = innerHeight;
    const areaH = H - PLAYER_H - PAD * 2;
    const colFull = Math.round((areaH * 9) / 16);
    const colW = video.id ? colFull : 0;
    const areaW = W - PAD * 2 - (colW ? colW + PAD : 0);
    const aspect = slides.aspect;
    const cw = Math.min(areaW, areaH * aspect);
    const ch = cw / aspect;
    const s = app.style;
    s.setProperty('--card-x', `${PAD + (areaW - cw) / 2}px`);
    s.setProperty('--card-y', `${PAD + (areaH - ch) / 2}px`);
    s.setProperty('--card-w', `${cw}px`);
    s.setProperty('--card-h', `${ch}px`);
    s.setProperty('--video-w', `${colW}px`);
    s.setProperty('--video-col', `${colFull}px`);
    s.setProperty('--video-h', `${areaH}px`);
    s.setProperty('--pad', `${PAD}px`);
    s.setProperty('--player-h', `${PLAYER_H}px`);
    return Math.min(2560, cw * Math.min(2, devicePixelRatio || 1));
  }
  function relayout(afterMs: number) {
    const px = layout();
    if (Math.abs(px - lastRenderPx) < 8) return;
    lastRenderPx = px;
    setTimeout(() => slides.resize(px, state.slide), afterMs);
  }
  let resizeT = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      relayout(0);
      decor.relayout();
    }, 150);
  });

  // ---------- связь ----------
  let transport: Transport | null = null;
  let remotes = 0;
  let online = true;
  let started = false;
  let publishT = 0;
  function publish() {
    clearTimeout(publishT);
    publishT = window.setTimeout(() => {
      const g = state.genreIdx >= 0 ? cfg.genres[state.genreIdx] : null;
      const s: SharedState = {
        slide: state.slide,
        total: slides.count,
        paused: state.remotePaused,
        gachaEnabled: state.gachaEnabled,
        gachaSpun: state.gachaSong !== null,
        genre: g?.name ?? null,
        video: video.id,
        ticker: ticker.active,
        wrapped: wrapped.visible,
      };
      transport?.setState(s);
    }, 80);
  }
  createTransport(state.room, 'screen', `screen-${state.room}`).then((t) => {
    transport = t;
    log(`Связь: ${t.kind}, комната ${state.room}`);
    t.onConnection((o) => {
      online = o;
      conn.set(remotes, online);
    });
    t.onPeers((n) => {
      if (n > remotes && started) toasts.show('Пульт жюри подключился', 1600, 'small');
      remotes = n;
      conn.set(remotes, online);
    });
    t.onEvent((env) => {
      if (!started) return;
      if (state.remotePaused) {
        log(`пульт на паузе, пропущено: ${env.ev.type}`);
        return;
      }
      log(`пульт → ${env.ev.type}`);
      handle(env.ev);
    });
    publish();
    if (DEBUG) app.appendChild(new DebugPanel(state.room, t.kind, toggleSim).el);
  });
  qr.setRoom(state.room);

  // ---------- загрузка ----------
  const assets = [
    cfg.player.cover,
    ...cfg.memes.map((m) => m.file),
    ...cfg.videos.map((v) => v.file),
    ...cfg.genres.flatMap((g) => [g.music, ...(typeof g.decor === 'object' && g.decor ? [g.decor.top, g.decor.left, g.decor.right] : [])]),
    ...cfg.gacha.flatMap((g) => [g.file, g.cover]),
  ].filter((p): p is string => !!p);

  await preloadAll(assets, (d, t) => gate.progress(`Загружаем файлы… ${d} / ${t}`, t ? (d / t) * 0.5 : 0.5));

  async function loadPdf(data: ArrayBuffer, label: string) {
    await slides.load(data, (d, t) => gate.progress(`${label} ${d} / ${t}`, 0.5 + (d / t) * 0.5), layout());
    lastRenderPx = layout();
  }
  try {
    const res = await fetch(assetUrl(cfg.pdf));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await loadPdf(await res.arrayBuffer(), 'Рисуем слайды…');
  } catch (e) {
    warn(`PDF не загрузился (${cfg.pdf}): ${(e as Error).message}`);
  }
  emptyMsg.classList.toggle('show', slides.count === 0);
  state.slide = Math.min(state.slide, Math.max(0, slides.count - 1));
  if (slides.count) stage.show(state.slide, 0);

  player.setSlide(state.slide, slides.count);
  restoreTrack();
  tick();
  setInterval(tick, 250);

  await gate.ready(S.restored ? state.slide : null);
  started = true;
  document.documentElement.requestFullscreen?.().catch(() => {});
  keepAwake();
  if (!state.leftFirst) qr.show(true);
  // восстановление после перезагрузки
  if (state.genreIdx >= 0 && cfg.genres[state.genreIdx]) {
    decor.set(cfg.genres[state.genreIdx], false);
    if (state.gachaSong === null) music.playGenre(blobUrl(cfg.genres[state.genreIdx].music));
  } else if (cfg.startGenre) {
    const idx = cfg.genres.findIndex((g) => g.id === cfg.startGenre);
    if (idx >= 0) setGenre(idx, false);
  }
  if (state.gachaSong !== null && cfg.gacha[state.gachaSong]) music.playGacha(blobUrl(cfg.gacha[state.gachaSong].file));
  updateMusicLabel();
  publish();

  // ---------- таймер ----------
  function tick() {
    player.update(S.timerElapsed(), state.timer.running);
  }

  // ---------- слайды ----------
  function go(i: number, dir: 1 | -1 | 0) {
    if (!slides.count) return;
    i = Math.max(0, Math.min(slides.count - 1, i));
    if (i === state.slide) return;
    stage.show(i, dir);
    state.slide = i;
    if (qr.visible) qr.show(false);
    if (!state.leftFirst && i > 0) {
      state.leftFirst = true;
      if (cfg.player.autostart) S.timerStart();
    }
    const last = slides.count - 1;
    if (i === last && state.finalMs === null) state.finalMs = S.timerElapsed();
    const gachaFrom = cfg.gachaFromSlide ? Math.min(last, cfg.gachaFromSlide - 1) : last;
    if (i >= gachaFrom && !state.gachaEnabled && cfg.gacha.length) openGacha();
    player.setSlide(i, slides.count);
    tick();
    publish();
    S.save();
  }

  // ---------- приколы ----------
  function memeBounds() {
    const right = video.id ? parseFloat(app.style.getPropertyValue('--video-w')) + PAD : 0;
    return { left: PAD, width: innerWidth - PAD * 2 - right, bottom: PLAYER_H + (ticker.active ? 56 : 8) };
  }
  function spawnMeme(id?: string) {
    const m = id ? cfg.memes.find((x) => x.id === id) : pick(cfg.memes);
    if (!m || isMissing(m.file)) return;
    memes.spawn(blobUrl(m.file)!, memeBounds());
    const st = state.stats;
    st.reactions++;
    st.memes[m.id] = (st.memes[m.id] ?? 0) + 1;
    st.slides[state.slide] = (st.slides[state.slide] ?? 0) + 1;
    S.save();
  }

  function closeGenreTime() {
    const g = cfg.genres[state.genreIdx];
    if (g && state.genreSince) {
      state.stats.genreMs[g.id] = (state.stats.genreMs[g.id] ?? 0) + (Date.now() - state.genreSince);
    }
    state.genreSince = null;
  }
  function setGenre(idx: number, announce = true) {
    const g = cfg.genres[idx];
    if (!g) return;
    closeGenreTime();
    state.genreIdx = idx;
    decor.set(g);
    if (state.gachaSong === null) {
      state.genreSince = Date.now();
      music.playGenre(blobUrl(g.music));
    }
    if (announce) {
      state.stats.genreSwitches++;
      toasts.show(`Волна сменилась: <b>${esc(g.name)}</b>`, 2000, 'wave');
      stage.shake();
    }
    updateMusicLabel();
    publish();
    S.save();
  }
  function nextGenre() {
    if (!cfg.genres.length) return;
    setGenre((state.genreIdx + 1) % cfg.genres.length);
  }
  function updateMusicLabel() {
    const g = cfg.genres[state.genreIdx];
    const what = state.gachaSong !== null ? 'Гача' : g ? g.name : '';
    player.setMusic(what ? `${state.musicMuted ? '🔇' : '♪'} ${what}` : '');
  }

  function showVideo(id?: string) {
    const v = id ? cfg.videos.find((x) => x.id === id) : pick(cfg.videos.filter((x) => x.id !== video.id));
    if (!v || isMissing(v.file)) return;
    const wasOn = !!video.id;
    video.show(v.id, blobUrl(v.file)!);
    if (!wasOn) relayout(520);
    publish();
  }
  function hideVideo() {
    if (!video.id) return;
    video.hide();
    relayout(520);
    publish();
  }

  function showTicker(text: string, custom: boolean) {
    text = text.trim().slice(0, 120);
    if (!text) return;
    ticker.show(text, cfg.tickerLoops);
    if (custom) state.stats.lastTicker = text;
    S.save();
    publish();
  }
  ticker.onEnd = publish;

  function openGacha() {
    if (!cfg.gacha.length) return;
    if (!state.gachaEnabled) {
      state.gachaEnabled = true;
      toasts.show('Гача открыта: жюри может крутить', 2500);
    }
    publish();
    S.save();
  }
  function restoreTrack() {
    const g = state.gachaSong !== null ? cfg.gacha[state.gachaSong] : null;
    if (g) player.setTrack({ cover: blobUrl(g.cover), title: g.title, artist: g.artist, badge: g.rarity });
    else player.setTrack({ cover: blobUrl(cfg.player.cover), title: cfg.player.title, artist: cfg.player.artist });
  }
  async function spinGacha() {
    if (!cfg.gacha.length || gacha.busy) return;
    if (wrapped.visible) wrapped.close();
    const idx = weightedPick(cfg.gacha);
    const song = cfg.gacha[idx];
    log(`гача: ${song.title} (${song.rarity})`);
    await gacha.spin(song, blobUrl(song.cover), () => player.coverRect(), () => {
      closeGenreTime();
      state.gachaSong = idx;
      music.playGacha(blobUrl(song.file));
      updateMusicLabel();
    });
    restoreTrack();
    publish();
    S.save();
  }

  function plural(n: number, one: string, few: string, many: string) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }
  function openWrapped() {
    if (gacha.busy) return;
    closeGenreTime();
    if (state.genreIdx >= 0 && state.gachaSong === null) state.genreSince = Date.now();
    const st = state.stats;
    const stories: Story[] = [];
    const n = st.reactions;
    stories.push(
      n > 0
        ? { kicker: 'Защита в цифрах', big: `Вы отправили<br><em>${n}</em> ${plural(n, 'реакцию', 'реакции', 'реакций')}`, theme: 'yellow' }
        : { kicker: 'Защита в цифрах', big: 'Ни одной реакции.<br><em>Сдержанно.</em>', theme: 'yellow' },
    );
    const fav = Object.entries(st.memes).sort((a, b) => b[1] - a[1])[0];
    const favMeme = fav && cfg.memes.find((m) => m.id === fav[0]);
    if (favMeme) {
      stories.push({ kicker: 'Ваш любимый мем', image: blobUrl(favMeme.file), big: `<em>${esc(favMeme.label)}</em>`, sub: `Отправлен ${fav[1]} ${plural(fav[1], 'раз', 'раза', 'раз')}`, theme: 'pink' });
    }
    const hot = Object.entries(st.slides).sort((a, b) => b[1] - a[1])[0];
    if (hot && slides.count) {
      const i = Number(hot[0]);
      stories.push({ kicker: 'Слайд, который вас зацепил', image: slides.img(i)?.src, big: `<em>№${i + 1}</em>`, sub: `${hot[1]} ${plural(hot[1], 'реакция', 'реакции', 'реакций')}, пока он был на экране`, theme: 'violet' });
    }
    if (st.genreSwitches > 0) {
      const favG = Object.entries(st.genreMs).sort((a, b) => b[1] - a[1])[0];
      const gName = favG ? cfg.genres.find((g) => g.id === favG[0])?.name : undefined;
      stories.push({ kicker: 'Волна', big: `Вы сменили волну<br><em>${st.genreSwitches}</em> ${plural(st.genreSwitches, 'раз', 'раза', 'раз')}`, sub: gName ? `Любимый жанр: ${gName}` : undefined, theme: 'green' });
    }
    if (st.lastTicker) {
      stories.push({ kicker: 'Ваше сообщение в эфире', big: `«${esc(st.lastTicker)}»`, theme: 'orange' });
    }
    const song = state.gachaSong !== null ? cfg.gacha[state.gachaSong] : null;
    if (song) {
      stories.push({ kicker: 'Ваша песня для финала', image: blobUrl(song.cover), big: `<em>${esc(song.title)}</em>`, sub: song.artist, theme: 'blue' });
    }
    const t = state.finalMs ?? S.timerElapsed();
    const limit = cfg.player.durationSec * 1000;
    stories.push({
      kicker: 'Время защиты',
      big: `<em>${fmtTime(t)}</em>`,
      sub: t <= limit ? 'Уложились' : `Перебрали на ${fmtTime(t - limit)}`,
      theme: t <= limit ? 'green' : 'red',
    });
    if (cfg.slogan) stories.push({ kicker: cfg.player.artist, big: esc(cfg.slogan), theme: 'dark' });
    wrapped.open(stories);
    publish();
  }

  function clearAll() {
    memes.clear();
    ticker.hide();
    hideVideo();
    qr.show(false);
    help.toggle(false);
    if (wrapped.visible) {
      wrapped.close();
      publish();
    }
  }

  function changeVolume(dir: 1 | -1) {
    state.volume = Math.max(0.1, Math.min(4, state.volume * (dir > 0 ? 1.25 : 0.8)));
    if (state.musicMuted) {
      state.musicMuted = false;
      music.setMuted(false);
    }
    music.setVolume(state.volume);
    toasts.show(`Громкость музыки: ${Math.round(state.volume * 100)}%`, 1200, 'small');
    updateMusicLabel();
    S.save();
  }

  // ---------- события пульта ----------
  function handle(ev: RemoteEvent) {
    switch (ev.type) {
      case 'meme': return spawnMeme(ev.id);
      case 'shake': return nextGenre();
      case 'video': return showVideo(ev.id);
      case 'video-off': return hideVideo();
      case 'ticker': return showTicker(ev.text, ev.custom);
      case 'ticker-off': ticker.hide(); return;
      case 'gacha-spin': if (state.gachaEnabled) spinGacha(); return;
      case 'wrapped': if (state.gachaEnabled) openWrapped(); return;
    }
  }

  // ---------- симуляция жюри (?debug, J) ----------
  let simT = 0;
  function toggleSim() {
    if (simT) {
      clearInterval(simT);
      simT = 0;
      toasts.show('Симуляция жюри выключена', 1200, 'small');
      return;
    }
    toasts.show('Симуляция жюри включена', 1200, 'small');
    simT = window.setInterval(() => {
      const r = Math.random();
      if (r < 0.8) spawnMeme();
      else if (r < 0.86) nextGenre();
      else if (r < 0.92) showTicker(pick(cfg.tickerPresets) ?? 'Тест', Math.random() < 0.5);
      else if (r < 0.96) showVideo();
      else hideVideo();
    }, 180);
  }

  // ---------- клавиши ----------
  function act(a: Action) {
    if (wrapped.visible && (a === 'next' || a === 'prev')) return a === 'next' ? wrapped.next() : wrapped.prev();
    switch (a) {
      case 'next': return go(state.slide + 1, 1);
      case 'prev': return go(state.slide - 1, -1);
      case 'first': return go(0, -1);
      case 'last': return go(slides.count - 1, 1);
      case 'timer':
        if (state.timer.running) S.timerPause();
        else S.timerStart();
        state.leftFirst = true;
        return tick();
      case 'timer-reset':
        S.timerReset();
        toasts.show('Таймер сброшен', 1200, 'small');
        return tick();
      case 'meme': return spawnMeme();
      case 'shake': return nextGenre();
      case 'video-off': return hideVideo();
      case 'video-random': return showVideo();
      case 'ticker': return showTicker(pick(cfg.tickerPresets) ?? '', false);
      case 'gacha-open': return openGacha();
      case 'gacha-spin': openGacha(); spinGacha(); return;
      case 'wrapped':
        if (wrapped.visible) {
          wrapped.close();
          publish();
        } else openWrapped();
        return;
      case 'vol-down': return changeVolume(-1);
      case 'vol-up': return changeVolume(1);
      case 'mute':
        state.musicMuted = !state.musicMuted;
        music.setMuted(state.musicMuted);
        toasts.show(state.musicMuted ? 'Музыка выключена' : 'Музыка включена', 1200, 'small');
        updateMusicLabel();
        return S.save();
      case 'remote-toggle':
        state.remotePaused = !state.remotePaused;
        toasts.show(state.remotePaused ? 'Пульт жюри выключен' : 'Пульт жюри снова работает', 1800);
        publish();
        return S.save();
      case 'clear': return clearAll();
      case 'qr': return qr.show(!qr.visible);
      case 'help': return help.toggle();
      case 'reset-all':
        if (confirm('Начать показ с нуля? Таймер, статистика, жанр и гача сбросятся. Код комнаты останется.')) {
          S.resetAll();
          location.reload();
        }
        return;
      case 'debug-sim': if (DEBUG) toggleSim(); return;
    }
  }
  addEventListener('keydown', (e) => {
    if (!started) return;
    if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
    const a = actionFor(e);
    if (!a) return;
    e.preventDefault();
    if (e.repeat && a !== 'next' && a !== 'prev' && a !== 'meme' && a !== 'vol-up' && a !== 'vol-down') return;
    act(a);
  });

  // ---------- PDF перетаскиванием ----------
  addEventListener('dragover', (e) => e.preventDefault());
  addEventListener('drop', async (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (!f || !/\.pdf$/i.test(f.name)) return toasts.show('Нужен файл .pdf', 1500, 'small');
    toasts.show(`Загружаю ${esc(f.name)}…`, 1500, 'small');
    try {
      await slides.load(await f.arrayBuffer(), () => {}, layout());
      lastRenderPx = layout();
      emptyMsg.classList.toggle('show', slides.count === 0);
      state.slide = Math.min(state.slide, slides.count - 1);
      stage.show(state.slide, 0);
      player.setSlide(state.slide, slides.count);
      publish();
      toasts.show(`Презентация заменена: ${slides.count} слайдов`, 2500);
    } catch (err) {
      warn(`PDF не открылся: ${(err as Error).message}`);
      toasts.show('Не получилось открыть PDF', 2000);
    }
  });

  // ---------- курсор прячется, чтобы не висел на слайде в Зуме ----------
  let idleT = 0;
  addEventListener('mousemove', () => {
    document.body.classList.remove('idle');
    clearTimeout(idleT);
    idleT = window.setTimeout(() => document.body.classList.add('idle'), 2000);
  });

  // ---------- чтобы ноутбук не уснул ----------
  async function keepAwake() {
    try {
      await navigator.wakeLock?.request('screen');
    } catch {
      /* не поддерживается — не страшно */
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && started) keepAwake();
  });
}

main().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre class="fatal">Ошибка запуска: ${esc(String(e?.stack ?? e))}</pre>`);
});
