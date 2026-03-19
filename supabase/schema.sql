-- ============================================
-- Fitness Zyklus-Tracker — Supabase SQL Schema
-- ============================================

-- 1. Benutzerprofile (erweitert Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Trainingspläne
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cycle_length INT NOT NULL DEFAULT 20,       -- Anzahl Einheiten im Zyklus
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Übungen innerhalb eines Plans (Soll-Werte)
CREATE TABLE IF NOT EXISTS plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- z.B. "Bankdrücken"
  target_sets INT NOT NULL DEFAULT 3,          -- Soll-Sätze
  target_reps INT NOT NULL DEFAULT 8,          -- Soll-Wiederholungen
  target_weight NUMERIC(6,2) NOT NULL DEFAULT 0, -- Soll-Gewicht (kg)
  rest_seconds INT NOT NULL DEFAULT 120,       -- Pause zwischen Sätzen (Sek)
  progression_increment NUMERIC(4,2) NOT NULL DEFAULT 2.5, -- Gewichts-Schritt (kg)
  progression_threshold INT NOT NULL DEFAULT 10, -- Ab welcher Einheit Progression
  sort_order INT NOT NULL DEFAULT 0,           -- Reihenfolge der Übungen
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Einzelne Trainingseinheiten
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_number INT NOT NULL,                 -- Fortlaufende Nummer im Zyklus (1..cycle_length)
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Konkrete Sätze pro Workout + Übung
CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  plan_exercise_id UUID NOT NULL REFERENCES plan_exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,                     -- Satz-Nummer (1, 2, 3, ...)
  weight NUMERIC(6,2) NOT NULL DEFAULT 0,      -- Tatsächliches Gewicht (kg)
  reps INT NOT NULL DEFAULT 0,                 -- Tatsächliche Wiederholungen
  rpe NUMERIC(3,1) CHECK (rpe >= 1 AND rpe <= 10), -- Rate of Perceived Exertion (1-10, 0.5 Schritte)
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indizes für häufige Abfragen
-- ============================================
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_id ON plan_exercises(plan_id);
CREATE INDEX IF NOT EXISTS idx_workouts_plan_id ON workouts(plan_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_number ON workouts(plan_id, workout_number);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_id ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_exercise ON workout_sets(plan_exercise_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Profiles: Benutzer sehen und bearbeiten nur ihr eigenes Profil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Plans: Benutzer sehen und bearbeiten nur eigene Pläne
CREATE POLICY "Users can view own plans"
  ON plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans"
  ON plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans"
  ON plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans"
  ON plans FOR DELETE USING (auth.uid() = user_id);

-- Plan Exercises: Zugriff über den Plan (Benutzer-Check)
CREATE POLICY "Users can view own plan exercises"
  ON plan_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_exercises.plan_id AND plans.user_id = auth.uid()));
CREATE POLICY "Users can insert own plan exercises"
  ON plan_exercises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_exercises.plan_id AND plans.user_id = auth.uid()));
CREATE POLICY "Users can update own plan exercises"
  ON plan_exercises FOR UPDATE
  USING (EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_exercises.plan_id AND plans.user_id = auth.uid()));
CREATE POLICY "Users can delete own plan exercises"
  ON plan_exercises FOR DELETE
  USING (EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_exercises.plan_id AND plans.user_id = auth.uid()));

-- Workouts: Benutzer sehen und bearbeiten nur eigene Workouts
CREATE POLICY "Users can view own workouts"
  ON workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workouts"
  ON workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workouts"
  ON workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workouts"
  ON workouts FOR DELETE USING (auth.uid() = user_id);

-- Workout Sets: Zugriff über das Workout (Benutzer-Check)
CREATE POLICY "Users can view own workout sets"
  ON workout_sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY "Users can insert own workout sets"
  ON workout_sets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY "Users can update own workout sets"
  ON workout_sets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid()));
CREATE POLICY "Users can delete own workout sets"
  ON workout_sets FOR DELETE
  USING (EXISTS (SELECT 1 FROM workouts WHERE workouts.id = workout_sets.workout_id AND workouts.user_id = auth.uid()));

-- ============================================
-- Trigger: updated_at automatisch setzen
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_plan_exercises_updated_at
  BEFORE UPDATE ON plan_exercises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
