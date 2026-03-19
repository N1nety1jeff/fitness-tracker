// ============================================
// Workout Store (Zustand)
// State Management für das aktive Workout
// ============================================

import { create } from 'zustand';
import type { Workout, WorkoutSet, PlanExercise } from '@/lib/supabase/types';

// ---- Typen ----

interface ActiveExercise extends PlanExercise {
  /** Bereits geloggte Sätze in der aktuellen Einheit */
  completedSets: WorkoutSet[];
  /** Sätze der letzten Einheit (für Soll-Ist-Vergleich) */
  previousSets: WorkoutSet[];
}

interface WorkoutState {
  // ---- State ----
  /** Das aktive Workout */
  activeWorkout: Workout | null;
  /** Übungen mit aktuellem Stand */
  exercises: ActiveExercise[];
  /** Index der aktuell ausgewählten Übung */
  currentExerciseIndex: number;
  /** Ist ein Workout aktiv? */
  isActive: boolean;

  // ---- Actions ----
  /** Workout starten */
  startWorkout: (workout: Workout, exercises: PlanExercise[], previousSets: WorkoutSet[]) => void;
  /** Workout beenden */
  endWorkout: () => void;
  /** Satz hinzufügen */
  addSet: (exerciseId: string, set: WorkoutSet) => void;
  /** Satz aktualisieren */
  updateSet: (exerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  /** Zu einer Übung navigieren */
  setCurrentExercise: (index: number) => void;
  /** Zur nächsten Übung */
  nextExercise: () => void;
  /** Zur vorherigen Übung */
  previousExercise: () => void;
}

// ---- Store ----

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  activeWorkout: null,
  exercises: [],
  currentExerciseIndex: 0,
  isActive: false,

  startWorkout: (workout, exercises, previousSets) => {
    const activeExercises: ActiveExercise[] = exercises.map((ex) => ({
      ...ex,
      completedSets: [],
      previousSets: previousSets.filter((s) => s.plan_exercise_id === ex.id),
    }));

    set({
      activeWorkout: workout,
      exercises: activeExercises,
      currentExerciseIndex: 0,
      isActive: true,
    });
  },

  endWorkout: () => {
    set({
      activeWorkout: null,
      exercises: [],
      currentExerciseIndex: 0,
      isActive: false,
    });
  },

  addSet: (exerciseId, newSet) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, completedSets: [...ex.completedSets, newSet] }
          : ex
      ),
    }));
  },

  updateSet: (exerciseId, setId, updates) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              completedSets: ex.completedSets.map((s) =>
                s.id === setId ? { ...s, ...updates } : s
              ),
            }
          : ex
      ),
    }));
  },

  setCurrentExercise: (index) => {
    const { exercises } = get();
    if (index >= 0 && index < exercises.length) {
      set({ currentExerciseIndex: index });
    }
  },

  nextExercise: () => {
    const { currentExerciseIndex, exercises } = get();
    if (currentExerciseIndex < exercises.length - 1) {
      set({ currentExerciseIndex: currentExerciseIndex + 1 });
    }
  },

  previousExercise: () => {
    const { currentExerciseIndex } = get();
    if (currentExerciseIndex > 0) {
      set({ currentExerciseIndex: currentExerciseIndex - 1 });
    }
  },
}));
