// ============================================
// Supabase Database Types
// Diese Typen spiegeln das SQL-Schema wider.
// Kann später durch `supabase gen types` automatisch generiert werden.
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          updated_at?: string;
        };
      };
      plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          cycle_length: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          cycle_length?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          cycle_length?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      plan_exercises: {
        Row: {
          id: string;
          plan_id: string;
          name: string;
          target_sets: number;
          target_reps: number;
          target_weight: number;
          rest_seconds: number;
          progression_increment: number;
          progression_threshold: number;
          sort_order: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          name: string;
          target_sets?: number;
          target_reps?: number;
          target_weight?: number;
          rest_seconds?: number;
          progression_increment?: number;
          progression_threshold?: number;
          sort_order?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          target_sets?: number;
          target_reps?: number;
          target_weight?: number;
          rest_seconds?: number;
          progression_increment?: number;
          progression_threshold?: number;
          sort_order?: number;
          notes?: string | null;
          updated_at?: string;
        };
      };
      workouts: {
        Row: {
          id: string;
          plan_id: string;
          user_id: string;
          workout_number: number;
          started_at: string;
          completed_at: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          user_id: string;
          workout_number: number;
          started_at?: string;
          completed_at?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          workout_number?: number;
          completed_at?: string | null;
          notes?: string | null;
        };
      };
      workout_sets: {
        Row: {
          id: string;
          workout_id: string;
          plan_exercise_id: string;
          set_number: number;
          weight: number;
          reps: number;
          rpe: number | null;
          notes: string | null;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          plan_exercise_id: string;
          set_number: number;
          weight?: number;
          reps?: number;
          rpe?: number | null;
          notes?: string | null;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          set_number?: number;
          weight?: number;
          reps?: number;
          rpe?: number | null;
          notes?: string | null;
        };
      };
    };
  };
}

// ============================================
// Convenience Type Aliases
// ============================================
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Plan = Database['public']['Tables']['plans']['Row'];
export type PlanExercise = Database['public']['Tables']['plan_exercises']['Row'];
export type Workout = Database['public']['Tables']['workouts']['Row'];
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];

export type PlanInsert = Database['public']['Tables']['plans']['Insert'];
export type PlanExerciseInsert = Database['public']['Tables']['plan_exercises']['Insert'];
export type WorkoutInsert = Database['public']['Tables']['workouts']['Insert'];
export type WorkoutSetInsert = Database['public']['Tables']['workout_sets']['Insert'];
