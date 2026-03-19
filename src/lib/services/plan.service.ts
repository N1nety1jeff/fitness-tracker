// ============================================
// PlanService
// CRUD-Operationen für Trainingspläne & Übungen
// ============================================

import { supabase } from '@/lib/supabase/client';
import type {
  Plan,
  PlanInsert,
  PlanExercise,
  PlanExerciseInsert,
} from '@/lib/supabase/types';

// ---- Typen ----

export interface PlanWithExercises extends Plan {
  plan_exercises: PlanExercise[];
}

// ---- Plan-Funktionen ----

/**
 * Lädt den aktiven Plan eines Benutzers.
 * Es kann immer nur ein Plan aktiv sein.
 */
export async function getActivePlan(
  userId: string
): Promise<PlanWithExercises | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*, plan_exercises(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Fehler beim Laden des aktiven Plans:', error);
    }
    return null;
  }

  // Cast nötig, da die manuellen Typen keine Relationen enthalten
  const result = data as unknown as PlanWithExercises;

  // Übungen nach sort_order sortieren
  if (result?.plan_exercises) {
    result.plan_exercises.sort(
      (a: PlanExercise, b: PlanExercise) => a.sort_order - b.sort_order
    );
  }

  return result;
}

/**
 * Lädt einen Plan mit allen Übungen.
 */
export async function getPlanWithExercises(
  planId: string
): Promise<PlanWithExercises | null> {
  const { data, error } = await supabase
    .from('plans')
    .select('*, plan_exercises(*)')
    .eq('id', planId)
    .single();

  if (error) {
    console.error('Fehler beim Laden des Plans:', error);
    return null;
  }

  const result = data as unknown as PlanWithExercises;

  if (result?.plan_exercises) {
    result.plan_exercises.sort(
      (a: PlanExercise, b: PlanExercise) => a.sort_order - b.sort_order
    );
  }

  return result;
}

/**
 * Lädt alle Pläne eines Benutzers.
 */
export async function getAllPlans(userId: string): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fehler beim Laden der Pläne:', error);
    return [];
  }

  return data || [];
}

/**
 * Erstellt einen neuen Trainingsplan.
 * Deaktiviert zuvor den aktuell aktiven Plan.
 */
export async function createPlan(
  userId: string,
  name: string,
  description?: string,
  cycleLength?: number,
): Promise<Plan | null> {
  // Alle bestehenden Pläne deaktivieren
  await (supabase.from('plans') as any)
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true);

  const insert: PlanInsert = {
    user_id: userId,
    name,
    description: description ?? null,
    cycle_length: cycleLength ?? 20,
    is_active: true,
  };

  const { data, error } = await (supabase.from('plans') as any)
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Erstellen des Plans:', error);
    return null;
  }

  return data;
}

/**
 * Aktualisiert einen Plan.
 */
export async function updatePlan(
  planId: string,
  updates: { name?: string; description?: string | null; cycle_length?: number; is_active?: boolean }
): Promise<boolean> {
  const { error } = await (supabase.from('plans') as any)
    .update(updates)
    .eq('id', planId);

  if (error) {
    console.error('Fehler beim Aktualisieren des Plans:', error);
    return false;
  }

  return true;
}

/**
 * Löscht einen Plan (und alle zugehörigen Übungen via CASCADE).
 */
export async function deletePlan(planId: string): Promise<boolean> {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId);

  if (error) {
    console.error('Fehler beim Löschen des Plans:', error);
    return false;
  }

  return true;
}

// ---- Übung-Funktionen ----

/**
 * Fügt eine Übung zu einem Plan hinzu.
 */
export async function addExerciseToPlan(
  planId: string,
  exercise: Omit<PlanExerciseInsert, 'plan_id'>
): Promise<PlanExercise | null> {
  const insert: PlanExerciseInsert = {
    ...exercise,
    plan_id: planId,
  };

  const { data, error } = await supabase
    .from('plan_exercises')
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Hinzufügen der Übung:', error);
    return null;
  }

  return data;
}

/**
 * Aktualisiert eine Übung.
 */
export async function updateExercise(
  exerciseId: string,
  updates: Partial<Omit<PlanExercise, 'id' | 'plan_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  const { error } = await (supabase.from('plan_exercises') as any)
    .update(updates)
    .eq('id', exerciseId);

  if (error) {
    console.error('Fehler beim Aktualisieren der Übung:', error);
    return false;
  }

  return true;
}

/**
 * Löscht eine Übung aus einem Plan.
 */
export async function deleteExercise(exerciseId: string): Promise<boolean> {
  const { error } = await supabase
    .from('plan_exercises')
    .delete()
    .eq('id', exerciseId);

  if (error) {
    console.error('Fehler beim Löschen der Übung:', error);
    return false;
  }

  return true;
}

/**
 * Aktualisiert die sort_order aller Übungen in einem Plan.
 */
export async function reorderExercises(
  exercises: { id: string; sort_order: number; superset_group: number | null }[]
): Promise<boolean> {
  for (const ex of exercises) {
    const { error } = await (supabase.from('plan_exercises') as any)
      .update({ sort_order: ex.sort_order, superset_group: ex.superset_group })
      .eq('id', ex.id);
    if (error) {
      console.error('Fehler beim Sortieren:', error);
      return false;
    }
  }
  return true;
}
