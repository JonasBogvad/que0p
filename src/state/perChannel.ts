import { createQueueState, QueueState } from './queue.js';
import { createActivityState, ActivityState } from './activity.js';
import { createReadyupState, ReadyupState } from './readyup.js';
import { createCooldownState, CooldownState } from './cooldown.js';
import { readSnapshot, createSnapshotWriter, ChannelSnapshot, QueueMode } from './channelStore.js';
import { queueFile } from '../paths.js';

export interface LobbyState {
  list(): string[];
  add(login: string): void;
  clear(): void;
}

export interface BanlistState {
  ban(login: string): void;
  unban(login: string): void;
  isBanned(login: string): boolean;
  list(): string[];
}

export interface ChannelState {
  queue: QueueState;
  activity: ActivityState;
  readyup: ReadyupState;
  cooldown: CooldownState;
  lobby: LobbyState;
  banlist: BanlistState;
  /** Resolves once every pending snapshot write has reached disk. */
  flush(): Promise<void>;
}

/** An open queue found on disk at boot, which the bot should pick up again once connected. */
export interface RestoredSession {
  channel: string;
  mode: QueueMode;
  size: number;
  /** Players who were mid ready-up when the process died; now at the front of the queue. */
  returnedToFront: string[];
}

type Restorer = (snapshot: ChannelSnapshot) => void;

const _channels = new Map<string, ChannelState>();
const _restorers = new WeakMap<ChannelState, Restorer>();
const _initialised = new Set<string>();

function snapshotOf(state: ChannelState): ChannelSnapshot {
  const current = state.readyup.getPendingWinner();
  return {
    players: state.queue.list(),
    open: state.queue.isQueueOpen(),
    mode: state.queue.getMode(),
    lobby: state.lobby.list(),
    pending: [...(current ? [current] : []), ...state.readyup.getPendingList()],
    banned: state.banlist.list(),
    lastActivityAt: state.queue.getLastActivityAt(),
  };
}

function createChannelState(channel: string): ChannelState {
  const writer = createSnapshotWriter(queueFile(channel));
  let _lobby: string[] = [];
  let _banned = new Set<string>();
  let state: ChannelState;
  let _dirty = false;

  // A command handler mutates several sub-states in one synchronous run (a draw
  // removes winners, then starts the ready-up). Snapshot once, after the run,
  // so no intermediate state ever reaches disk.
  function flushDirty(): void {
    if (!_dirty) return;
    _dirty = false;
    writer.write(snapshotOf(state));
  }
  function persist(): void {
    if (_dirty) return;
    _dirty = true;
    queueMicrotask(flushDirty);
  }

  state = {
    queue: createQueueState(persist),
    activity: createActivityState(),
    readyup: createReadyupState(persist),
    cooldown: createCooldownState(),
    lobby: {
      list: () => [..._lobby],
      add: (login) => {
        if (_lobby.includes(login)) return;
        _lobby = [..._lobby, login];
        persist();
      },
      clear: () => {
        if (_lobby.length === 0) return;
        _lobby = [];
        persist();
      },
    },
    banlist: {
      ban: (login) => {
        if (_banned.has(login)) return;
        _banned = new Set([..._banned, login]);
        persist();
      },
      unban: (login) => {
        if (!_banned.has(login)) return;
        _banned = new Set([..._banned].filter(l => l !== login));
        persist();
      },
      isBanned: (login) => _banned.has(login),
      list: () => [..._banned],
    },
    flush: () => {
      flushDirty();
      return writer.idle();
    },
  };

  _restorers.set(state, (snapshot) => {
    state.queue.restore({
      players: snapshot.players,
      open: snapshot.open,
      mode: snapshot.mode,
      lastActivityAt: snapshot.lastActivityAt,
    });
    _lobby = [...snapshot.lobby];
    _banned = new Set(snapshot.banned);
  });

  return state;
}

export function getChannelState(channel: string): ChannelState {
  const existing = _channels.get(channel);
  if (existing) return existing;
  const state = createChannelState(channel);
  _channels.set(channel, state);
  return state;
}

/**
 * Load the channel's persisted snapshot. Players mid ready-up when the process
 * died go back to the front of the queue so the streamer can redraw them.
 * Returns the open session to resume, or null if the queue was closed.
 */
export async function initChannelState(channel: string): Promise<RestoredSession | null> {
  // Memory is the source of truth once a channel is live (e.g. re-added via
  // /callback after !qpart); re-reading disk would clobber or duplicate it.
  if (_initialised.has(channel)) return null;
  _initialised.add(channel);

  const state = getChannelState(channel);
  const snapshot = await readSnapshot(queueFile(channel));
  if (!snapshot) return null;

  _restorers.get(state)?.(snapshot);
  // Someone already in the lobby has their slot; don't also hand them a queue spot.
  const returnedToFront = state.queue.prepend(snapshot.pending.filter(l => !snapshot.lobby.includes(l)));

  const mode = state.queue.getMode();
  const open = state.queue.isQueueOpen() && mode !== null;
  console.log(
    `[queue] Loaded ${state.queue.size()} entries for #${channel}` +
    (open ? ' (queue open)' : '') +
    (returnedToFront.length > 0 ? ` — returned to front: ${returnedToFront.join(', ')}` : ''),
  );

  if (!open || mode === null) return null;
  return { channel, mode, size: state.queue.size(), returnedToFront };
}

export function getAllChannelStates(): Map<string, ChannelState> {
  return _channels;
}
