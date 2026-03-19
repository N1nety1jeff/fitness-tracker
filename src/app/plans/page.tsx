'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Trash2,
  BookOpen, Search, X, Star, ArrowUp, ArrowDown, Link2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getAllPlans, createPlan, updatePlan, deletePlan, addExerciseToPlan, getPlanWithExercises, reorderExercises } from '@/lib/services/plan.service';
import { getExercises } from '@/lib/services/exercise.service';
import { deleteExercise as deletePlanExercise } from '@/lib/services/plan.service';
import type { Plan, PlanExercise, Exercise } from '@/lib/supabase/types';
import type { PlanWithExercises } from '@/lib/services/plan.service';
import BottomNav from '@/components/bottom-nav';

const USER_ID = '00000000-0000-0000-0000-000000000000';

type View = 'list' | 'detail' | 'new-plan' | 'add-exercise';

export default function PlansPage() {
  const router = useRouter();
  const [view, setView] = useState<View>('list');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanWithExercises | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New-Plan form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCycle, setNewCycle] = useState(20);
  const [isSaving, setIsSaving] = useState(false);

  // Add-Exercise
  const [exSearch, setExSearch] = useState('');
  const [pickedExercise, setPickedExercise] = useState<Exercise | null>(null);
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState(8);
  const [exWeight, setExWeight] = useState(0);
  const [exRest, setExRest] = useState(90);
  const [exDuration, setExDuration] = useState(60);

  const loadPlans = async () => {
    setIsLoading(true);
    const data = await getAllPlans(USER_ID);
    setPlans(data);
    setIsLoading(false);
  };

  const loadExercises = async () => {
    const data = await getExercises(USER_ID);
    setExercises(data);
  };

  useEffect(() => {
    loadPlans();
    loadExercises();
  }, []);

  const openPlan = async (plan: Plan) => {
    const detail = await getPlanWithExercises(plan.id);
    setSelectedPlan(detail);
    setView('detail');
  };

  const handleCreatePlan = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    await createPlan(USER_ID, newName.trim(), newDesc.trim() || undefined, newCycle);
    setNewName(''); setNewDesc(''); setNewCycle(20);
    setIsSaving(false);
    setView('list');
    loadPlans();
  };

  const handleSetActive = async (planId: string) => {
    // Alle deaktivieren, dann diesen aktivieren
    for (const p of plans) {
      if (p.is_active && p.id !== planId) await updatePlan(p.id, { is_active: false });
    }
    await updatePlan(planId, { is_active: true });
    loadPlans();
    if (selectedPlan) {
      const detail = await getPlanWithExercises(planId);
      setSelectedPlan(detail);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Plan und alle Übungen löschen?')) return;
    await deletePlan(planId);
    setView('list');
    loadPlans();
  };

  const handleAddExercise = async () => {
    if (!selectedPlan || !pickedExercise) return;
    setIsSaving(true);
    const isTimeBased = pickedExercise.exercise_type === 'time';
    const sortOrder = selectedPlan.plan_exercises.length + 1;
    await addExerciseToPlan(selectedPlan.id, {
      exercise_id: pickedExercise.id,
      name: pickedExercise.name,
      target_sets: exSets,
      target_reps: isTimeBased ? 0 : exReps,
      target_weight: exWeight,
      rest_seconds: exRest,
      target_duration_seconds: isTimeBased ? exDuration : null,
      progression_increment: 2.5,
      progression_threshold: 10,
      sort_order: sortOrder,
    });
    setPickedExercise(null);
    setExSearch('');
    setExSets(3); setExReps(8); setExWeight(0); setExRest(90); setExDuration(60);
    setIsSaving(false);
    const detail = await getPlanWithExercises(selectedPlan.id);
    setSelectedPlan(detail);
    setView('detail');
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    if (!confirm('Übung aus Plan entfernen?')) return;
    await deletePlanExercise(exerciseId);
    if (selectedPlan) {
      const detail = await getPlanWithExercises(selectedPlan.id);
      setSelectedPlan(detail);
    }
  };

  const handleMoveExercise = async (index: number, direction: 'up' | 'down') => {
    if (!selectedPlan) return;
    const exs = [...selectedPlan.plan_exercises];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= exs.length) return;
    [exs[index], exs[swapIdx]] = [exs[swapIdx], exs[index]];
    const updates = exs.map((ex, i) => ({ id: ex.id, sort_order: i + 1, superset_group: ex.superset_group }));
    await reorderExercises(updates);
    const detail = await getPlanWithExercises(selectedPlan.id);
    setSelectedPlan(detail);
  };

  const handleToggleSuperset = async (index: number) => {
    if (!selectedPlan) return;
    const exs = [...selectedPlan.plan_exercises];
    if (index >= exs.length - 1) return;
    const current = exs[index];
    const next = exs[index + 1];

    if (current.superset_group && current.superset_group === next.superset_group) {
      // Remove superset - set both to null
      current.superset_group = null;
      next.superset_group = null;
      // Check if any others in the group remain
    } else {
      // Create superset - find next available group number
      const maxGroup = Math.max(0, ...exs.map(e => e.superset_group || 0));
      const groupNum = current.superset_group || (maxGroup + 1);
      current.superset_group = groupNum;
      next.superset_group = groupNum;
    }

    const updates = exs.map((ex, i) => ({ id: ex.id, sort_order: i + 1, superset_group: ex.superset_group }));
    await reorderExercises(updates);
    const detail = await getPlanWithExercises(selectedPlan.id);
    setSelectedPlan(detail);
  };

  const filteredExercises = useMemo(() => {
    if (!exSearch.trim()) return exercises;
    const q = exSearch.toLowerCase();
    return exercises.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.equipment_id?.toLowerCase().includes(q)) ||
      (e.muscle_group?.toLowerCase().includes(q))
    );
  }, [exercises, exSearch]);

  // ---- Views ----

  if (view === 'new-plan') {
    return (
      <div className="min-h-screen bg-black text-white font-sans max-w-md mx-auto p-4 pb-28">
        <header className="flex items-center gap-3 mb-8 pt-4">
          <button onClick={() => setView('list')} className="p-2 hover:bg-white/10 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black uppercase tracking-tight">Neuer Plan</h1>
        </header>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Name *</label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="z.B. Push Day A"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Beschreibung</label>
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Optional..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 resize-none h-20"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Zykluslänge (Einheiten)</label>
            <div className="flex items-center gap-4">
              <button onClick={() => setNewCycle(c => Math.max(1, c - 1))} className="p-3 bg-white/5 rounded-lg">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-3xl font-black w-16 text-center">{newCycle}</span>
              <button onClick={() => setNewCycle(c => c + 1)} className="p-3 bg-white/5 rounded-lg">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <button
            onClick={handleCreatePlan}
            disabled={!newName.trim() || isSaving}
            className="w-full py-4 bg-primary text-black font-black uppercase tracking-tight rounded-xl mt-4 disabled:opacity-40"
          >
            Plan erstellen
          </button>
        </div>
      </div>
    );
  }

  if (view === 'add-exercise') {
    return (
      <div className="min-h-screen bg-black text-white font-sans max-w-md mx-auto pb-28">
        <header className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => { setView('detail'); setPickedExercise(null); }} className="p-2 hover:bg-white/10 rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black uppercase tracking-tight">Übung hinzufügen</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={exSearch}
              onChange={e => setExSearch(e.target.value)}
              placeholder="Übung suchen..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50"
            />
            {exSearch && <button onClick={() => setExSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-muted-foreground" /></button>}
          </div>
        </header>

        {!pickedExercise ? (
          <ul className="px-4 pt-3 space-y-2">
            {filteredExercises.map(ex => (
              <li key={ex.id}>
                <button
                  onClick={() => setPickedExercise(ex)}
                  className="w-full glass-card border-white/5 p-4 flex items-center gap-3 text-left hover:border-primary/30 transition-colors"
                >
                  {ex.is_favorite && <Star className="w-4 h-4 fill-primary text-primary shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-sm">{ex.name}</p>
                      {ex.exercise_type === 'time' && <span className="text-[9px] font-bold uppercase bg-blue-500/20 text-blue-400 px-1 py-0.5 rounded">Zeit</span>}
                    </div>
                    <div className="flex gap-2">
                      {ex.muscle_group && <span className="text-[10px] text-primary/70 font-bold uppercase">{ex.muscle_group}</span>}
                      {ex.equipment_id && <span className="text-[10px] font-mono text-muted-foreground">#{ex.equipment_id}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 space-y-4">
            <div className="glass-card p-4 border-primary/20">
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest mb-1">Gewählt</p>
              <p className="font-black text-lg">{pickedExercise.name}</p>
              {pickedExercise.muscle_group && <p className="text-xs text-primary/70 font-bold uppercase">{pickedExercise.muscle_group}</p>}
              <button onClick={() => setPickedExercise(null)} className="text-xs text-muted-foreground mt-1 underline">Andere wählen</button>
            </div>

            {(pickedExercise.exercise_type === 'time' ? [
              { label: 'Sätze', value: exSets, set: setExSets, step: 1, min: 1 },
              { label: 'Dauer (Sek)', value: exDuration, set: setExDuration, step: 5, min: 5 },
              { label: 'Gewicht (kg)', value: exWeight, set: setExWeight, step: 2.5, min: 0 },
              { label: 'Pause (Sek)', value: exRest, set: setExRest, step: 15, min: 0 },
            ] : [
              { label: 'Sätze', value: exSets, set: setExSets, step: 1, min: 1 },
              { label: 'Wiederholungen', value: exReps, set: setExReps, step: 1, min: 1 },
              { label: 'Startgewicht (kg)', value: exWeight, set: setExWeight, step: 2.5, min: 0 },
              { label: 'Pause (Sek)', value: exRest, set: setExRest, step: 15, min: 0 },
            ]).map(({ label, value, set, step, min }) => (
              <div key={label} className="glass-card p-4 flex items-center justify-between border-white/5">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => set((v: number) => Math.max(min, v - step))} className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center font-bold text-lg">−</button>
                  <span className="font-black text-xl w-14 text-center">{value}</span>
                  <button onClick={() => set((v: number) => v + step)} className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center font-bold text-lg">+</button>
                </div>
              </div>
            ))}

            <button
              onClick={handleAddExercise}
              disabled={isSaving}
              className="w-full py-4 bg-primary text-black font-black uppercase tracking-tight rounded-xl disabled:opacity-40"
            >
              Zum Plan hinzufügen
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'detail' && selectedPlan) {
    return (
      <div className="min-h-screen bg-black text-white font-sans max-w-md mx-auto pb-28">
        <header className="flex items-center justify-between px-4 pt-4 pb-4 border-b border-white/5">
          <button onClick={() => setView('list')} className="p-2 hover:bg-white/10 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="font-black text-lg uppercase tracking-tight">{selectedPlan.name}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{selectedPlan.cycle_length} Einheiten/Zyklus</p>
          </div>
          <button onClick={() => handleDeletePlan(selectedPlan.id)} className="p-2 hover:bg-white/10 rounded-full">
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        </header>

        <div className="px-4 pt-4">
          {/* Aktivieren */}
          <button
            onClick={() => handleSetActive(selectedPlan.id)}
            className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest mb-6 transition-colors ${
              selectedPlan.is_active
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
            }`}
          >
            {selectedPlan.is_active ? '✓ Aktiver Plan' : 'Als aktiv setzen'}
          </button>

          {/* Übungsliste */}
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Übungen ({selectedPlan.plan_exercises.length})
            </h2>
            <button
              onClick={() => setView('add-exercise')}
              className="flex items-center gap-1 text-primary text-xs font-bold"
            >
              <Plus className="w-4 h-4" /> Hinzufügen
            </button>
          </div>

          {selectedPlan.plan_exercises.length === 0 ? (
            <div className="glass-card p-8 border-dashed border-white/10 text-center">
              <p className="text-muted-foreground text-sm">Noch keine Übungen.</p>
              <button onClick={() => setView('add-exercise')} className="text-primary text-sm font-bold mt-2 underline">
                Erste Übung hinzufügen
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {selectedPlan.plan_exercises.map((ex, i) => {
                const nextEx = selectedPlan.plan_exercises[i + 1];
                const prevEx = i > 0 ? selectedPlan.plan_exercises[i - 1] : null;
                const isInSuperset = ex.superset_group !== null;
                const isFirstInSuperset = isInSuperset && (!prevEx || prevEx.superset_group !== ex.superset_group);
                const isLastInSuperset = isInSuperset && (!nextEx || nextEx.superset_group !== ex.superset_group);
                const supersetWithNext = ex.superset_group !== null && nextEx?.superset_group === ex.superset_group;

                return (
                  <li key={ex.id} className="relative">
                    {/* Supersatz-Klammer */}
                    {isInSuperset && (
                      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-primary/50 ${isFirstInSuperset ? 'rounded-t-full mt-2' : ''} ${isLastInSuperset ? 'rounded-b-full mb-2' : ''}`} />
                    )}
                    <div className={`glass-card p-4 border-white/5 flex items-start gap-2 ${isInSuperset ? 'ml-3 border-primary/10' : ''}`}>
                      {/* Verschieben-Buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
                        <button
                          onClick={() => handleMoveExercise(i, 'up')}
                          disabled={i === 0}
                          className="p-1 hover:bg-white/10 rounded disabled:opacity-20"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveExercise(i, 'down')}
                          disabled={i === selectedPlan.plan_exercises.length - 1}
                          className="p-1 hover:bg-white/10 rounded disabled:opacity-20"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{ex.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {ex.target_duration_seconds
                            ? `${ex.target_sets}×${ex.target_duration_seconds}s`
                            : `${ex.target_sets}×${ex.target_reps}`}
                          {ex.target_weight > 0 ? ` @ ${ex.target_weight}kg` : ''}
                          {' · Pause '}
                          {ex.rest_seconds}s
                        </p>
                        {isFirstInSuperset && (
                          <span className="text-[9px] font-bold uppercase tracking-widest text-primary mt-1 inline-block">Supersatz</span>
                        )}
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        {i < selectedPlan.plan_exercises.length - 1 && (
                          <button
                            onClick={() => handleToggleSuperset(i)}
                            className={`p-1.5 hover:bg-white/10 rounded-lg ${supersetWithNext ? 'text-primary' : 'text-muted-foreground'}`}
                            title="Supersatz mit nächster"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleRemoveExercise(ex.id)} className="p-1.5 hover:bg-white/10 rounded-lg shrink-0">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ---- Plan-Liste ----
  return (
    <div className="min-h-screen bg-black text-white font-sans max-w-md mx-auto pb-28">
      <header className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-white/5">
        <h1 className="text-2xl font-black uppercase tracking-tight">Trainingspläne</h1>
        <button
          onClick={() => setView('new-plan')}
          className="p-2.5 bg-primary text-black rounded-full hover:opacity-90"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Zur Übungsbibliothek */}
      <button
        onClick={() => router.push('/exercises')}
        className="mx-4 mt-4 w-[calc(100%-2rem)] glass-card p-4 border-white/5 flex items-center gap-3 hover:border-primary/20 transition-colors"
      >
        <BookOpen className="w-5 h-5 text-primary" />
        <span className="font-bold text-sm">Übungsbibliothek verwalten</span>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
      </button>

      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground text-sm py-16">Lade...</div>
        ) : plans.length === 0 ? (
          <div className="glass-card p-8 border-dashed border-white/10 text-center mt-4">
            <p className="text-muted-foreground text-sm mb-4">Noch keine Pläne.</p>
            <button
              onClick={() => setView('new-plan')}
              className="bg-primary text-black px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest"
            >
              Ersten Plan erstellen
            </button>
          </div>
        ) : (
          <ul className="space-y-3 mt-2">
            {plans.map(plan => (
              <li key={plan.id}>
                <button
                  onClick={() => openPlan(plan)}
                  className={`w-full glass-card p-5 border text-left hover:border-primary/20 transition-colors ${
                    plan.is_active ? 'border-primary/30' : 'border-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-base uppercase tracking-tight">{plan.name}</p>
                      {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">{plan.cycle_length} Einheiten/Zyklus</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {plan.is_active && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                          Aktiv
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
