// ============================================
// ProgressionService
// Logik für automatische Gewichtserhöhung
// ============================================

import { supabase } from '@/lib/supabase/client';
import type { PlanExercise, WorkoutSet } from '@/lib/supabase/types';

// ---- Typen ----

export interface ProgressionSuggestion {
  exerciseId: string;
  exerciseName: string;
  currentWeight: number;
  suggestedWeight: number;
  increment: number;
  currentWorkoutNumber: number;
  threshold: number;
  /** true = Schwelle erreicht, Progression empfohlen */
  shouldProgress: boolean;
}

export interface ExercisePerformance {
  exerciseId: string;
  exerciseName: string;
  targetWeight: number;
  targetReps: number;
  targetSets: number;
  /** Letzte tatsächliche Sätze */
  lastSets: WorkoutSet[];
  /** Durchschnittlicher RPE der letzten Einheit */
  averageRpe: number | null;
}

// ---- Kern-Logik (reine Funktionen, testbar) ----

/**
 * Prüft, ob die Schwelle für eine Progression erreicht ist.
 * @param workoutNumber Aktuelle Einheitennummer im Zyklus
 * @param threshold Ab welcher Einheit Progression startet (Standard: 10)
 * @returns true wenn workout_number >= threshold
 */
export function checkProgression(
  workoutNumber: number,
  threshold: number
): boolean {
  return workoutNumber >= threshold;
}

/**
 * Berechnet das neue Zielgewicht nach Progression.
 * @param currentWeight Aktuelles Zielgewicht in kg
 * @param increment Gewichts-Schritt in kg (z.B. 2.5)
 * @returns Neues Zielgewicht
 */
export function calculateNewTarget(
  currentWeight: number,
  increment: number
): number {
  return Math.round((currentWeight + increment) * 100) / 100;
}

/**
 * Bewertet die Performance einer Übung anhand der letzten Einheit.
 * Gibt zurück, ob Progression sinnvoll ist (alle Sätze im Zielbereich).
 */
export function evaluatePerformance(
  targetReps: number,
  targetSets: number,
  actualSets: { reps: number; rpe: number | null }[]
): {
  allSetsCompleted: boolean;
  allRepsHit: boolean;
  averageRpe: number | null;
  recommendation: 'progress' | 'maintain' | 'deload';
} {
  const allSetsCompleted = actualSets.length >= targetSets;
  const allRepsHit = actualSets.every((s) => s.reps >= targetReps);

  const rpeValues = actualSets
    .map((s) => s.rpe)
    .filter((r): r is number => r !== null);
  const averageRpe =
    rpeValues.length > 0
      ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10
      : null;

  // Logik: Progression wenn alle Sätze/Reps getroffen UND RPE ≤ 8
  if (allSetsCompleted && allRepsHit && (averageRpe === null || averageRpe <= 8)) {
    return { allSetsCompleted, allRepsHit, averageRpe, recommendation: 'progress' };
  }

  // Deload wenn RPE > 9.5 oder weniger als die Hälfte der Reps geschafft
  if (
    (averageRpe !== null && averageRpe > 9.5) ||
    actualSets.some((s) => s.reps < targetReps * 0.5)
  ) {
    return { allSetsCompleted, allRepsHit, averageRpe, recommendation: 'deload' };
  }

  return { allSetsCompleted, allRepsHit, averageRpe, recommendation: 'maintain' };
}

// ---- Supabase-Funktionen ----

/**
 * Gibt Progressions-Vorschläge für alle Übungen eines Plans zurück.
 * Berücksichtigt die aktuelle Einheitennummer und die letzte Performance.
 */
export async function getProgressionSuggestions(
  planId: string,
  currentWorkoutNumber: number
): Promise<ProgressionSuggestion[]> {
  // 1. Alle Übungen des Plans laden
  const { data: exercises, error: exError } = await supabase
    .from('plan_exercises')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: true });

  if (exError || !exercises) {
    console.error('Fehler beim Laden der Übungen:', exError);
    return [];
  }

  // 2. Für jede Übung prüfen
  const suggestions: ProgressionSuggestion[] = exercises.map(
    (exercise: PlanExercise) => {
      const shouldProgress = checkProgression(
        currentWorkoutNumber,
        exercise.progression_threshold
      );

      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        currentWeight: exercise.target_weight,
        suggestedWeight: shouldProgress
          ? calculateNewTarget(exercise.target_weight, exercise.progression_increment)
          : exercise.target_weight,
        increment: exercise.progression_increment,
        currentWorkoutNumber,
        threshold: exercise.progression_threshold,
        shouldProgress,
      };
    }
  );

  return suggestions;
}

/**
 * Wendet eine Progression an: Aktualisiert das Zielgewicht der Übung.
 */
export async function applyProgression(
  exerciseId: string,
  newWeight: number
): Promise<boolean> {
  const { error } = await supabase
    .from('plan_exercises')
    .update({ target_weight: newWeight })
    .eq('id', exerciseId);

  if (error) {
    console.error('Fehler beim Anwenden der Progression:', error);
    return false;
  }

  return true;
}

/**
 * Lädt die Performance-Daten der letzten Einheit für alle Übungen eines Plans.
 * Ermöglicht den Soll-Ist-Vergleich.
 */
export async function getLastPerformance(
  planId: string,
  userId: string
): Promise<ExercisePerformance[]> {
  // Letztes abgeschlossenes Workout des Plans laden
  const { data: lastWorkout, error: wError } = await supabase
    .from('workouts')
    .select('id')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('workout_number', { ascending: false })
    .limit(1)
    .single();

  if (wError || !lastWorkout) {
    return [];
  }

  // Alle Übungen des Plans + Sets des letzten Workouts
  const { data: exercises } = await supabase
    .from('plan_exercises')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order', { ascending: true });

  if (!exercises) return [];

  const { data: sets } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('workout_id', lastWorkout.id)
    .order('set_number', { ascending: true });

  return exercises.map((ex: PlanExercise) => {
    const exerciseSets = (sets || []).filter(
      (s: WorkoutSet) => s.plan_exercise_id === ex.id
    );
    const rpeValues = exerciseSets
      .map((s: WorkoutSet) => s.rpe)
      .filter((r): r is number => r !== null);

    return {
      exerciseId: ex.id,
      exerciseName: ex.name,
      targetWeight: ex.target_weight,
      targetReps: ex.target_reps,
      targetSets: ex.target_sets,
      lastSets: exerciseSets,
      averageRpe:
        rpeValues.length > 0
          ? Math.round(
              (rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10
            ) / 10
          : null,
    };
  });
}
