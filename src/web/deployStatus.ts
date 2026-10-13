export interface ChannelActivity {
  channel: string;
  open: boolean;
  waitingForReady: boolean;
}

export interface BusyChannel {
  channel: string;
  reason: 'ready-up in progress' | 'queue open';
}

export interface DeployStatus {
  /** True when at least one live channel has a game session in progress. */
  busy: boolean;
  /** 'unknown' when Twitch could not be asked; the caller decides how to treat that. */
  liveStatus: 'known' | 'unknown';
  busyChannels: BusyChannel[];
  checkedAt: string;
}

const CACHE_MS = 30_000;

/** A session is in progress when the queue is open or someone is mid ready-up. */
export function sessionCandidates(channels: readonly ChannelActivity[]): ChannelActivity[] {
  return channels.filter(c => c.open || c.waitingForReady);
}

export function computeDeployStatus(
  channels: readonly ChannelActivity[],
  live: ReadonlySet<string> | null,
  now: number = Date.now(),
): DeployStatus {
  const busyChannels: BusyChannel[] = live === null
    ? []
    : sessionCandidates(channels)
      .filter(c => live.has(c.channel))
      .map(c => ({ channel: c.channel, reason: c.waitingForReady ? 'ready-up in progress' : 'queue open' }));
  return {
    busy: busyChannels.length > 0,
    liveStatus: live === null ? 'unknown' : 'known',
    busyChannels,
    checkedAt: new Date(now).toISOString(),
  };
}

/**
 * Builds the status the deploy workflow polls. Twitch is only asked about
 * channels with a session in progress, and the answer is cached briefly so
 * a polling loop (or a curious visitor) cannot hammer Helix.
 */
export function createDeployStatusProvider(
  collect: () => ChannelActivity[],
  fetchLive: (logins: string[]) => Promise<ReadonlySet<string> | null>,
  options: { cacheMs?: number; now?: () => number } = {},
): () => Promise<DeployStatus> {
  const cacheMs = options.cacheMs ?? CACHE_MS;
  const now = options.now ?? Date.now;
  let _cached: { at: number; status: DeployStatus } | null = null;

  return async () => {
    const at = now();
    if (_cached && at - _cached.at < cacheMs) return _cached.status;

    const channels = collect();
    const candidates = sessionCandidates(channels);
    const live = candidates.length === 0 ? new Set<string>() : await fetchLive(candidates.map(c => c.channel));
    const status = computeDeployStatus(channels, live, at);
    _cached = { at, status };
    return status;
  };
}
