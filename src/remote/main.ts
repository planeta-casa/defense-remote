import '@fontsource-variable/onest';
import '../styles/remote.css';
import { assetUrl, loadConfig, type Config } from '../config';
import { normalizeRoom, randomId, type RemoteEvent, type SharedState } from '../protocol';
import { createTransport, type Transport } from '../transport';
import { el, esc } from '../util';

const root = document.getElementById('remote')!;
const params = new URLSearchParams(location.search);
const room = normalizeRoom(params.get('room') ?? '');

function clientId(): string {
  try {
    let id = localStorage.getItem('defense.client');
    if (!id) {
      id = randomId(8);
      localStorage.setItem('defense.client', id);
    }
    return id;
  } catch {
    return randomId(8);
  }
}

function buzz(ms = 12) {
  navigator.vibrate?.(ms);
}

// ---------- ввод кода комнаты ----------
function joinForm() {
  root.innerHTML = `
    <div class="join">
      <div class="join-kicker">Пульт жюри</div>
      <div class="join-title">Введите код с экрана</div>
      <input class="join-input" maxlength="4" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="K7PM">
      <button class="btn primary join-btn" disabled>Подключиться</button>
    </div>`;
  const input = root.querySelector('.join-input') as HTMLInputElement;
  const btn = root.querySelector('.join-btn') as HTMLButtonElement;
  input.oninput = () => {
    input.value = normalizeRoom(input.value);
    btn.disabled = input.value.length !== 4;
  };
  const go = () => {
    if (input.value.length !== 4) return;
    params.set('room', input.value);
    location.search = params.toString();
  };
  btn.onclick = go;
  input.onkeydown = (e) => e.key === 'Enter' && go();
  input.focus();
}

// ---------- пульт ----------
type Tab = 'memes' | 'wave' | 'videos' | 'ticker' | 'final';
const TABS: [Tab, string][] = [
  ['memes', 'Мемы'],
  ['wave', 'Волна'],
  ['videos', 'Ролики'],
  ['ticker', 'Строка'],
  ['final', 'Финал'],
];

