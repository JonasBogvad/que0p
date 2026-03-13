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
}

const _channels = new Map<string, ChannelState>();

export function getChannelState(channel: string): ChannelState {
  let state = _channels.get(channel);
  if (!state) {
    state = {
      queue: createQueueState(queueFile(channel)),
      activity: createActivityState(),
      readyup: createReadyupState(),
      cooldown: createCooldownState(),
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
