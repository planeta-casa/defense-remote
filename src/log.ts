// Лог и предупреждения. В ?debug они ещё и выводятся на экран.
export const DEBUG = new URLSearchParams(location.search).has('debug');

type Listener = (line: string, level: 'info' | 'warn') => void;
const listeners: Listener[] = [];
const backlog: [string, 'info' | 'warn'][] = [];

function emit(line: string, level: 'info' | 'warn') {
  const stamp = new Date().toLocaleTimeString('ru-RU');
  const full = `${stamp} ${line}`;
  backlog.push([full, level]);
  if (backlog.length > 200) backlog.shift();
  listeners.forEach((l) => l(full, level));
}

export function log(msg: string) {
  console.info('[defense]', msg);
  emit(msg, 'info');
}

export function warn(msg: string) {
  console.warn('[defense]', msg);
  emit(msg, 'warn');
}

export function onLog(l: Listener) {
  backlog.forEach(([line, level]) => l(line, level));
  listeners.push(l);
}
