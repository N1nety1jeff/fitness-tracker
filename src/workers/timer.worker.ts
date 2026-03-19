// ============================================
// Timer Web Worker
// Läuft unabhängig vom UI-Thread und bleibt aktiv
// wenn das Display ausgeschaltet wird.
// ============================================

// ---- Typen ----

type TimerPhase = 'idle' | 'work' | 'rest' | 'completed';

interface TimerConfig {
  workDuration: number;   // Arbeitsphase in Sekunden
  restDuration: number;   // Pause in Sekunden
  intervals: number;      // Anzahl Intervalle (z.B. 10)
}

interface TimerState {
  phase: TimerPhase;
  timeRemaining: number;  // Verbleibende Zeit in ms
  currentInterval: number;
  totalIntervals: number;
  isRunning: boolean;
}

// Nachrichten vom Main-Thread an den Worker
type IncomingMessage =
  | { type: 'configure'; config: TimerConfig }
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'get-state' };

// Nachrichten vom Worker an den Main-Thread
type OutgoingMessage =
  | { type: 'tick'; state: TimerState }
  | { type: 'phase-change'; phase: TimerPhase; interval: number }
  | { type: 'interval-complete'; interval: number }
  | { type: 'all-complete' }
  | { type: 'state'; state: TimerState }
  | { type: 'configured'; config: TimerConfig };

// ---- Worker State ----

let config: TimerConfig = {
  workDuration: 30,
  restDuration: 15,
  intervals: 10,
};

let state: TimerState = {
  phase: 'idle',
  timeRemaining: 0,
  currentInterval: 0,
  totalIntervals: config.intervals,
  isRunning: false,
};

let tickInterval: ReturnType<typeof setInterval> | null = null;
let lastTickTime: number = 0;

// Granularität: 100ms für präzise Zeiterfassung
const TICK_INTERVAL_MS = 100;

// ---- Kern-Logik ----

function sendMessage(msg: OutgoingMessage) {
  (self as unknown as Worker).postMessage(msg);
}

function emitTick() {
  sendMessage({ type: 'tick', state: { ...state } });
}

function startTicking() {
  if (tickInterval !== null) return;

  lastTickTime = Date.now();

  tickInterval = setInterval(() => {
    const now = Date.now();
    // Drift-Korrektur: Tatsächlich vergangene Zeit nutzen statt fester 100ms
    const elapsed = now - lastTickTime;
    lastTickTime = now;

    if (!state.isRunning) return;

    state.timeRemaining -= elapsed;

    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      handlePhaseEnd();
    }

    emitTick();
  }, TICK_INTERVAL_MS);
}

function stopTicking() {
  if (tickInterval !== null) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

function handlePhaseEnd() {
  if (state.phase === 'work') {
    // Arbeitsphase vorbei → Pause starten
    sendMessage({ type: 'interval-complete', interval: state.currentInterval });

    if (state.currentInterval >= state.totalIntervals) {
      // Alle Intervalle abgeschlossen
      state.phase = 'completed';
      state.isRunning = false;
      stopTicking();
      sendMessage({ type: 'all-complete' });
      sendMessage({ type: 'phase-change', phase: 'completed', interval: state.currentInterval });
    } else {
      // Pause-Phase starten
      state.phase = 'rest';
      state.timeRemaining = config.restDuration * 1000;
      sendMessage({ type: 'phase-change', phase: 'rest', interval: state.currentInterval });
    }
  } else if (state.phase === 'rest') {
    // Pause vorbei → nächstes Intervall
    state.currentInterval += 1;
    state.phase = 'work';
    state.timeRemaining = config.workDuration * 1000;
    sendMessage({ type: 'phase-change', phase: 'work', interval: state.currentInterval });
  }
}

function resetState() {
  stopTicking();
  state = {
    phase: 'idle',
    timeRemaining: 0,
    currentInterval: 0,
    totalIntervals: config.intervals,
    isRunning: false,
  };
}

// ---- Message Handler ----

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'configure':
      config = { ...msg.config };
      state.totalIntervals = config.intervals;
      if (state.phase === 'idle') {
        state.timeRemaining = config.workDuration * 1000;
      }
      sendMessage({ type: 'configured', config });
      emitTick();
      break;

    case 'start':
      resetState();
      state.phase = 'work';
      state.currentInterval = 1;
      state.timeRemaining = config.workDuration * 1000;
      state.totalIntervals = config.intervals;
      state.isRunning = true;
      sendMessage({ type: 'phase-change', phase: 'work', interval: 1 });
      startTicking();
      emitTick();
      break;

    case 'pause':
      state.isRunning = false;
      emitTick();
      break;

    case 'resume':
      if (state.phase !== 'idle' && state.phase !== 'completed') {
        state.isRunning = true;
        lastTickTime = Date.now(); // Reset für Drift-Korrektur
        startTicking();
        emitTick();
      }
      break;

    case 'reset':
      resetState();
      emitTick();
      break;

    case 'get-state':
      sendMessage({ type: 'state', state: { ...state } });
      break;
  }
};

// Initiale Nachricht senden
sendMessage({ type: 'state', state: { ...state } });