async function remote(cfg: Config) {
  let state: SharedState | null = null;
  let online = false;
  let screens = 0;
  let sent = 0;
  let tab: Tab = 'memes';
  let transport: Transport | null = null;

  root.innerHTML = `
    <header class="hdr">
      <div class="hdr-left"><b>Пульт жюри</b><span class="hdr-room">${esc(room)}</span></div>
      <div class="status"><i></i><span>Подключаемся…</span></div>
    </header>
    <div class="sub"><span class="sub-slide">—</span><span class="sub-sent"></span></div>
    <main class="panes">
      <section class="pane" data-tab="memes"><div class="memes-grid"></div></section>
      <section class="pane" data-tab="wave">
        <button class="btn shake-btn">Встряхнуть</button>
        <div class="wave-now">Жанр ещё не выбран</div>
        <button class="btn motion-btn">Включить встряхивание телефона</button>
        <p class="hint">Каждое встряхивание включает следующий жанр: украшения и фоновая музыка.</p>
      </section>
      <section class="pane" data-tab="videos">
        <div class="videos-grid"></div>
        <button class="btn ghost video-off">Убрать ролик</button>
      </section>
      <section class="pane" data-tab="ticker">
        <div class="chips"></div>
        <div class="tk-own">
          <textarea class="tk-input" maxlength="120" rows="2" placeholder="Свой текст для бегущей строки"></textarea>
          <div class="tk-row"><span class="tk-count">0 / 120</span><button class="btn primary tk-send" disabled>Отправить</button></div>
        </div>
        <button class="btn ghost tk-off">Убрать строку</button>
      </section>
      <section class="pane" data-tab="final">
        <button class="btn gacha-btn" disabled>Крутить гачу</button>
        <p class="hint gacha-hint">Гача откроется, когда показ дойдёт до последнего слайда.</p>
        <button class="btn primary wrapped-btn" hidden>Показать итоги защиты</button>
      </section>
    </main>
    <nav class="tabs">${TABS.map(([id, name]) => `<button data-tab="${id}">${name}</button>`).join('')}</nav>
    <div class="paused"><div><b>Ведущий поставил пульт на паузу</b><span>Кнопки снова заработают, когда он его включит.</span></div></div>`;

  const $ = <T extends HTMLElement>(s: string) => root.querySelector(s) as T;

  // --- вкладки
  function showTab(t: Tab) {
    tab = t;
    root.querySelectorAll<HTMLElement>('.pane').forEach((p) => p.classList.toggle('active', p.dataset.tab === t));
    root.querySelectorAll<HTMLElement>('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
    if (t === 'final') $('.tabs [data-tab="final"]').classList.remove('ping');
  }
  root.querySelectorAll<HTMLButtonElement>('.tabs button').forEach((b) => (b.onclick = () => showTab(b.dataset.tab as Tab)));
  showTab('memes');

  // --- отправка
  function send(ev: RemoteEvent, btn?: HTMLElement) {
    if (!transport || state?.paused) return;
    transport.send(ev);
    buzz();
    keepAwake();
    if (btn) {
      btn.classList.remove('sent');
      void btn.offsetWidth;
      btn.classList.add('sent');
    }
    if (ev.type === 'meme') {
      sent++;
      $('.sub-sent').textContent = `Отправлено реакций: ${sent}`;
    }
  }

  // --- мемы
  const mg = $('.memes-grid');
  for (const m of cfg.memes) {
    const b = el('button', 'tile', `<img src="${assetUrl(m.file)}" alt="" loading="lazy"><span>${esc(m.label)}</span>`);
    b.onclick = () => send({ type: 'meme', id: m.id }, b);
    mg.appendChild(b);
  }

  // --- волна
  $('.shake-btn').onclick = (e) => send({ type: 'shake' }, e.currentTarget as HTMLElement);
  setupMotion($('.motion-btn'), () => send({ type: 'shake' }, $('.shake-btn')));

  // --- ролики
  const vg = $('.videos-grid');
  for (const v of cfg.videos) {
    const b = el('button', 'vtile', `${v.poster ? `<img src="${assetUrl(v.poster)}" alt="" loading="lazy">` : ''}<span>${esc(v.label)}</span>`);
    b.dataset.id = v.id;
    b.onclick = () => send({ type: 'video', id: v.id }, b);
    vg.appendChild(b);
  }
  $('.video-off').onclick = (e) => send({ type: 'video-off' }, e.currentTarget as HTMLElement);

  // --- строка
  const chips = $('.chips');
  for (const p of cfg.tickerPresets) {
    const b = el('button', 'chip', esc(p));
    b.onclick = () => send({ type: 'ticker', text: p, custom: false }, b);
    chips.appendChild(b);
  }
  const input = $<HTMLTextAreaElement>('.tk-input');
  const sendBtn = $<HTMLButtonElement>('.tk-send');
  const updateCount = () => {
    $('.tk-count').textContent = `${input.value.length} / 120`;
    sendBtn.disabled = !input.value.trim();
  };
  input.oninput = updateCount;
  sendBtn.onclick = () => {
    const text = input.value.trim().slice(0, 120);
    if (!text) return;
    send({ type: 'ticker', text, custom: true }, sendBtn);
    input.value = '';
    updateCount();
    input.blur();
  };
  $('.tk-off').onclick = (e) => send({ type: 'ticker-off' }, e.currentTarget as HTMLElement);

  // --- финал
  $('.gacha-btn').onclick = (e) => send({ type: 'gacha-spin' }, e.currentTarget as HTMLElement);
  $('.wrapped-btn').onclick = (e) => send({ type: 'wrapped' }, e.currentTarget as HTMLElement);

  // --- состояние
  function render() {
    const st = $('.status');
    const label = st.querySelector('span')!;
    st.className = 'status';
    if (!online) {
      st.classList.add('bad');
      label.textContent = 'Нет связи, переподключаемся…';
    } else if (screens === 0) {
      st.classList.add('warn');
      label.textContent = 'Экран не в сети';
    } else if (state?.paused) {
      st.classList.add('warn');
      label.textContent = 'На паузе';
    } else {
      st.classList.add('ok');
      label.textContent = 'Подключено';
    }
    root.classList.toggle('is-paused', !!state?.paused);
    if (!state) return;
    $('.sub-slide').textContent = state.total ? `Слайд ${state.slide + 1} / ${state.total}` : '';
    $('.wave-now').textContent = state.genre ? `Сейчас: ${state.genre}` : 'Жанр ещё не выбран';
    root.querySelectorAll<HTMLElement>('.vtile').forEach((b) => b.classList.toggle('active', b.dataset.id === state!.video));
    ($('.video-off') as HTMLButtonElement).disabled = !state.video;
    ($('.tk-off') as HTMLButtonElement).disabled = !state.ticker;
    const g = $<HTMLButtonElement>('.gacha-btn');
    const wasDisabled = g.disabled;
    g.disabled = !state.gachaEnabled;
    g.textContent = state.gachaSpun ? 'Крутить ещё раз' : 'Крутить гачу';
    $('.gacha-hint').textContent = state.gachaEnabled
      ? state.gachaSpun
        ? 'Не понравилась песня? Можно крутить снова.'
        : 'Песня для заключительного слова. Жмите!'
      : 'Гача откроется, когда показ дойдёт до последнего слайда.';
    $('.wrapped-btn').hidden = !state.gachaSpun;
    if (wasDisabled && state.gachaEnabled && tab !== 'final') $('.tabs [data-tab="final"]').classList.add('ping');
  }
  render();

  transport = await createTransport(room, 'remote', clientId());
  transport.onConnection((o) => {
    online = o;
    render();
  });
  transport.onPeers((n) => {
    screens = n;
    render();
  });
  transport.onState((s) => {
    state = s;
    render();
  });
}

// ---------- встряхивание ----------
function setupMotion(btn: HTMLButtonElement, onShake: () => void) {
  let enabled = false;
  let last = 0;
  let prev: [number, number, number] | null = null;
  const handler = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    const cur: [number, number, number] = [a.x, a.y, a.z];
    if (prev) {
      const d = Math.hypot(cur[0] - prev[0], cur[1] - prev[1], cur[2] - prev[2]);
      const now = Date.now();
      if (d > 22 && now - last > 1500) {
        last = now;
        onShake();
      }
    }
    prev = cur;
  };
  if (typeof DeviceMotionEvent === 'undefined') {
    btn.hidden = true;
    return;
  }
  btn.onclick = async () => {
    if (enabled) {
      removeEventListener('devicemotion', handler);
      enabled = false;
      btn.textContent = 'Включить встряхивание телефона';
      btn.classList.remove('on');
      return;
    }
    const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
    if (DME.requestPermission) {
      try {
        if ((await DME.requestPermission()) !== 'granted') {
          btn.textContent = 'Доступ к датчику не дали — жмите кнопку выше';
          return;
        }
      } catch {
        btn.textContent = 'Датчик недоступен — жмите кнопку выше';
        return;
      }
    }
    addEventListener('devicemotion', handler);
    enabled = true;
    btn.textContent = 'Встряхивание включено (нажмите, чтобы выключить)';
    btn.classList.add('on');
  };
}

// ---------- не гасить экран телефона ----------
let lock: WakeLockSentinel | null = null;
async function keepAwake() {
  if (lock && !lock.released) return;
  try {
    lock = (await navigator.wakeLock?.request('screen')) ?? null;
  } catch {
    /* не поддерживается */
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && lock?.released) keepAwake();
});

// ---------- старт ----------
if (room.length !== 4) joinForm();
else
  loadConfig()
    .then(remote)
    .catch((e) => {
      root.innerHTML = `<pre class="fatal">Ошибка: ${esc(String(e?.message ?? e))}</pre>`;
    });
