import type { Envelope, RemoteEvent, SharedState } from './protocol';
import { firebaseConfig } from './firebase-config';
import { warn } from './log';

export type Role = 'screen' | 'remote';

/**
 * Связь экрана и пульта. Чтобы сменить Firebase на что-то другое,
 * достаточно ещё одной реализации этого интерфейса и строки в createTransport.
 */
export interface Transport {
  readonly kind: string;
  /** пульт → экран */
  send(ev: RemoteEvent): void;
  /** экран получает события пультов */
  onEvent(cb: (env: Envelope) => void): void;
  /** экран публикует состояние */
  setState(s: SharedState): void;
  /** пульт читает состояние */
  onState(cb: (s: SharedState) => void): void;
  /** экран: сколько пультов онлайн; пульт: сколько экранов онлайн */
  onPeers(cb: (count: number) => void): void;
  /** есть ли связь с сервером */
  onConnection(cb: (online: boolean) => void): void;
}

export function transportKind(): 'firebase' | 'local' {
  const forced = new URLSearchParams(location.search).get('transport');
  if (forced === 'local') return 'local';
  if (!firebaseConfig) return 'local';
  return 'firebase';
}

export async function createTransport(room: string, role: Role, clientId: string): Promise<Transport> {
  const kind = transportKind();
  if (kind === 'firebase' && firebaseConfig) {
    try {
      const { FirebaseTransport } = await import('./transport-firebase');
      return new FirebaseTransport(firebaseConfig, room, role, clientId);
    } catch (e) {
      warn(`Firebase не запустился (${(e as Error).message}), переключаюсь на локальную связь`);
    }
  } else if (!firebaseConfig) {
    warn('Firebase не настроен: пульт работает только в этом же браузере (вкладки). См. README.');
  }
  const { LocalTransport } = await import('./transport-local');
  return new LocalTransport(room, role, clientId);
}
