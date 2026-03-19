'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  History,
  Plus,
  Minus,
  MessageSquare
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTimer } from '@/hooks/use-timer';
import { useWorkoutStore } from '@/stores/workout-store';
import { logSet, completeWorkout } from '@/lib/services/workout.service';

export default function WorkoutPage() {
  const router = useRouter();
  const {
    exercises,
    currentExerciseIndex,
    nextExercise,
    previousExercise,
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

  const timer = useTimer({
    restDuration: currentExercise?.rest_seconds ?? 90,
  });

  // Eingabewerte aktualisieren + Timer zurücksetzen wenn Übung wechselt
  useEffect(() => {
    if (currentExercise) {
      setWeight(currentExercise.target_weight);
      setReps(currentExercise.target_reps);
      setNotes('');
      timer.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExerciseIndex]);

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
          reps,
          rpe: null,
          notes: notes || null,
        });

        timer.reset();
        timer.start();
        setNotes('');
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
  const setsRemaining = currentExercise.target_sets - currentExercise.completedSets.length;
  const allSetsDone = setsRemaining <= 0;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24 font-sans max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-4">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-muted rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-xs font-bold uppercase tracking-widest text-muted-foreground underline decoration-primary/50 underline-offset-4">
            Einheit {activeWorkout.workout_number}
          </h1>
          <p className="text-lg font-black italic uppercase tracking-tight">Training</p>
        </div>
        <button
          onClick={handleCompleteWorkout}
          disabled={isCompleting}
          className="p-2 hover:bg-muted rounded-full text-primary disabled:opacity-50"
          title="Training abschließen"
        >
          <CheckCircle2 className="w-6 h-6" />
        </button>
      </header>

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

        <div className="flex justify-center gap-4 text-sm">
          <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full font-bold border border-primary/20 text-xs tracking-wide">
            Ziel: {currentExercise.target_sets}x{currentExercise.target_reps} @ {currentExercise.target_weight}kg
          </span>
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
              <p className="font-mono text-sm">{set.weight}kg x {set.reps}</p>
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
            {allSetsDone && (
              <div className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Fertig</div>
            )}
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

        {/* Gewicht */}
        <div className="glass-card p-5 flex items-center justify-between border-white/5">
          <button onClick={() => setWeight(w => Math.max(0, w - 2.5))} className="gym-button bg-muted text-white">
            <Minus className="w-7 h-7" />
          </button>
          <div className="text-center">
            <span className="text-5xl font-black tracking-tighter">{weight}</span>
            <span className="text-muted-foreground ml-1 font-bold text-lg">kg</span>
          </div>
          <button onClick={() => setWeight(w => w + 2.5)} className="gym-button bg-muted text-white">
            <Plus className="w-7 h-7" />
          </button>
        </div>

        {/* Reps */}
        <div className="glass-card p-5 flex items-center justify-between border-white/5">
          <button onClick={() => setReps(r => Math.max(0, r - 1))} className="gym-button bg-muted text-white">
            <Minus className="w-7 h-7" />
          </button>
          <div className="text-center">
            <span className="text-5xl font-black tracking-tighter">{reps}</span>
            <span className="text-muted-foreground ml-1 font-bold text-lg">Reps</span>
          </div>
          <button onClick={() => setReps(r => Math.min(50, r + 1))} className="gym-button bg-muted text-white">
            <Plus className="w-7 h-7" />
          </button>
        </div>

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

      {/* Navigation Footer */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent pt-10">
        <div className="glass-card flex justify-around p-4 border-white/10 shadow-2xl">
          <button className="flex flex-col items-center gap-1 text-primary">
            <History className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Training</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground">
            <Clock className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">History</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-muted-foreground">
            <Plus className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Plan</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
