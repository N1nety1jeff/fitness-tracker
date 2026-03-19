import { supabase } from '@/lib/supabase/client';
import type { Exercise, ExerciseInsert } from '@/lib/supabase/types';

export async function getExercises(userId: string): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('user_id', userId)
    .order('is_favorite', { ascending: false })
    .order('muscle_group', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Fehler beim Laden der Übungen:', error);
    return [];
  }
  return data || [];
}

export async function createExercise(
  userId: string,
  data: { name: string; equipment_id?: string; muscle_group?: string; notes?: string; exercise_type?: 'reps' | 'time'; target_muscles?: string; instructions?: string; common_mistakes?: string }
): Promise<Exercise | null> {
  const insert: ExerciseInsert = {
    user_id: userId,
    name: data.name,
    equipment_id: data.equipment_id || null,
    muscle_group: data.muscle_group || null,
    notes: data.notes || null,
    exercise_type: data.exercise_type || 'reps',
    target_muscles: data.target_muscles || null,
    instructions: data.instructions || null,
    common_mistakes: data.common_mistakes || null,
  };

  const { data: result, error } = await supabase
    .from('exercises')
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error('Fehler beim Erstellen der Übung:', error);
    return null;
  }
  return result;
}

export async function updateExercise(
  id: string,
  updates: { name?: string; equipment_id?: string | null; muscle_group?: string | null; notes?: string | null; is_favorite?: boolean; exercise_type?: 'reps' | 'time'; target_muscles?: string | null; instructions?: string | null; common_mistakes?: string | null }
): Promise<boolean> {
  const { error } = await supabase
    .from('exercises')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Fehler beim Aktualisieren der Übung:', error);
    return false;
  }
  return true;
}

export async function toggleFavorite(id: string, currentValue: boolean): Promise<boolean> {
  return updateExercise(id, { is_favorite: !currentValue });
}

export async function deleteExercise(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('exercises')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Fehler beim Löschen der Übung:', error);
    return false;
  }
  return true;
}
