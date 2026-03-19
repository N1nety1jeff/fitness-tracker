'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  History,
  Plus,
  Minus,
  MessageSquare,
  List,
  Timer,
  Link2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTimer } from '@/hooks/use-timer';
import { useWorkoutStore } from '@/stores/workout-store';
import { logSet, completeWorkout } from '@/lib/services/workout.service';
import BottomNav from '@/components/bottom-nav';

function formatDuration(startIso: string): string {
  const diff = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function WorkoutPage() {
  const router = useRouter();
  const {
    exercises,
    currentExerciseIndex,
    nextExercise,
    previousExercise,
    setCurrentExercise,
    addSet,
    isActive,
    activeWorkout,
    endWorkout,
  } = useWorkoutStore();

  const currentExercise = exercises[currentExerciseIndex];

  const [weight, setWeight] = useState(85);
  const [reps, setReps] = useState(8);
  const [notes, setNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [duration, setDuration] = useState('00:00');
  const [showOverview, setShowOverview] = useState(false);
  const overviewRef = useRef<HTMLDivElement>(null);

  // Zeitbasierte Übung: Countdown
  const [exerciseTimeLeft, setExerciseTimeLeft] = useState(0);
  const [exerciseTimerRunning, setExerciseTimerRunning] = useState(false);
  const exerciseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTimeBased = currentExercise?.target_duration_seconds != null && currentExercise.target_duration_seconds > 0;

  // Supersatz-Erkennung
  const getSupersatPartners = (index: number): number[] => {
    const ex = exercises[index];
    if (!ex?.superset_group) return [index];
    const partners: number[] = [];
    for (let i = 0; i < exercises.length; i++) {
      if (exercises[i].superset_group === ex.superset_group) partners.push(i);
    }
    return partners;
  };

  const supersatIndices = currentExercise ? getSupersatPartners(currentExerciseIndex) : [];
  const isInSuperset = supersatIndices.length > 1;

  const timer = useTimer({
    restDuration: currentExercise?.rest_seconds ?? 90,
  });

  // Laufende Uhr
  useEffect(() => {
    if (!activeWorkout?.started_at) return;
    setDuration(formatDuration(activeWorkout.started_at));
    const interval = setInterval(() => {
      setDuration(formatDuration(activeWorkout.started_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout?.started_at]);

  // Eingabewerte + Timer zurücksetzen bei Übungswechsel
  useEffect(() => {
    if (currentExercise) {
      setWeight(currentExercise.target_weight);
      setReps(currentExercise.target_reps);
      setNotes('');
      timer.reset();
      // Exercise timer reset
      setExerciseTimerRunning(false);
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
      setExerciseTimeLeft(currentExercise.target_duration_seconds || 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex]);

  // Exercise countdown timer
  useEffect(() => {
    if (!exerciseTimerRunning || exerciseTimeLeft <= 0) {
      if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current);
      if (exerciseTimerRunning && exerciseTimeLeft <= 0) setExerciseTimerRunning(false);
      return;
    }
    exerciseTimerRef.current = setInterval(() => {
      setExerciseTimeLeft((t: number) => {
        if (t <= 1) {
          setExerciseTimerRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (exerciseTimerRef.current) clearInterval(exerciseTimerRef.current); };
  }, [exerciseTimerRunning, exerciseTimeLeft]);

  // Übersicht schließen wenn außerhalb geklickt
  useEffect(() => {
    if (!showOverview) return;
    const handler = (e: MouseEvent) => {
      if (overviewRef.current && !overviewRef.current.contains(e.target as Node)) {
        setShowOverview(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOverview]);

  const handleLogSet = async () => {
    if (!activeWorkout || !currentExercise) return;
    if (currentExercise.completedSets.length >= currentExercise.target_sets) return;

    try {
      const loggedSet = await logSet({
        workoutId: activeWorkout.id,
        planExerciseId: currentExercise.id,
        setNumber: currentExercise.completedSets.length + 1,
        weight,
        reps,
        rpe: null,
        notes: notes || null,
      });

      if (loggedSet) {
        addSet(currentExercise.id, {
          id: loggedSet.id,
          workout_id: activeWorkout.id,
          plan_exercise_id: currentExercise.id,
          set_number: loggedSet.set_number,
          completed_at: loggedSet.completed_at || new Date().toISOString(),
          created_at: loggedSet.created_at || new Date().toISOString(),
          weight,
          reps: isTimeBased ? 0 : reps,
          rpe: null,
          notes: notes || null,
        });
        setNotes('');

        // Supersatz-Flow: zur nächsten Übung im Supersatz springen, Pause erst nach letzter
        if (isInSuperset) {
          const myPosInSuperset = supersatIndices.indexOf(currentExerciseIndex);
          const nextInSuperset = supersatIndices[myPosInSuperset + 1];
          if (nextInSuperset !== undefined) {
            // Nächste Übung im Supersatz, kein Pause-Timer
            setCurrentExercise(nextInSuperset);
            return;
          }
          // Letzte im Supersatz: zurück zur ersten, Pause starten
          setCurrentExercise(supersatIndices[0]);
        }
        timer.reset();
        timer.start();
      }
    } catch (error) {
      console.error('Fehler beim Speichern des Satzes:', error);
      alert('Satz konnte nicht gespeichert werden!');
    }
  };

  const handleCompleteWorkout = async () => {
    if (!activeWorkout) return;
    setIsCompleting(true);
    await completeWorkout(activeWorkout.id);
    endWorkout();
    router.push('/dashboard');
  };

  if (!isActive || !currentExercise) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-muted-foreground text-sm">Kein aktives Training.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="gym-button bg-primary text-black px-6 py-3 text-sm font-bold uppercase tracking-widest"
        >
          Zum Dashboard
        </button>
      </div>
    );
  }

  const currentSetNumber = currentExercise.completedSets.length + 1;
  const allSetsDone = currentExercise.completedSets.length >= currentExercise.target_sets;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-28 font-sans max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-4 pt-4">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-muted rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {activeWorkout.started_at && (
              <span>Start {formatTime(activeWorkout.started_at)} · </span>
            )}
            <span className="text-primary font-mono">{duration}</span>
          </div>
          <p className="text-base font-black italic uppercase tracking-tight">Einheit {activeWorkout.workout_number}</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowOverview(v => !v)}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground"
            title="Übungsübersicht"
          >
            <List className="w-6 h-6" />
          </button>
          <button
            onClick={handleCompleteWorkout}
            disabled={isCompleting}
            className="p-2 hover:bg-muted rounded-full text-primary disabled:opacity-50"
            title="Training abschließen"
          >
            <CheckCircle2 className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Übungsübersicht (Dropdown) */}
      {showOverview && (
        <div ref={overviewRef} className="glass-card border-white/10 mb-4 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-4 pt-3 pb-2">
            Alle Übungen – tippe zum Springen
          </p>
          <ul>
            {exercises.map((ex, i) => {
              const done = ex.completedSets.length;
              const total = ex.target_sets;
              const isCurrentEx = i === currentExerciseIndex;
              const prevEx = i > 0 ? exercises[i - 1] : null;
              const nextEx = i < exercises.length - 1 ? exercises[i + 1] : null;
              const inSS = ex.superset_group !== null;
              const ssStart = inSS && (!prevEx || prevEx.superset_group !== ex.superset_group);
              const ssEnd = inSS && (!nextEx || nextEx.superset_group !== ex.superset_group);
              return (
                <li key={ex.id} className="relative">
                  {inSS && <div className={`absolute left-0 top-0 bottom-0 w-0.5 bg-purple-500/50 ${ssStart ? 'rounded-t-full mt-1' : ''} ${ssEnd ? 'rounded-b-full mb-1' : ''}`} />}
                  <button
                    onClick={() => { setCurrentExercise(i); setShowOverview(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${inSS ? 'pl-5' : ''} ${
                      isCurrentEx ? 'bg-primary/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <span className={`text-xs font-mono w-4 ${isCurrentEx ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
                    <span className="flex-1 text-sm font-bold truncate">{ex.name}</span>
                    {ex.target_duration_seconds ? (
                      <span className="text-[9px] font-mono text-blue-400 shrink-0 mr-1">{ex.target_duration_seconds}s</span>
                    ) : null}
                    <span className={`text-xs font-mono shrink-0 ${done >= total ? 'text-primary' : 'text-muted-foreground'}`}>
                      {done}/{total}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Exercise Navigation */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={previousExercise}
            className={`p-3 glass-card border-white/5 hover:bg-white/10 transition-colors ${currentExerciseIndex === 0 ? 'opacity-20 pointer-events-none' : ''}`}
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-2xl font-black italic uppercase tracking-tight leading-tight text-center flex-1 px-4">
            {currentExercise.name}
          </h2>
          <button
            onClick={nextExercise}
            className={`p-3 glass-card border-white/5 hover:bg-white/10 transition-colors ${currentExerciseIndex === exercises.length - 1 ? 'opacity-20 pointer-events-none' : ''}`}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="flex justify-center gap-2 text-sm flex-wrap">
          <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full font-bold border border-primary/20 text-xs tracking-wide">
            Ziel: {currentExercise.target_sets}×{isTimeBased ? `${currentExercise.target_duration_seconds}s` : currentExercise.target_reps}
            {currentExercise.target_weight > 0 ? ` @ ${currentExercise.target_weight}kg` : ''}
          </span>
          {isTimeBased && (
            <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-full font-bold border border-blue-500/20 text-xs tracking-wide flex items-center gap-1">
              <Timer className="w-3 h-3" /> Zeitbasiert
            </span>
          )}
          {isInSuperset && (
            <span className="bg-purple-500/10 text-purple-400 px-3 py-1.5 rounded-full font-bold border border-purple-500/20 text-xs tracking-wide flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Supersatz
            </span>
          )}
        </div>
      </section>

      {/* Letzte Einheit */}
      <section className="glass-card p-5 mb-6 border-primary/5">
        <div className="flex items-center gap-2 mb-4 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
          <History className="w-3 h-3" /> Letzte Einheit
        </div>
        <div className="grid grid-cols-3 gap-4">
          {currentExercise.previousSets.map((set, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Satz {i + 1}</p>
              <p className="font-mono text-sm">{set.weight}kg × {set.reps}</p>
            </div>
          ))}
          {currentExercise.previousSets.length === 0 && (
            <div className="col-span-3 text-center py-2 text-xs text-muted-foreground italic">Keine Daten verfügbar</div>
          )}
        </div>
      </section>

      {/* Logger */}
      <section className="space-y-6">
        {/* Satz & Timer */}
        <div className="flex justify-center items-center gap-10 py-6">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Satz</div>
            <div className={`text-5xl font-black ${allSetsDone ? 'text-primary' : 'text-white'}`}>
              {allSetsDone ? '✓' : currentSetNumber}
              {!allSetsDone && <span className="text-xl text-muted-foreground"> / {currentExercise.target_sets}</span>}
            </div>
          </div>
          <div className="h-16 w-px bg-white/10" />
          <div className="text-center cursor-pointer group" onClick={timer.isRunning ? timer.pause : timer.resume}>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Pause</div>
            <div className={`text-4xl font-mono font-black transition-colors ${timer.isRunning ? 'text-primary' : 'text-muted-foreground'}`}>
              {timer.formattedTime}
            </div>
            <div className="flex justify-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {timer.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <RotateCcw className="w-3 h-3" onClick={(e: React.MouseEvent) => { e.stopPropagation(); timer.reset(); }} />
            </div>
          </div>
        </div>

        {/* Gewicht (nur wenn > 0 oder rep-basiert) */}
        {(currentExercise.target_weight > 0 || !isTimeBased) && (
          <div className="glass-card p-5 flex items-center justify-between border-white/5">
            <button onClick={() => setWeight((w: number) => Math.max(0, w - 2.5))} className="gym-button bg-muted text-white">
              <Minus className="w-7 h-7" />
            </button>
            <div className="text-center">
              <span className="text-5xl font-black tracking-tighter">{weight}</span>
              <span className="text-muted-foreground ml-1 font-bold text-lg">kg</span>
            </div>
            <button onClick={() => setWeight((w: number) => w + 2.5)} className="gym-button bg-muted text-white">
              <Plus className="w-7 h-7" />
            </button>
          </div>
        )}

        {isTimeBased ? (
          /* Zeitbasiert: Countdown */
          <div className="glass-card p-5 border-white/5">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">Übungstimer</div>
              <div className={`text-6xl font-mono font-black mb-4 ${exerciseTimeLeft === 0 && exerciseTimerRunning === false && currentExercise.target_duration_seconds ? 'text-primary' : exerciseTimerRunning ? 'text-blue-400' : 'text-white'}`}>
                {Math.floor(exerciseTimeLeft / 60)}:{(exerciseTimeLeft % 60).toString().padStart(2, '0')}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    if (exerciseTimerRunning) {
                      setExerciseTimerRunning(false);
                    } else {
                      if (exerciseTimeLeft === 0) setExerciseTimeLeft(currentExercise.target_duration_seconds || 60);
                      setExerciseTimerRunning(true);
                    }
                  }}
                  className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest ${exerciseTimerRunning ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}
                >
                  {exerciseTimerRunning ? 'Stop' : exerciseTimeLeft === 0 ? 'Neustart' : 'Start'}
                </button>
                <button
                  onClick={() => { setExerciseTimerRunning(false); setExerciseTimeLeft(currentExercise.target_duration_seconds || 60); }}
                  className="px-4 py-3 rounded-xl bg-white/5 text-muted-foreground"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Rep-basiert */
          <div className="glass-card p-5 flex items-center justify-between border-white/5">
            <button onClick={() => setReps((r: number) => Math.max(0, r - 1))} className="gym-button bg-muted text-white">
              <Minus className="w-7 h-7" />
            </button>
            <div className="text-center">
              <span className="text-5xl font-black tracking-tighter">{reps}</span>
              <span className="text-muted-foreground ml-1 font-bold text-lg">Reps</span>
            </div>
            <button onClick={() => setReps((r: number) => Math.min(50, r + 1))} className="gym-button bg-muted text-white">
              <Plus className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* Notizen */}
        <div className="glass-card p-5 border-white/5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">
            <MessageSquare className="w-3 h-3" /> Notizen zum Satz
          </div>
          <textarea
            value={notes}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder="z.B. Fokus auf Tiefe..."
            className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-sm focus:outline-none focus:border-primary/50 transition-colors min-h-[80px] resize-none"
          />
        </div>

        {/* Satz loggen */}
        <button
          onClick={handleLogSet}
          disabled={allSetsDone}
          className="w-full gym-button bg-primary text-black electric-glow flex items-center justify-center gap-3 mt-6 py-6 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Play className="w-6 h-6 fill-current" />
          <span className="text-xl font-black tracking-tight">
            {allSetsDone ? 'ALLE SÄTZE ERLEDIGT' : 'SATZ LOGGEN'}
          </span>
        </button>
      </section>

      <BottomNav />
    </div>
  );
}
