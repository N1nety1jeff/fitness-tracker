'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Plus, Pencil, Trash2, X, Check, ChevronLeft, Info, ChevronDown, ChevronUp, Timer, Hash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  getExercises,
  createExercise,
  updateExercise,
  toggleFavorite,
  deleteExercise,
} from '@/lib/services/exercise.service';
import type { Exercise } from '@/lib/supabase/types';
import BottomNav from '@/components/bottom-nav';

const USER_ID = '00000000-0000-0000-0000-000000000000';

const MUSCLE_GROUPS = ['Alle', 'Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Beine', 'Core'];

type SortMode = 'favoriten' | 'alphabetisch' | 'muskelgruppe';

interface EditState {
  name: string;
  equipment_id: string;
  muscle_group: string;
  notes: string;
  exercise_type: 'reps' | 'time';
  target_muscles: string;
  instructions: string;
  common_mistakes: string;
}

export default function ExercisesPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('Alle');
  const [sortMode, setSortMode] = useState<SortMode>('favoriten');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', equipment_id: '', muscle_group: '', notes: '', exercise_type: 'reps', target_muscles: '', instructions: '', common_mistakes: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExercise, setNewExercise] = useState<EditState>({ name: '', equipment_id: '', muscle_group: '', notes: '', exercise_type: 'reps', target_muscles: '', instructions: '', common_mistakes: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDescriptions, setShowDescriptions] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('showDescriptions');
    if (stored !== null) setShowDescriptions(stored === 'true');
  }, []);

  const load = async () => {
    setIsLoading(true);
    const data = await getExercises(USER_ID);
    setExercises(data);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = exercises;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.equipment_id?.toLowerCase().includes(q)) ||
        (e.muscle_group?.toLowerCase().includes(q))
      );
    }
    if (filterGroup !== 'Alle') {
      list = list.filter(e => e.muscle_group === filterGroup);
    }
    if (sortMode === 'alphabetisch') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'muskelgruppe') {
      list = [...list].sort((a, b) => (a.muscle_group || '').localeCompare(b.muscle_group || '') || a.name.localeCompare(b.name));
    } else {
      // favoriten zuerst, dann alphabetisch
      list = [...list].sort((a, b) => {
        if (a.is_favorite === b.is_favorite) return a.name.localeCompare(b.name);
        return a.is_favorite ? -1 : 1;
      });
    }
    return list;
  }, [exercises, search, filterGroup, sortMode]);

  const handleToggleFavorite = async (ex: Exercise) => {
    setExercises(prev => prev.map(e => e.id === ex.id ? { ...e, is_favorite: !e.is_favorite } : e));
    await toggleFavorite(ex.id, ex.is_favorite);
  };

  const handleStartEdit = (ex: Exercise) => {
    setEditingId(ex.id);
    setEditState({
      name: ex.name,
      equipment_id: ex.equipment_id || '',
      muscle_group: ex.muscle_group || '',
      notes: ex.notes || '',
      exercise_type: ex.exercise_type || 'reps',
      target_muscles: ex.target_muscles || '',
      instructions: ex.instructions || '',
      common_mistakes: ex.common_mistakes || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editState.name.trim()) return;
    setIsSaving(true);
    await updateExercise(editingId, {
      name: editState.name.trim(),
      equipment_id: editState.equipment_id.trim() || null,
      muscle_group: editState.muscle_group.trim() || null,
      notes: editState.notes.trim() || null,
      exercise_type: editState.exercise_type,
      target_muscles: editState.target_muscles.trim() || null,
      instructions: editState.instructions.trim() || null,
      common_mistakes: editState.common_mistakes.trim() || null,
    });
    setEditingId(null);
    setIsSaving(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Übung wirklich löschen?')) return;
    setExercises(prev => prev.filter(e => e.id !== id));
    await deleteExercise(id);
  };

  const handleAddExercise = async () => {
    if (!newExercise.name.trim()) return;
    setIsSaving(true);
    await createExercise(USER_ID, {
      name: newExercise.name.trim(),
      equipment_id: newExercise.equipment_id.trim() || undefined,
      muscle_group: newExercise.muscle_group.trim() || undefined,
      notes: newExercise.notes.trim() || undefined,
      exercise_type: newExercise.exercise_type,
      target_muscles: newExercise.target_muscles.trim() || undefined,
      instructions: newExercise.instructions.trim() || undefined,
      common_mistakes: newExercise.common_mistakes.trim() || undefined,
    });
    setNewExercise({ name: '', equipment_id: '', muscle_group: '', notes: '', exercise_type: 'reps', target_muscles: '', instructions: '', common_mistakes: '' });
    setShowAddForm(false);
    setIsSaving(false);
    load();
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans max-w-md mx-auto pb-28">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black uppercase tracking-tight flex-1">Übungsbibliothek</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="p-2 bg-primary text-black rounded-full hover:opacity-90"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Suche */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen nach Name oder Gerätenr..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Muskelgruppen-Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {MUSCLE_GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setFilterGroup(g)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                filterGroup === g ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </header>

      {/* Sortierung */}
      <div className="flex gap-2 px-4 pt-3 pb-1">
        {(['favoriten', 'alphabetisch', 'muskelgruppe'] as SortMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${
              sortMode === mode ? 'text-primary border border-primary/50' : 'text-muted-foreground border border-white/10'
            }`}
          >
            {mode === 'favoriten' ? '⭐ Favoriten' : mode === 'alphabetisch' ? 'A–Z' : 'Muskel'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground self-center">{filtered.length} Übungen</span>
      </div>

      {/* Neues Übungsformular */}
      {showAddForm && (
        <div className="mx-4 mt-3 glass-card p-4 border-primary/20">
          <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Neue Übung</h3>
          <div className="space-y-2">
            <input
              autoFocus
              type="text"
              value={newExercise.name}
              onChange={e => setNewExercise(s => ({ ...s, name: e.target.value }))}
              placeholder="Name *"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
            {/* Typ-Auswahl */}
            <div className="flex gap-2">
              {(['reps', 'time'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setNewExercise(s => ({ ...s, exercise_type: t }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors ${
                    newExercise.exercise_type === t ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground'
                  }`}
                >
                  {t === 'reps' ? <><Hash className="w-3 h-3" /> Reps</> : <><Timer className="w-3 h-3" /> Zeit</>}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={newExercise.equipment_id}
              onChange={e => setNewExercise(s => ({ ...s, equipment_id: e.target.value }))}
              placeholder="Gerätenummer (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
            <select
              value={newExercise.muscle_group}
              onChange={e => setNewExercise(s => ({ ...s, muscle_group: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 text-white"
            >
              <option value="">Muskelgruppe (optional)</option>
              {MUSCLE_GROUPS.slice(1).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <input
              type="text"
              value={newExercise.target_muscles}
              onChange={e => setNewExercise(s => ({ ...s, target_muscles: e.target.value }))}
              placeholder="Zielmuskeln (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
            />
            <textarea
              value={newExercise.instructions}
              onChange={e => setNewExercise(s => ({ ...s, instructions: e.target.value }))}
              placeholder="Ausführung (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none h-16"
            />
            <textarea
              value={newExercise.common_mistakes}
              onChange={e => setNewExercise(s => ({ ...s, common_mistakes: e.target.value }))}
              placeholder="Häufige Fehler (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none h-16"
            />
            <textarea
              value={newExercise.notes}
              onChange={e => setNewExercise(s => ({ ...s, notes: e.target.value }))}
              placeholder="Notizen (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none h-16"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 bg-white/5 rounded-lg text-sm font-bold text-muted-foreground"
            >
              Abbrechen
            </button>
            <button
              onClick={handleAddExercise}
              disabled={!newExercise.name.trim() || isSaving}
              className="flex-1 py-2 bg-primary text-black rounded-lg text-sm font-bold disabled:opacity-40"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="text-center text-muted-foreground text-sm py-16">Lade...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-16">Keine Übungen gefunden.</div>
      ) : (
        <ul className="px-4 pt-2 space-y-2">
          {filtered.map(ex => (
            <li key={ex.id} className="glass-card border-white/5 overflow-hidden">
              {editingId === ex.id ? (
                /* Edit-Mode */
                <div className="p-4 space-y-2">
                  <input
                    autoFocus
                    type="text"
                    value={editState.name}
                    onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                  />
                  {/* Typ-Auswahl */}
                  <div className="flex gap-2">
                    {(['reps', 'time'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditState(s => ({ ...s, exercise_type: t }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors ${
                          editState.exercise_type === t ? 'bg-primary text-black' : 'bg-white/5 text-muted-foreground'
                        }`}
                      >
                        {t === 'reps' ? <><Hash className="w-3 h-3" /> Reps</> : <><Timer className="w-3 h-3" /> Zeit</>}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={editState.equipment_id}
                    onChange={e => setEditState(s => ({ ...s, equipment_id: e.target.value }))}
                    placeholder="Gerätenummer"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                  />
                  <select
                    value={editState.muscle_group}
                    onChange={e => setEditState(s => ({ ...s, muscle_group: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 text-white"
                  >
                    <option value="">Muskelgruppe</option>
                    {MUSCLE_GROUPS.slice(1).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <input
                    type="text"
                    value={editState.target_muscles}
                    onChange={e => setEditState(s => ({ ...s, target_muscles: e.target.value }))}
                    placeholder="Zielmuskeln"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                  />
                  <textarea
                    value={editState.instructions}
                    onChange={e => setEditState(s => ({ ...s, instructions: e.target.value }))}
                    placeholder="Ausführung"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none h-14"
                  />
                  <textarea
                    value={editState.common_mistakes}
                    onChange={e => setEditState(s => ({ ...s, common_mistakes: e.target.value }))}
                    placeholder="Häufige Fehler"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none h-14"
                  />
                  <textarea
                    value={editState.notes}
                    onChange={e => setEditState(s => ({ ...s, notes: e.target.value }))}
                    placeholder="Notizen"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none h-14"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="flex-1 py-2 bg-white/5 rounded-lg text-xs font-bold text-muted-foreground flex items-center justify-center gap-1">
                      <X className="w-3 h-3" /> Abbrechen
                    </button>
                    <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 py-2 bg-primary text-black rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Speichern
                    </button>
                  </div>
                </div>
              ) : (
                /* View-Mode */
                <div>
                  <div className="flex items-center gap-3 p-4">
                    <button onClick={() => handleToggleFavorite(ex)} className="shrink-0">
                      <Star className={`w-5 h-5 transition-colors ${ex.is_favorite ? 'fill-primary text-primary' : 'text-white/20'}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{ex.name}</p>
                        {ex.exercise_type === 'time' && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded shrink-0">Zeit</span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-0.5">
                        {ex.muscle_group && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-primary/70">{ex.muscle_group}</span>
                        )}
                        {ex.equipment_id && (
                          <span className="text-[10px] font-mono text-muted-foreground">#{ex.equipment_id}</span>
                        )}
                      </div>
                      {ex.notes && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{ex.notes}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {showDescriptions && (ex.target_muscles || ex.instructions || ex.common_mistakes) && (
                        <button onClick={() => setExpandedId(expandedId === ex.id ? null : ex.id)} className="p-2 hover:bg-white/10 rounded-lg">
                          <Info className={`w-4 h-4 ${expandedId === ex.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        </button>
                      )}
                      <button onClick={() => handleStartEdit(ex)} className="p-2 hover:bg-white/10 rounded-lg">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(ex.id)} className="p-2 hover:bg-white/10 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  {/* Expandierbarer Info-Bereich */}
                  {expandedId === ex.id && showDescriptions && (
                    <div className="px-4 pb-4 pt-0 space-y-2 border-t border-white/5 mt-0 pt-3">
                      {ex.target_muscles && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Zielmuskeln</p>
                          <p className="text-xs text-muted-foreground">{ex.target_muscles}</p>
                        </div>
                      )}
                      {ex.instructions && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">Ausführung</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-line">{ex.instructions}</p>
                        </div>
                      )}
                      {ex.common_mistakes && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-0.5">Häufige Fehler</p>
                          <p className="text-xs text-muted-foreground whitespace-pre-line">{ex.common_mistakes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <BottomNav />
    </div>
  );
}
