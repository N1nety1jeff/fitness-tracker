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
import { useTimer } from '@/hooks/use-timer';
import { useWorkoutStore } from '@/stores/workout-store';

// ---- Mock Data ----

const MOCK_EXERCISE = {
  id: 'ex1',
  name: 'Bankdrücken (Flachbank)',
  target_sets: 3,
  target_reps: 8,
  target_weight: 85,
  rest_seconds: 90, // 1:30 min
  previous_sets: [
    { weight: 82.5, reps: 8, rpe: 8 },
    { weight: 82.5, reps: 8, rpe: 8.5 },
    { weight: 82.5, reps: 7, rpe: 10 },
  ],
  notes: 'Fokus auf langsame Exzentrik.'
};

export default function WorkoutPage() {
  const { 
    exercises, 
    currentExerciseIndex, 
    nextExercise, 
    previousExercise,
    addSet,
    isActive,
    startWorkout
  } = useWorkoutStore();

  // Aktuelle Übung aus dem Store
  const currentExercise = exercises[currentExerciseIndex];

  // Local UI State (für die Eingabe im Formular)
  const [weight, setWeight] = useState(85);
  const [reps, setReps] = useState(8);
  const [rpe, setRpe] = useState<number | null>(8);
  const [notes, setNotes] = useState('');

  // Timer Hook
  const timer = useTimer({
    restDuration: currentExercise?.rest_seconds || 90,
  });

  // Demo-Initialisierung falls kein Workout aktiv
  useEffect(() => {
    if (!isActive) {
      // Mock-Daten in den Store laden für "Greifbarkeit"
      startWorkout(
        { id: 'w1', plan_id: 'p1', user_id: 'u1', workout_number: 12, started_at: new Date().toISOString(), completed_at: null, notes: null, created_at: new Date().toISOString() },
        [
          { id: 'ex1', plan_id: 'p1', name: 'Bankdrücken (Flachbank)', target_sets: 3, target_reps: 8, target_weight: 85, rest_seconds: 90, progression_increment: 2.5, progression_threshold: 10, sort_order: 1, notes: 'Brustfokus', created_at: '', updated_at: '' },
          { id: 'ex2', plan_id: 'p1', name: 'Schrägbankdrücken (KH)', target_sets: 3, target_reps: 10, target_weight: 30, rest_seconds: 60, progression_increment: 2, progression_threshold: 10, sort_order: 2, notes: 'Obere Brust', created_at: '', updated_at: '' }
        ],
        [
          { id: 's1', workout_id: 'w0', plan_exercise_id: 'ex1', set_number: 1, weight: 82.5, reps: 8, rpe: 8, notes: null, completed_at: '', created_at: '' },
          { id: 's2', workout_id: 'w0', plan_exercise_id: 'ex1', set_number: 2, weight: 82.5, reps: 8, rpe: 8.5, notes: null, completed_at: '', created_at: '' },
          { id: 's3', workout_id: 'w0', plan_exercise_id: 'ex1', set_number: 3, weight: 82.5, reps: 7, rpe: 10, notes: null, completed_at: '', created_at: '' }
        ]
      );
    }
  }, [isActive, startWorkout]);

  // Eingabewerte aktualisieren wenn Übung wechselt
  useEffect(() => {
    if (currentExercise) {
      setWeight(currentExercise.target_weight);
      setReps(currentExercise.target_reps);
    }
  }, [currentExerciseIndex, currentExercise]);

  const handleLogSet = () => {
    if (!currentExercise) return;

    const newSet = {
      id: Math.random().toString(36).substr(2, 9),
      workout_id: 'w1',
      plan_exercise_id: currentExercise.id,
      set_number: currentExercise.completedSets.length + 1,
      weight,
      reps,
      rpe,
      notes: notes || null,
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    addSet(currentExercise.id, newSet);
    
    // UI Reset für den nächsten Satz (optional, Notizen behalten falls gewünscht)
    setNotes('');
    
    // Timer starten
    timer.reset();
    timer.start();
  };

  if (!currentExercise) return <div className="p-8 text-center">Lade Training...</div>;

  const currentSetNumber = currentExercise.completedSets.length + 1;

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24 font-sans max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-4">
        <button className="p-2 hover:bg-muted rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h1 className="text-xs font-bold uppercase tracking-widest text-muted-foreground underline decoration-primary/50 underline-offset-4">Einheit 12 / 20</h1>
          <p className="text-lg font-black italic uppercase tracking-tight">Push Day A</p>
        </div>
        <button className="p-2 hover:bg-muted rounded-full text-primary">
          <CheckCircle2 className="w-6 h-6" />
        </button>
      </header>

      {/* Exercise Info & Navigation */}
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

      {/* Soll-Ist-Vergleich */}
      <section className="glass-card p-5 mb-6 border-primary/5">
        <div className="flex items-center gap-2 mb-4 text-muted-foreground uppercase text-[10px] font-bold tracking-widest">
          <History className="w-3 h-3" /> Letzte Einheit (Soll)
        </div>
        <div className="grid grid-cols-3 gap-4">
          {currentExercise.previousSets.map((set, i) => (
            <div key={i} className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Satz {i+1}</p>
              <p className="font-mono text-sm">{set.weight}kg x {set.reps}</p>
              <p className="text-[10px] text-primary font-bold">RPE {set.rpe}</p>
            </div>
          ))}
          {currentExercise.previousSets.length === 0 && (
            <div className="col-span-3 text-center py-2 text-xs text-muted-foreground italic">Keine Daten verfügbar</div>
          )}
        </div>
      </section>

      {/* Logger Area */}
      <section className="space-y-6">
        <div className="flex justify-center items-center gap-10 py-6">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Satz</div>
            <div className="text-5xl font-black text-white">
              {currentSetNumber} <span className="text-xl text-muted-foreground">/ {currentExercise.target_sets}</span>
            </div>
          </div>
          <div className="h-16 w-px bg-white/10" />
          <div className="text-center cursor-pointer group" onClick={timer.isRunning ? timer.pause : timer.resume}>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Rest</div>
            <div className={`text-4xl font-mono font-black transition-colors ${timer.isRunning ? 'text-primary' : 'text-muted-foreground'}`}>
              {timer.formattedTime}
            </div>
            <div className="flex justify-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {timer.isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <RotateCcw className="w-3 h-3" onClick={(e) => { e.stopPropagation(); timer.reset(); }} />
            </div>
          </div>
        </div>

        {/* Input Controls */}
        <div className="space-y-4">
          <div className="glass-card p-5 flex items-center justify-between border-white/5">
            <button onClick={() => setWeight(weight - 2.5)} className="gym-button bg-muted text-white">
              <Minus className="w-7 h-7" />
            </button>
            <div className="text-center">
              <span className="text-5xl font-black tracking-tighter">{weight}</span>
              <span className="text-muted-foreground ml-1 font-bold text-lg">kg</span>
            </div>
            <button onClick={() => setWeight(weight + 2.5)} className="gym-button bg-muted text-white">
              <Plus className="w-7 h-7" />
            </button>
          </div>

          <div className="glass-card p-5 flex items-center justify-between border-white/5">
            <button onClick={() => setReps(reps - 1)} className="gym-button bg-muted text-white">
              <Plus className="w-7 h-7" />
            </button>
            <div className="text-center">
              <span className="text-5xl font-black tracking-tighter">{reps}</span>
              <span className="text-muted-foreground ml-1 font-bold text-lg">Reps</span>
            </div>
            <button onClick={() => setReps(reps + 1)} className="gym-button bg-muted text-white">
              <Plus className="w-7 h-7" />
            </button>
          </div>
        </div>

        {/* RPE & Notes */}
        <div className="space-y-4">
          <div className="glass-card p-5 border-white/5">
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">Anstrengung (RPE)</div>
            <div className="flex justify-between gap-1">
              {[6, 7, 8, 8.5, 9, 9.5, 10].map((val) => (
                <button
                  key={val}
                  onClick={() => setRpe(val)}
                  className={`flex-1 py-3 rounded-lg font-mono font-bold text-sm transition-all border ${
                    rpe === val 
                      ? 'bg-primary text-black border-primary electric-glow' 
                      : 'bg-white/5 text-muted-foreground border-white/5'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-3">
              <MessageSquare className="w-3 h-3" /> Notizen zum Satz
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="z.B. Fokus auf Tiefe..."
              className="w-full bg-white/5 border border-white/5 rounded-lg p-3 text-sm focus:outline-none focus:border-primary/50 transition-colors min-h-[80px] resize-none"
            />
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={handleLogSet}
          className="w-full gym-button bg-primary text-black electric-glow flex items-center justify-center gap-3 mt-6 py-6"
        >
          <Play className="w-6 h-6 fill-current" />
          <span className="text-xl font-black tracking-tight">SATZ LOGGEN</span>
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

