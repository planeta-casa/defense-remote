// Горячие клавиши ведущего. Ловим по e.code — работает в любой раскладке (RU тоже).

export const HELP: [string, string][] = [
  ['→  ←   PgDn PgUp   Пробел', 'Слайд вперёд / назад (кликер тоже работает)'],
  ['Home  End', 'Первый / последний слайд'],
  ['T', 'Таймер: старт / пауза'],
  ['R', 'Таймер: сброс на 0:00'],
  ['M', 'Случайный мем'],
  ['S', 'Встряхнуть: следующий жанр'],
  ['V   Shift+V', 'Убрать ролик сбоку / включить случайный'],
  ['K', 'Случайная фраза в бегущую строку'],
  ['G   Shift+G', 'Открыть гачу жюри / крутить самому'],
  ['F', 'Итоги защиты'],
  ['[   ]   0', 'Музыка тише / громче / выключить-включить'],
  ['X', 'Пульт жюри: выключить / включить'],
  ['C   Backspace', 'Убрать всё лишнее: мемы, строку, ролик'],
  ['Q', 'Показать QR для пульта'],
  ['H', 'Эта подсказка'],
  ['Shift+R', 'Начать показ с нуля (сбросить всё)'],
];

export type Action =
  | 'next' | 'prev' | 'first' | 'last'
  | 'timer' | 'timer-reset'
  | 'meme' | 'shake' | 'video-off' | 'video-random' | 'ticker'
  | 'gacha-open' | 'gacha-spin' | 'wrapped'
  | 'vol-down' | 'vol-up' | 'mute'
  | 'remote-toggle' | 'clear' | 'qr' | 'help' | 'reset-all' | 'debug-sim';

export function actionFor(e: KeyboardEvent): Action | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  const s = e.shiftKey;
  switch (e.code) {
    case 'ArrowRight': case 'ArrowDown': case 'PageDown': case 'Enter': case 'NumpadEnter':
      return 'next';
    case 'Space':
      return s ? 'prev' : 'next';
    case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
      return 'prev';
    case 'Home': return 'first';
    case 'End': return 'last';
    case 'KeyT': return 'timer';
    case 'KeyR': return s ? 'reset-all' : 'timer-reset';
    case 'KeyM': return 'meme';
    case 'KeyS': return 'shake';
    case 'KeyV': return s ? 'video-random' : 'video-off';
    case 'KeyK': return 'ticker';
    case 'KeyG': return s ? 'gacha-spin' : 'gacha-open';
    case 'KeyF': return 'wrapped';
    case 'BracketLeft': case 'Minus': case 'NumpadSubtract': return 'vol-down';
    case 'BracketRight': case 'Equal': case 'NumpadAdd': return 'vol-up';
    case 'Digit0': case 'Numpad0': return 'mute';
    case 'KeyX': return 'remote-toggle';
    case 'KeyC': case 'Backspace': case 'Delete': return 'clear';
    case 'KeyQ': return 'qr';
    case 'KeyH': case 'Slash': return 'help';
    case 'KeyJ': return 'debug-sim';
    default: return null;
  }
}
