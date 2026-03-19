// ============================================
// useTimer Hook
// React-Schnittstelle zum Timer Web Worker
// ============================================

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_TIMER_WORK_SECONDS,
  DEFAULT_TIMER_REST_SECONDS,
  DEFAULT_TIMER_INTERVALS,
} from '@/lib/utils/constants';

// ---- Typen ----

type TimerPhase = 'idle' | 'work' | 'rest' | 'completed';

interface TimerConfig {
  workDuration: number;
  restDuration: number;
  intervals: number;
}

interface TimerState {
  phase: TimerPhase;
  timeRemaining: number;
  currentInterval: number;
  totalIntervals: number;
  isRunning: boolean;
}

interface UseTimerOptions {
  workDuration?: number;
  restDuration?: number;
  intervals?: number;
  onIntervalComplete?: (interval: number) => void;
  onAllComplete?: () => void;
  onPhaseChange?: (phase: TimerPhase, interval: number) => void;
}

interface UseTimerReturn {
  /** Verbleibende Zeit in Sekunden */
  timeRemaining: number;
  /** Verbleibende Zeit in ms (für präzise Anzeige) */
  timeRemainingMs: number;
  /** Aktuelle Phase */
  phase: TimerPhase;
  /** Aktuelles Intervall */
  currentInterval: number;
  /** Gesamtanzahl Intervalle */
  totalIntervals: number;
  /** Läuft der Timer? */
  isRunning: boolean;
  /** Timer starten (von vorne) */
  start: () => void;
  /** Timer pausieren */
  pause: () => void;
  /** Timer fortsetzen */
  resume: () => void;
  /** Timer zurücksetzen */
  reset: () => void;
  /** Timer konfigurieren */
  configure: (config: Partial<TimerConfig>) => void;
  /** Formatierte verbleibende Zeit (MM:SS) */
  formattedTime: string;
}

// ---- Hilfsfunktionen ----

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ---- Hook ----

export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
  const {
    workDuration = DEFAULT_TIMER_WORK_SECONDS,
    restDuration = DEFAULT_TIMER_REST_SECONDS,
    intervals = DEFAULT_TIMER_INTERVALS,
    onIntervalComplete,
    onAllComplete,
    onPhaseChange,
  } = options;

  const workerRef = useRef<Worker | null>(null);
  const callbacksRef = useRef({ onIntervalComplete, onAllComplete, onPhaseChange });

  // Callbacks aktualisieren ohne Worker neu zu erstellen
  useEffect(() => {
    callbacksRef.current = { onIntervalComplete, onAllComplete, onPhaseChange };
  }, [onIntervalComplete, onAllComplete, onPhaseChange]);

  const [state, setState] = useState<TimerState>({
    phase: 'idle',
    timeRemaining: 0,
    currentInterval: 0,
    totalIntervals: intervals,
    isRunning: false,
  });

  // Worker erstellen
  useEffect(() => {
    const worker = new Worker(
      new URL('@/workers/timer.worker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (event) => {
      const msg = event.data;

      switch (msg.type) {
        case 'tick':
        case 'state':
          setState(msg.state);
          break;
        case 'phase-change':
          callbacksRef.current.onPhaseChange?.(msg.phase, msg.interval);
          break;
        case 'interval-complete':
          callbacksRef.current.onIntervalComplete?.(msg.interval);
          break;
        case 'all-complete':
          callbacksRef.current.onAllComplete?.();
          break;
      }
    };

    // Worker konfigurieren
    worker.postMessage({
      type: 'configure',
      config: { workDuration, restDuration, intervals },
    });

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
    // Nur beim Mounten erstellen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    workerRef.current?.postMessage({ type: 'start' });
  }, []);

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: 'pause' });
  }, []);

  const resume = useCallback(() => {
    workerRef.current?.postMessage({ type: 'resume' });
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ type: 'reset' });
  }, []);

  const configure = useCallback((config: Partial<TimerConfig>) => {
    const fullConfig: TimerConfig = {
      workDuration: config.workDuration ?? workDuration,
      restDuration: config.restDuration ?? restDuration,
      intervals: config.intervals ?? intervals,
    };
    workerRef.current?.postMessage({ type: 'configure', config: fullConfig });
  }, [workDuration, restDuration, intervals]);

  return {
    timeRemaining: Math.ceil(state.timeRemaining / 1000),
    timeRemainingMs: state.timeRemaining,
    phase: state.phase,
    currentInterval: state.currentInterval,
    totalIntervals: state.totalIntervals,
    isRunning: state.isRunning,
    start,
    pause,
    resume,
    reset,
    configure,
    formattedTime: formatTime(state.timeRemaining),
  };
}
