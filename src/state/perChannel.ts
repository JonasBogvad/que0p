import { createQueueState, QueueState } from './queue.js';
import { createActivityState, ActivityState } from './activity.js';
import { createReadyupState, ReadyupState } from './readyup.js';
import { createCooldownState, CooldownState } from './cooldown.js';
import { queueFile } from '../paths.js';

export interface ChannelState {
  queue: QueueState;
  activity: ActivityState;
  readyup: ReadyupState;
  cooldown: CooldownState;
  lobby: {
    list: () => string[];
    add: (login: string) => void;
    clear: () => void;
  };
  banlist: {
    ban: (login: string) => void;
    unban: (login: string) => void;
    isBanned: (login: string) => boolean;
    list: () => string[];
  };
}

const _channels = new Map<string, ChannelState>();

export function getChannelState(channel: string): ChannelState {
  let state = _channels.get(channel);
  if (!state) {
    let _lobby: string[] = [];
    const _banned = new Set<string>();
    state = {
      queue: createQueueState(queueFile(channel)),
      activity: createActivityState(),
      readyup: createReadyupState(),
      cooldown: createCooldownState(),
      lobby: {
        list: () => [..._lobby],
        add: (login: string) => { if (!_lobby.includes(login)) _lobby.push(login); },
        clear: () => { _lobby = []; },
      },
      banlist: {
        ban: (login: string) => _banned.add(login),
        unban: (login: string) => _banned.delete(login),
        isBanned: (login: string) => _banned.has(login),
        list: () => [..._banned],
      },
    };
    _channels.set(channel, state);
  }
  return state;
}

export async function initChannelState(channel: string): Promise<ChannelState> {
  const state = getChannelState(channel);
  await state.queue.loadPersisted();
  return state;
}

export function getAllChannelStates(): Map<string, ChannelState> {
  return _channels;
}
