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

/**
 * Ready-up state machine for one draw batch. `onChange` fires whenever the set
 * of players still waiting changes, so the owner can persist who was mid
 * ready-up if the process dies.
 */
export function createReadyupState(onChange: () => void = () => {}): ReadyupState {
  let _pendingList: string[] = [];
  let _currentWinner: string | null = null;
  let _readyTimer: ReturnType<typeof setTimeout> | null = null;
  let _onSlotLost: ((login: string) => void) | null = null;
  let _onReady: ((login: string) => void) | null = null;
  let _say: SayFn | null = null;
  let _lastEvent: { type: 'ready' | 'lost' | 'skip' | null; login: string | null } = { type: null, login: null };
  let _drawnBatch: string[] = [];

  function clearTimer(): void {
    if (_readyTimer !== null) {
      clearTimeout(_readyTimer);
      _readyTimer = null;
    }
  }

  function processNext(): void {
    if (_pendingList.length === 0 || _say === null) {
      _currentWinner = null;
      return;
    }
    const [winner, ...rest] = _pendingList;
    _pendingList = rest;
    _currentWinner = winner;
    void _say(`>_ @${winner} — type !qready within 30s or !qskip to pass`);
    _readyTimer = setTimeout(() => {
      _readyTimer = null;
      const timedOut = _currentWinner;
      if (timedOut === null || _say === null) return;
      _currentWinner = null;
      void _say(`> @${timedOut} — slot lost [30s]`);
      _lastEvent = { type: 'lost', login: timedOut };
      if (_onSlotLost) _onSlotLost(timedOut);
      processNext();
      onChange();
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
      onChange();
    },

    confirmReady(login, say) {
      if (_currentWinner === null || login !== _currentWinner) return false;
      clearTimer();
      const winner = _currentWinner;
      _currentWinner = null;
      void say(`> @${winner} ready — slot confirmed`);
      _lastEvent = { type: 'ready', login: winner };
      if (_onReady) _onReady(winner);
      processNext();
      onChange();
      return true;
    },

    skipCurrent(say) {
      if (_currentWinner === null) return;
      clearTimer();
      const skipped = _currentWinner;
      _currentWinner = null;
      void say(`> @${skipped} skipped — requeued`);
      _lastEvent = { type: 'skip', login: skipped };
      if (_onSlotLost) _onSlotLost(skipped);
      processNext();
      onChange();
    },

    cancelAll() {
      clearTimer();
      _pendingList = [];
      _currentWinner = null;
      _onSlotLost = null;
      _onReady = null;
      _say = null;
      _drawnBatch = [];
      onChange();
    },

    getPendingWinner() { return _currentWinner; },
    getPendingList() { return [..._pendingList]; },
    isWaitingForReady() { return _currentWinner !== null; },
    getLastEvent() { return _lastEvent; },
    getDrawnBatch() { return [..._drawnBatch]; },
  };

  return state;
}
