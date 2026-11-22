import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getDatabase,
  onChildAdded,
  onDisconnect,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  set,
  startAt,
  type Database,
} from 'firebase/database';
import type { Envelope, RemoteEvent, SharedState } from './protocol';
import type { Role, Transport } from './transport';
import { log, warn } from './log';

/** События старше этого (по серверным часам) экран выбрасывает, чтобы не проигрывать историю после переподключения. */
const MAX_EVENT_AGE_MS = 15_000;

/**
 * rooms/{code}/events/{push}     — события пульта, экран удаляет их после обработки
 * rooms/{code}/state             — состояние для пультов
 * rooms/{code}/presence/screens|remotes/{id}
 */
export class FirebaseTransport implements Transport {
  readonly kind = 'firebase';
  private db: Database;
  private base: string;
  private offset = 0;
  private connCbs: ((online: boolean) => void)[] = [];
  private online = false;

  constructor(cfg: FirebaseOptions, room: string, private role: Role, private id: string) {
    const app = initializeApp(cfg);
    this.db = getDatabase(app);
    this.base = `rooms/${room}`;

    onValue(ref(this.db, '.info/serverTimeOffset'), (s) => (this.offset = Number(s.val()) || 0));
    onValue(ref(this.db, '.info/connected'), (s) => {
      this.online = s.val() === true;
      this.connCbs.forEach((cb) => cb(this.online));
      if (this.online) this.announce();
      log(`Firebase: ${this.online ? 'на связи' : 'нет связи'}`);
    });
  }

  private announce() {
    const me = ref(this.db, `${this.base}/presence/${this.role}s/${this.id}`);
    onDisconnect(me)
      .remove()
      .then(() => set(me, { t: serverTimestamp() }))
      .catch((e) => warn(`presence: ${e.message}`));
  }

  private serverNow() {
    return Date.now() + this.offset;
  }

  send(ev: RemoteEvent) {
    push(ref(this.db, `${this.base}/events`), { ev, from: this.id, t: serverTimestamp() }).catch((e) =>
      warn(`Не отправилось: ${e.message}`),
    );
  }

  onEvent(cb: (e: Envelope) => void) {
    const seen = new Set<string>();
    const q = query(ref(this.db, `${this.base}/events`), orderByChild('t'), startAt(this.serverNow() - MAX_EVENT_AGE_MS));
    onChildAdded(q, (snap) => {
      const key = snap.key!;
      const env = snap.val() as Envelope;
      remove(snap.ref).catch(() => {});
      if (seen.has(key)) return;
      seen.add(key);
      if (typeof env?.t !== 'number' || this.serverNow() - env.t > MAX_EVENT_AGE_MS) return;
      cb(env);
    });
  }

  setState(s: SharedState) {
    set(ref(this.db, `${this.base}/state`), s).catch((e) => warn(`state: ${e.message}`));
  }

  onState(cb: (s: SharedState) => void) {
    onValue(ref(this.db, `${this.base}/state`), (snap) => {
      const v = snap.val();
      if (v) cb(v as SharedState);
    });
  }

  onPeers(cb: (n: number) => void) {
    const other = this.role === 'screen' ? 'remotes' : 'screens';
    onValue(ref(this.db, `${this.base}/presence/${other}`), (snap) => cb(snap.size));
  }

  onConnection(cb: (online: boolean) => void) {
    this.connCbs.push(cb);
    cb(this.online);
  }
}
