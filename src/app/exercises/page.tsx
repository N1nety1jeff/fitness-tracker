'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Plus, Pencil, Trash2, X, Check, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  getExercises,
  createExercise,
  updateExercise,
  toggleFavorite,
  deleteExercise,
} from '@/lib/services/exercise.service';
import type { Exercise } from '@/lib/supabase/types';

const USER_ID = '00000000-0000-0000-0000-000000000000';

const MUSCLE_GROUPS = ['Alle', 'Brust', 'Rücken', 'Schultern', 'Bizeps', 'Trizeps', 'Beine', 'Core'];

type SortMode = 'favoriten' | 'alphabetisch' | 'muskelgruppe';

interface EditState {
  name: string;
  equipment_id: string;
  muscle_group: string;
  notes: string;
}

export default function ExercisesPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('Alle');
  const [sortMode, setSortMode] = useState<SortMode>('favoriten');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', equipment_id: '', muscle_group: '', notes: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExercise, setNewExercise] = useState<EditState>({ name: '', equipment_id: '', muscle_group: '', notes: '' });
  const [isSaving, setIsSaving] = useState(false);

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
    setEditState({ name: ex.name, equipment_id: ex.equipment_id || '', muscle_group: ex.muscle_group || '', notes: ex.notes || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editState.name.trim()) return;
    setIsSaving(true);
    await updateExercise(editingId, {
      name: editState.name.trim(),
      equipment_id: editState.equipment_id.trim() || null,
      muscle_group: editState.muscle_group.trim() || null,
      notes: editState.notes.trim() || null,
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
    });
    setNewExercise({ name: '', equipment_id: '', muscle_group: '', notes: '' });
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
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => handleToggleFavorite(ex)} className="shrink-0">
                    <Star className={`w-5 h-5 transition-colors ${ex.is_favorite ? 'fill-primary text-primary' : 'text-white/20'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{ex.name}</p>
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
                    <button onClick={() => handleStartEdit(ex)} className="p-2 hover:bg-white/10 rounded-lg">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(ex.id)} className="p-2 hover:bg-white/10 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
