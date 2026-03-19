// ============================================
// WorkoutService
// CRUD-Operationen für Workouts und Sätze
// ============================================

import { supabase } from '@/lib/supabase/client';
import type {
  Workout,
  WorkoutInsert,
  WorkoutSet,
  WorkoutSetInsert,
} from '@/lib/supabase/types';

// ---- Typen ----

export interface CreateWorkoutResult {
  workout: Workout | null;
  error: string | null;
}

export interface LogSetData {
  workoutId: string;
  planExerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number | null;
  notes?: string | null;
}

// ---- Workout-Funktionen ----

/**
 * Erstellt eine neue Trainingseinheit für einen Plan.
 * Ermittelt automatisch die nächste Einheitennummer im Zyklus.
 */
export async function createWorkout(
  planId: string,
  userId: string
): Promise<CreateWorkoutResult> {
  // Höchste Einheitennummer des Plans ermitteln
  const { data: lastWorkout } = await supabase
    .from('workouts')
    .select('workout_number')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .order('workout_number', { ascending: false })
    .limit(1)
    .single();

  const nextNumber = lastWorkout ? lastWorkout.workout_number + 1 : 1;

  const insert: WorkoutInsert = {
    plan_id: planId,
    user_id: userId,
    workout_number: nextNumber,
    started_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('workouts')
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Erstellen des Workouts:', error);
    return { workout: null, error: error.message };
  }

  return { workout: data, error: null };
}

/**
 * Lädt das letzte abgeschlossene Workout eines Plans.
 * Wird für den Soll-Ist-Vergleich verwendet.
 */
export async function getLastWorkout(
  planId: string,
  userId: string
): Promise<Workout | null> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('workout_number', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // PGRST116 = no rows found, kein Fehler
    if (error.code !== 'PGRST116') {
      console.error('Fehler beim Laden des letzten Workouts:', error);
    }
    return null;
  }

  return data;
}

/**
 * Lädt alle Workouts eines Plans, sortiert nach Einheitennummer.
 */
export async function getWorkoutsByPlan(
  planId: string,
  userId: string
): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .order('workout_number', { ascending: true });

  if (error) {
    console.error('Fehler beim Laden der Workouts:', error);
    return [];
  }

  return data || [];
}

/**
 * Markiert ein Workout als abgeschlossen.
 */
export async function completeWorkout(workoutId: string): Promise<boolean> {
  const { error } = await supabase
    .from('workouts')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', workoutId);

  if (error) {
    console.error('Fehler beim Abschließen des Workouts:', error);
    return false;
  }

  return true;
}

// ---- Set-Funktionen ----

/**
 * Speichert einen einzelnen Satz.
 */
export async function logSet(data: LogSetData): Promise<WorkoutSet | null> {
  const insert: WorkoutSetInsert = {
    workout_id: data.workoutId,
    plan_exercise_id: data.planExerciseId,
    set_number: data.setNumber,
    weight: data.weight,
    reps: data.reps,
    rpe: data.rpe ?? null,
    notes: data.notes ?? null,
    completed_at: new Date().toISOString(),
  };

  const { data: result, error } = await supabase
    .from('workout_sets')
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Speichern des Satzes:', error);
    return null;
  }

  return result;
}

/**
 * Aktualisiert einen bestehenden Satz.
 */
export async function updateSet(
  setId: string,
  updates: { weight?: number; reps?: number; rpe?: number | null; notes?: string | null }
): Promise<boolean> {
  const { error } = await supabase
    .from('workout_sets')
    .update(updates)
    .eq('id', setId);

  if (error) {
    console.error('Fehler beim Aktualisieren des Satzes:', error);
    return false;
  }

  return true;
}

/**
 * Lädt alle Sätze eines Workouts, gruppiert nach Übung.
 */
export async function getWorkoutSets(
  workoutId: string
): Promise<WorkoutSet[]> {
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('workout_id', workoutId)
    .order('set_number', { ascending: true });

  if (error) {
    console.error('Fehler beim Laden der Sätze:', error);
    return [];
  }

  return data || [];
}

/**
 * Löscht einen Satz.
 */
export async function deleteSet(setId: string): Promise<boolean> {
  const { error } = await supabase
    .from('workout_sets')
    .delete()
    .eq('id', setId);

  if (error) {
    console.error('Fehler beim Löschen des Satzes:', error);
    return false;
  }

  return true;
}
