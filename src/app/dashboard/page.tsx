'use client';

import React from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Award,
  ChevronRight,
  Play,
  RotateCcw,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getActivePlan, createPlan, addExerciseToPlan } from '@/lib/services/plan.service';
import { createWorkout } from '@/lib/services/workout.service';
import { useWorkoutStore } from '@/stores/workout-store';
import type { PlanWithExercises } from '@/lib/services/plan.service';

// ---- Mock Data for Dashboard ----

const MOCK_STATS = [
  { label: 'Einheiten', value: '12 / 20', icon: Calendar, color: 'text-primary' },
  { label: 'Gesamtvolumen', value: '45.2 t', icon: TrendingUp, color: 'text-blue-400' },
  { label: 'PRs (Zyklus)', value: '8', icon: Award, color: 'text-yellow-400' },
  { label: 'Soll-Erfüllung', value: '94%', icon: Target, color: 'text-green-400' },
];

const MOCK_CHART_DATA = [
  { label: 'W1', value: 80 },
  { label: 'W2', value: 82.5 },
  { label: 'W3', value: 82.5 },
  { label: 'W4', value: 85 },
  { label: 'W5', value: 85 },
  { label: 'W6', value: 87.5 },
  { label: 'W7', value: 90 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [activePlan, setActivePlan] = React.useState<PlanWithExercises | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isStarting, setIsStarting] = React.useState(false);
  const { startWorkout } = useWorkoutStore();

  // Daten vom Supabase laden
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    // Da wir noch kein Auth haben, suchen wir nach dem neuesten aktiven Plan
    // (In einer echten App würde hier die userId stehen)
    const plan = await getActivePlan('00000000-0000-0000-0000-000000000000'); // Dummy ID für Test ohne Auth RLS
    setActivePlan(plan);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInitializeDemo = async () => {
    setIsLoading(true);
    // 1. Plan erstellen
    const demoPlan = await createPlan(
      '00000000-0000-0000-0000-000000000000', 
      'Push Day A', 
      'Hypertrophie Fokus', 
      20
    );

    if (demoPlan) {
      // 2. Übungen hinzufügen
      await addExerciseToPlan(demoPlan.id, {
        name: 'Bankdrücken (Flachbank)',
        target_sets: 3,
        target_reps: 8,
        target_weight: 85,
        rest_seconds: 90,
        progression_increment: 2.5,
        progression_threshold: 10,
        sort_order: 1
      });
      await addExerciseToPlan(demoPlan.id, {
        name: 'Schrägbankdrücken (KH)',
        target_sets: 3,
        target_reps: 10,
        target_weight: 30,
        rest_seconds: 60,
        progression_increment: 2,
        progression_threshold: 10,
        sort_order: 2
      });
      
      await loadData();
    }
  };

  if (isLoading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Lade Dashboard...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 font-sans max-w-md mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-10 pt-4">
        <div>
          <h1 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Willkommen zurück</h1>
          <p className="text-3xl font-black italic uppercase tracking-tighter">Athlet <span className="text-primary tracking-normal">#01</span></p>
        </div>
        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
          <Award className="w-6 h-6 text-primary" />
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4 mb-10">
        {MOCK_STATS.map((stat, i) => (
          <div key={i} className="glass-card p-5 border-white/5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity`}>
              <stat.icon className="w-12 h-12" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{stat.label}</p>
            <p className="text-xl font-black tracking-tight">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Kraftkurve (Custom SVG Chart) */}
      <section className="mb-10">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground underline decoration-primary/50 underline-offset-4">Kraftkurve (Bankdrücken)</h2>
          <Link href="/history" className="text-[10px] font-bold uppercase text-primary flex items-center gap-1">
            Details <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="glass-card p-6 border-primary/10 relative h-48 flex items-end justify-between gap-1 overflow-hidden">
          {/* SVG Line Chart */}
          <svg className="absolute inset-0 w-full h-full p-6 pb-12 opacity-80" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#CCFF00" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#CCFF00" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area */}
            <path 
              d="M 0 100 L 0 50 L 15 45 L 30 45 L 45 40 L 60 40 L 75 35 L 100 25 L 100 100 Z" 
              fill="url(#chartGradient)" 
            />
            {/* Line */}
            <path 
              d="M 0 50 L 15 45 L 30 45 L 45 40 L 60 40 L 75 35 L 100 25" 
              fill="none" 
              stroke="#CCFF00" 
              strokeWidth="2" 
              strokeLinejoin="round" 
              strokeLinecap="round"
            />
          </svg>
          
          {/* Chart Labels */}
          {MOCK_CHART_DATA.map((data, i) => (
            <div key={i} className="flex flex-col items-center z-10">
              <div className="text-[8px] font-bold text-muted-foreground mb-1">{data.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Aktueller Plan */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Aktueller Plan</h2>
        {activePlan ? (
          <div className="glass-card p-6 border-white/5 relative bg-white/[0.02]">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xl font-black italic uppercase italic tracking-tight mb-1">{activePlan.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest px-2 py-0.5 bg-primary/10 text-primary rounded inline-block">
                  Einheit 1 / {activePlan.cycle_length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Status</p>
                <p className="text-xs font-bold text-green-400">AKTIV</p>
              </div>
            </div>
            
            <div className="mb-6 space-y-2">
              {activePlan.plan_exercises.slice(0, 3).map((ex, i) => (
                <div key={i} className="flex justify-between text-[11px] text-muted-foreground">
                  <span>{ex.name}</span>
                  <span className="font-mono">{ex.target_sets}x{ex.target_reps} @ {ex.target_weight}kg</span>
                </div>
              ))}
              {activePlan.plan_exercises.length > 3 && (
                <p className="text-[10px] italic text-muted-foreground mt-1">...und {activePlan.plan_exercises.length - 3} weitere</p>
              )}
            </div>

            <button
              disabled={isStarting}
              onClick={async () => {
                if (!activePlan) return;
                setIsStarting(true);
                const { workout } = await createWorkout(activePlan.id, '00000000-0000-0000-0000-000000000000');
                if (workout) {
                  startWorkout(workout, activePlan.plan_exercises, []);
                  router.push('/workout');
                } else {
                  setIsStarting(false);
                  alert('Training konnte nicht gestartet werden.');
                }
              }}
              className="w-full gym-button bg-primary text-black electric-glow flex items-center justify-center gap-3 py-4 disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-current" />
              <span className="font-black uppercase tracking-tight text-sm">
                {isStarting ? 'Starte...' : 'Training Starten'}
              </span>
            </button>
          </div>
        ) : (
          <div className="glass-card p-8 border-dashed border-white/10 flex flex-col items-center justify-center text-center">
            <RotateCcw className="w-10 h-10 text-muted-foreground mb-4 opacity-20" />
            <p className="text-sm text-muted-foreground mb-6 font-medium">Kein aktiver Plan gefunden.</p>
            <button 
              onClick={handleInitializeDemo}
              className="gym-button bg-white/5 text-white border-white/10 px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              Beispielplan erstellen
            </button>
          </div>
        )}
      </section>

      {/* Navigation Footer */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent pt-10">
        <div className="glass-card flex justify-around p-4 border-white/10 shadow-2xl">
          <button className="flex flex-col items-center gap-1 text-primary">
            <TrendingUp className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Dashboard</span>
          </button>
          <Link href="/plans" className="flex flex-col items-center gap-1 text-muted-foreground">
            <Plus className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Pläne</span>
          </Link>
          <Link href="/settings" className="flex flex-col items-center gap-1 text-muted-foreground">
            <RotateCcw className="w-6 h-6" />
            <span className="text-[10px] font-black uppercase tracking-widest">Daten</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
