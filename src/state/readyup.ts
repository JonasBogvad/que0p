type SayFn = (msg: string) => void | Promise<void>;

const READY_TIMEOUT_MS = 30_000;

let _pendingList: string[] = [];
let _currentWinner: string | null = null;
let _readyTimer: ReturnType<typeof setTimeout> | null = null;
let _onSlotLost: ((login: string) => void) | null = null;
let _onReady: ((login: string) => void) | null = null;
let _say: SayFn | null = null;

function processNext(): void {
  if (_pendingList.length === 0 || _say === null) {
    _currentWinner = null;
    return;
  }
  const winner = _pendingList.shift()!;
  _currentWinner = winner;
  void _say(`⚔️ @${winner} — you were drawn! Type !ready within 30 seconds or !skip to pass.`);
  _readyTimer = setTimeout(() => {
    _readyTimer = null;
    const timedOut = _currentWinner;
    // Guard against cancelAll() racing the timer (shouldn't happen, but defensive)
    if (timedOut === null || _say === null) return;
    _currentWinner = null;
    void _say(`⚔️ @${timedOut} did not respond in time. Slot lost.`);
    if (_onSlotLost) _onSlotLost(timedOut);
    processNext();
  }, READY_TIMEOUT_MS);
}

export function startMultiReadyUp(
  winners: string[],
  onSlotLost: (login: string) => void,
  onReady: (login: string) => void,
  say: SayFn,
): void {
  cancelAll();
  if (winners.length === 0) return;
  _pendingList = [...winners];
  _onSlotLost = onSlotLost;
  _onReady = onReady;
  _say = say;
  processNext();
}

export function confirmReady(login: string, say: SayFn): boolean {
  if (_currentWinner === null || login !== _currentWinner) return false;
  if (_readyTimer !== null) {
    clearTimeout(_readyTimer);
    _readyTimer = null;
  }
  const winner = _currentWinner;
  _currentWinner = null;
  void say(`⚔️ @${winner} is ready! GL HF!`);
  if (_onReady) _onReady(winner);
  processNext();
  return true;
}

export function skipCurrent(say: SayFn): void {
  if (_currentWinner === null) return;
  if (_readyTimer !== null) {
    clearTimeout(_readyTimer);
    _readyTimer = null;
  }
  const skipped = _currentWinner;
  _currentWinner = null;
  void say(`⚔️ @${skipped} passed. Moving on...`);
  if (_onSlotLost) _onSlotLost(skipped);
  processNext();
}

export function cancelAll(): void {
  if (_readyTimer !== null) {
    clearTimeout(_readyTimer);
    _readyTimer = null;
  }
  _pendingList = [];
  _currentWinner = null;
  _onSlotLost = null;
  _onReady = null;
  _say = null;
}

export function getPendingWinner(): string | null {
  return _currentWinner;
}

export function getPendingList(): string[] {
  return [..._pendingList];
}

export function isWaitingForReady(): boolean {
  return _currentWinner !== null;
}
