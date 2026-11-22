import type { Envelope, RemoteEvent, SharedState } from './protocol';
import type { Role, Transport } from './transport';

type Msg =
  | { k: 'ev'; env: Envelope }
  | { k: 'state'; s: SharedState }
  | { k: 'hello'; role: Role; id: string }
  | { k: 'bye'; id: string };

/** Связь через BroadcastChannel — только вкладки одного браузера. Для отладки и как запасной вариант. */
export class LocalTransport implements Transport {
  readonly kind = 'local';
  private ch: BroadcastChannel;
  private peers = new Map<string, number>();
  private evCbs: ((e: Envelope) => void)[] = [];
  private stateCbs: ((s: SharedState) => void)[] = [];
  private peerCbs: ((n: number) => void)[] = [];
  private lastState: SharedState | null = null;
  private lastCount = -1;

  constructor(room: string, private role: Role, private id: string) {
    this.ch = new BroadcastChannel(`defense-${room}`);
    this.ch.onmessage = (e: MessageEvent<Msg>) => this.handle(e.data);
    const hello = () => this.post({ k: 'hello', role, id });
    hello();
    setInterval(() => {
      hello();
      this.prune();
    }, 1500);
    addEventListener('pagehide', () => this.post({ k: 'bye', id }));
  }

  private post(m: Msg) {
    this.ch.postMessage(m);
  }

  private handle(m: Msg) {
    if (m.k === 'ev' && this.role === 'screen') this.evCbs.forEach((cb) => cb(m.env));
    if (m.k === 'state' && this.role === 'remote') this.stateCbs.forEach((cb) => cb(m.s));
    if (m.k === 'hello' && m.role !== this.role) {
      const isNew = !this.peers.has(m.id);
      this.peers.set(m.id, Date.now());
      if (isNew && this.role === 'screen' && this.lastState) this.post({ k: 'state', s: this.lastState });
      this.emitPeers();
    }
    if (m.k === 'bye') {
      this.peers.delete(m.id);
      this.emitPeers();
    }
  }

  private prune() {
    const now = Date.now();
    for (const [id, t] of this.peers) if (now - t > 5000) this.peers.delete(id);
    this.emitPeers();
  }

  private emitPeers() {
    if (this.peers.size === this.lastCount) return;
    this.lastCount = this.peers.size;
    this.peerCbs.forEach((cb) => cb(this.peers.size));
  }

  send(ev: RemoteEvent) {
    this.post({ k: 'ev', env: { ev, from: this.id, t: Date.now() } });
  }
  onEvent(cb: (e: Envelope) => void) {
    this.evCbs.push(cb);
  }
  setState(s: SharedState) {
    this.lastState = s;
    this.post({ k: 'state', s });
  }
  onState(cb: (s: SharedState) => void) {
    this.stateCbs.push(cb);
  }
  onPeers(cb: (n: number) => void) {
    this.peerCbs.push(cb);
    cb(this.peers.size);
  }
  onConnection(cb: (online: boolean) => void) {
    cb(true);
  }
}
