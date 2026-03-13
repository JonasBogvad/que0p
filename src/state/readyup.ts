type SayFn = (msg: string) => void | Promise<void>;

const READY_TIMEOUT_MS = 30_000;

export interface ReadyupState {
  startMultiReadyUp(
    winners: string[],
    onSlotLost: (login: string) => void,
    onReady: (login: string) => void,
    say: SayFn,
  ): void;
  confirmReady(login: string, say: SayFn): boolean;
  skipCurrent(say: SayFn): void;
  cancelAll(): void;
  getPendingWinner(): string | null;
  getPendingList(): string[];
  isWaitingForReady(): boolean;
  getLastEvent(): { type: 'ready' | 'lost' | 'skip' | null; login: string | null };
  getDrawnBatch(): string[];
}

export function createReadyupState(): ReadyupState {
  let _pendingList: string[] = [];
  let _currentWinner: string | null = null;
  let _readyTimer: ReturnType<typeof setTimeout> | null = null;
  let _onSlotLost: ((login: string) => void) | null = null;
  let _onReady: ((login: string) => void) | null = null;
  let _say: SayFn | null = null;
  let _lastEvent: { type: 'ready' | 'lost' | 'skip' | null; login: string | null } = { type: null, login: null };
  let _drawnBatch: string[] = [];

  function processNext(): void {
    if (_pendingList.length === 0 || _say === null) {
      _currentWinner = null;
      return;
    }
    const winner = _pendingList.shift()!;
    _currentWinner = winner;
    void _say(`💣 @${winner} — you've been picked! Type !ready within 30s or !skip to pass.`);
    _readyTimer = setTimeout(() => {
      _readyTimer = null;
      const timedOut = _currentWinner;
      if (timedOut === null || _say === null) return;
      _currentWinner = null;
      void _say(`⏰ @${timedOut} took too long. Slot lost!`);
      _lastEvent = { type: 'lost', login: timedOut };
      if (_onSlotLost) _onSlotLost(timedOut);
      processNext();
    }, READY_TIMEOUT_MS);
  }

  const state: ReadyupState = {
    startMultiReadyUp(winners, onSlotLost, onReady, say) {
      state.cancelAll();
      if (winners.length === 0) return;
      _drawnBatch = [...winners];
      _pendingList = [...winners];
      _onSlotLost = onSlotLost;
      _onReady = onReady;
      _say = say;
      processNext();
    },

    confirmReady(login, say) {
      if (_currentWinner === null || login !== _currentWinner) return false;
      if (_readyTimer !== null) { clearTimeout(_readyTimer); _readyTimer = null; }
      const winner = _currentWinner;
      _currentWinner = null;
      void say(`⚡ @${winner} is ready! GL HF — frag out!`);
      _lastEvent = { type: 'ready', login: winner };
      if (_onReady) _onReady(winner);
      processNext();
      return true;
    },

    skipCurrent(say) {
      if (_currentWinner === null) return;
      if (_readyTimer !== null) { clearTimeout(_readyTimer); _readyTimer = null; }
      const skipped = _currentWinner;
      _currentWinner = null;
      void say(`💨 @${skipped} passed. Moving on...`);
      _lastEvent = { type: 'skip', login: skipped };
      if (_onSlotLost) _onSlotLost(skipped);
      processNext();
    },

    cancelAll() {
      if (_readyTimer !== null) { clearTimeout(_readyTimer); _readyTimer = null; }
      _pendingList = [];
      _currentWinner = null;
      _onSlotLost = null;
      _onReady = null;
      _say = null;
    },

    getPendingWinner() { return _currentWinner; },
    getPendingList() { return [..._pendingList]; },
    isWaitingForReady() { return _currentWinner !== null; },
    getLastEvent() { return _lastEvent; },
    getDrawnBatch() { return [..._drawnBatch]; },
  };

  return state;
}
